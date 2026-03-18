# MasonryMatrix Benchmark Report

- Benchmark date (start): 2026-03-18T10:45:18.380Z
- Benchmark date (end): 2026-03-18T10:45:33.214Z
- Total wall-clock duration: 14,834 ms
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
- Free memory: 16.25 GiB (17,446,891,520 bytes)
- RSS: 0.10 GiB (103,264,256 bytes)
- Heap used: 0.02 GiB (24,208,752 bytes)
- Heap total: 0.04 GiB (38,567,936 bytes)

## Machine at end

- Free memory: 14.21 GiB (15,262,027,776 bytes)
- RSS: 1.98 GiB (2,122,047,488 bytes)
- Heap used: 1.03 GiB (1,102,795,472 bytes)
- Heap total: 1.13 GiB (1,215,631,360 bytes)

## Scenario notes

- Timed sections exclude synthetic data generation.
- recreateMatrix measurements exclude base dataset generation and the initial matrix fill.
- appendItems measurements exclude synthetic delta dataset generation and the preload of 1,000,000 items.
- recreateMatrix samples reuse the same prepared matrix for repeated rebuilds.
- appendItems samples prepare a fresh preloaded matrix per sample to keep the starting state stable.

## recreateMatrix

| Operation      | Columns | Base items | Added items | Timed items | Samples | Warmup |  Min ms | Median ms | Mean ms |  P95 ms |  Max ms | StdDev ms | Median ops/sec | Median items/sec |
| -------------- | ------: | ---------: | ----------: | ----------: | ------: | -----: | ------: | --------: | ------: | ------: | ------: | --------: | -------------: | ---------------: |
| recreateMatrix |       8 |      1,000 |           0 |       1,000 |       7 |      1 |   0.049 |     0.060 |   0.068 |   0.098 |   0.099 |     0.019 |      16694.491 |       16,694,491 |
| recreateMatrix |      16 |      1,000 |           0 |       1,000 |       7 |      1 |   0.059 |     0.087 |   0.100 |   0.170 |   0.192 |     0.042 |      11467.890 |       11,467,890 |
| recreateMatrix |      32 |      1,000 |           0 |       1,000 |       7 |      1 |   0.094 |     0.146 |   0.180 |   0.282 |   0.296 |     0.067 |       6854.010 |        6,854,010 |
| recreateMatrix |       8 |    100,000 |           0 |     100,000 |       7 |      1 |   4.531 |     4.783 |   5.213 |   7.237 |   8.264 |     1.249 |        209.078 |       20,907,817 |
| recreateMatrix |      16 |    100,000 |           0 |     100,000 |       7 |      1 |   6.368 |     7.210 |   7.355 |   8.794 |   8.834 |     0.958 |        138.704 |       13,870,395 |
| recreateMatrix |      32 |    100,000 |           0 |     100,000 |       7 |      1 |   7.121 |     7.621 |   7.953 |   9.249 |   9.575 |     0.781 |        131.215 |       13,121,465 |
| recreateMatrix |       8 |  1,000,000 |           0 |   1,000,000 |       7 |      1 | 165.481 |   195.651 | 193.457 | 209.312 | 212.427 |    13.932 |          5.111 |        5,111,131 |
| recreateMatrix |      16 |  1,000,000 |           0 |   1,000,000 |       7 |      1 | 127.256 |   129.990 | 153.766 | 210.436 | 211.688 |    35.615 |          7.693 |        7,692,905 |
| recreateMatrix |      32 |  1,000,000 |           0 |   1,000,000 |       7 |      1 | 243.574 |   263.391 | 278.664 | 368.825 | 412.423 |    55.254 |          3.797 |        3,796,643 |

## appendItems

| Operation   | Columns | Base items | Added items | Timed items | Samples | Warmup | Min ms | Median ms | Mean ms | P95 ms | Max ms | StdDev ms | Median ops/sec | Median items/sec |
| ----------- | ------: | ---------: | ----------: | ----------: | ------: | -----: | -----: | --------: | ------: | -----: | -----: | --------: | -------------: | ---------------: |
| appendItems |       8 |  1,000,000 |         100 |         100 |       3 |      1 |  3.507 |     3.528 |   3.639 |  3.845 |  3.881 |     0.171 |        283.471 |           28,347 |
| appendItems |       8 |  1,000,000 |       1,000 |       1,000 |       3 |      1 |  2.546 |     2.597 |   7.032 | 14.618 | 15.954 |     6.308 |        385.015 |          385,015 |
| appendItems |       8 |  1,000,000 |      10,000 |      10,000 |       3 |      1 |  2.817 |     2.838 |   3.477 |  4.582 |  4.776 |     0.919 |        352.410 |        3,524,105 |
| appendItems |      16 |  1,000,000 |         100 |         100 |       3 |      1 |  2.826 |     3.361 |   3.991 |  5.543 |  5.785 |     1.288 |        297.530 |           29,753 |
| appendItems |      16 |  1,000,000 |       1,000 |       1,000 |       3 |      1 |  2.601 |     2.609 |   2.618 |  2.640 |  2.644 |     0.019 |        383.362 |          383,362 |
| appendItems |      16 |  1,000,000 |      10,000 |      10,000 |       3 |      1 |  2.825 |     2.874 |   2.894 |  2.971 |  2.982 |     0.065 |        347.996 |        3,479,955 |
| appendItems |      32 |  1,000,000 |         100 |         100 |       3 |      1 |  2.572 |     2.588 |   2.605 |  2.647 |  2.654 |     0.035 |        386.414 |           38,641 |
| appendItems |      32 |  1,000,000 |       1,000 |       1,000 |       3 |      1 |  2.719 |     2.799 |   5.443 | 10.009 | 10.810 |     3.795 |        357.258 |          357,258 |
| appendItems |      32 |  1,000,000 |      10,000 |      10,000 |       3 |      1 |  2.952 |     3.012 |   3.001 |  3.036 |  3.039 |     0.036 |        331.950 |        3,319,502 |
