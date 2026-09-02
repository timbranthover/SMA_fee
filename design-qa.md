# Design QA — Proposal Selection Spacing and Table Widths

- Source visual truth: `/workspace/scratch/ebb121d741b1/upload/IMG_2247.jpeg` and `/workspace/scratch/ebb121d741b1/upload/IMG_2248.jpeg`
- Browser-rendered implementation: `/workspace/scratch/proposal-responsive-polish-local.jpg`
- Combined comparison: `/workspace/scratch/proposal-responsive-comparison.jpg`
- Local preview: `http://terminal.local:4173/`
- Production target: `https://ups-investment-screener.vercel.app`
- Browser viewport: 1363 × 936 CSS px at device pixel ratio 1
- Source pixels: 3024 × 872 and 1152 × 1536
- State: Morrison Household → Apple concentration decision → proposal-led SMA selection

## Visible comparison

The source showed two concrete defects: the proposal mandate was compressed into a 128px ribbon with a 15px effective title and 31px controls, and the final proposal-results metric inherited the generic `last-child` action width and collapsed to 42px. The revised browser render keeps the ribbon in the same location while giving the title, tags, controls, stepper, capital summary, and navigation enough room to scan as a single proposal context.

The revised table measures 1,066px inside a 1,066px results viewport with no horizontal overflow at the tested desktop width. Its final Manager Fee column measures the intended 96px. The action-column width now applies only to `.action-cell`, so proposal mode cannot accidentally compress whichever metric happens to be last.

## Required fidelity surfaces

- Fonts and typography: Existing Georgia/Arial system is preserved. Proposal title now resolves to 21px; step text to 8.5px; labels/tags to 8px; inputs to 11px.
- Spacing and layout rhythm: Ribbon expands to a 154px minimum with responsive `minmax()` columns, fluid outer padding, larger gaps, 38px controls, and 22px progress markers.
- Colors and visual tokens: Existing neutral, black, green, red, border, and shadow tokens are unchanged.
- Image and asset fidelity: No assets, icons, or brand marks were added or altered.
- Copy and content: Proposal language, values, filters, table metrics, and navigation are unchanged.

## Interactions tested

- Completed the main demo path from My Book through Morrison Household and the Apple concentration decision.
- Changed the target position and investment amount; verified the capital summary updated.
- Added a strategy, verified the proposal basket became actionable, and continued into the client proposal.
- Returned to investment selection and removed the strategy successfully.
- Verified the proposal table's final header is fully visible and sortable at its 96px width.
- Browser console contained no application warnings or errors; only cloud-browser extension metadata messages were present.
- Automated suite: 98 tests passed.

## Comparison history

- Initial finding: the proposal hierarchy was visually undersized and the mandate controls were crowded.
- Initial finding: `.results-table th:last-child` incorrectly treated the final proposal metric as the narrow action column.
- Fix: strengthened the existing ribbon hierarchy and introduced responsive column sizing without changing structure or workflow.
- Fix: scoped the 42px width to `.action-cell` and added a regression assertion that rejects the old generic selector.
- Post-fix evidence: the proposal context is readable at a glance, the main flow remains functional, and Manager Fee retains the same 96px allocation as the other data columns.

## Findings

No actionable P0, P1, or P2 visual findings remain for the requested proposal-selection spacing and responsive table-width scope.

final result: passed
