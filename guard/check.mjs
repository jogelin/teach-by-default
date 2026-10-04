// The rule, as code: "never log personal data, always use the shared logger".
// One checker for every place the rule is enforced: the agent hooks, the CI job
// and the benchmark grader. Usage: node guard/check.mjs <file|dir>...
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PII = /\b(email|e?mail|name|fullName|firstName|lastName|phone|address|password|token|ip)\b/i;
// Passing a whole user-like object logs every field. `user.id` and `userId` are fine.
const WHOLE_OBJECT = /\b(user|customer|input|existing|body)\b(?!\s*\.\s*id\b)/;

// Keep only the code of a call's arguments: drop plain string literals and the
// literal parts of template strings, keep `${...}` expressions.
function codeOnly(args) {
  return args
    .replace(/'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"/g, "''")
    .replace(/`(?:\\.|[^`\\])*`/g, (tpl) => (tpl.match(/\$\{[^}]*\}/g) ?? []).join(' '));
}

// Argument text of the call starting at `open` (the index of its "(").
function callArgs(text, open) {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === '(') depth++;
    else if (text[i] === ')' && --depth === 0) return text.slice(open + 1, i);
  }
  return text.slice(open + 1);
}

/** Violations in a piece of source code. */
export function check(source, file = '') {
  const violations = [];
  const line = (index) => source.slice(0, index).split('\n').length;
  if (!file.endsWith('logger.ts')) {
    for (const m of source.matchAll(/\bconsole\.(log|info|warn|error|debug)\s*\(/g)) {
      violations.push({ file, line: line(m.index), rule: 'console', text: m[0] });
    }
  }
  for (const m of source.matchAll(/\b(logger|console)\.(debug|info|warn|error|log)\s*\(/g)) {
    const code = codeOnly(callArgs(source, m.index + m[0].length - 1));
    const hit = code.match(PII) ?? code.match(WHOLE_OBJECT);
    if (hit) violations.push({ file, line: line(m.index), rule: 'pii', text: `${m[0]}… logs "${hit[0]}"` });
  }
  return violations;
}

function files(path) {
  if (statSync(path).isFile()) return [path];
  return readdirSync(path).flatMap((name) => (name === 'node_modules' ? [] : files(join(path, name))));
}

/** Violations in files or directories (only .ts/.js sources). */
export function checkPaths(paths) {
  return paths
    .flatMap(files)
    .filter((f) => /\.(ts|js|mjs)$/.test(f))
    .flatMap((f) => check(readFileSync(f, 'utf8'), f));
}

export const message = (violations) =>
  'Logging policy: never log personal data (email, name, phone, address, password, tokens, whole user objects) ' +
  'and always use the shared `logger` from src/logger.ts with ids only (userId, orderId).\n' +
  violations.map((v) => `- ${v.file}:${v.line} ${v.rule}: ${v.text}`).join('\n');

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const violations = checkPaths(process.argv.slice(2).length ? process.argv.slice(2) : ['src']);
  if (violations.length) {
    console.error(message(violations));
    process.exit(1);
  }
  console.log('Logging policy: OK');
}
