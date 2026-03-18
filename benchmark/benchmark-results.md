# MasonryMatrix Benchmark Report

- Benchmark date (start): 2026-03-18T18:41:12.550Z
- Benchmark date (end): 2026-03-18T18:41:19.149Z
- Total wall-clock duration: 6,599 ms
- Node.js: v20.19.0
- V8: 11.3.244.8-node.26
- Seed: 2026
- Root width: 3840
- GC exposed: yes

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
- Free memory: 15.81 GiB (16,973,828,096 bytes)
- RSS: 0.08 GiB (88,711,168 bytes)
- Heap used: 0.02 GiB (24,931,272 bytes)
- Heap total: 0.03 GiB (34,828,288 bytes)

## Machine at end

- Free memory: 14.93 GiB (16,028,651,520 bytes)
- RSS: 1.18 GiB (1,264,697,344 bytes)
- Heap used: 1.07 GiB (1,144,050,608 bytes)
- Heap total: 1.11 GiB (1,196,466,176 bytes)

## Scenario notes

- Timed sections exclude synthetic data generation.
- recreateMatrix measurements exclude base dataset generation and the initial matrix fill.
- appendItems measurements exclude synthetic delta dataset generation and the preload of 1,000,000 items.
- recreateMatrix samples reuse the same prepared matrix for repeated rebuilds.
- appendItems samples prepare a fresh preloaded matrix per sample to keep the starting state stable.

## recreateMatrix

| Operation      | Columns | Base items | Added items | Timed items | Samples | Warmup | Min ms | Median ms | Mean ms |  P95 ms |  Max ms | StdDev ms | Median ops/sec | Median items/sec |
| -------------- | ------: | ---------: | ----------: | ----------: | ------: | -----: | -----: | --------: | ------: | ------: | ------: | --------: | -------------: | ---------------: |
| recreateMatrix |       8 |      1,000 |           0 |       1,000 |       7 |      1 |  0.040 |     0.289 |   0.209 |   0.394 |   0.429 |     0.148 |       3455.425 |        3,455,425 |
| recreateMatrix |      16 |      1,000 |           0 |       1,000 |       7 |      1 |  0.041 |     0.049 |   0.059 |   0.094 |   0.105 |     0.021 |      20449.898 |       20,449,898 |
| recreateMatrix |      32 |      1,000 |           0 |       1,000 |       7 |      1 |  0.050 |     0.059 |   0.067 |   0.108 |   0.127 |     0.025 |      16920.474 |       16,920,474 |
| recreateMatrix |       8 |    100,000 |           0 |     100,000 |       7 |      1 |  3.882 |     4.459 |   4.523 |   5.247 |   5.395 |     0.496 |        224.266 |       22,426,553 |
| recreateMatrix |      16 |    100,000 |           0 |     100,000 |       7 |      1 |  4.434 |     4.524 |   4.780 |   5.242 |   5.266 |     0.355 |        221.038 |       22,103,844 |
| recreateMatrix |      32 |    100,000 |           0 |     100,000 |       7 |      1 |  5.352 |     6.444 |   9.801 |  20.881 |  22.655 |     6.470 |        155.193 |       15,519,275 |
| recreateMatrix |       8 |  1,000,000 |           0 |   1,000,000 |       7 |      1 | 51.833 |    52.855 |  63.225 | 104.167 | 125.730 |    25.524 |         18.920 |       18,919,543 |
| recreateMatrix |      16 |  1,000,000 |           0 |   1,000,000 |       7 |      1 | 54.624 |    56.913 |  67.668 | 111.284 | 133.743 |    27.022 |         17.571 |       17,570,616 |
| recreateMatrix |      32 |  1,000,000 |           0 |   1,000,000 |       7 |      1 | 65.327 |    67.219 |  79.386 | 122.103 | 137.669 |    24.722 |         14.877 |       14,876,813 |

## appendItems

| Operation   | Columns | Base items | Added items | Timed items | Samples | Warmup | Min ms | Median ms | Mean ms | P95 ms | Max ms | StdDev ms | Median ops/sec | Median items/sec |
| ----------- | ------: | ---------: | ----------: | ----------: | ------: | -----: | -----: | --------: | ------: | -----: | -----: | --------: | -------------: | ---------------: |
| appendItems |       8 |  1,000,000 |         100 |         100 |       3 |      1 |  4.802 |     5.128 |   5.088 |  5.315 |  5.336 |     0.220 |        195.027 |           19,503 |
| appendItems |       8 |  1,000,000 |       1,000 |       1,000 |       3 |      1 |  4.960 |     5.118 |   5.272 |  5.675 |  5.737 |     0.335 |        195.393 |          195,393 |
| appendItems |       8 |  1,000,000 |      10,000 |      10,000 |       3 |      1 |  5.739 |     5.916 |   5.971 |  6.223 |  6.257 |     0.215 |        169.027 |        1,690,274 |
| appendItems |      16 |  1,000,000 |         100 |         100 |       3 |      1 |  5.515 |     5.619 |   5.608 |  5.684 |  5.691 |     0.072 |        177.980 |           17,798 |
| appendItems |      16 |  1,000,000 |       1,000 |       1,000 |       3 |      1 |  4.313 |     4.693 |   5.012 |  5.897 |  6.031 |     0.737 |        213.106 |          213,106 |
| appendItems |      16 |  1,000,000 |      10,000 |      10,000 |       3 |      1 |  5.179 |     5.520 |   5.495 |  5.760 |  5.786 |     0.249 |        181.166 |        1,811,660 |
| appendItems |      32 |  1,000,000 |         100 |         100 |       3 |      1 |  4.514 |     4.659 |   4.618 |  4.678 |  4.680 |     0.074 |        214.638 |           21,464 |
| appendItems |      32 |  1,000,000 |       1,000 |       1,000 |       3 |      1 |  5.029 |     5.144 |   5.184 |  5.356 |  5.380 |     0.146 |        194.386 |          194,386 |
| appendItems |      32 |  1,000,000 |      10,000 |      10,000 |       3 |      1 |  4.904 |     5.398 |   5.325 |  5.647 |  5.674 |     0.318 |        185.268 |        1,852,675 |
