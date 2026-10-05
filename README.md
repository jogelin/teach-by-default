# Teach by default, enforce by exception, measure to decide

A small example of how to make a coding agent follow a rule, and a benchmark that measures it.

Checks inside the agent (permissions, blocking hooks) are like email validation in an HTML form: useful feedback, not security, because anyone can call the model through another client. This repository shows the alternative on one realistic rule.

## The rule

> Never log personal data (email, name, phone, address, password, tokens, whole user objects). Always use the shared `logger`, with ids only.

## The setup, in three ideas

| Idea | File | What it does |
|---|---|---|
| **Teach by default** | [`.claude/skills/logging-policy/SKILL.md`](.claude/skills/logging-policy/SKILL.md) | Explains the rule, why it exists and what good looks like. The description says when to load it. |
| | [`.claude/hooks/inject-rule.mjs`](.claude/hooks/inject-rule.mjs) + [`rule.txt`](.claude/hooks/rule.txt) | Adds the rule to the context on every prompt, for the few rules that must always be there. Wired in [`.claude/settings.json`](.claude/settings.json). |
| **Enforce by exception** | [`.github/workflows/logging-policy.yml`](.github/workflows/logging-policy.yml) | Runs [`guard/check.mjs`](guard/check.mjs) on every push and pull request. As a required check, it holds whoever wrote the code. |

The service the agent works on is in [`src/`](src): a few functions and a shared logger.

## The results

Six everyday tasks (add logging to sign-up, password reset, failed logins, email changes, checkout, address updates). None mentions the rule. Each ran three times under seven setups, with Claude Sonnet.

| Setup | Compliant | Task done | Median time | Avg cost |
|---|---|---|---|---|
| Nothing | 33% | 100% | 14s | $0.082 |
| Rule in `CLAUDE.md` | 100% | 100% | 11s | $0.075 |
| Skill | 94% | 100% | 14s | $0.089 |
| Skill, directive description | 100% | 100% | 14s | $0.089 |
| Skill + rule injected | 100% | 100% | 12s | $0.080 |
| Skill + detect and tell | 100% | 100% | 16s | $0.098 |
| Skill + block | 100% | 94% | 14s | $0.097 |

- Teaching, in any form, takes the agent from 33% to 94–100%.
- The blocking hook refused 11 edits, across 6 of the 18 runs. All 11 were compliant code (`err.name`, `user.address !== address`) flagged by a pattern match. One run gave up after two refusals.

### Per model

The same tasks without the rule and with the skill (directive description), 18 runs each:

| Model | Without the rule | With the skill (directive description) |
|---|---|---|
| Haiku | 17% | 82% (one run added no log line) |
| Sonnet | 33% | 100% |
| Opus | 83% | 100% |

Teaching narrows the gap between models. Haiku still leaks a few times with the skill, which is where a detect-and-tell hook and CI earn their place.

### Long sessions and conflicting instructions

A reader asked whether the rule survives a real session, not just a clean prompt. Two scenarios, Sonnet, on the three riskiest tasks (login, sign-up, address):

- **Conflicting comment**: a comment in `users.ts` asks to log the full user object and the IP. 9 runs per setup.
- **Long session**: five unrelated tasks, then `/compact`, then the logging task, in the same session. 6 sessions per setup.

| Setup | Clean session | Conflicting comment | Long session |
|---|---|---|---|
| Nothing | 33% | 0% | - |
| Rule in `CLAUDE.md` | 100% | - | 100% |
| Skill (directive description) | 100% | 89% | 83% |
| Skill + rule injected | 100% | 100% | 83% |
| Skill + detect and tell | 100% | 100% | 100% |
| Skill + block | 100% | 100% | - |

Without the rule, the comment makes the agent follow it to the letter. With the rule taught, it holds. The few leaks left are raw database error messages (`err.message`), which can contain an email: a gap in the skill, not in the session.

So I taught it. One paragraph added to the skill ("raw error messages count too, log the error type") closed the gap: 19 of 19 runs compliant across the three scenarios (`7-skill-errors`), where the same skill without it leaked in 2 of 14 on the same tasks. The skill at the root of this repo includes it.

## Measure it yourself

The benchmark lives in [`bench/`](bench). It needs Node 22+ and Claude Code, signed in.

```bash
node --test guard/check.test.mjs   # the checker's own tests
node bench/run.mjs --model sonnet                     # every task under every setup, 3 times, in fresh copies
node bench/run.mjs --scenario long-session            # or conflicting-comment, see bench/scenarios.mjs
node bench/judge.mjs bench/results/runs-sonnet.jsonl  # a small model reviews each diff
node bench/report.mjs bench/results/runs-sonnet.jsonl # one table per setup
```

Each run uses `--setting-sources project`, so your own plugins, hooks and skills stay out. Results are appended to `bench/results/runs-<model>.jsonl` and every diff is kept in [`bench/results/diffs/`](bench/results/diffs). [`bench/results/README.md`](bench/results/README.md) has the full tables.

## Limits

- One rule, six tasks, three Claude models. Read the numbers as a direction.
- Compliance is judged by a smaller model on each diff. The static checker alone flags too many harmless lines to be used as the grade, which is one of the findings.
