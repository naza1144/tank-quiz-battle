package tankquiz.authz

import rego.v1

default allow := false

# -------------------------------------------------------------
# 1. Role-to-Permissions Mapping Table
# -------------------------------------------------------------
role_permissions := {
    "ADMIN": [
        "*"
    ],
    "TEACHER": [
        "game:play",
        "game:join_squad",
        "quiz:vote",
        "portal:teacher",
        "quiz:read_all",
        "quiz:write",
        "quiz:import",
        "quiz:difficulty",
        "room:control",
        "stats:read_class",
        "stats:read_own",
        "lms:sync"
    ],
    "STUDENT": [
        "game:play",
        "game:join_squad",
        "quiz:vote",
        "stats:read_own"
    ],
    "GUEST": [
        "game:play",
        "game:join_squad",
        "quiz:vote"
    ]
}

# -------------------------------------------------------------
# 2. Derive User Permissions Array from Input Role
# -------------------------------------------------------------
# Query endpoint: /v1/data/tankquiz/authz/user_permissions
user_permissions contains perm if {
    role := input.role
    some p in role_permissions[role]
    perm := p
}

# -------------------------------------------------------------
# 3. Allow/Deny Evaluation Rule
# -------------------------------------------------------------
# Query endpoint: /v1/data/tankquiz/authz/allow
allow if {
    "*" in user_permissions
}

allow if {
    input.permission in user_permissions
}
