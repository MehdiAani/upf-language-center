<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# UPF Language Center — Next.js 16 app (Sprint 1 implemented; build per SPEC.md)

## What exists now
- Next.js 16 App Router scaffold at root (`app/` dir, no `src/`).
- `SPEC.md`: product spec for a bilingual (FR/EN) language-center management platform (roles, permissions, sprints 1–4).
- `supabase/schema.sql`: Postgres schema + RLS policies; seeds departments ESMAB, FSI, FBS, HEALTH and semesters 2026-2027 S1/S2.
- `.env.local`: Supabase URL + publishable key (committed even though `.env*` is gitignored — do not add new secrets here).

## Sprint 1 — implemented
- Supabase browser + server clients + middleware session refresh (`@supabase/ssr`, NOT auth-helpers)
- next-intl cookie-based EN/FR (`next-intl.config.ts`, `messages/en.json`, `messages/fr.json`)
- `/login` (sign in + sign up, FR/EN toggle), `/pending` (role = 'pending' waiting room), sign-out server action
- `/dashboard` shell: global header (semester selector, FR/EN toggle, role badge, sign-out) + role-based sidebar
- `/dashboard` dept cards (Admin/Dept Head) and semi-module grid (Professor) from `department_semester_stats`
- `/departments/[id]` placeholder page
- `/admin/departments` and `/admin/users` (Admin only)

## Stack
- Installed: Next.js 16.4.6, React 19.3.0, TypeScript strict, Tailwind CSS v4, `@supabase/supabase-js`, `@supabase/ssr`, `next-intl`, `zod`, `lucide-react`
- Still to install (Sprint 3+): `xlsx`, `jspdf`, `jspdf-autotable`
- Path alias: `@/*` → `./*`
- `next.config.ts`: no `cacheComponents`/`partialPrefetching` (removed — incompatible with `force-dynamic` routes)
- Middleware: `middleware.ts` (Next.js convention, deprecated warning — use `proxy` for migration later)

## Commands
- `npm run dev` — dev server at http://localhost:3000 (Turbopack).
- `npm run build` — production build (includes typechecking). **Must pass clean.**
- `npm run start` — production server, only after `build`.
- `npm run lint` — eslint via `eslint-config-next`. **Must pass clean.**
- **No test script / test runner.** Verification = `lint` + `build`.

## Env vars (Supabase)
- Browser/server/middleware clients read `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (fallback to `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
- Do NOT use `@supabase/auth-helpers-nextjs`.

## Auth / RLS
- Supabase Auth + `public.profiles` table (role: admin/dept_head/professor/pending).
- RLS policies enforce role-based access; server components check `profile.role` and redirect to `/login` or `/pending`.
- New users auto-get `role = 'pending'` via `handle_new_user()` trigger.

## Git / repo state
- Single commit on `master`; `SPEC.md` and `supabase/` are untracked.
