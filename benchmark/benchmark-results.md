# Benchmark results

Started at: 2026-03-10T05:06:05.719Z

Width: 320
Append parts: 10
Totals: 1000, 10000, 100000, 1000000
Columns: 4, 8, 16, 32

## items=1000 | columns=4

### Time

| Task | Mean (ms) | P50 (ms) | Min (ms) | Ops/s | Samples | RME |
| --- | --- | --- | --- | --- | --- | --- |
| append(10x100) | 0.025 | 0.022 | 0.020 | 43526 | 12067 | 1.15% |
| recreate | 0.013 | 0.011 | 0.010 | 86567 | 23635 | 3.82% |

### Memory

| Task | Run | Heap before | Heap after | Heap delta | RSS before | RSS after | RSS delta |
| --- | --- | --- | --- | --- | --- | --- | --- |
| append | 1 | 29.19 MB | 29.36 MB | 0.17 MB | 160.54 MB | 160.54 MB | 0.00 MB |
| recreate | 3 | 30.12 MB | 30.20 MB | 0.07 MB | 160.54 MB | 160.54 MB | 0.00 MB |

## items=1000 | columns=8

### Time

| Task | Mean (ms) | P50 (ms) | Min (ms) | Ops/s | Samples | RME |
| --- | --- | --- | --- | --- | --- | --- |
| append(10x100) | 0.027 | 0.024 | 0.021 | 39820 | 11100 | 1.20% |
| recreate | 0.014 | 0.013 | 0.011 | 75265 | 20804 | 1.21% |

### Memory

| Task | Run | Heap before | Heap after | Heap delta | RSS before | RSS after | RSS delta |
| --- | --- | --- | --- | --- | --- | --- | --- |
| append | 1 | 46.36 MB | 46.52 MB | 0.16 MB | 162.12 MB | 162.12 MB | 0.00 MB |
| recreate | 1 | 46.92 MB | 46.99 MB | 0.07 MB | 162.12 MB | 162.12 MB | 0.00 MB |

## items=1000 | columns=16

### Time

| Task | Mean (ms) | P50 (ms) | Min (ms) | Ops/s | Samples | RME |
| --- | --- | --- | --- | --- | --- | --- |
| append(10x100) | 0.060 | 0.051 | 0.049 | 18674 | 4998 | 2.34% |
| recreate | 0.045 | 0.039 | 0.018 | 24296 | 6664 | 1.44% |

### Memory

| Task | Run | Heap before | Heap after | Heap delta | RSS before | RSS after | RSS delta |
| --- | --- | --- | --- | --- | --- | --- | --- |
| append | 3 | 41.31 MB | 41.47 MB | 0.16 MB | 162.33 MB | 162.33 MB | 0.00 MB |
| recreate | 1 | 41.55 MB | 41.62 MB | 0.07 MB | 162.34 MB | 162.34 MB | 0.01 MB |

## items=1000 | columns=32

### Time

| Task | Mean (ms) | P50 (ms) | Min (ms) | Ops/s | Samples | RME |
| --- | --- | --- | --- | --- | --- | --- |
| append(10x100) | 0.084 | 0.071 | 0.039 | 13341 | 3578 | 1.92% |
| recreate | 0.068 | 0.058 | 0.030 | 16165 | 4428 | 2.25% |

### Memory

| Task | Run | Heap before | Heap after | Heap delta | RSS before | RSS after | RSS delta |
| --- | --- | --- | --- | --- | --- | --- | --- |
| append | 1 | 88.87 MB | 89.03 MB | 0.16 MB | 228.61 MB | 228.61 MB | 0.00 MB |
| recreate | 1 | 89.43 MB | 89.49 MB | 0.06 MB | 228.61 MB | 228.61 MB | 0.00 MB |

## items=10000 | columns=4

### Time

| Task | Mean (ms) | P50 (ms) | Min (ms) | Ops/s | Samples | RME |
| --- | --- | --- | --- | --- | --- | --- |
| append(10x1000) | 0.497 | 0.455 | 0.423 | 2098 | 403 | 2.96% |
| recreate | 0.298 | 0.285 | 0.274 | 3392 | 671 | 1.04% |

### Memory

| Task | Run | Heap before | Heap after | Heap delta | RSS before | RSS after | RSS delta |
| --- | --- | --- | --- | --- | --- | --- | --- |
| append | 2 | 49.44 MB | 51.19 MB | 1.75 MB | 232.07 MB | 232.07 MB | 0.00 MB |
| recreate | 3 | 56.86 MB | 57.59 MB | 0.73 MB | 232.07 MB | 232.07 MB | 0.00 MB |

## items=10000 | columns=8

### Time

| Task | Mean (ms) | P50 (ms) | Min (ms) | Ops/s | Samples | RME |
| --- | --- | --- | --- | --- | --- | --- |
| append(10x1000) | 0.565 | 0.513 | 0.490 | 1857 | 355 | 3.53% |
| recreate | 0.400 | 0.351 | 0.234 | 2674 | 500 | 3.95% |

### Memory

| Task | Run | Heap before | Heap after | Heap delta | RSS before | RSS after | RSS delta |
| --- | --- | --- | --- | --- | --- | --- | --- |
| append | 3 | 62.30 MB | 64.05 MB | 1.75 MB | 234.86 MB | 234.86 MB | 0.00 MB |
| recreate | 1 | 64.83 MB | 65.54 MB | 0.71 MB | 234.86 MB | 234.86 MB | 0.00 MB |

## items=10000 | columns=16

### Time

| Task | Mean (ms) | P50 (ms) | Min (ms) | Ops/s | Samples | RME |
| --- | --- | --- | --- | --- | --- | --- |
| append(10x1000) | 0.668 | 0.607 | 0.580 | 1560 | 300 | 3.39% |
| recreate | 0.487 | 0.448 | 0.430 | 2117 | 411 | 2.67% |

### Memory

| Task | Run | Heap before | Heap after | Heap delta | RSS before | RSS after | RSS delta |
| --- | --- | --- | --- | --- | --- | --- | --- |
| append | 3 | 53.76 MB | 55.51 MB | 1.75 MB | 237.57 MB | 237.57 MB | 0.00 MB |
| recreate | 1 | 56.33 MB | 57.08 MB | 0.75 MB | 237.57 MB | 237.57 MB | 0.00 MB |

## items=10000 | columns=32

### Time

| Task | Mean (ms) | P50 (ms) | Min (ms) | Ops/s | Samples | RME |
| --- | --- | --- | --- | --- | --- | --- |
| append(10x1000) | 0.812 | 0.759 | 0.420 | 1280 | 247 | 3.03% |
| recreate | 0.615 | 0.584 | 0.569 | 1653 | 326 | 2.11% |

### Memory

| Task | Run | Heap before | Heap after | Heap delta | RSS before | RSS after | RSS delta |
| --- | --- | --- | --- | --- | --- | --- | --- |
| append | 2 | 61.27 MB | 63.01 MB | 1.75 MB | 232.15 MB | 232.15 MB | 0.00 MB |
| recreate | 1 | 65.52 MB | 66.20 MB | 0.68 MB | 232.15 MB | 232.15 MB | 0.00 MB |

## items=100000 | columns=4

### Time

| Task | Mean (ms) | P50 (ms) | Min (ms) | Ops/s | Samples | RME |
| --- | --- | --- | --- | --- | --- | --- |
| append(10x10000) | 9.551 | 7.383 | 6.574 | 122 | 106 | 9.95% |
| recreate | 3.685 | 3.540 | 3.256 | 277 | 272 | 2.75% |

### Memory

| Task | Run | Heap before | Heap after | Heap delta | RSS before | RSS after | RSS delta |
| --- | --- | --- | --- | --- | --- | --- | --- |
| append | 2 | 180.74 MB | 197.51 MB | 16.77 MB | 338.38 MB | 349.19 MB | 10.81 MB |
| recreate | 2 | 142.39 MB | 150.36 MB | 7.97 MB | 322.09 MB | 324.09 MB | 2.00 MB |

## items=100000 | columns=8

### Time

| Task | Mean (ms) | P50 (ms) | Min (ms) | Ops/s | Samples | RME |
| --- | --- | --- | --- | --- | --- | --- |
| append(10x10000) | 9.829 | 8.169 | 6.399 | 113 | 102 | 8.63% |
| recreate | 4.137 | 4.023 | 2.364 | 248 | 242 | 3.35% |

### Memory

| Task | Run | Heap before | Heap after | Heap delta | RSS before | RSS after | RSS delta |
| --- | --- | --- | --- | --- | --- | --- | --- |
| append | 2 | 217.70 MB | 234.13 MB | 16.42 MB | 365.63 MB | 374.41 MB | 8.78 MB |
| recreate | 2 | 198.92 MB | 206.67 MB | 7.75 MB | 364.13 MB | 364.13 MB | 0.00 MB |

## items=100000 | columns=16

### Time

| Task | Mean (ms) | P50 (ms) | Min (ms) | Ops/s | Samples | RME |
| --- | --- | --- | --- | --- | --- | --- |
| append(10x10000) | 10.177 | 8.490 | 7.559 | 109 | 100 | 8.73% |
| recreate | 6.681 | 4.714 | 2.550 | 183 | 150 | 8.88% |

### Memory

| Task | Run | Heap before | Heap after | Heap delta | RSS before | RSS after | RSS delta |
| --- | --- | --- | --- | --- | --- | --- | --- |
| append | 2 | 256.07 MB | 271.86 MB | 15.79 MB | 426.16 MB | 434.98 MB | 8.81 MB |
| recreate | 3 | 246.64 MB | 253.69 MB | 7.05 MB | 418.93 MB | 418.93 MB | 0.00 MB |

## items=100000 | columns=32

### Time

| Task | Mean (ms) | P50 (ms) | Min (ms) | Ops/s | Samples | RME |
| --- | --- | --- | --- | --- | --- | --- |
| append(10x10000) | 11.681 | 10.140 | 7.241 | 93 | 86 | 7.98% |
| recreate | 6.327 | 6.102 | 3.470 | 161 | 159 | 3.66% |

### Memory

| Task | Run | Heap before | Heap after | Heap delta | RSS before | RSS after | RSS delta |
| --- | --- | --- | --- | --- | --- | --- | --- |
| append | 3 | 282.76 MB | 299.30 MB | 16.54 MB | 466.85 MB | 475.66 MB | 8.81 MB |
| recreate | 1 | 307.94 MB | 315.81 MB | 7.88 MB | 476.48 MB | 476.48 MB | 0.00 MB |

## items=1000000 | columns=4

### Time

| Task | Mean (ms) | P50 (ms) | Min (ms) | Ops/s | Samples | RME |
| --- | --- | --- | --- | --- | --- | --- |
| append(10x100000) | 139.927 | 145.034 | 106.740 | 7 | 8 | 9.95% |
| recreate | 92.008 | 102.577 | 32.546 | 14 | 11 | 27.52% |

### Memory

| Task | Run | Heap before | Heap after | Heap delta | RSS before | RSS after | RSS delta |
| --- | --- | --- | --- | --- | --- | --- | --- |
| append | 1 | 1298.74 MB | 1415.29 MB | 116.55 MB | 1514.90 MB | 1603.12 MB | 88.22 MB |
| recreate | 1 | 1503.82 MB | 374.51 MB | -1129.31 MB | 1688.80 MB | 1441.29 MB | -247.50 MB |

## items=1000000 | columns=8

### Time

| Task | Mean (ms) | P50 (ms) | Min (ms) | Ops/s | Samples | RME |
| --- | --- | --- | --- | --- | --- | --- |
| append(10x100000) | 161.286 | 162.981 | 133.906 | 6 | 7 | 7.82% |
| recreate | 88.348 | 80.945 | 43.060 | 12 | 12 | 19.40% |

### Memory

| Task | Run | Heap before | Heap after | Heap delta | RSS before | RSS after | RSS delta |
| --- | --- | --- | --- | --- | --- | --- | --- |
| append | 1 | 1663.83 MB | 388.29 MB | -1275.54 MB | 1874.66 MB | 1549.64 MB | -325.02 MB |
| recreate | 1 | 531.89 MB | 604.98 MB | 73.09 MB | 1606.26 MB | 1630.89 MB | 24.63 MB |

## items=1000000 | columns=16

### Time

| Task | Mean (ms) | P50 (ms) | Min (ms) | Ops/s | Samples | RME |
| --- | --- | --- | --- | --- | --- | --- |
| append(10x100000) | 208.788 | 202.504 | 161.136 | 5 | 6 | 18.49% |
| recreate | 126.403 | 120.198 | 86.967 | 8 | 8 | 22.42% |

### Memory

| Task | Run | Heap before | Heap after | Heap delta | RSS before | RSS after | RSS delta |
| --- | --- | --- | --- | --- | --- | --- | --- |
| append | 1 | 607.88 MB | 693.97 MB | 86.09 MB | 1597.67 MB | 1645.40 MB | 47.73 MB |
| recreate | 1 | 830.88 MB | 901.16 MB | 70.27 MB | 1693.57 MB | 1718.37 MB | 24.80 MB |

## items=1000000 | columns=32

### Time

| Task | Mean (ms) | P50 (ms) | Min (ms) | Ops/s | Samples | RME |
| --- | --- | --- | --- | --- | --- | --- |
| append(10x100000) | 255.373 | 245.724 | 234.593 | 4 | 4 | 16.97% |
| recreate | 167.080 | 181.216 | 105.642 | 6 | 6 | 26.10% |

### Memory

| Task | Run | Heap before | Heap after | Heap delta | RSS before | RSS after | RSS delta |
| --- | --- | --- | --- | --- | --- | --- | --- |
| append | 1 | 1015.56 MB | 377.46 MB | -638.11 MB | 1705.22 MB | 1545.91 MB | -159.32 MB |
| recreate | 1 | 498.67 MB | 562.32 MB | 63.65 MB | 1579.71 MB | 1595.36 MB | 15.64 MB |


