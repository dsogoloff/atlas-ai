<#
.SYNOPSIS
  Manual Code <-> Codex review hop for one lane diff. Local-only.

.DESCRIPTION
  The relay's manual mode (automated transport is parked until Codex reachability is
  confirmed). Two modes:

    Bundle (default): diff the current lane against its base, scrub for anything that must
      never leave the box (secrets / obvious PII / licensed content), and write a
      review-request file you paste into Codex by hand.

    Ingest (-FindingsFile): validate the JSON Codex returns against
      tools/schemas/codex_review.schema.json (structural check) and summarise it, so a
      malformed reply is caught before the codex-finding-resolver agent runs.

  Hard rule (see .agent/runs/RUNBOOK.md "Relay safety"): the relay must never carry
  secrets, child PII, or licensed S.A.M. question text off-box. Review payloads are
  diffs/code, not data dumps. If the scrub trips, the bundle is refused.

  ASCII-only on purpose: Windows PowerShell 5.1 reads -File scripts as the system ANSI
  codepage, so non-ASCII bytes (em-dashes, arrows) corrupt parsing. Keep this file ASCII.

.EXAMPLE
  powershell -File tools/relay/manual_codex_review.ps1
  powershell -File tools/relay/manual_codex_review.ps1 -FindingsFile tools/relay/.reviews/reply.json
#>
[CmdletBinding()]
param(
  [string]$Base = "ATLAS-ASSESSMENT",
  [string]$Head = "",
  [string]$FindingsFile = "",
  [switch]$Force
)

$ErrorActionPreference = "Stop"

$RepoRoot   = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$SchemaPath = Join-Path $RepoRoot "tools/schemas/codex_review.schema.json"
$ReviewsDir = Join-Path $PSScriptRoot ".reviews"

$Severities = @("blocker", "high", "medium", "low", "info")
$Categories = @("correctness", "security", "performance", "style", "test", "architecture", "docs", "other")

function Fail([string]$msg) {
  Write-Host "ERROR: $msg" -ForegroundColor Red
  exit 1
}

# --- Ingest mode -----------------------------------------------------------
function Invoke-Ingest([string]$path) {
  if (-not (Test-Path $path)) { Fail "findings file not found: $path" }

  try {
    $doc = Get-Content -Raw -Path $path | ConvertFrom-Json
  } catch {
    Fail "not valid JSON ($path): $($_.Exception.Message)"
  }

  $errs = New-Object System.Collections.Generic.List[string]
  $names = $doc.PSObject.Properties.Name
  if ($names -notcontains "review")   { $errs.Add("top level: missing 'review'") }
  if ($names -notcontains "findings") { $errs.Add("top level: missing 'findings'") }

  if ($names -contains "review") {
    $rnames = $doc.review.PSObject.Properties.Name
    if ($rnames -notcontains "base")            { $errs.Add("review: missing 'base'") }
    if ($rnames -notcontains "reviewed_commit") { $errs.Add("review: missing 'reviewed_commit'") }
  }

  $findings = @()
  if ($names -contains "findings") {
    if ($doc.findings -isnot [System.Array]) {
      $errs.Add("findings: must be an array")
    } else {
      $findings = $doc.findings
      $i = 0
      foreach ($f in $findings) {
        $fn = $f.PSObject.Properties.Name
        foreach ($req in @("id", "file", "severity", "category", "description")) {
          if ($fn -notcontains $req) { $errs.Add("findings[$i]: missing '$req'") }
        }
        if (($fn -contains "severity") -and ($Severities -notcontains $f.severity)) {
          $errs.Add("findings[$i]: severity '$($f.severity)' not in {$($Severities -join ', ')}")
        }
        if (($fn -contains "category") -and ($Categories -notcontains $f.category)) {
          $errs.Add("findings[$i]: category '$($f.category)' not in {$($Categories -join ', ')}")
        }
        $i++
      }
    }
  }

  if ($errs.Count -gt 0) {
    Write-Host "INVALID -- $($errs.Count) problem(s) against codex_review.schema.json:" -ForegroundColor Red
    foreach ($e in $errs) { Write-Host "  - $e" }
    exit 1
  }

  Write-Host "VALID -- $($findings.Count) finding(s)." -ForegroundColor Green
  foreach ($s in $Severities) {
    $c = @($findings | Where-Object { $_.severity -eq $s }).Count
    if ($c -gt 0) { Write-Host ("  {0,-8} {1}" -f $s, $c) }
  }
  $mustFix = @($findings | Where-Object { $_.severity -eq "blocker" -or $_.severity -eq "high" })
  if ($mustFix.Count -gt 0) {
    Write-Host "Must resolve before merge (blocker/high):" -ForegroundColor Yellow
    foreach ($f in $mustFix) { Write-Host "  [$($f.id)] $($f.file): $($f.description)" }
  }
  Write-Host ""
  Write-Host "Next: hand this file + the lane diff to the codex-finding-resolver agent."
  Write-Host "It confirms each finding against the code and REJECTS anything that conflicts with"
  Write-Host "BUSINESS_RULES / the voice-locked Step-4 prompt / ARCHITECTURE locks (those are gates)."
}

# --- Bundle mode -----------------------------------------------------------
function Get-SecretHits([string[]]$lines) {
  # Scan ADDED lines only. Patterns match real secret VALUES, not the mere mention of a
  # key NAME -- otherwise code, .env.example, or docs that reference a key (including this
  # script's own pattern list) would falsely trip. A name alone is not a leak; a value is.
  $patterns = [ordered]@{
    "anthropic key"     = 'sk-ant-[A-Za-z0-9_-]{20,}'
    "resend key"        = 're_[A-Za-z0-9]{20,}'
    "private key block" = '-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----'
    "jwt / service key" = 'eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{6,}'
    "assigned secret"   = '(?i)(password|secret|api[_-]?key|service_role(_key)?|access[_-]?token|client[_-]?secret)\s*[=:]\s*[''"][^''"]{8,}[''"]'
  }
  $hits = New-Object System.Collections.Generic.List[string]
  foreach ($line in $lines) {
    if ($line.StartsWith("+") -and -not $line.StartsWith("+++")) {
      foreach ($name in $patterns.Keys) {
        if ($line -match $patterns[$name]) { $hits.Add($name); break }
      }
    }
  }
  return ($hits | Select-Object -Unique)
}

function Invoke-Bundle {
  if ([string]::IsNullOrWhiteSpace($Head)) {
    $Head = (& git rev-parse --abbrev-ref HEAD).Trim()
  }
  if ($Head -eq $Base) {
    Fail "Head ($Head) is the base. Review a lane/* branch, not the protected base."
  }

  $sha = (& git rev-parse --short $Head).Trim()
  if ($LASTEXITCODE -ne 0) { Fail "could not resolve $Head" }

  $diffLines = & git diff "$Base...$Head"
  if ($LASTEXITCODE -ne 0) { Fail "git diff $Base...$Head failed" }
  if ($null -eq $diffLines -or $diffLines.Count -eq 0) {
    Write-Host "No diff between $Base and $Head -- nothing to review." -ForegroundColor Yellow
    exit 0
  }

  $hits = Get-SecretHits $diffLines
  if ($hits.Count -gt 0) {
    Write-Host "SECRET SCRUB TRIPPED -- the diff has added lines matching:" -ForegroundColor Red
    foreach ($h in $hits) { Write-Host "  - $h" }
    Write-Host "The relay must never carry secrets off-box. Remove them (use env vars) and retry."
    if (-not $Force) { Fail "refusing to write the review bundle (override with -Force only if these are false positives)" }
    Write-Host "-Force set: writing anyway. You confirm these are NOT real secrets." -ForegroundColor Yellow
  }

  if (-not (Test-Path $ReviewsDir)) { New-Item -ItemType Directory -Path $ReviewsDir | Out-Null }
  $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $safeBranch = ($Head -replace '[^A-Za-z0-9._-]', '-')
  $reqPath = Join-Path $ReviewsDir "request-$safeBranch-$sha-$stamp.md"

  $diffText = ($diffLines -join "`n")
  $fence = '````'   # single-quoted: literal backticks. 4-backtick fence nests 3-backtick blocks.
  $sevList = ($Severities -join ', ')
  $catList = ($Categories -join ', ')

  # Single-quoted here-string (no interpolation) + literal token replace. Robust against
  # any '$' or backtick inside the diff text.
  $template = @'
# Codex review request -- {{HEAD}} @ {{SHA}} (base {{BASE}})

You are an INDEPENDENT code reviewer, not an oracle. Review the diff below for
correctness, security, performance, style, missing tests, and architecture fit. REPORT
problems; do not rewrite the branch.

Return ONLY a JSON object conforming to tools/schemas/codex_review.schema.json:
- review: { branch, base, reviewed_commit, reviewer: "codex", summary }
- findings: [ { id, file, location?, severity, category, description, suggested_fix? } ]
  severity in: {{SEV}}
  category in: {{CAT}}
An empty findings array is valid (nothing to change).

Do NOT include any secret, child PII, or licensed S.A.M. question text in your reply.
Do NOT propose changes to consent semantics, pricing, claims language, or the voice-locked
Step-4 narration prompt -- those are product/business gates, not review fixes.

Save your reply as a .json file, then validate + summarise it with:
  powershell -File tools/relay/manual_codex_review.ps1 -FindingsFile <that-file.json>

--- DIFF ---
{{FENCE}}diff
{{DIFF}}
{{FENCE}}
'@

  $prompt = $template.Replace('{{HEAD}}', $Head).Replace('{{SHA}}', $sha).Replace('{{BASE}}', $Base).Replace('{{SEV}}', $sevList).Replace('{{CAT}}', $catList).Replace('{{FENCE}}', $fence).Replace('{{DIFF}}', $diffText)

  Set-Content -Path $reqPath -Value $prompt -Encoding UTF8

  Write-Host "Review request written:" -ForegroundColor Green
  Write-Host "  $reqPath"
  Write-Host ""
  Write-Host "Next steps:"
  Write-Host "  1. Paste that file's contents into Codex."
  Write-Host "  2. Save Codex's JSON reply (schema: $SchemaPath)."
  Write-Host "  3. Validate it:  powershell -File tools/relay/manual_codex_review.ps1 -FindingsFile <reply.json>"
  Write-Host "  4. Hand the validated findings + this diff to the codex-finding-resolver agent."
}

# --- Dispatch --------------------------------------------------------------
if (-not [string]::IsNullOrWhiteSpace($FindingsFile)) {
  Invoke-Ingest $FindingsFile
} else {
  Invoke-Bundle
}
