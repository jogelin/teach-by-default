// PostToolUse: check the file the agent just edited and, on a violation, tell
// the model what is wrong. It never blocks (the security-guidance model).
import { existsSync, readFileSync } from 'node:fs';
import { checkPaths, message } from './check.mjs';

const event = JSON.parse(readFileSync(0, 'utf8'));
const file = event.tool_input?.file_path;
const violations = file && existsSync(file) ? checkPaths([file]) : [];
if (violations.length) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: `${message(violations)}\nFix these log lines.` },
    }),
  );
}
