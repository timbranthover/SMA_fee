from pathlib import Path

path = Path("tests/wealth.test.mjs")
source = path.read_text()
old = '''    concentrationPolicies: 1,
    histories: 1,
  });'''
new = '''    concentrationPolicies: 1,
    histories: 1,
    decisions: 0,
    householdEvents: 0,
  });'''
if source.count(old) != 1:
    raise SystemExit(f"Expected one repository stats assertion, found {source.count(old)}")
path.write_text(source.replace(old, new, 1))
