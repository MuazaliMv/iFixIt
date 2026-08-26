# Global Authentication + OTP Gate

## Rule

No user may access or perform any protected application function unless both conditions are true:

1. the request has a valid authenticated session;
2. the account has completed OTP verification for the active phone identity.

Unauthenticated or non-OTP-verified users are limited to the authentication, OTP verification, logout, and recovery flows required to complete authentication.

## Enforcement boundary

This rule must be enforced server-side for every protected page, route handler, server action, RPC-backed mutation, and privileged data read. Client-side redirects and disabled buttons are only usability helpers and must never be treated as the security control.

## Required implementation

- Centralize the check in one server-side authorization helper.
- Reuse that helper from protected route handlers and server actions.
- Add an app-level request gate for protected page navigation.
- Deny by default when session state, OTP state, or authorization state cannot be determined.
- Preserve only the minimum public allow-list needed for login/OTP/recovery and static assets.
- Return `401` for unauthenticated requests and `403` for authenticated sessions that have not completed OTP verification or lack the required role/permission.
- Log denied protected actions without recording OTP codes or session secrets.

## OTP state

OTP verification must be based on trusted server-side identity/session data. Do not trust a browser-local flag, query parameter, hidden form field, or client-only state to prove OTP completion.

## Acceptance tests

1. Anonymous page navigation to a protected route is redirected to login.
2. Anonymous protected API calls receive `401`.
3. Authenticated but non-OTP-verified page navigation is restricted to OTP completion.
4. Authenticated but non-OTP-verified protected API calls receive `403`.
5. OTP-verified users can access only actions permitted by their role/permissions.
6. A stale/expired session fails closed.
7. Direct calls to protected APIs cannot bypass UI guards.
8. Logout immediately removes access to protected functions.

## Change policy

Any new protected page, API, server action, or mutation must use the central gate before it can be merged.
