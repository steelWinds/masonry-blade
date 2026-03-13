# MasonryMatrix Benchmark Report

- Benchmark date (start): 2026-03-13T12:36:12.112Z
- Benchmark date (end): 2026-03-13T12:36:20.306Z
- Total wall-clock duration: 8,194 ms
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
- Free memory: 13.29 GiB (14,274,899,968 bytes)
- RSS: 0.10 GiB (108,830,720 bytes)
- Heap used: 0.02 GiB (26,764,856 bytes)
- Heap total: 0.04 GiB (38,305,792 bytes)

## Machine at end

- Free memory: 11.62 GiB (12,477,886,464 bytes)
- RSS: 1.76 GiB (1,894,993,920 bytes)
- Heap used: 1.23 GiB (1,319,184,232 bytes)
- Heap total: 1.32 GiB (1,418,022,912 bytes)

## Scenario notes

- Timed sections exclude synthetic data generation.
- recreateMatrix measurements exclude base dataset generation and the initial matrix fill.
- appendItems measurements exclude synthetic delta dataset generation and the preload of 1,000,000 items.
- recreateMatrix samples reuse the same prepared matrix for repeated rebuilds.
- appendItems samples prepare a fresh preloaded matrix per sample to keep the starting state stable.

## recreateMatrix

| Operation      | Columns | Base items | Added items | Timed items | Samples | Warmup | Min ms | Median ms | Mean ms |  P95 ms |  Max ms | StdDev ms | Median ops/sec | Median items/sec |
| -------------- | ------: | ---------: | ----------: | ----------: | ------: | -----: | -----: | --------: | ------: | ------: | ------: | --------: | -------------: | ---------------: |
| recreateMatrix |       8 |      1,000 |           0 |       1,000 |       7 |      1 |  0.032 |     0.034 |   0.044 |   0.073 |   0.077 |     0.017 |      29761.905 |       29,761,905 |
| recreateMatrix |      16 |      1,000 |           0 |       1,000 |       7 |      1 |  0.029 |     0.036 |   0.035 |   0.040 |   0.040 |     0.004 |      28089.888 |       28,089,888 |
| recreateMatrix |      32 |      1,000 |           0 |       1,000 |       7 |      1 |  0.043 |     0.051 |   0.052 |   0.063 |   0.063 |     0.008 |      19531.250 |       19,531,250 |
| recreateMatrix |       8 |    100,000 |           0 |     100,000 |       7 |      1 |  2.562 |     3.554 |   3.289 |   3.938 |   3.950 |     0.610 |        281.381 |       28,138,102 |
| recreateMatrix |      16 |    100,000 |           0 |     100,000 |       7 |      1 |  2.963 |     3.005 |   3.020 |   3.141 |   3.179 |     0.071 |        332.768 |       33,276,763 |
| recreateMatrix |      32 |    100,000 |           0 |     100,000 |       7 |      1 |  3.719 |     3.796 |   3.817 |   3.935 |   3.949 |     0.075 |        263.463 |       26,346,296 |
| recreateMatrix |       8 |  1,000,000 |           0 |   1,000,000 |       7 |      1 | 71.668 |    77.009 |  82.037 |  93.888 |  95.016 |     9.296 |         12.986 |       12,985,512 |
| recreateMatrix |      16 |  1,000,000 |           0 |   1,000,000 |       7 |      1 | 53.092 |    67.351 |  72.659 |  97.839 | 101.569 |    15.922 |         14.848 |       14,847,589 |
| recreateMatrix |      32 |  1,000,000 |           0 |   1,000,000 |       7 |      1 | 97.313 |   113.639 | 113.587 | 125.833 | 125.978 |     9.802 |          8.800 |        8,799,780 |

## appendItems

| Operation   | Columns | Base items | Added items | Timed items | Samples | Warmup | Min ms | Median ms | Mean ms | P95 ms | Max ms | StdDev ms | Median ops/sec | Median items/sec |
| ----------- | ------: | ---------: | ----------: | ----------: | ------: | -----: | -----: | --------: | ------: | -----: | -----: | --------: | -------------: | ---------------: |
| appendItems |       8 |  1,000,000 |         100 |         100 |       3 |      1 |  2.642 |     2.734 |   2.770 |  2.916 |  2.936 |     0.123 |        365.805 |           36,580 |
| appendItems |       8 |  1,000,000 |       1,000 |       1,000 |       3 |      1 |  2.668 |     2.957 |   5.332 |  9.631 | 10.372 |     3.566 |        338.146 |          338,146 |
| appendItems |       8 |  1,000,000 |      10,000 |      10,000 |       3 |      1 |  2.977 |     2.996 |   3.055 |  3.173 |  3.193 |     0.098 |        333.734 |        3,337,338 |
| appendItems |      16 |  1,000,000 |         100 |         100 |       3 |      1 |  2.464 |     2.744 |   2.658 |  2.765 |  2.767 |     0.138 |        364.458 |           36,446 |
| appendItems |      16 |  1,000,000 |       1,000 |       1,000 |       3 |      1 |  2.503 |     2.542 |   3.334 |  4.716 |  4.958 |     1.148 |        393.422 |          393,422 |
| appendItems |      16 |  1,000,000 |      10,000 |      10,000 |       3 |      1 |  2.760 |     2.779 |   2.844 |  2.972 |  2.993 |     0.106 |        359.803 |        3,598,028 |
| appendItems |      32 |  1,000,000 |         100 |         100 |       3 |      1 |  2.559 |     2.573 |   2.651 |  2.796 |  2.821 |     0.120 |        388.712 |           38,871 |
| appendItems |      32 |  1,000,000 |       1,000 |       1,000 |       3 |      1 |  2.599 |     2.623 |   2.677 |  2.790 |  2.809 |     0.094 |        381.170 |          381,170 |
| appendItems |      32 |  1,000,000 |      10,000 |      10,000 |       3 |      1 |  2.829 |     2.902 |   2.910 |  2.988 |  2.998 |     0.069 |        344.602 |        3,446,018 |
