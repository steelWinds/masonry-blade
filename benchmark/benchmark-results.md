# MasonryMatrix Benchmark

## Setup

- Seed: 2026
- Root width: 3840
- Gap: 16
- Samples per scenario: 5
- Warmup iterations per scenario: 1
- GC exposed: no
- Modes: plain, meta-object

## How to read it

- `plain` uses items without `meta`.
- `meta-object` uses the current MasonryMatrix API with an object in `meta`.
- `recreate` measures only the rebuild step after the matrix has already been populated.
- `append` measures only the new batch append step on top of a preloaded matrix.

## Highlights

- Fastest rebuild of 1,000,000 items: **plain**, 8 columns, **60.395 ms** median, 16,557,580 items/sec.
- Fastest append of 10,000 items onto a 1,000,000-item matrix: **plain**, 8 columns, **6.520 ms** median, 1,533,836 items/sec.
- At 8 columns and 1,000,000 items, adding a meta object changes rebuild median from **60.395 ms** to **130.015 ms** (+115.3%).

## Results

| Operation | Mode        | Columns | Workload                         |     Median |        P95 |           Throughput |
| --------- | ----------- | ------: | -------------------------------- | ---------: | ---------: | -------------------: |
| append    | meta-object |       8 | append 1,000 items to 1,000,000  |   7.691 ms |  40.132 ms |    130,015 items/sec |
| append    | meta-object |       8 | append 10,000 items to 1,000,000 |   9.741 ms |  10.591 ms |  1,026,568 items/sec |
| append    | meta-object |      16 | append 1,000 items to 1,000,000  |   8.758 ms |  10.562 ms |    114,185 items/sec |
| append    | meta-object |      16 | append 10,000 items to 1,000,000 |   8.961 ms |   9.537 ms |  1,116,009 items/sec |
| append    | meta-object |      32 | append 1,000 items to 1,000,000  |  10.140 ms |  37.694 ms |     98,616 items/sec |
| append    | meta-object |      32 | append 10,000 items to 1,000,000 |  12.560 ms |  14.426 ms |    796,185 items/sec |
| append    | plain       |       8 | append 1,000 items to 1,000,000  |   5.245 ms |  15.853 ms |    190,654 items/sec |
| append    | plain       |       8 | append 10,000 items to 1,000,000 |   6.520 ms |   8.965 ms |  1,533,836 items/sec |
| append    | plain       |      16 | append 1,000 items to 1,000,000  |   6.234 ms |   7.199 ms |    160,406 items/sec |
| append    | plain       |      16 | append 10,000 items to 1,000,000 |   7.942 ms |   9.919 ms |  1,259,192 items/sec |
| append    | plain       |      32 | append 1,000 items to 1,000,000  |   8.622 ms |   9.274 ms |    115,985 items/sec |
| append    | plain       |      32 | append 10,000 items to 1,000,000 |   8.626 ms |  10.587 ms |  1,159,246 items/sec |
| recreate  | meta-object |       8 | rebuild 100,000 items            |  13.742 ms |  14.183 ms |  7,276,749 items/sec |
| recreate  | meta-object |       8 | rebuild 1,000,000 items          | 130.015 ms | 245.307 ms |  7,691,432 items/sec |
| recreate  | meta-object |      16 | rebuild 100,000 items            |  16.097 ms |  39.560 ms |  6,212,415 items/sec |
| recreate  | meta-object |      16 | rebuild 1,000,000 items          | 152.910 ms | 451.581 ms |  6,539,803 items/sec |
| recreate  | meta-object |      32 | rebuild 100,000 items            |  15.586 ms |  20.078 ms |  6,416,138 items/sec |
| recreate  | meta-object |      32 | rebuild 1,000,000 items          | 172.211 ms | 350.220 ms |  5,806,820 items/sec |
| recreate  | plain       |       8 | rebuild 100,000 items            |   5.959 ms |   7.707 ms | 16,780,776 items/sec |
| recreate  | plain       |       8 | rebuild 1,000,000 items          |  60.395 ms |  61.454 ms | 16,557,580 items/sec |
| recreate  | plain       |      16 | rebuild 100,000 items            |  12.039 ms |  12.834 ms |  8,306,062 items/sec |
| recreate  | plain       |      16 | rebuild 1,000,000 items          | 108.444 ms | 117.156 ms |  9,221,383 items/sec |
| recreate  | plain       |      32 | rebuild 100,000 items            |  17.327 ms |  45.290 ms |  5,771,173 items/sec |
| recreate  | plain       |      32 | rebuild 1,000,000 items          | 158.391 ms | 695.739 ms |  6,313,494 items/sec |

## Plain vs meta-object overhead

| Operation | Columns | Base items | Added items | Plain median | Meta median | Meta overhead |
| --------- | ------: | ---------: | ----------: | -----------: | ----------: | ------------: |
| append    |       8 |  1,000,000 |       1,000 |     5.245 ms |    7.691 ms |        +46.6% |
| append    |       8 |  1,000,000 |      10,000 |     6.520 ms |    9.741 ms |        +49.4% |
| append    |      16 |  1,000,000 |       1,000 |     6.234 ms |    8.758 ms |        +40.5% |
| append    |      16 |  1,000,000 |      10,000 |     7.942 ms |    8.961 ms |        +12.8% |
| append    |      32 |  1,000,000 |       1,000 |     8.622 ms |   10.140 ms |        +17.6% |
| append    |      32 |  1,000,000 |      10,000 |     8.626 ms |   12.560 ms |        +45.6% |
| recreate  |       8 |    100,000 |           0 |     5.959 ms |   13.742 ms |       +130.6% |
| recreate  |       8 |  1,000,000 |           0 |    60.395 ms |  130.015 ms |       +115.3% |
| recreate  |      16 |    100,000 |           0 |    12.039 ms |   16.097 ms |        +33.7% |
| recreate  |      16 |  1,000,000 |           0 |   108.444 ms |  152.910 ms |        +41.0% |
| recreate  |      32 |    100,000 |           0 |    17.327 ms |   15.586 ms |        -10.1% |
| recreate  |      32 |  1,000,000 |           0 |   158.391 ms |  172.211 ms |         +8.7% |
