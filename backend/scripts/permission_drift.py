"""Print the permission drift between the backend registry and the UI mirror."""
from __future__ import annotations

import pathlib
import re
import sys
import warnings

warnings.filterwarnings("ignore")
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

from app.core.permissions import ALL_PERMISSIONS  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
FE = ROOT / "frontend" / "src" / "auth" / "permissions.ts"

text = FE.read_text(encoding="utf-8")
# families may have more than one dot (e.g. OWN.RECORD.READ)
fe_set = set(re.findall(r'"([A-Z_]+(?:\.[A-Z_]+)+)"', text))

print(f"backend : {len(ALL_PERMISSIONS)}")
print(f"frontend: {len(fe_set)}")
print()
print(f"MISSING IN FRONTEND ({len(ALL_PERMISSIONS - fe_set)}):")
for p in sorted(ALL_PERMISSIONS - fe_set):
    print(f"  {p}")
print()
print(f"FRONTEND-ONLY, NOT ON BACKEND ({len(fe_set - set(ALL_PERMISSIONS))}):")
for p in sorted(fe_set - set(ALL_PERMISSIONS)):
    print(f"  {p}")
