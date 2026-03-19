#!/usr/bin/env node
'use strict';

const { execSync, spawnSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const STATE_DIR = path.join(os.homedir(), '.issue-watcher');
const SKILL_DIR = path.join(os.homedir(), '.claude', 'skills', 'issue-watcher');
const DEFAULT_INTERVAL = 30;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function log(msg) {
  const ts = new Date().toISOString().replace('T', ' ').slice(0, 19);
  console.log(`[${ts}] ${msg}`);
}

function run(cmd, opts = {}) {
  try {
    return execSync(cmd, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: opts.cwd,
      timeout: opts.timeout || 30000,
      maxBuffer: 10 * 1024 * 1024,
    }).trim();
  } catch (err) {
    if (opts.ignoreError) return null;
    throw err;
  }
}

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}

// ---------------------------------------------------------------------------
// Preflight checks
// ---------------------------------------------------------------------------

function checkDependencies() {
  try {
    run('gh --version');
  } catch {
    console.error('Error: gh CLI is not installed. Install it: https://cli.github.com');
    process.exit(1);
  }
  try {
    run('claude --version');
  } catch {
    console.error('Error: claude CLI is not installed. Install it: https://docs.anthropic.com/en/docs/claude-code');
    process.exit(1);
  }
  try {
    run('git rev-parse --is-inside-work-tree');
  } catch {
    console.error('Error: not inside a git repository. Run this from within a git repo.');
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Repo info
// ---------------------------------------------------------------------------

function getRepoInfo() {
  const json = run('gh repo view --json nameWithOwner,defaultBranchRef');
  const data = JSON.parse(json);
  return {
    nameWithOwner: data.nameWithOwner,
    defaultBranch: data.defaultBranchRef.name,
  };
}

// ---------------------------------------------------------------------------
// State management
// ---------------------------------------------------------------------------

function stateFilePath(nameWithOwner) {
  const safe = nameWithOwner.replace('/', '-');
  return path.join(STATE_DIR, `${safe}.json`);
}

function loadState(nameWithOwner) {
  const fp = stateFilePath(nameWithOwner);
  if (!fs.existsSync(fp)) return { processed: {} };
  return JSON.parse(fs.readFileSync(fp, 'utf8'));
}

function saveState(nameWithOwner, state) {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(stateFilePath(nameWithOwner), JSON.stringify(state, null, 2));
}

// ---------------------------------------------------------------------------
// Daemon management
// ---------------------------------------------------------------------------

function repoSlug(nameWithOwner) {
  return nameWithOwner.replace('/', '-');
}

function pidFilePath(nameWithOwner) {
  return path.join(STATE_DIR, `${repoSlug(nameWithOwner)}.pid`);
}

function logFilePath(nameWithOwner) {
  return path.join(STATE_DIR, `${repoSlug(nameWithOwner)}.log`);
}

function readPid(nameWithOwner) {
  const fp = pidFilePath(nameWithOwner);
  if (!fs.existsSync(fp)) return null;
  const pid = parseInt(fs.readFileSync(fp, 'utf8').trim(), 10);
  if (isNaN(pid)) return null;
  return pid;
}

function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function writePid(nameWithOwner) {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(pidFilePath(nameWithOwner), String(process.pid));
}

function removePid(nameWithOwner) {
  const fp = pidFilePath(nameWithOwner);
  if (fs.existsSync(fp)) fs.unlinkSync(fp);
}

function launchDaemon(opts) {
  checkDependencies();
  const repo = getRepoInfo();
  const existingPid = readPid(repo.nameWithOwner);
  if (existingPid && isProcessAlive(existingPid)) {
    console.error(`Daemon already running for ${repo.nameWithOwner} (PID: ${existingPid})`);
    console.error(`Use --stop to stop it, or --status to check.`);
    process.exit(1);
  }

  fs.mkdirSync(STATE_DIR, { recursive: true });
  const logFile = logFilePath(repo.nameWithOwner);
  const logFd = fs.openSync(logFile, 'a');

  // Rebuild args without --daemon, add --_daemon-child
  const childArgs = [__filename, '--_daemon-child'];
  if (opts.interval !== DEFAULT_INTERVAL) childArgs.push('--interval', String(opts.interval));
  if (opts.label) childArgs.push('--label', opts.label);
  if (opts.dryRun) childArgs.push('--dry-run');

  const child = spawn(process.execPath, childArgs, {
    cwd: process.cwd(),
    detached: true,
    stdio: ['ignore', logFd, logFd],
    env: process.env,
  });

  child.unref();
  fs.closeSync(logFd);

  // Write PID of the child (not us)
  fs.writeFileSync(pidFilePath(repo.nameWithOwner), String(child.pid));

  console.log(`Daemon started for ${repo.nameWithOwner} (PID: ${child.pid})`);
  console.log(`  Logs: ${logFile}`);
  console.log(`  Stop: issue-watcher --stop`);
  process.exit(0);
}

function stopDaemon() {
  checkDependencies();
  const repo = getRepoInfo();
  const pid = readPid(repo.nameWithOwner);
  if (!pid) {
    console.log(`No daemon running for ${repo.nameWithOwner}.`);
    process.exit(0);
  }
  if (!isProcessAlive(pid)) {
    console.log(`Daemon (PID: ${pid}) is no longer running. Cleaning up.`);
    removePid(repo.nameWithOwner);
    process.exit(0);
  }
  process.kill(pid, 'SIGTERM');
  console.log(`Stopped daemon for ${repo.nameWithOwner} (PID: ${pid}).`);
  removePid(repo.nameWithOwner);
}

function showStatus() {
  checkDependencies();
  const repo = getRepoInfo();
  const pid = readPid(repo.nameWithOwner);
  const logFile = logFilePath(repo.nameWithOwner);

  if (!pid) {
    console.log(`No daemon registered for ${repo.nameWithOwner}.`);
    return;
  }
  if (!isProcessAlive(pid)) {
    console.log(`Daemon (PID: ${pid}) is not running (stale PID file).`);
    removePid(repo.nameWithOwner);
    return;
  }
  console.log(`Daemon running for ${repo.nameWithOwner} (PID: ${pid})`);
  console.log(`  Logs: ${logFile}`);
  console.log(`  Stop: issue-watcher --stop`);
}

// ---------------------------------------------------------------------------
// GitHub helpers
// ---------------------------------------------------------------------------

function fetchOpenIssues(nameWithOwner, label) {
  let cmd = `gh issue list --repo ${nameWithOwner} --json number,title,body,labels,createdAt --state open --limit 50`;
  if (label) cmd += ` --label "${label}"`;
  const json = run(cmd);
  return JSON.parse(json);
}

function fetchIssue(nameWithOwner, number) {
  const json = run(`gh issue view ${number} --repo ${nameWithOwner} --json number,title,body,labels,createdAt`);
  return JSON.parse(json);
}

// ---------------------------------------------------------------------------
// Core: process a single issue
// ---------------------------------------------------------------------------

function processIssue(repo, issue, defaultBranch) {
  const num = issue.number;
  const slug = slugify(issue.title);
  const branch = `issue-watcher/${num}-${slug}`;
  const worktreeDir = path.join(os.tmpdir(), `issue-watcher-${num}-${Date.now()}`);

  log(`Processing issue #${num}: ${issue.title}`);

  try {
    // Make sure we're up to date
    run(`git fetch origin ${defaultBranch}`, { timeout: 60000, ignoreError: true });

    // Create worktree from the latest default branch
    run(`git worktree add "${worktreeDir}" -b "${branch}" "origin/${defaultBranch}"`);
    log(`  Created worktree at ${worktreeDir}`);

    // Build the prompt
    const prompt = [
      `You are working in a git repository. A GitHub issue has been filed that you need to address by making code changes.`,
      ``,
      `## Issue #${num}: ${issue.title}`,
      ``,
      issue.body || '(no description provided)',
      ``,
      `---`,
      `Instructions:`,
      `- Analyze the codebase to understand the relevant code.`,
      `- Make the minimal necessary changes to address this issue.`,
      `- Follow existing code conventions and patterns.`,
      `- Do not make unrelated changes.`,
      `- If the issue cannot be addressed with code changes, create a brief explanation in ISSUE_NOTES.md.`,
    ].join('\n');

    // Run Claude
    log(`  Running Claude...`);
    const claudeArgs = ['-p', '--dangerously-skip-permissions'];
    const result = spawnSync('claude', claudeArgs, {
      input: prompt,
      cwd: worktreeDir,
      encoding: 'utf8',
      timeout: 10 * 60 * 1000, // 10 minutes
      maxBuffer: 50 * 1024 * 1024,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    if (result.status !== 0) {
      log(`  Claude exited with status ${result.status}`);
      if (result.stderr) log(`  stderr: ${result.stderr.slice(0, 500)}`);
      cleanup(worktreeDir, branch);
      return { success: false, reason: 'claude-failed' };
    }

    const claudeOutput = (result.stdout || '').trim();
    log(`  Claude finished`);

    // Check if any files changed
    const diff = run('git diff --stat', { cwd: worktreeDir, ignoreError: true }) || '';
    const untracked = run('git ls-files --others --exclude-standard', { cwd: worktreeDir, ignoreError: true }) || '';
    const hasChanges = diff.length > 0 || untracked.length > 0;

    if (!hasChanges) {
      log(`  No code changes were made. Skipping PR.`);
      cleanup(worktreeDir, branch);
      return { success: true, reason: 'no-changes' };
    }

    // Commit
    run('git add -A', { cwd: worktreeDir });
    const commitMsgFile = path.join(os.tmpdir(), `issue-watcher-commit-${num}.txt`);
    fs.writeFileSync(commitMsgFile, `fix: address issue #${num}\n\n${issue.title}\n\nAutomated fix generated by issue-watcher using Claude.\n\nCloses #${num}`);
    run(`git commit -F "${commitMsgFile}"`, { cwd: worktreeDir });
    fs.unlinkSync(commitMsgFile);

    // Push
    run(`git push -u origin "${branch}"`, { cwd: worktreeDir, timeout: 60000 });
    log(`  Pushed branch ${branch}`);

    // Create PR
    const prBodyFile = path.join(os.tmpdir(), `issue-watcher-pr-${num}.md`);
    const prBody = [
      `## Summary`,
      ``,
      `Automated PR to address #${num}.`,
      ``,
      `## Claude's Analysis`,
      ``,
      claudeOutput.slice(0, 3000),
      ``,
      `---`,
      `*Generated by [issue-watcher](https://github.com/Fionoble/ai-cli-tools)*`,
    ].join('\n');
    fs.writeFileSync(prBodyFile, prBody);

    const prTitle = `fix: ${issue.title}`.slice(0, 120);
    const prUrl = run(
      `gh pr create --repo ${repo.nameWithOwner} --base "${defaultBranch}" --head "${branch}" --title "${prTitle.replace(/"/g, '\\"')}" --body-file "${prBodyFile}"`,
      { cwd: worktreeDir, timeout: 30000 }
    );
    fs.unlinkSync(prBodyFile);
    log(`  Created PR: ${prUrl}`);

    // Comment on the issue
    const commentFile = path.join(os.tmpdir(), `issue-watcher-comment-${num}.txt`);
    fs.writeFileSync(commentFile, `🤖 A PR has been automatically generated to address this issue: ${prUrl}`);
    run(`gh issue comment ${num} --repo ${repo.nameWithOwner} --body-file "${commentFile}"`);
    fs.unlinkSync(commentFile);
    log(`  Commented on issue #${num}`);

    // Clean up worktree (keep the branch since it's pushed)
    run(`git worktree remove "${worktreeDir}" --force`, { ignoreError: true });

    return { success: true, prUrl };
  } catch (err) {
    log(`  Error processing issue #${num}: ${err.message}`);
    cleanup(worktreeDir, branch);
    return { success: false, reason: err.message };
  }
}

function cleanup(worktreeDir, branch) {
  run(`git worktree remove "${worktreeDir}" --force`, { ignoreError: true });
  run(`git branch -D "${branch}"`, { ignoreError: true });
}

// ---------------------------------------------------------------------------
// Poll loop
// ---------------------------------------------------------------------------

function runCycle(repo, state, opts) {
  let issues;

  if (opts.issue) {
    const issue = fetchIssue(repo.nameWithOwner, opts.issue);
    issues = [issue];
  } else {
    const allIssues = fetchOpenIssues(repo.nameWithOwner, opts.label);
    issues = allIssues.filter(i => !state.processed[i.number]);
  }

  if (issues.length === 0) {
    log('No new issues.');
    return;
  }

  log(`Found ${issues.length} new issue(s)`);

  for (const issue of issues) {
    if (opts.dryRun) {
      log(`  [dry-run] Would process #${issue.number}: ${issue.title}`);
      continue;
    }

    const result = processIssue(repo, issue, repo.defaultBranch);
    state.processed[issue.number] = {
      processedAt: new Date().toISOString(),
      ...result,
    };
    saveState(repo.nameWithOwner, state);
  }
}

function startPolling(opts) {
  checkDependencies();

  const repo = getRepoInfo();
  log(`Watching ${repo.nameWithOwner} (branch: ${repo.defaultBranch})`);
  if (opts.label) log(`Filtering by label: ${opts.label}`);
  if (!opts.once) log(`Polling every ${opts.interval}s${opts.daemonChild ? '' : ' (Ctrl+C to stop)'}`);
  console.log('');

  // If we're the daemon child, write our PID and clean up on exit
  if (opts.daemonChild) {
    writePid(repo.nameWithOwner);
    const cleanupPid = () => removePid(repo.nameWithOwner);
    process.on('exit', cleanupPid);
  }

  // --init: mark all existing issues as processed
  if (opts.init) {
    const state = loadState(repo.nameWithOwner);
    const issues = fetchOpenIssues(repo.nameWithOwner, opts.label);
    for (const issue of issues) {
      state.processed[issue.number] = { processedAt: new Date().toISOString(), reason: 'init-skip' };
    }
    saveState(repo.nameWithOwner, state);
    log(`Marked ${issues.length} existing issue(s) as processed.`);
    return;
  }

  const state = loadState(repo.nameWithOwner);

  runCycle(repo, state, opts);
  if (opts.once) return;

  const timer = setInterval(() => {
    const freshState = loadState(repo.nameWithOwner);
    runCycle(repo, freshState, opts);
  }, opts.interval * 1000);

  // Graceful shutdown
  const shutdown = () => {
    log('Shutting down...');
    clearInterval(timer);
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

// ---------------------------------------------------------------------------
// Skill install/uninstall
// ---------------------------------------------------------------------------

function installSkill() {
  const source = path.join(__dirname, 'skill', 'SKILL.md');
  if (!fs.existsSync(source)) {
    console.error('Error: SKILL.md not found in package. Try reinstalling.');
    process.exit(1);
  }
  fs.mkdirSync(SKILL_DIR, { recursive: true });
  fs.copyFileSync(source, path.join(SKILL_DIR, 'SKILL.md'));
  console.log(`Claude Code skill installed to ${SKILL_DIR}/SKILL.md`);
}

function uninstallSkill() {
  const skillFile = path.join(SKILL_DIR, 'SKILL.md');
  if (fs.existsSync(skillFile)) {
    fs.unlinkSync(skillFile);
    fs.rmdirSync(SKILL_DIR);
    console.log('Claude Code skill removed.');
  } else {
    console.log('Skill not installed, nothing to remove.');
  }
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function printUsage() {
  console.log(`Usage: issue-watcher [options]

Watch a GitHub repo for new issues and use Claude to auto-generate PRs.

Run this from inside the git repo you want to watch. Requires the gh and
claude CLIs to be installed and authenticated.

Options:
  --interval <seconds>   Polling interval (default: ${DEFAULT_INTERVAL})
  --label <label>        Only process issues with this label
  --issue <number>       Process a specific issue number and exit
  --once                 Process new issues once and exit (no polling)
  --init                 Mark all existing open issues as processed (skip them)
  --dry-run              Show what would be processed without acting
  --daemon               Run in the background (logs to ~/.issue-watcher/)
  --stop                 Stop the background daemon for this repo
  --status               Check if a daemon is running for this repo
  --install-skill        Install the Claude Code skill to ~/.claude/skills/
  --uninstall-skill      Remove the Claude Code skill
  -h, --help             Show this help message

Prerequisites:
  gh                     GitHub CLI, authenticated (https://cli.github.com)
  claude                 Claude Code CLI (https://docs.anthropic.com/en/docs/claude-code)

Notes:
  Claude runs with --dangerously-skip-permissions so it can modify files
  autonomously. Each issue is processed in an isolated git worktree.

Examples:
  issue-watcher                          # start watching, poll every 30s
  issue-watcher --daemon                 # run in background
  issue-watcher --status                 # check if daemon is running
  issue-watcher --stop                   # stop background daemon
  issue-watcher --label auto-fix         # only issues labeled "auto-fix"
  issue-watcher --init                   # skip existing issues on first run
  issue-watcher --issue 42               # process just issue #42
  issue-watcher --daemon --label auto-fix # background, filtered by label
`);
}

function parseArgs(argv) {
  const opts = {
    interval: DEFAULT_INTERVAL,
    label: null,
    issue: null,
    once: false,
    init: false,
    dryRun: false,
    daemon: false,
    daemonChild: false,
    stop: false,
    status: false,
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case '--interval':
        opts.interval = parseInt(argv[++i], 10);
        if (isNaN(opts.interval) || opts.interval < 5) {
          console.error('Error: --interval must be >= 5 seconds');
          process.exit(1);
        }
        break;
      case '--label':
        opts.label = argv[++i];
        break;
      case '--issue':
        opts.issue = parseInt(argv[++i], 10);
        if (isNaN(opts.issue)) {
          console.error('Error: --issue must be a number');
          process.exit(1);
        }
        opts.once = true;
        break;
      case '--once':
        opts.once = true;
        break;
      case '--init':
        opts.init = true;
        opts.once = true;
        break;
      case '--dry-run':
        opts.dryRun = true;
        break;
      case '--daemon':
        opts.daemon = true;
        break;
      case '--_daemon-child':
        opts.daemonChild = true;
        break;
      case '--stop':
        opts.stop = true;
        break;
      case '--status':
        opts.status = true;
        break;
      case '--install-skill':
        installSkill();
        process.exit(0);
      case '--uninstall-skill':
        uninstallSkill();
        process.exit(0);
      case '-h':
      case '--help':
        printUsage();
        process.exit(0);
      default:
        console.error(`Unknown option: ${arg}`);
        printUsage();
        process.exit(1);
    }
  }

  return opts;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const opts = parseArgs(process.argv);

if (opts.stop) {
  stopDaemon();
} else if (opts.status) {
  showStatus();
} else if (opts.daemon) {
  launchDaemon(opts);
} else {
  startPolling(opts);
}
