# Results

| Condition | Runs | Compliant | Task done | Skill loaded | Median time | Avg cost | Avg turns |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 0-none | 18 | 33% | 100% | 0% | 14s | $0.082 | 5.7 |
| 1-claude-md | 18 | 100% | 100% | 0% | 11s | $0.075 | 5.1 |
| 2-skill | 18 | 94% | 100% | 100% | 14s | $0.089 | 7.8 |
| 3-skill-directive | 18 | 100% | 100% | 100% | 14s | $0.089 | 7.9 |
| 4-inject | 18 | 100% | 100% | 100% | 12s | $0.080 | 7.1 |
| 5-detect-inject | 18 | 100% | 100% | 100% | 16s | $0.098 | 8.3 |
| 6-block | 18 | 100% | 94% | 100% | 14s | $0.097 | 8.2 |

Compliant = runs that log no personal data (LLM judge on each diff), among runs that added a log line. 0 run(s) failed and are excluded.
Model: sonnet.
