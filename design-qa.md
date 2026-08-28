# Comparison Chart Design QA

- Source visual truth path: `/workspace/scratch/e1b81af706d5/upload/IMG_83B74445-F7A8-4072-9B13-0175AF1558CA.jpeg`
- Source pixels: 1080 × 1440, photographed desktop monitor, 72 dpi metadata
- Implementation screenshot path: Cloud Browser inline capture, session `Investment Screener chart QA`, captured 2026-08-28
- Implementation URL: `http://terminal.local:4173/`
- Implementation pixels: 1348 × 926
- CSS viewport: 1363 × 936 at device pixel ratio 1
- Density normalization: no pixel-density resampling; the source is a perspective photograph rather than a direct viewport capture. The modal content region and identical three-investment interaction state were compared together in one visual review input.
- State: three equities selected; comparison modal open; 1Y selected; S&P 500 off; all investment series visible; decision table directly below chart

## Findings

No actionable P0, P1 or P2 findings remain.

### Required fidelity surfaces

- Fonts and typography: Georgia display headings and compact Arial UI text preserve the existing hierarchy and optical tone. The chart uses the same Arial stack and small tabular values; labels remain readable without becoming consumer-finance styled.
- Spacing and layout rhythm: header, close control, table tracks, row density, borders and square controls remain consistent with the source. The modal intentionally expands from the source to a near-full desktop analytical canvas, while the original table remains in the same reading order below the new chart.
- Colors and visual tokens: white surface, warm-gray dividers, near-black controls and restrained red/green/blue series align with the existing product tokens. The optional benchmark is dashed charcoal and does not compete with investment series.
- Image quality and asset fidelity: the new visualization is rendered by TradingView Lightweight Charts on a sharp canvas at the browser's device density. No placeholder imagery, approximate logos, inline SVGs or rasterized UI elements were introduced.
- Copy and content: language is operational and explicit—“Total return,” “Performance comparison,” selectable periods, “Add S&P 500,” as-of date and an “Illustrative” rebasing disclosure. The existing decision-field labels are unchanged.

## Full-view comparison evidence

The source and rendered implementation were opened together. The implementation retains the source modal's calm white field, serif title, small uppercase section label, circular close control, thin table rules and compact column density. The larger modal is an intentional extension: it adds one clearly bounded chart region above the unchanged side-by-side table without changing the feature's entry point or underlying comparison flow.

## Focused region comparison evidence

The chart and the first six decision rows were reviewed at readable scale. Time controls stay on one line, three legend cells fill the available width evenly, 1Y values reconcile to the table, axis labels remain within the plot, and the table begins immediately below the chart disclosure. Focused review was necessary because the source's table text is too small for full-photo inspection.

## Comparison history

### Pass 1

- P2: the fixed five-column legend left an empty gray block with three selected investments.
  - Fix: changed the legend to auto-fit equal-width columns based on visible series.
  - Post-fix evidence: three investment legend cells span the full chart width; enabling S&P 500 produces four equal cells.
- P2: the chart library's default attribution mark introduced a visually foreign black logo inside the plot.
  - Fix: disabled the optional in-chart attribution mark while retaining the Apache-2.0 dependency notice in the installed package and lockfile.
  - Post-fix evidence: the plot now contains only data, axes and crosshair information.

### Pass 2

- No actionable P0/P1/P2 differences.
- Residual P3: extreme-return series can compress lower-volatility lines on long ranges. This is an expected analytical effect; users can hide any series from the legend to rescale the chart.

## Primary interactions tested

- Selected three investments and opened comparison.
- Loaded chart data and local chart module on demand.
- Switched between 1Y and 3Y without refetching.
- Enabled and disabled the S&P 500 benchmark.
- Hid and restored an investment series from the legend.
- Moved the crosshair and verified synchronized date and series values.
- Confirmed the decision table remains visible and scrollable below the chart.
- Confirmed no application console errors or warnings.

## Implementation checklist

- [x] Preserve comparison entry point and table.
- [x] Add normalized performance chart above table.
- [x] Add 1M, 3M, 6M, YTD, 1Y, 3Y, 5Y and MAX periods.
- [x] Add optional S&P 500 benchmark.
- [x] Add synchronized crosshair values and series visibility controls.
- [x] Match existing typography, spacing, borders and restrained color system.
- [x] Keep the chart dependency local and lazy-loaded.
- [x] Clearly label all performance history illustrative.

final result: passed
