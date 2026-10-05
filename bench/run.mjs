// Runs every task under every condition with headless Claude Code, then grades
// the result with the same checker the hooks and CI use.
// Usage: node bench/run.mjs [--model sonnet] [--scenario clean|long-session|conflicting-comment] [--reps 3] [--concurrency 3] [--conditions 0-none,6-block] [--tasks signup]
// Results go to bench/results/runs-<model>[-<scenario>].jsonl (appended), diffs to bench/results/diffs/<model>[-<scenario>]/.
import { spawn, execFileSync } from 'node:child_process';
import { appendFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { checkPaths } from '../guard/check.mjs';
import { scenarios } from './scenarios.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const { values: opts } = parseArgs({
  options: {
    reps: { type: 'string', default: '3' },
    model: { type: 'string', default: 'sonnet' },
    scenario: { type: 'string', default: 'clean' },
    concurrency: { type: 'string', default: '3' },
    conditions: { type: 'string' },
    tasks: { type: 'string' },
    out: { type: 'string' },
  },
});

const pick = (all, list) => (list ? all.filter((x) => list.split(',').includes(x.id ?? x)) : all);
const conditions = pick(readdirSync(join(root, 'bench/conditions')).filter((c) => /^\d/.test(c)).sort(), opts.conditions);
const tasks = pick(JSON.parse(readFileSync(join(root, 'bench/tasks.json'), 'utf8')), opts.tasks);
const scenario = scenarios[opts.scenario];
if (!scenario) throw new Error(`Unknown scenario ${opts.scenario}: ${Object.keys(scenarios).join(', ')}`);
// Results of the clean scenario keep their original names.
const label = opts.scenario === 'clean' ? opts.model : `${opts.model}-${opts.scenario}`;
const LOG_CALL = /\b(logger|console)\.(debug|info|warn|error|log)\s*\(/g;

const countLogCalls = (dir) =>
  readdirSync(join(dir, 'src'))
    .filter((f) => f !== 'logger.ts')
    .reduce((n, f) => n + (readFileSync(join(dir, 'src', f), 'utf8').match(LOG_CALL) ?? []).length, 0);

function prepare(condition) {
  const dir = mkdtempSync(join(tmpdir(), 'teach-by-default-'));
  cpSync(join(root, 'src'), join(dir, 'src'), { recursive: true });
  cpSync(join(root, 'package.json'), join(dir, 'package.json'));
  cpSync(join(root, 'bench/conditions', condition), dir, { recursive: true, filter: (src) => !src.endsWith('.keep') });
  if (existsSync(join(dir, '.claude/settings.json'))) {
    const hooks = join(dir, '.claude/hooks');
    mkdirSync(hooks, { recursive: true });
    cpSync(join(root, '.claude/hooks'), hooks, { recursive: true });
    cpSync(join(root, 'bench/hooks'), hooks, { recursive: true });
    cpSync(join(root, 'guard/check.mjs'), join(hooks, 'check.mjs'));
  }
  scenario.prepare?.(dir);
  const git = (...args) => execFileSync('git', ['-c', 'user.name=bench', '-c', 'user.email=bench@example.com', ...args], { cwd: dir });
  git('init', '-q');
  git('add', '-A');
  git('commit', '-qm', 'baseline');
  return dir;
}

function claude(dir, prompt, sessionId) {
  const args = [
    '-p', prompt,
    '--model', opts.model,
    '--output-format', 'stream-json', '--verbose',
    // Only the project's own settings: no user plugins, hooks or skills leak into the run.
    '--setting-sources', 'project',
    '--permission-mode', 'acceptEdits',
    '--disallowedTools', 'Bash',
    // Multi-step scenarios resume the same session; single prompts leave no session behind.
    ...(sessionId === undefined ? ['--no-session-persistence'] : sessionId ? ['--resume', sessionId] : []),
    '--max-turns', '20',
  ];
  return new Promise((resolve) => {
    const child = spawn('claude', args, { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] });
    child.on('error', (err) => resolve([{ type: 'result', is_error: true, result: err.message }]));
    let out = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (out += d));
    child.on('close', () => resolve(out.split('\n').flatMap((l) => { try { return [JSON.parse(l)]; } catch { return []; } })));
  });
}

async function runOne(condition, task, rep) {
  const dir = prepare(condition);
  // Earlier steps of a multi-step scenario: same session, then compaction.
  const steps = [...(scenario.warmup ?? []), ...(scenario.compact ? ['/compact'] : [])];
  let sessionId = steps.length ? null : undefined;
  let earlierCost = 0;
  for (const step of steps) {
    const stepEvents = await claude(dir, step, sessionId);
    const stepResult = stepEvents.find((e) => e.type === 'result') ?? {};
    sessionId = stepResult.session_id ?? sessionId;
    earlierCost += stepResult.total_cost_usd ?? 0;
  }
  // Warmup edits are committed: the diff, the count and the judge only see the logging task.
  if (steps.length) {
    execFileSync('git', ['-c', 'user.name=bench', '-c', 'user.email=bench@example.com', 'commit', '-qam', 'warmup', '--allow-empty'], { cwd: dir });
    execFileSync('git', ['-c', 'user.name=bench', '-c', 'user.email=bench@example.com', 'add', '-A'], { cwd: dir });
    execFileSync('git', ['-c', 'user.name=bench', '-c', 'user.email=bench@example.com', 'commit', '-qm', 'warmup files', '--allow-empty'], { cwd: dir });
  }
  const beforeTask = countLogCalls(dir);
  const events = await claude(dir, task.prompt, sessionId);
  const init = events.find((e) => e.type === 'system' && e.subtype === 'init') ?? {};
  const result = events.find((e) => e.type === 'result') ?? {};
  const toolUses = events.flatMap((e) => (e.type === 'assistant' ? e.message.content.filter((c) => c.type === 'tool_use') : []));
  const toolResults = events.flatMap((e) => (e.type === 'user' && Array.isArray(e.message?.content) ? e.message.content.filter((c) => c.type === 'tool_result') : []));
  const violations = checkPaths([join(dir, 'src')]).map((v) => ({ ...v, file: v.file.replace(dir + '/', '') }));
  const logCallsAdded = countLogCalls(dir) - beforeTask;
  const diff = execFileSync('git', ['diff'], { cwd: dir, encoding: 'utf8' });
  const id = `${condition}__${task.id}__${rep}`;
  mkdirSync(join(root, 'bench/results/diffs', label), { recursive: true });
  writeFileSync(join(root, 'bench/results/diffs', label, `${id}.diff`), diff);
  rmSync(dir, { recursive: true, force: true });
  return {
    id,
    condition,
    task: task.id,
    rep,
    model: label,
    scenario: opts.scenario,
    taskDone: logCallsAdded > 0,
    logCallsAdded,
    compliant: violations.length === 0,
    violations,
    skillLoaded: toolUses.some((t) => t.name === 'Skill' && JSON.stringify(t.input).includes('logging-policy')),
    // The code the agent proposed when an edit was refused, to tell real attempts from false alarms.
    refusals: toolResults
      .filter((r) => JSON.stringify(r.content).includes('Logging policy'))
      .map((r) => {
        const input = toolUses.find((t) => t.id === r.tool_use_id)?.input ?? {};
        return input.new_string ?? input.content ?? '';
      }),
    costUsd: result.total_cost_usd == null ? null : result.total_cost_usd + earlierCost,
    durationMs: result.duration_ms ?? null,
    turns: result.num_turns ?? null,
    error: result.is_error ? result.result : null,
    context: { skills: init.skills ?? null, plugins: init.plugins ?? null, model: init.model ?? null },
  };
}

const jobs = conditions.flatMap((c) => tasks.flatMap((t) => Array.from({ length: Number(opts.reps) }, (_, r) => [c, t, r + 1])));
mkdirSync(join(root, 'bench/results'), { recursive: true });
const out = join(root, opts.out ?? `bench/results/runs-${label}.jsonl`);
console.log(`${jobs.length} runs: ${conditions.length} conditions x ${tasks.length} tasks x ${opts.reps} reps, model ${opts.model}, scenario ${opts.scenario}`);

let next = 0;
let done = 0;
async function worker() {
  while (next < jobs.length) {
    const [c, t, r] = jobs[next++];
    const run = await runOne(c, t, r);
    appendFileSync(out, JSON.stringify(run) + '\n');
    done++;
    console.log(`[${done}/${jobs.length}] ${run.id} ${run.error ? 'ERROR ' + run.error : run.compliant ? 'compliant' : 'VIOLATION'} skill=${run.skillLoaded} refused=${run.refusals.length} $${run.costUsd?.toFixed(3)} ${Math.round(run.durationMs / 1000)}s`);
  }
}
await Promise.all(Array.from({ length: Number(opts.concurrency) }, worker));
