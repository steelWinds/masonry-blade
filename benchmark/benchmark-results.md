# MasonryMatrix Benchmark Report

- Benchmark date (start): 2026-03-15T05:58:31.463Z
- Benchmark date (end): 2026-03-15T05:58:41.046Z
- Total wall-clock duration: 9,583 ms
- Node.js: v24.13.1
- V8: 13.6.233.17-node.40
- Seed: 2026
- Root width: 3840
- GC exposed: no

## Benchmark configuration

- recreateMatrix samples per scenario: 7
- appendItems samples per scenario: 3
- Warmup iterations per scenario: 1
- recreateMatrix columns: 8, 16, 32
- recreateMatrix item counts: 1,000, 100,000, 1,000,000
- appendItems columns: 8, 16, 32
- appendItems base items: 1,000,000
- appendItems delta counts: 100, 1,000, 10,000

## Machine at start

- Hostname: nuphy
- Platform: win32
- Release: 10.0.26200
- Architecture: x64
- CPU count: 20
- CPU model: 13th Gen Intel(R) Core(TM) i5-13500
- Load average (1m, 5m, 15m): 0.00, 0.00, 0.00
- Total memory: 31.73 GiB (34,064,785,408 bytes)
- Free memory: 15.79 GiB (16,953,176,064 bytes)
- RSS: 0.10 GiB (103,911,424 bytes)
- Heap used: 0.02 GiB (24,468,072 bytes)
- Heap total: 0.04 GiB (37,781,504 bytes)

## Machine at end

- Free memory: 14.01 GiB (15,039,197,184 bytes)
- RSS: 1.89 GiB (2,032,902,144 bytes)
- Heap used: 1.51 GiB (1,622,508,880 bytes)
- Heap total: 1.61 GiB (1,727,545,344 bytes)

## Scenario notes

- Timed sections exclude synthetic data generation.
- recreateMatrix measurements exclude base dataset generation and the initial matrix fill.
- appendItems measurements exclude synthetic delta dataset generation and the preload of 1,000,000 items.
- recreateMatrix samples reuse the same prepared matrix for repeated rebuilds.
- appendItems samples prepare a fresh preloaded matrix per sample to keep the starting state stable.

## recreateMatrix

| Operation      | Columns | Base items | Added items | Timed items | Samples | Warmup |  Min ms | Median ms | Mean ms |  P95 ms |  Max ms | StdDev ms | Median ops/sec | Median items/sec |
| -------------- | ------: | ---------: | ----------: | ----------: | ------: | -----: | ------: | --------: | ------: | ------: | ------: | --------: | -------------: | ---------------: |
| recreateMatrix |       8 |      1,000 |           0 |       1,000 |       7 |      1 |   0.021 |     0.023 |   0.031 |   0.059 |   0.069 |     0.016 |      42918.455 |       42,918,455 |
| recreateMatrix |      16 |      1,000 |           0 |       1,000 |       7 |      1 |   0.022 |     0.027 |   0.027 |   0.035 |   0.037 |     0.005 |      36900.369 |       36,900,369 |
| recreateMatrix |      32 |      1,000 |           0 |       1,000 |       7 |      1 |   0.059 |     0.062 |   0.064 |   0.072 |   0.072 |     0.005 |      16181.230 |       16,181,230 |
| recreateMatrix |       8 |    100,000 |           0 |     100,000 |       7 |      1 |   2.389 |     4.849 |   5.174 |   8.271 |   9.018 |     1.968 |        206.211 |       20,621,108 |
| recreateMatrix |      16 |    100,000 |           0 |     100,000 |       7 |      1 |   2.776 |     2.946 |   3.321 |   4.059 |   4.113 |     0.543 |        339.443 |       33,944,331 |
| recreateMatrix |      32 |    100,000 |           0 |     100,000 |       7 |      1 |   3.545 |     3.574 |   3.591 |   3.668 |   3.692 |     0.046 |        279.767 |       27,976,723 |
| recreateMatrix |       8 |  1,000,000 |           0 |   1,000,000 |       7 |      1 |  74.615 |    93.152 |  97.785 | 124.140 | 132.044 |    16.474 |         10.735 |       10,735,154 |
| recreateMatrix |      16 |  1,000,000 |           0 |   1,000,000 |       7 |      1 | 104.054 |   107.063 | 107.824 | 113.220 | 114.461 |     3.314 |          9.340 |        9,340,286 |
| recreateMatrix |      32 |  1,000,000 |           0 |   1,000,000 |       7 |      1 | 100.044 |   109.504 | 108.584 | 118.841 | 120.919 |     7.200 |          9.132 |        9,132,078 |

## appendItems

| Operation   | Columns | Base items | Added items | Timed items | Samples | Warmup | Min ms | Median ms | Mean ms | P95 ms | Max ms | StdDev ms | Median ops/sec | Median items/sec |
| ----------- | ------: | ---------: | ----------: | ----------: | ------: | -----: | -----: | --------: | ------: | -----: | -----: | --------: | -------------: | ---------------: |
| appendItems |       8 |  1,000,000 |         100 |         100 |       3 |      1 |  2.646 |     3.180 |   6.535 | 12.720 | 13.780 |     5.127 |        314.465 |           31,447 |
| appendItems |       8 |  1,000,000 |       1,000 |       1,000 |       3 |      1 |  3.569 |     3.628 |   3.623 |  3.667 |  3.671 |     0.042 |        275.619 |          275,619 |
| appendItems |       8 |  1,000,000 |      10,000 |      10,000 |       3 |      1 |  2.851 |     3.715 |   4.436 |  6.439 |  6.742 |     1.668 |        269.165 |        2,691,645 |
| appendItems |      16 |  1,000,000 |         100 |         100 |       3 |      1 |  2.846 |     3.043 |   2.987 |  3.068 |  3.071 |     0.100 |        328.601 |           32,860 |
| appendItems |      16 |  1,000,000 |       1,000 |       1,000 |       3 |      1 |  2.854 |     3.090 |   3.135 |  3.424 |  3.461 |     0.250 |        323.593 |          323,593 |
| appendItems |      16 |  1,000,000 |      10,000 |      10,000 |       3 |      1 |  2.851 |     2.857 |   2.865 |  2.885 |  2.888 |     0.017 |        350.067 |        3,500,665 |
| appendItems |      32 |  1,000,000 |         100 |         100 |       3 |      1 |  2.467 |     2.646 |   5.673 | 10.979 | 11.905 |     4.408 |        377.943 |           37,794 |
| appendItems |      32 |  1,000,000 |       1,000 |       1,000 |       3 |      1 |  2.689 |     2.765 |   2.751 |  2.796 |  2.800 |     0.047 |        361.611 |          361,611 |
| appendItems |      32 |  1,000,000 |      10,000 |      10,000 |       3 |      1 |  2.955 |     3.037 |   3.011 |  3.042 |  3.042 |     0.040 |        329.251 |        3,292,506 |
