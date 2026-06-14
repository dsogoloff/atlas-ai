#!/usr/bin/env python3
"""Atlas — local headless Claude Code MCP relay.

A small, auditable HTTP MCP server that a claude.ai *custom connector* reaches
through a Cloudflare *named tunnel*. The tunnel terminates to this process on
localhost; this server is NEVER directly internet-exposed (it binds 127.0.0.1
only — requirement 8). On a valid dispatch it spawns a HEADLESS `claude -p`
constrained by `.claude/relay-agent.settings.json` and returns the result.

Security model (locked decisions, 2026-06-13):
  * Layer 0 — Cloudflare WAF IP allow-list (Anthropic egress CIDR). External.
  * Layer 1 — secret-token, validated IN CODE (this file): BOTH a required
    path segment `/mcp/<RELAY_SECRET>` AND a required `X-Relay-Secret` header,
    constant-time compared, read from env (never hardcoded, never logged). Any
    miss → a generic 403 that does NOT reveal which check failed (req. 2).
  * Layer 2 — the spawned agent runs in a CLEAN worktree (RELAY_WORKTREE, no
    settings.local.json present) under the full hard-deny set, and inherits the
    dedicated capped ANTHROPIC_API_KEY from THIS process's env only — never from
    a .env file, never logged (req. 3, 4, 5).

Hard rules enforced here:
  * `claude -p` is ALWAYS launched with `--settings .claude/relay-agent.settings.json`
    and NEVER with `--dangerously-skip-permissions` (req. 3).
  * RELAY_WORKTREE must be set or the server refuses to start — no silent
    fall-back to the main checkout (req. 4, fail-closed).
  * One in-flight job per session_key; a second concurrent dispatch → 409
    (req. 5, decision #6 one-writer-per-topic).
  * Spawn is wrapped in a max-3-attempt retry with backoff; auth failures are
    NOT retried, only transient spawn/runtime failures (req. 6).
  * Logs carry session_key / timestamp / outcome only — never the secret, the
    API key, .env contents, or full request headers/paths (req. 7).

Run: RELAY_SECRET=... RELAY_WORKTREE=/path/to/clean/worktree \
     ANTHROPIC_API_KEY=... [RELAY_PORT=8787] python tools/relay/code_relay.py
"""

from __future__ import annotations

import hmac
import json
import logging
import os
import shutil
import subprocess
import sys
import threading
import time
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

SETTINGS_REL_PATH = ".claude/relay-agent.settings.json"
MIN_SECRET_LEN = 32          # a short shared secret undermines layer 1
MAX_BODY_BYTES = 256 * 1024  # cap request bodies; dispatch payloads are small
MAX_ATTEMPTS = 3
SPAWN_TIMEOUT_SEC = 1800     # 30 min ceiling on a single headless run
SECRET_HEADER = "X-Relay-Secret"
MCP_PROTOCOL_VERSION = "2025-06-18"
SERVER_NAME = "atlas-code-relay"

# Stderr/stdout markers that mean "auth/credential failure" — NOT retryable.
_AUTH_FAILURE_MARKERS = (
    "401",
    "unauthorized",
    "invalid api key",
    "invalid x-api-key",
    "authentication",
    "authentication_error",
    "missing bearer",
)

# ---------------------------------------------------------------------------
# Logging — redacting by construction. We only ever pass scalars we control
# (session_key, outcome, attempt, rc) into log records; the secret, the API
# key, .env contents, and request headers/paths are never handed to the logger.
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    stream=sys.stdout,
)
log = logging.getLogger(SERVER_NAME)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------------------------------------------------------------------------
# Config — read once at startup, fail-closed on anything missing/weak.
# ---------------------------------------------------------------------------


class Config:
    def __init__(self) -> None:
        self.secret = os.environ.get("RELAY_SECRET", "")
        self.worktree = os.environ.get("RELAY_WORKTREE", "")
        self.port = int(os.environ.get("RELAY_PORT", "8787"))
        # Presence only — the VALUE is never read here or logged. The spawned
        # process inherits it from this process's env.
        self.has_api_key = bool(os.environ.get("ANTHROPIC_API_KEY", ""))

    def validate_or_die(self) -> None:
        problems: list[str] = []

        if not self.secret:
            problems.append("RELAY_SECRET is unset (the in-code secret-token).")
        elif len(self.secret) < MIN_SECRET_LEN:
            problems.append(
                f"RELAY_SECRET is too short (<{MIN_SECRET_LEN} chars); use a "
                "long random value."
            )

        # Decision layer-2: NO silent fall-back to the main checkout.
        if not self.worktree:
            problems.append(
                "RELAY_WORKTREE is unset; refusing to start. Point it at the "
                "clean worktree (no settings.local.json) the headless agent runs in."
            )
        elif not os.path.isdir(self.worktree):
            problems.append(f"RELAY_WORKTREE is not a directory: {self.worktree}")
        else:
            settings_path = os.path.join(self.worktree, SETTINGS_REL_PATH)
            if not os.path.isfile(settings_path):
                problems.append(
                    f"missing {SETTINGS_REL_PATH} in RELAY_WORKTREE — the headless "
                    "deny set must be present in the worktree."
                )
            # If a settings.local.json leaked into the 'clean' worktree, its
            # permissive allow-list would partly defeat layer-2. Warn loudly.
            if os.path.isfile(os.path.join(self.worktree, ".claude", "settings.local.json")):
                log.warning(
                    "RELAY_WORKTREE contains .claude/settings.local.json — layer-2 "
                    "isolation expects it ABSENT; remove it from the relay worktree."
                )

        if not self.has_api_key:
            problems.append(
                "ANTHROPIC_API_KEY is unset; the headless spawn would fail. Set "
                "the dedicated capped key in this process's env (never a .env file)."
            )

        if shutil.which("claude") is None:
            problems.append("`claude` CLI not found on PATH; cannot spawn the headless agent.")

        if problems:
            sys.stderr.write("code_relay: refusing to start (fail-closed):\n")
            for p in problems:
                sys.stderr.write(f"  - {p}\n")
            raise SystemExit(2)


# ---------------------------------------------------------------------------
# One-writer-per-topic lock (decision #6). One in-flight job per session_key.
# ---------------------------------------------------------------------------


class InFlightRegistry:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._active: set[str] = set()

    def try_acquire(self, session_key: str) -> bool:
        with self._lock:
            if session_key in self._active:
                return False
            self._active.add(session_key)
            return True

    def release(self, session_key: str) -> None:
        with self._lock:
            self._active.discard(session_key)


# ---------------------------------------------------------------------------
# Headless spawn + capped retry
# ---------------------------------------------------------------------------


class SpawnResult:
    def __init__(self, ok: bool, rc: int, stdout: str, stderr: str, auth_failure: bool) -> None:
        self.ok = ok
        self.rc = rc
        self.stdout = stdout
        self.stderr = stderr
        self.auth_failure = auth_failure


def _looks_like_auth_failure(text: str) -> bool:
    low = text.lower()
    return any(m in low for m in _AUTH_FAILURE_MARKERS)


def spawn_headless(cfg: Config, prompt: str) -> SpawnResult:
    """Run a single headless `claude -p` constrained by the relay-agent deny set.

    NEVER passes --dangerously-skip-permissions. Runs with cwd=RELAY_WORKTREE so
    the relative --settings path and the clean (no settings.local.json) leash
    resolve inside the isolated worktree. Inherits this process's env (incl. the
    dedicated ANTHROPIC_API_KEY); no .env file is ever read.
    """
    cmd = [
        "claude",
        "-p",
        prompt,
        "--settings",
        SETTINGS_REL_PATH,
    ]
    # Inherit our env so the dedicated capped ANTHROPIC_API_KEY flows to the
    # child. We do NOT construct the key here and we never log env.
    child_env = os.environ.copy()
    try:
        proc = subprocess.run(
            cmd,
            cwd=cfg.worktree,
            env=child_env,
            capture_output=True,
            text=True,
            timeout=SPAWN_TIMEOUT_SEC,
        )
    except subprocess.TimeoutExpired:
        return SpawnResult(False, -1, "", "spawn timed out", auth_failure=False)
    except OSError as e:
        # Transient spawn failure (e.g., resource limits) — retryable.
        return SpawnResult(False, -1, "", f"spawn error: {e.__class__.__name__}", auth_failure=False)

    combined = (proc.stdout or "") + "\n" + (proc.stderr or "")
    if proc.returncode == 0:
        return SpawnResult(True, 0, proc.stdout or "", proc.stderr or "", auth_failure=False)
    return SpawnResult(
        False,
        proc.returncode,
        proc.stdout or "",
        proc.stderr or "",
        auth_failure=_looks_like_auth_failure(combined),
    )


def spawn_with_retry(cfg: Config, prompt: str, session_key: str) -> SpawnResult:
    """Max-3-attempt wrapper with backoff. Retries ONLY transient
    spawn/runtime failures; an auth/credential failure is terminal (req. 6)."""
    result = SpawnResult(False, -1, "", "no attempt made", auth_failure=False)
    for attempt in range(1, MAX_ATTEMPTS + 1):
        result = spawn_headless(cfg, prompt)
        if result.ok:
            log.info("dispatch ok   session_key=%s attempt=%d rc=0", session_key, attempt)
            return result
        if result.auth_failure:
            # Do NOT retry credential failures — retrying a bad key just burns
            # quota and never succeeds.
            log.error(
                "dispatch auth-failure session_key=%s attempt=%d (not retried)",
                session_key,
                attempt,
            )
            return result
        log.warning(
            "dispatch transient-failure session_key=%s attempt=%d rc=%s",
            session_key,
            attempt,
            result.rc,
        )
        if attempt < MAX_ATTEMPTS:
            time.sleep(2 ** attempt)  # 2s, 4s backoff
    log.error("dispatch failed session_key=%s attempts=%d rc=%s", session_key, MAX_ATTEMPTS, result.rc)
    return result


# ---------------------------------------------------------------------------
# HTTP / MCP handler
# ---------------------------------------------------------------------------

_CONFIG: Config | None = None
_REGISTRY = InFlightRegistry()


def _constant_time_eq(candidate: str, secret: str) -> bool:
    # hmac.compare_digest is constant-time for equal-length byte strings and
    # does not short-circuit on the first differing byte.
    return hmac.compare_digest((candidate or "").encode("utf-8"), secret.encode("utf-8"))


class RelayHandler(BaseHTTPRequestHandler):
    # Do not advertise server/runtime versions.
    server_version = SERVER_NAME
    sys_version = ""

    # CRITICAL (req. 7): the default access log prints the request line, which
    # includes the path — and the path carries /mcp/<RELAY_SECRET>. Suppress it
    # entirely; we emit our own redacted dispatch logs instead.
    def log_message(self, fmt: str, *args: Any) -> None:  # noqa: A003 - stdlib name
        return

    # -- helpers -------------------------------------------------------------

    def _send_json(self, status: int, payload: dict[str, Any]) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _forbid(self) -> None:
        # Generic 403 — never reveal whether the path segment or the header was
        # the failing check (req. 2). Same body, same status, every time.
        self._send_json(403, {"error": "forbidden"})

    def _authorized(self) -> bool:
        """Validate BOTH the path-segment secret AND the header secret, in
        constant time, without leaking which one failed."""
        assert _CONFIG is not None
        secret = _CONFIG.secret

        # Path must be exactly /mcp/<segment>. Anything else → empty candidate
        # (still constant-time compared, still a generic failure).
        path = self.path.split("?", 1)[0]
        parts = path.split("/")
        # ["", "mcp", "<segment>"]
        path_secret = parts[2] if len(parts) == 3 and parts[1] == "mcp" else ""

        header_secret = self.headers.get(SECRET_HEADER, "")

        ok_path = _constant_time_eq(path_secret, secret)
        ok_header = _constant_time_eq(header_secret, secret)
        # Evaluate BOTH before combining so neither the comparison work nor the
        # branch order depends on which check failed.
        return ok_path and ok_header

    def _read_body(self) -> bytes | None:
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            return None
        if length <= 0:
            return b""
        if length > MAX_BODY_BYTES:
            return None
        return self.rfile.read(length)

    # -- verbs ---------------------------------------------------------------

    def do_GET(self) -> None:
        # No readable GET surface. Auth first so an unauthenticated probe can't
        # even distinguish a health endpoint from anything else.
        if not self._authorized():
            self._forbid()
            return
        self._send_json(200, {"status": "ok", "server": SERVER_NAME})

    def do_POST(self) -> None:
        # Layer 1 gate BEFORE reading/handling anything else.
        if not self._authorized():
            self._forbid()
            return

        raw = self._read_body()
        if raw is None:
            self._send_json(413, {"error": "payload too large or malformed length"})
            return
        try:
            req = json.loads(raw or b"{}")
        except (ValueError, UnicodeDecodeError):
            self._send_json(400, {"error": "invalid json"})
            return

        method = req.get("method")
        req_id = req.get("id")

        if method == "initialize":
            self._send_json(200, self._rpc_result(req_id, {
                "protocolVersion": MCP_PROTOCOL_VERSION,
                "capabilities": {"tools": {}},
                "serverInfo": {"name": SERVER_NAME, "version": "1"},
            }))
            return

        if method == "tools/list":
            self._send_json(200, self._rpc_result(req_id, {"tools": [_DISPATCH_TOOL]}))
            return

        if method == "tools/call":
            self._handle_tools_call(req_id, req.get("params") or {})
            return

        self._send_json(200, self._rpc_error(req_id, -32601, "method not found"))

    # -- MCP tools/call ------------------------------------------------------

    def _handle_tools_call(self, req_id: Any, params: dict[str, Any]) -> None:
        assert _CONFIG is not None
        if params.get("name") != _DISPATCH_TOOL["name"]:
            self._send_json(200, self._rpc_error(req_id, -32602, "unknown tool"))
            return
        args = params.get("arguments") or {}
        session_key = args.get("session_key")
        prompt = args.get("task")
        if not isinstance(session_key, str) or not session_key.strip():
            self._send_json(200, self._rpc_error(req_id, -32602, "session_key required"))
            return
        if not isinstance(prompt, str) or not prompt.strip():
            self._send_json(200, self._rpc_error(req_id, -32602, "task required"))
            return

        # One-writer-per-topic (decision #6): reject a concurrent dispatch for
        # the same session_key with HTTP 409.
        if not _REGISTRY.try_acquire(session_key):
            log.info("dispatch rejected (in-flight) session_key=%s at=%s", session_key, _now_iso())
            self._send_json(409, {"error": "session_key already mid-run"})
            return

        log.info("dispatch start session_key=%s at=%s", session_key, _now_iso())
        try:
            result = spawn_with_retry(_CONFIG, prompt, session_key)
        finally:
            _REGISTRY.release(session_key)

        if result.ok:
            self._send_json(200, self._rpc_result(req_id, {
                "content": [{"type": "text", "text": result.stdout}],
                "isError": False,
            }))
        else:
            # Surface a non-leaky failure summary (no env, no secret).
            reason = "auth_failure" if result.auth_failure else "spawn_failed"
            self._send_json(200, self._rpc_result(req_id, {
                "content": [{"type": "text", "text": f"dispatch {reason} (rc={result.rc})"}],
                "isError": True,
            }))

    # -- JSON-RPC envelopes --------------------------------------------------

    @staticmethod
    def _rpc_result(req_id: Any, result: dict[str, Any]) -> dict[str, Any]:
        return {"jsonrpc": "2.0", "id": req_id, "result": result}

    @staticmethod
    def _rpc_error(req_id: Any, code: int, message: str) -> dict[str, Any]:
        return {"jsonrpc": "2.0", "id": req_id, "error": {"code": code, "message": message}}


_DISPATCH_TOOL = {
    "name": "dispatch_coding_task",
    "description": "Dispatch a coding task to the headless Atlas agent in the relay worktree.",
    "inputSchema": {
        "type": "object",
        "properties": {
            "session_key": {
                "type": "string",
                "description": "Topic/workstream key. One in-flight job per key (one-writer-per-topic).",
            },
            "task": {
                "type": "string",
                "description": "The task prompt for the headless `claude -p` run.",
            },
        },
        "required": ["session_key", "task"],
    },
}


# ---------------------------------------------------------------------------
# Entrypoint
# ---------------------------------------------------------------------------


def main() -> None:
    global _CONFIG
    cfg = Config()
    cfg.validate_or_die()
    _CONFIG = cfg

    # Bind localhost ONLY (req. 8). The Cloudflare named tunnel connects here;
    # the server is never directly internet-exposed.
    httpd = ThreadingHTTPServer(("127.0.0.1", cfg.port), RelayHandler)
    log.info(
        "code_relay listening on 127.0.0.1:%d (worktree=%s) — tunnel terminates here",
        cfg.port,
        cfg.worktree,
    )
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        log.info("code_relay shutting down")
    finally:
        httpd.server_close()


if __name__ == "__main__":
    main()
