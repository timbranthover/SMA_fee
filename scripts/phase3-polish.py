from pathlib import Path


def replace_once(path, old, new):
    file = Path(path)
    source = file.read_text()
    count = source.count(old)
    if count != 1:
        raise SystemExit(f"Expected one match in {path}, found {count}: {old[:120]!r}")
    file.write_text(source.replace(old, new, 1))

replace_once(
    "lib/decision-service.js",
    '      "Validate gain and tax-reserve assumptions",',
    '      "Review unrealized gain and tax-lot context",',
)
replace_once(
    "lib/decision-service.js",
    '        model.defaults = { targetWeight: review.targetWeight, taxRate: 23.8, stressDrop: 35, goalId: relatedGoal?.id || "", goalFunding: 0, redeployAmount: roundMoney(review.targetRelease * 0.65) };',
    '        model.defaults = { targetWeight: review.targetWeight, stressDrop: 35, goalId: relatedGoal?.id || "", goalFunding: 0, redeployAmount: roundMoney(review.targetRelease * 0.65) };',
)
replace_once(
    "lib/decision-service.js",
    '        model.bounds = { targetWeight: { min: 1, max: Math.ceil(review.holding.weight), step: 0.5 }, taxRate: { min: 0, max: 50, step: 0.1 }, stressDrop: { min: 10, max: 60, step: 5 }, goalFunding: { min: 0, max: relatedGoal?.remaining || 0, step: 5000 }, redeployAmount: { min: 0, max: review.targetRelease, step: 5000 } };',
    '        model.bounds = { targetWeight: { min: 1, max: Math.ceil(review.holding.weight), step: 0.5 }, stressDrop: { min: 10, max: 60, step: 5 }, goalFunding: { min: 0, max: relatedGoal?.remaining || 0, step: 5000 }, redeployAmount: { min: 0, max: review.targetRelease, step: 5000 } };',
)
replace_once(
    "lib/decision-service.js",
    '        model.assumptions = ["Proceeds remain inside the household unless explicitly earmarked.", "Tax reserve uses an editable effective capital-gains-rate assumption.", "Stress loss uses an editable single-position drawdown assumption.", "Redeployed proceeds are modeled as diversified US equity for allocation impact only."];',
    '        model.assumptions = ["Proceeds remain inside the household unless explicitly earmarked.", "Estimated realized gain is proportional to current position-level unrealized gain; tax liability is intentionally not modeled.", "Stress loss uses an editable single-position drawdown assumption.", "Redeployed proceeds are modeled as diversified US equity for allocation impact only."];',
)
replace_once(
    "lib/decision-service.js",
    '      const taxRate = clamp(input.taxRate ?? detail.model.defaults.taxRate, 0, 50);\n      const taxReserve = roundMoney(realizedGain * taxRate / 100);\n',
    '',
)
replace_once(
    "lib/decision-service.js",
    '        inputs: { targetWeight, taxRate, stressDrop, goalId: relatedGoal?.id || "", goalFunding: roundMoney(goalFunding), redeployAmount: roundMoney(redeployAmount) },',
    '        inputs: { targetWeight, stressDrop, goalId: relatedGoal?.id || "", goalFunding: roundMoney(goalFunding), redeployAmount: roundMoney(redeployAmount) },',
)
replace_once(
    "lib/decision-service.js",
    '        economics: { release, realizedGain, taxReserve, goalFunding: roundMoney(goalFunding), redeployAmount: roundMoney(redeployAmount), remainingCashProceeds: roundMoney(remainingCashProceeds) },',
    '        economics: { release, realizedGain, goalFunding: roundMoney(goalFunding), redeployAmount: roundMoney(redeployAmount), remainingCashProceeds: roundMoney(remainingCashProceeds) },',
)
replace_once(
    "api/decision.js",
    '      "targetWeight", "taxRate", "stressDrop", "goalFunding", "redeployAmount", "deployAmount", "reservePct", "fundingAmount", "allocationAmount",',
    '      "targetWeight", "stressDrop", "goalFunding", "redeployAmount", "deployAmount", "reservePct", "fundingAmount", "allocationAmount",',
)
replace_once(
    "app.js",
    '<div class="decision-assumption-inputs"><label><span>Tax reserve assumption</span><div><input type="number" data-decision-input="taxRate" min="0" max="50" step="0.1" value="${inputs.taxRate}" /><em>%</em></div></label><label><span>Single-stock stress</span><div><input type="number" data-decision-input="stressDrop" min="10" max="60" step="5" value="${inputs.stressDrop}" /><em>%</em></div></label></div>',
    '<div class="decision-assumption-inputs"><label><span>Single-stock stress</span><div><input type="number" data-decision-input="stressDrop" min="10" max="60" step="5" value="${inputs.stressDrop}" /><em>%</em></div></label></div>',
)
replace_once(
    "app.js",
    '<div><span>Estimated realized gain</span><strong>${formatWealthCurrency(scenario.economics.realizedGain)}</strong></div><div><span>Estimated tax reserve</span><strong>${formatWealthCurrency(scenario.economics.taxReserve)}</strong></div><div><span>Implementation amount</span>',
    '<div><span>Estimated realized gain</span><strong>${formatWealthCurrency(scenario.economics.realizedGain)}</strong></div><div><span>Tax liability</span><strong>Not modeled</strong></div><div><span>Implementation amount</span>',
)
replace_once(
    "tests/decision.test.mjs",
    '    taxRate: 23.8,\n',
    '',
)
replace_once(
    "tests/decision.test.mjs",
    '  assert.ok(scenario.economics.taxReserve > 0);',
    '  assert.equal("taxReserve" in scenario.economics, false);',
)

for path in ["lib/decision-service.js", "api/decision.js", "app.js", "tests/decision.test.mjs"]:
    source = Path(path).read_text()
    if "taxRate" in source or "taxReserve" in source or "Tax reserve assumption" in source or "Estimated tax reserve" in source:
        raise SystemExit(f"False tax-precision language remains in {path}")

print("Phase Three tax-precision polish applied")
