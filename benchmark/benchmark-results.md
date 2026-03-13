# MasonryMatrix Benchmark Report

- Benchmark date (start): 2026-03-13T15:08:34.992Z
- Benchmark date (end): 2026-03-13T15:08:43.202Z
- Total wall-clock duration: 8,210 ms
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
- Free memory: 14.58 GiB (15,660,044,288 bytes)
- RSS: 0.10 GiB (103,698,432 bytes)
- Heap used: 0.02 GiB (24,497,360 bytes)
- Heap total: 0.04 GiB (37,781,504 bytes)

## Machine at end

- Free memory: 13.23 GiB (14,203,809,792 bytes)
- RSS: 1.45 GiB (1,560,649,728 bytes)
- Heap used: 0.52 GiB (555,610,776 bytes)
- Heap total: 0.90 GiB (967,802,880 bytes)

## Scenario notes

- Timed sections exclude synthetic data generation.
- recreateMatrix measurements exclude base dataset generation and the initial matrix fill.
- appendItems measurements exclude synthetic delta dataset generation and the preload of 1,000,000 items.
- recreateMatrix samples reuse the same prepared matrix for repeated rebuilds.
- appendItems samples prepare a fresh preloaded matrix per sample to keep the starting state stable.

## recreateMatrix

| Operation      | Columns | Base items | Added items | Timed items | Samples | Warmup | Min ms | Median ms | Mean ms |  P95 ms |  Max ms | StdDev ms | Median ops/sec | Median items/sec |
| -------------- | ------: | ---------: | ----------: | ----------: | ------: | -----: | -----: | --------: | ------: | ------: | ------: | --------: | -------------: | ---------------: |
| recreateMatrix |       8 |      1,000 |           0 |       1,000 |       7 |      1 |  0.020 |     0.027 |   0.033 |   0.053 |   0.058 |     0.012 |      37037.037 |       37,037,037 |
| recreateMatrix |      16 |      1,000 |           0 |       1,000 |       7 |      1 |  0.037 |     0.040 |   0.042 |   0.053 |   0.058 |     0.007 |      25252.525 |       25,252,525 |
| recreateMatrix |      32 |      1,000 |           0 |       1,000 |       7 |      1 |  0.053 |     0.055 |   0.058 |   0.069 |   0.074 |     0.007 |      18148.820 |       18,148,820 |
| recreateMatrix |       8 |    100,000 |           0 |     100,000 |       7 |      1 |  2.560 |     4.574 |   4.199 |   4.928 |   5.022 |     0.786 |        218.632 |       21,863,180 |
| recreateMatrix |      16 |    100,000 |           0 |     100,000 |       7 |      1 |  2.630 |     2.669 |   2.679 |   2.728 |   2.736 |     0.035 |        374.672 |       37,467,216 |
| recreateMatrix |      32 |    100,000 |           0 |     100,000 |       7 |      1 |  3.432 |     4.573 |   4.248 |   5.012 |   5.129 |     0.636 |        218.675 |       21,867,483 |
| recreateMatrix |       8 |  1,000,000 |           0 |   1,000,000 |       7 |      1 | 29.905 |    66.711 |  64.521 |  89.235 |  95.013 |    18.655 |         14.990 |       14,990,032 |
| recreateMatrix |      16 |  1,000,000 |           0 |   1,000,000 |       7 |      1 | 30.537 |    85.665 |  68.851 |  95.688 |  98.685 |    25.288 |         11.673 |       11,673,324 |
| recreateMatrix |      32 |  1,000,000 |           0 |   1,000,000 |       7 |      1 | 57.066 |    58.558 |  68.059 | 106.289 | 126.396 |    23.825 |         17.077 |       17,077,086 |

## appendItems

| Operation   | Columns | Base items | Added items | Timed items | Samples | Warmup | Min ms | Median ms | Mean ms | P95 ms | Max ms | StdDev ms | Median ops/sec | Median items/sec |
| ----------- | ------: | ---------: | ----------: | ----------: | ------: | -----: | -----: | --------: | ------: | -----: | -----: | --------: | -------------: | ---------------: |
| appendItems |       8 |  1,000,000 |         100 |         100 |       3 |      1 |  2.498 |     2.623 |   2.641 |  2.784 |  2.802 |     0.125 |        381.243 |           38,124 |
| appendItems |       8 |  1,000,000 |       1,000 |       1,000 |       3 |      1 |  2.521 |     2.632 |   2.602 |  2.652 |  2.654 |     0.058 |        379.997 |          379,997 |
| appendItems |       8 |  1,000,000 |      10,000 |      10,000 |       3 |      1 |  2.708 |     2.754 |   2.746 |  2.772 |  2.774 |     0.028 |        363.069 |        3,630,687 |
| appendItems |      16 |  1,000,000 |         100 |         100 |       3 |      1 |  2.588 |     2.641 |   5.887 | 11.453 | 12.432 |     4.628 |        378.630 |           37,863 |
| appendItems |      16 |  1,000,000 |       1,000 |       1,000 |       3 |      1 |  2.610 |     2.637 |   2.649 |  2.692 |  2.698 |     0.037 |        379.190 |          379,190 |
| appendItems |      16 |  1,000,000 |      10,000 |      10,000 |       3 |      1 |  2.842 |     2.980 |   2.952 |  3.028 |  3.033 |     0.081 |        335.627 |        3,356,268 |
| appendItems |      32 |  1,000,000 |         100 |         100 |       3 |      1 |  2.533 |     2.560 |   2.616 |  2.734 |  2.753 |     0.098 |        390.564 |           39,056 |
| appendItems |      32 |  1,000,000 |       1,000 |       1,000 |       3 |      1 |  2.576 |     2.619 |   2.637 |  2.706 |  2.715 |     0.058 |        381.840 |          381,840 |
| appendItems |      32 |  1,000,000 |      10,000 |      10,000 |       3 |      1 |  2.922 |     2.986 |   5.618 | 10.151 | 10.947 |     3.768 |        334.919 |        3,349,186 |
