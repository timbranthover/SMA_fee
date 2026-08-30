# Design QA — Numeric Unit Spacing

- Source visual truth: `/workspace/scratch/e1b81af706d5/upload/IMG_2200.jpeg`
- Browser-rendered implementation: cloud-browser focused capture of `http://terminal.local:4173/`, Dividend yield expanded
- Production target: `https://ups-investment-screener.vercel.app`
- Viewport: 1363 × 936 CSS px at device pixel ratio 1
- Source pixels: 870 × 366
- Implementation focused capture: 263 × 95 px (247 × 79 component plus 8px context on each side)
- Density normalization: source is a high-zoom crop of the desktop sidebar; comparison used the visible control geometry rather than raw pixel scale
- State: Equities; Dividend yield expanded; active 1.6%–3.1% range

## Full-view comparison evidence

The source shows the minimum suffix separated from `1.6`, while the maximum correctly reads `3.1%`. The revised browser-rendered screen preserves the surrounding filter, endpoint alignment, slider position, typography, and 79px expanded height.

## Focused comparison evidence

The source and revised focused captures were reviewed together. The implementation now renders both `1.6%` and `3.1%` as cohesive values. Measured space between each numeric input box and its unit is 0px. Percent, multiple, currency, month, and year formats all pass the same adjacency check.

## Required fidelity surfaces

- Fonts and typography: Existing 9px bold tabular numerals and secondary unit styling are unchanged. A hidden text mirror now gives each editable number its exact content width.
- Spacing and layout rhythm: Units sit directly against their values without changing the three-column endpoint grid or the 79px component height.
- Colors and visual tokens: No changes.
- Image and asset fidelity: No assets or icons were added or changed.
- Copy and content: Labels, values, units, accessibility names, and clear behavior are unchanged.

## Interactions tested

- Verified 0px unit gaps for `%`, `×`, `$`, `mo`, and `yr`.
- Verified six- and seven-digit currency inputs size independently.
- Verified the mirror updates from input events and programmatic slider changes.
- Browser console contained no application warnings or errors.
- Automated suite: 52 tests passed.

## Findings

No actionable P0, P1, or P2 findings remain. The pointer visible in the focused capture is cloud-browser test chrome, not part of the product.

## Comparison history

- Initial finding: unsupported `field-sizing` fallback left a fixed-width minimum input, visually stranding its suffix.
- Fix: replaced browser-dependent sizing with a CSP-safe hidden text mirror that tracks the current value.
- Post-fix evidence: 0px unit gaps across all supported formats; content-responsive currency widths; height and behavior unchanged.

final result: passed
