# Results

Compliant = runs that log no personal data, judged by a smaller model on each diff, among runs that added a log line.

## Every setup, Claude Sonnet (`runs-sonnet.jsonl`)

| Condition | Runs | Compliant | Task done | Skill loaded | Median time | Avg cost | Avg turns |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 0-none | 18 | 33% | 100% | 0% | 14s | $0.082 | 5.7 |
| 1-claude-md | 18 | 100% | 100% | 0% | 11s | $0.075 | 5.1 |
| 2-skill | 18 | 94% | 100% | 100% | 14s | $0.089 | 7.8 |
| 3-skill-directive | 18 | 100% | 100% | 100% | 14s | $0.089 | 7.9 |
| 4-inject | 18 | 100% | 100% | 100% | 12s | $0.080 | 7.1 |
| 5-detect | 18 | 100% | 100% | 100% | 16s | $0.098 | 8.3 |
| 6-block | 18 | 100% | 94% | 100% | 14s | $0.097 | 8.2 |

The `6-block` rows come from a second run of that setup, which also records the code of every refused edit (`refusals`). The other setups were run once.

## Per model (`runs-haiku.jsonl`, `runs-opus.jsonl`)

| Model | Without the rule | With the skill (directive description) |
|---|---|---|
| Haiku | 17% | 82% (14 of the 17 runs that added a log line) |
| Sonnet | 33% | 100% |
| Opus | 83% | 100% |

Every diff is in `diffs/<model>/`.
