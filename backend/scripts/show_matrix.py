"""Print the live role x permission matrix and the dev identities.

Run:  python scripts/show_matrix.py
Used to keep the RBAC testing guide in sync with the real registry.
"""
from __future__ import annotations

import pathlib
import sys
import warnings

warnings.filterwarnings("ignore")
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

from app.core.permissions import ROLE_PERMISSIONS  # noqa: E402
from app.core.roles import ALL_ROLES  # noqa: E402
from app.core.security import DEV_USERS  # noqa: E402

WRITE = {"CREATE", "UPDATE", "WRITE", "DELETE", "APPROVE", "REJECT", "SUBMIT",
         "ASSIGN", "RUN", "MANAGE", "CONFIGURE", "VERIFY", "FREEZE", "UNFREEZE",
         "RESOLVE", "FLAG", "ISSUE", "PAYMENT_REQUEST", "CALCULATE", "REQUEST"}


def is_write(perm: str) -> bool:
    return perm.split(".")[-1] in WRITE


def main() -> None:
    print("=" * 78)
    print("DEV IDENTITIES")
    print("=" * 78)
    for username, user in DEV_USERS.items():
        print(f"  {username:<12} role={user['role']:<14} "
              f"id={user['id']:<12} projects={user['project_ids']}")

    print()
    print("=" * 78)
    print("ROLE x PERMISSION MATRIX (write permissions only)")
    print("=" * 78)
    for role in ALL_ROLES:
        perms = sorted(ROLE_PERMISSIONS.get(role, frozenset()))
        if "*" in perms:
            print(f"\n{role}: * (full control)")
            continue
        writes = [p for p in perms if is_write(p)]
        reads = [p for p in perms if not is_write(p)]
        print(f"\n{role}  ({len(perms)} total: {len(writes)} write / {len(reads)} read)")
        print(f"  WRITE: {', '.join(writes) if writes else '(none)'}")
        print(f"  READ : {', '.join(reads) if reads else '(none)'}")

    print()
    print("=" * 78)
    print("READ-ONLY ROLES (zero write permissions)")
    print("=" * 78)
    for role in ALL_ROLES:
        perms = ROLE_PERMISSIONS.get(role, frozenset())
        if "*" in perms:
            continue
        w = [p for p in perms if is_write(p)]
        if not w:
            print(f"  {role}: {len(perms)} read permissions, 0 writes")


if __name__ == "__main__":
    main()
