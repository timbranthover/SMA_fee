from pathlib import Path

path = Path("tests/wealth.test.mjs")
source = path.read_text()

old_stats = '''    concentrationPolicies: 1,
    histories: 1,
  });'''
new_stats = '''    concentrationPolicies: 1,
    histories: 1,
    decisions: 0,
    actionPlans: 0,
    actions: 0,
  });'''
if source.count(old_stats) != 1:
    raise SystemExit(f"Expected repository-stats assertion once, found {source.count(old_stats)}")
source = source.replace(old_stats, new_stats, 1)

old_flow = '''  assert.match(app, /data-household-scenario="concentration"/);
  assert.match(app, /flags: \\["Tax-Aware", "Direct Indexing"\\]/);
  assert.match(app, /Carry the objective—not hidden client data/);'''
new_flow = '''  assert.match(app, /function openDecision/);
  assert.match(app, /loadHouseholdDecision/);
  assert.match(app, /decisionFromPath/);
  assert.match(app, /saveDecisionCandidates/);'''
if source.count(old_flow) != 1:
    raise SystemExit(f"Expected legacy concentration-flow assertions once, found {source.count(old_flow)}")
source = source.replace(old_flow, new_flow, 1)

path.write_text(source)
print("Phase Three regression assertions aligned")
