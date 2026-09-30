"""List every registered route with methods, so the testing guide stays accurate.

Run:  python scripts/list_routes.py [substring-filter]
"""
from __future__ import annotations

import pathlib
import sys
import warnings

warnings.filterwarnings("ignore")
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

from fastapi.routing import APIRoute  # noqa: E402

from app.main import app  # noqa: E402


def main() -> None:
    needle = sys.argv[1].lower() if len(sys.argv) > 1 else ""
    rows = []
    for route in app.routes:
        if not isinstance(route, APIRoute):
            continue
        methods = ",".join(sorted(m for m in route.methods if m != "HEAD"))
        if needle and needle not in route.path.lower():
            continue
        rows.append((route.path, methods, route.name))
    for path, methods, name in sorted(rows):
        print(f"{methods:<12} {path:<62} {name}")
    print(f"\n{len(rows)} route(s)")


if __name__ == "__main__":
    main()
