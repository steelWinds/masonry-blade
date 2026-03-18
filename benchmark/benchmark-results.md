# MasonryMatrix Benchmark Report

- Benchmark date (start): 2026-03-18T13:04:54.474Z
- Benchmark date (end): 2026-03-18T13:05:05.439Z
- Total wall-clock duration: 10,965 ms
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
- Free memory: 15.52 GiB (16,666,828,800 bytes)
- RSS: 0.10 GiB (102,338,560 bytes)
- Heap used: 0.02 GiB (26,741,744 bytes)
- Heap total: 0.04 GiB (38,567,936 bytes)

## Machine at end

- Free memory: 13.51 GiB (14,507,872,256 bytes)
- RSS: 2.07 GiB (2,222,346,240 bytes)
- Heap used: 1.24 GiB (1,327,284,792 bytes)
- Heap total: 1.34 GiB (1,439,977,472 bytes)

## Scenario notes

- Timed sections exclude synthetic data generation.
- recreateMatrix measurements exclude base dataset generation and the initial matrix fill.
- appendItems measurements exclude synthetic delta dataset generation and the preload of 1,000,000 items.
- recreateMatrix samples reuse the same prepared matrix for repeated rebuilds.
- appendItems samples prepare a fresh preloaded matrix per sample to keep the starting state stable.

## recreateMatrix

| Operation      | Columns | Base items | Added items | Timed items | Samples | Warmup |  Min ms | Median ms | Mean ms |  P95 ms |  Max ms | StdDev ms | Median ops/sec | Median items/sec |
| -------------- | ------: | ---------: | ----------: | ----------: | ------: | -----: | ------: | --------: | ------: | ------: | ------: | --------: | -------------: | ---------------: |
| recreateMatrix |       8 |      1,000 |           0 |       1,000 |       7 |      1 |   0.038 |     0.059 |   0.059 |   0.084 |   0.086 |     0.017 |      17064.846 |       17,064,846 |
| recreateMatrix |      16 |      1,000 |           0 |       1,000 |       7 |      1 |   0.040 |     0.050 |   0.052 |   0.063 |   0.065 |     0.008 |      19801.980 |       19,801,980 |
| recreateMatrix |      32 |      1,000 |           0 |       1,000 |       7 |      1 |   0.053 |     0.059 |   0.064 |   0.084 |   0.090 |     0.012 |      17006.803 |       17,006,803 |
| recreateMatrix |       8 |    100,000 |           0 |     100,000 |       7 |      1 |   2.841 |     2.905 |   3.235 |   4.475 |   5.036 |     0.742 |        344.258 |       34,425,778 |
| recreateMatrix |      16 |    100,000 |           0 |     100,000 |       7 |      1 |   3.266 |     3.288 |   3.320 |   3.459 |   3.512 |     0.081 |        304.118 |       30,411,775 |
| recreateMatrix |      32 |    100,000 |           0 |     100,000 |       7 |      1 |   4.178 |     4.268 |   4.305 |   4.451 |   4.465 |     0.095 |        234.313 |       23,431,276 |
| recreateMatrix |       8 |  1,000,000 |           0 |   1,000,000 |       7 |      1 | 101.891 |   107.871 | 115.992 | 151.035 | 167.766 |    21.417 |          9.270 |        9,270,349 |
| recreateMatrix |      16 |  1,000,000 |           0 |   1,000,000 |       7 |      1 | 102.062 |   107.740 | 110.643 | 123.545 | 127.180 |     7.834 |          9.282 |        9,281,612 |
| recreateMatrix |      32 |  1,000,000 |           0 |   1,000,000 |       7 |      1 | 126.113 |   130.726 | 131.467 | 141.374 | 145.323 |     6.022 |          7.650 |        7,649,570 |

## appendItems

| Operation   | Columns | Base items | Added items | Timed items | Samples | Warmup | Min ms | Median ms | Mean ms | P95 ms | Max ms | StdDev ms | Median ops/sec | Median items/sec |
| ----------- | ------: | ---------: | ----------: | ----------: | ------: | -----: | -----: | --------: | ------: | -----: | -----: | --------: | -------------: | ---------------: |
| appendItems |       8 |  1,000,000 |         100 |         100 |       3 |      1 |  2.654 |     3.172 |   3.029 |  3.252 |  3.261 |     0.268 |        315.278 |           31,528 |
| appendItems |       8 |  1,000,000 |       1,000 |       1,000 |       3 |      1 |  2.715 |     3.047 |   3.038 |  3.322 |  3.353 |     0.260 |        328.224 |          328,224 |
| appendItems |       8 |  1,000,000 |      10,000 |      10,000 |       3 |      1 |  2.878 |     3.569 |   7.880 | 15.832 | 17.194 |     6.592 |        280.175 |        2,801,748 |
| appendItems |      16 |  1,000,000 |         100 |         100 |       3 |      1 |  2.633 |     2.766 |   2.756 |  2.859 |  2.869 |     0.097 |        361.481 |           36,148 |
| appendItems |      16 |  1,000,000 |       1,000 |       1,000 |       3 |      1 |  3.351 |     3.372 |   3.444 |  3.586 |  3.609 |     0.117 |        296.604 |          296,604 |
| appendItems |      16 |  1,000,000 |      10,000 |      10,000 |       3 |      1 |  2.906 |     3.220 |   4.543 |  7.076 |  7.504 |     2.098 |        310.588 |        3,105,879 |
| appendItems |      32 |  1,000,000 |         100 |         100 |       3 |      1 |  2.527 |     2.581 |   2.570 |  2.601 |  2.603 |     0.032 |        387.402 |           38,740 |
| appendItems |      32 |  1,000,000 |       1,000 |       1,000 |       3 |      1 |  2.631 |     2.661 |   3.520 |  5.009 |  5.270 |     1.237 |        375.841 |          375,841 |
| appendItems |      32 |  1,000,000 |      10,000 |      10,000 |       3 |      1 |  2.983 |     3.191 |   3.170 |  3.321 |  3.336 |     0.145 |        313.430 |        3,134,305 |
