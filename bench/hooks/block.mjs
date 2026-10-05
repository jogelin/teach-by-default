// PreToolUse: refuse an edit that would add a violating log line.
import { readFileSync } from 'node:fs';
import { check, message } from './check.mjs';

const event = JSON.parse(readFileSync(0, 'utf8'));
const input = event.tool_input ?? {};
const proposed = input.content ?? input.new_string ?? '';
const violations = check(proposed, input.file_path ?? '');
if (violations.length) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: message(violations) },
    }),
  );
}
