// UserPromptSubmit: put the rule in the model's context on every prompt.
import { readFileSync } from 'node:fs';

const rule = readFileSync(new URL('./rule.txt', import.meta.url), 'utf8').trim();
process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext: `Logging policy for this repository: ${rule}` },
  }),
);
