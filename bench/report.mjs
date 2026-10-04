// Summarizes results/runs.jsonl into one table per condition.
// Usage: node bench/report.mjs [results/runs.jsonl]
import { readFileSync, writeFileSync } from 'node:fs';

const file = process.argv[2] ?? 'results/runs.jsonl';
const runs = readFileSync(file, 'utf8').trim().split('\n').map(JSON.parse).filter((r) => !r.error);
const errors = readFileSync(file, 'utf8').trim().split('\n').map(JSON.parse).filter((r) => r.error).length;

const pct = (n, d) => (d ? `${Math.round((100 * n) / d)}%` : '-');
const avg = (xs) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : 0;
};

const byCondition = Map.groupBy(runs, (r) => r.condition);
const rows = [...byCondition.keys()].sort().map((c) => {
  const rs = byCondition.get(c);
  const done = rs.filter((r) => r.taskDone);
  return [
    c,
    rs.length,
    pct(done.filter((r) => r.compliant).length, done.length),
    pct(done.length, rs.length),
    pct(rs.filter((r) => r.skillLoaded).length, rs.length),
    avg(rs.map((r) => r.blocked)).toFixed(1),
    `${Math.round(median(rs.map((r) => r.durationMs)) / 1000)}s`,
    `$${avg(rs.map((r) => r.costUsd)).toFixed(3)}`,
    avg(rs.map((r) => r.turns)).toFixed(1),
  ];
});

const header = ['Condition', 'Runs', 'Compliant', 'Task done', 'Skill loaded', 'Policy feedback / run', 'Median time', 'Avg cost', 'Avg turns'];
const table = [header, header.map(() => '---'), ...rows].map((r) => `| ${r.join(' | ')} |`).join('\n');
const notes = [
  `Compliant = runs with no violation among runs that added a log line. ${errors} run(s) failed and are excluded.`,
  `Model: ${[...new Set(runs.map((r) => r.model))].join(', ')}.`,
].join('\n');

writeFileSync('results/README.md', `# Results\n\n${table}\n\n${notes}\n`);
console.log(`${table}\n\n${notes}`);
