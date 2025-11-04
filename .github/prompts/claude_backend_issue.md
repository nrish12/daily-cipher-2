Title: Backend hardening for server.js + API docs

@claude

## Lane (enforced for this task)
- You may edit: `server.js`, `utils/**`, `supabase/**`, and `package.json` (only to add backend deps/scripts).
- Do NOT edit: `src/**`, `public/**`, or root configs (`vite.config.ts`, `tsconfig*.json`, `eslint.config.js`, `tailwind.config.js`) unless absolutely required — if so, leave TODOs in the PR body instead of changing them.

## Task
1) Add input validation and helpful error handling to existing routes in `server.js`.
2) Extract duplicated logic into `utils/**` where it makes sense.
3) Ensure Supabase calls handle auth/session/edge cases (timeouts, null data, permission errors).
4) No secrets in code. Expect values via `process.env.*`. List required ENV var names in the PR (no values).

## Acceptance
- API section in PR lists for each endpoint touched/added:
  - METHOD + PATH
  - Inputs (required/optional, types)
  - Responses (success + common error shapes)
  - Status codes
- How to run locally (commands) and a simple test plan (curl or fetch examples).
- Any contract change includes clear TODOs for frontend (tag area:frontend).
- Small, focused diff (no formatting-only churn). Helpful error logs; success paths not noisy.
