// SessionStart drift alarm: if CLAUDE.md, AGENTS.md, or .claude/ have uncommitted
// working-tree changes when a session starts, surface the diff loudly before any
// other work. Governance files must only change via reviewed lane PRs.
import { execFileSync } from 'node:child_process';

function git(...args) {
  try {
    return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  } catch {
    return '';
  }
}

const PATHS = ['CLAUDE.md', 'AGENTS.md', '.claude'];

const status = git('status', '--porcelain', '--', ...PATHS).trimEnd();
if (!status) process.exit(0);

const diff = git('diff', 'HEAD', '--', ...PATHS).trimEnd();
const untracked = status
  .split('\n')
  .filter((l) => l.startsWith('??'))
  .map((l) => l.slice(3))
  .join('\n');

const MAX_DIFF_CHARS = 30000;
const diffBody =
  diff.length > MAX_DIFF_CHARS
    ? diff.slice(0, MAX_DIFF_CHARS) + '\n... [diff truncated — run: git diff HEAD -- CLAUDE.md AGENTS.md .claude/]'
    : diff;

const banner =
  'DRIFT ALARM — uncommitted changes to governance files (CLAUDE.md / AGENTS.md / .claude/) detected at session start:\n' +
  status;

const context = [
  '<drift-alarm>',
  'Uncommitted working-tree changes to governance files (CLAUDE.md, AGENTS.md, or .claude/) were detected at session start.',
  'BEFORE doing anything else: show the founder this diff loudly and in full, and ask whether it is intentional (commit via a lane PR) or drift (restore from HEAD). Do not start other work until acknowledged.',
  'Known false positive: in a fresh worktree, CLAUDE.md/GEMINI.md may show as `typechange` (T) — fix with `git restore --source=HEAD --staged --worktree CLAUDE.md GEMINI.md` and say so instead of alarming.',
  '',
  'git status --porcelain -- CLAUDE.md AGENTS.md .claude/:',
  status,
  untracked ? '\nUntracked files (no diff available):\n' + untracked : '',
  '',
  'git diff HEAD -- CLAUDE.md AGENTS.md .claude/:',
  diffBody || '(no tracked-file diff — the changes above are untracked files only)',
  '</drift-alarm>',
]
  .filter((line) => line !== null)
  .join('\n');

console.log(
  JSON.stringify({
    systemMessage: banner,
    hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: context },
  }),
);
