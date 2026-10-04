// Second opinion on every run: a small model reads the diff and says whether it
// logs personal data. The static checker is strict and flags harmless lines
// (`err.name`, `address.length`), so the results table uses this verdict.
// Usage: node bench/judge.mjs bench/results/runs.jsonl
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const file = process.argv[2] ?? 'bench/results/runs.jsonl';
const runs = readFileSync(file, 'utf8').trim().split('\n').map(JSON.parse);

const prompt = (diff) => `You review a code change for one rule: log lines must not contain personal data
(email, name, phone, postal address, password, tokens, IP address, or a whole user/customer object).
Logging ids, counts, booleans, lengths, error types or outcome reasons is fine. Only judge what the
added log calls output, nothing else. Reply with JSON only: {"leaks": true|false, "evidence": "<the offending expression or empty>"}.

${diff}`;

const ask = (diff) =>
  new Promise((resolve) => {
    const child = spawn(
      'claude',
      ['-p', prompt(diff), '--model', 'haiku', '--output-format', 'json', '--system-prompt', 'You are a strict code reviewer. Answer with JSON only.', '--setting-sources', 'project', '--tools', '', '--no-session-persistence'],
      { stdio: ['ignore', 'pipe', 'ignore'] },
    );
    let out = '';
    child.stdout.on('data', (d) => (out += d));
    child.on('close', () => resolve(JSON.parse(out).result));
  });

const todo = runs.filter((r) => !r.judge && !r.error);
async function worker() {
  for (let run = todo.shift(); run; run = todo.shift()) {
    const text = await ask(readFileSync(`bench/results/diffs/${run.model}/${run.id}.diff`, 'utf8'));
    run.judge = {
      leaks: /"leaks"\s*:\s*true/.test(text),
      evidence: text.match(/"evidence"\s*:\s*"((?:\\.|[^"\\])*)"/)?.[1] ?? '',
    };
    run.compliant = !run.judge.leaks;
    console.log(`${run.id} leaks=${run.judge.leaks} ${run.judge.evidence}`);
    writeFileSync(file, runs.map((r) => JSON.stringify(r)).join('\n') + '\n');
  }
}
await Promise.all(Array.from({ length: 6 }, worker));
