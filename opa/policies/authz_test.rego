package tankquiz.authz

import rego.v1

test_admin_has_wildcard if {
    perms := user_permissions with input as {"role": "ADMIN"}
    "*" in perms
}

test_admin_allow_anything if {
    allow with input as {"role": "ADMIN", "permission": "any:action"}
}

test_teacher_has_portal_permission if {
    perms := user_permissions with input as {"role": "TEACHER"}
    "portal:teacher" in perms
    "quiz:write" in perms
}

test_teacher_allow_quiz_write if {
    allow with input as {"role": "TEACHER", "permission": "quiz:write"}
}

test_student_denied_portal if {
    perms := user_permissions with input as {"role": "STUDENT"}
    not "portal:teacher" in perms
    not allow with input as {"role": "STUDENT", "permission": "portal:teacher"}
}

test_student_allowed_play if {
    allow with input as {"role": "STUDENT", "permission": "game:play"}
}
