# Design QA — Numeric Range Value Alignment

- Source visual truth: `/workspace/scratch/e1b81af706d5/upload/IMG_2199.jpeg`
- Browser-rendered implementation: cloud-browser focused capture of `http://terminal.local:4173/`, Fees expanded
- Production target: `https://ups-investment-screener.vercel.app`
- Viewport: 1363 × 936 CSS px at device pixel ratio 1
- Source pixels: 607 × 264
- Implementation focused capture: 263 × 95 px (247 × 79 component plus 8px context on each side)
- Density normalization: source is a high-zoom crop of the same desktop sidebar; comparison used the control's visible alignment rather than raw pixel scale
- State: All investments; Fees expanded; full 0%–1.75% range

## Full-view comparison evidence

The source shows the minimum, separator, and maximum packed into a left-biased cluster while the rail spans the full filter width. The revised browser-rendered screen preserves the surrounding screener, filter width, typography, accordion behavior, and 79px expanded height.

## Focused comparison evidence

The source and revised focused captures were reviewed together. In the revision, the minimum aligns exactly with the rail's left endpoint, the separator aligns with the rail center, and the maximum aligns exactly with the right endpoint. Measured offsets are 0px left, 0px center, and 0px right. The same geometry passed for all 11 investment-category configurations.

## Required fidelity surfaces

- Fonts and typography: Existing font family, 9px bold tabular numerals, 8px secondary summary, and affix styling are unchanged. Inputs size to their content where supported and retain a safe fallback width.
- Spacing and layout rhythm: Values now use a three-column endpoint grid with an 8px center gap and the same 6px rail inset. Expanded height remains 79px.
- Colors and visual tokens: No color, border, shadow, or state-token changes.
- Image and asset fidelity: No assets or icons were added or changed.
- Copy and content: Labels, values, units, accessibility names, and clear behavior are unchanged.

## Interactions tested

- Verified percent, dollar, multiple, month, and year value formats across all investment categories.
- Verified keyboard adjustment updates the slider value, URL state, and filtered results.
- Verified the minimum, separator, and maximum align at 0px offset from their corresponding rail anchors.
- Browser console contained no application warnings or errors.
- Automated suite: 52 tests passed.

## Findings

No actionable P0, P1, or P2 findings remain. The pointer visible in the focused capture is cloud-browser test chrome, not part of the product.

## Comparison history

- Initial finding: lower and upper values formed a compact left-biased cluster unrelated to the rail endpoints.
- Fix: grouped values into a dedicated three-column grid, anchored minimum and maximum to opposite ends, centered the separator, and added content-aware input sizing.
- Post-fix evidence: 0px endpoint and center offsets across all 11 category configurations; component height unchanged; keyboard behavior and tests pass.

final result: passed
