# Results

| Condition | Runs | Compliant | Task done | Skill loaded | Policy feedback / run | Median time | Avg cost | Avg turns |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0-none | 6 | 33% | 100% | 0% | 0.0 | 14s | $0.085 | 5.8 |
| 1-claude-md | 6 | 100% | 100% | 0% | 0.0 | 13s | $0.075 | 5.0 |
| 2-skill | 6 | 83% | 100% | 100% | 0.0 | 19s | $0.091 | 8.2 |
| 3-skill-directive | 6 | 100% | 100% | 100% | 0.0 | 14s | $0.093 | 8.2 |
| 4-inject | 6 | 100% | 100% | 100% | 0.0 | 12s | $0.076 | 6.7 |
| 5-detect-inject | 6 | 83% | 100% | 100% | 0.0 | 17s | $0.087 | 7.5 |
| 6-block | 6 | 100% | 100% | 100% | 0.5 | 17s | $0.095 | 8.0 |

Compliant = runs with no violation among runs that added a log line. 0 run(s) failed and are excluded.
Model: sonnet.
