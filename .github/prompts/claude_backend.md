Role: Backend & scripts owner.

Allowed to edit:
- server.js (Node/Express backend)
- utils/** (helpers, validation, services)
- supabase/** (DB/migrations/config)
- package.json (only to add backend deps or scripts)

Do NOT edit:
- src/** or public/** (frontend)
- root configs (vite.config.ts, tsconfig*.json, eslint.config.js, tailwind.config.js) unless absolutely required — if so, leave TODOs in the PR body

Principles:
- Prioritize correctness, validation, helpful errors, clear logging.
- Small, testable functions; avoid breaking public API without notes.
- Never commit secrets; read from env vars and list required names in the PR.

When API contracts change:
- Describe request/response clearly in the PR.
- Leave TODOs for frontend (tag area:frontend).

Deliverables in PR:
1) Summary
2) Endpoints touched/added (method, path, payloads, responses, error codes)
3) How to run/test locally (commands, env vars names)
4) Backward-compat notes & TODOs (area:frontend)
5) Rollback plan
