# Teach by default, enforce by exception, measure to decide

A small example of how to make a coding agent follow a rule, and a benchmark that measures it.

Checks inside the agent (permissions, blocking hooks) are like email validation in an HTML form: useful feedback, not security, because anyone can call the model through another client. This repository shows the alternative on one realistic rule.

## The rule

> Never log personal data (email, name, phone, address, password, tokens, whole user objects). Always use the shared `logger`, with ids only.

## The setup, in three files

| Idea | File | What it does |
|---|---|---|
| **Teach by default** | [`.claude/skills/logging-policy/SKILL.md`](.claude/skills/logging-policy/SKILL.md) | Explains the rule, why it exists and what good looks like. The description says when to load it. |
| | [`.claude/hooks/inject-rule.mjs`](.claude/hooks/inject-rule.mjs) | Adds the rule to the context on every prompt, for the few rules that must always be there. |
| **Enforce by exception** | [`.github/workflows/logging-policy.yml`](.github/workflows/logging-policy.yml) | Runs [`guard/check.mjs`](guard/check.mjs) on every pull request. As a required check, it holds whoever wrote the code. |

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
- The blocking hook refused 11 edits. All 11 were compliant code (`err.name`, `user.address !== address`) flagged by a pattern match. One run gave up after two refusals.

### Per model

The same tasks without the rule and with the skill (directive description), 18 runs each:

| Model | Without the rule | With the skill |
|---|---|---|
| Haiku | 17% | 82% |
| Sonnet | 33% | 100% |
| Opus | 83% | 100% |

Teaching narrows the gap between models. Haiku still leaks a few times with the skill, which is where a detect-and-tell hook and CI earn their place.

## Measure it yourself

The benchmark lives in [`bench/`](bench). It needs Node 22+ and Claude Code, signed in.

```bash
node --test guard/check.test.mjs   # the checker's own tests
node bench/run.mjs --reps 3        # every task under every setup, in fresh copies (--model haiku|sonnet|opus)
node bench/judge.mjs               # a small model reviews each diff
node bench/report.mjs              # the table above
```

Each run uses `--setting-sources project`, so your own plugins, hooks and skills stay out. Every diff is kept in [`bench/results/diffs/`](bench/results/diffs).

## Limits

- One rule, six tasks, three Claude models. Read the numbers as a direction.
- Compliance is judged by a smaller model on each diff. The static checker alone flags too many harmless lines to be used as the grade, which is one of the findings.
