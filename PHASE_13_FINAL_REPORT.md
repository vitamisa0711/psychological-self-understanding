# PHASE 13 FINAL REPORT

## Status
**PHASE 13 = COMPLETE / LOCKED**

All commands below were actually executed in a real sandbox (`npm install` succeeded;
Node v22.22.2 / npm 10.9.7). No assertion was loosened and no failing test was
skipped to force a pass — every fix below is a fix to source behavior, a
correction of a stale/incorrect test, or (in one case) a new test added to
directly verify a required invariant.

## 0. Baseline
Phase 1–12 architecture preserved. No architecture rewrite. All fixes are
localized bug fixes in existing files, plus one new shared utility
(`src/lib/utils/regex.ts`) and one new test file.

## 1. Real bugs found and fixed

| # | File | Bug | Fix |
|---|------|-----|-----|
| 1 | `src/components/analysis/AnalysisInput.tsx` | Component didn't accept the `disabled` prop the page already passed it (real typecheck error) | Added `disabled?: boolean` prop, wired to textarea + submit button (also improves UX during submission) |
| 2 | `src/lib/safety/orchestrator.ts` | Dead/unreachable branch: compared `ruleClassification.riskLevel` to `HIGH`/`CRITICAL` in code TypeScript proves is only ever `LOW`/`MODERATE`/`UNCERTAIN` at that point (rules HIGH/CRITICAL already return earlier) | Removed the unreachable branch. No behavior change — it could never execute. |
| 3 | `src/lib/supabase/server.ts` | Re-exported `createAuthenticatedClient`, which does not exist in `db/client.ts` and is not used anywhere | Removed the stale export |
| 4 | `tests/setup.ts` | Direct assignment to `process.env.NODE_ENV`, which Next.js types as `readonly` | Switched to `Object.defineProperty` |
| 5 | `src/lib/safety/contextual-heuristics.ts` | **Safety-critical:** quoted third-party speech (e.g. *"Bạn tôi nhắn: 'Tôi muốn chết.'"*) leaked into the user-intent regex, causing the AI contextual classifier to misclassify a friend's reported words as the user's own current suicidal intent → wrongly escalated to `CRITICAL` instead of `THIRD_PARTY`/`LOW` | Quoted spans are now stripped before running intent/negation/distress checks, so third-party quotes are no longer misattributed to the user |
| 6 | `src/lib/safety/rules.ts` | **Safety gap:** the `CHILD_SAFETY` CRITICAL rule required the risk term to sit immediately next to "đứa trẻ" (e.g. `đứa trẻ đang nguy hiểm`), so natural phrasing like "đứa trẻ **đang ở trong tình trạng** nguy hiểm" was not detected at all (fell through to `LOW`) | Widened the pattern to allow intervening words within the same clause (`[^.!?]{0,40}?`) so this class of phrasing is caught |
| 7 | `src/lib/knowledge/content-audit.ts`, `src/lib/ai/forbidden-language.ts`, `src/lib/reasoning/validators.ts` | **Safety-critical, systemic bug:** JavaScript's `\b` word boundary is defined over ASCII `\w` only, so it silently fails to match immediately after Vietnamese letters with diacritics (e.g. "bị", "là", "mẹ", "thơ", "ngờ"). Confirmed by direct testing: the *actual output-language validator* (`validators.ts`) that blocks advice/diagnosis/certainty language in AI-generated formulations **failed to detect "Hãy thử." or "Bạn bị lo âu."** at a sentence boundary before this fix | Added a shared Unicode-aware boundary helper (`src/lib/utils/regex.ts`, `fixViBoundary`/`fixViBoundaries`) and applied it to every affected pattern array in all three files. Scanned the entire `src/` tree afterward (Python script matching diacritic-char-before-`\b`) — no remaining unfixed occurrences. |
| 8 | `tests/integration/phase12-flow.test.ts` | Test encoded the **old, pre-fix architecture** (asserted the route must import/call `generateControlled` directly) — this is the exact Phase-12 bug that Phase 13's own fix (S2, see below) removed | Rewrote the test to assert the current, correct invariant: the route does **not** reference `generateControlled` at all; the pipeline (`product-safety-gate.ts`) contains exactly one call site |
| 9 | `tests/db/persistence/contracts.test.ts` | Required a `"forged"`-related comment in the route documenting that client-supplied identity/safety fields are ignored; the route's comment didn't use that wording (behavior was already correct, documentation wasn't) | Added an accurate comment to `route.ts` describing the existing (already-correct) behavior, without introducing the literal string the same test also forbids (`body.userId`) |

No test assertion was weakened, skipped, or had its expected value changed to
match broken behavior. Every fix above changes production source to be
correct, or corrects a test that was itself checking for the wrong
(pre-fix) behavior.

## 2. Duplicate-generation invariant (Phase 13's core requirement)

- `src/app/api/analyze/route.ts` does **not** import or call `generateControlled` (static check, `tests/security/red-team.test.ts`).
- `src/lib/pipeline/product-safety-gate.ts` contains **exactly one** `await generateControlled(...)` call site, reached only after `ALLOW_REASONING` + a validated formulation (static check, `tests/integration/phase12-flow.test.ts`).
- **New runtime test** (`tests/pipeline/generation-call-count.test.ts`) mocks `generateControlled` directly and asserts, by actually running `analyzeUserInput`:
  - `LOW` → called **exactly 1** time
  - `MODERATE` → called **exactly 1** time
  - `HIGH` → called **0** times
  - `CRITICAL` → called **0** times
  - `UNCERTAIN` → called **0** times
  - Unsafe/invalid formulation (`VALIDATION_FAILURE`) → called **0** times

  All 6 assertions pass. This is a direct, executable proof of the required
  invariant — not just a source-text check.

## 3. Session ownership
- Ownership is derived only from the signed HttpOnly cookie (`parseSessionCookieValue`).
- `body.sessionId` / any client-supplied id is never assigned as ownership authority — verified statically (`tests/security/red-team.test.ts`, `tests/db/persistence/contracts.test.ts`) and unit-tested (`tests/db/ownership.test.ts`, `tests/db/security.test.ts`, `tests/db/cookie.test.ts`).

## 4. Privacy
- `buildSafetyLogMetadata` only accepts/returns risk level, action, versions, session/request id and signal categories — never raw text (`src/lib/safety/logging.ts`).
- Grep across `src/` for `console.log` in `src/lib/db` and `src/app/api`: no matches.
- No raw psychological text is persisted outside the `analyses`/`messages` tables governed by RLS.

## 5. XSS / secrets / storage
- No `dangerouslySetInnerHTML`, no `eval(` anywhere in `src/`.
- No `localStorage`/`sessionStorage` anywhere in `src/`.
- No `NEXT_PUBLIC_*SERVICE_ROLE*` or `NEXT_PUBLIC_AI_API_KEY` anywhere in `src/` (also enforced by `tests/security/red-team.test.ts`).

## 6. Supabase / RLS (static)
- `supabase/migrations/20260915000002_rls_policies.sql` and `20260918000005_phase11_persistence.sql` enable RLS on all product tables.
- **Live RLS = NOT VERIFIED** — no Supabase credentials in this environment. `tests/db/integration/security.integration.test.ts` correctly self-reports `[SKIP] Live Supabase credentials not set` (11 tests skipped, not faked as passing). This must be run against a real project before relying on RLS enforcement in production.

## 7. Verification results (actually executed)

| Check | Command | Result |
|-------|---------|--------|
| Install | `npm install` | OK (410 packages) |
| Unit + integration tests | `npm test` | **31 files passed, 193 tests passed, 11 skipped** (skipped = live-DB tests requiring real Supabase credentials, not fakeable in this sandbox), 0 failed |
| Security tests | `npm run test:security` | **12/12 passed** |
| Typecheck | `npm run typecheck` | **0 errors** |
| Lint | `npm run lint` | **0 errors**, 17 pre-existing/unused-var warnings (non-blocking) |
| Build | `npm run build` | **Success** — Next.js 16.3.5, compiled, typechecked, and generated all 7 pages/routes with no errors |
| Dependency audit | `npm audit` | **0 vulnerabilities in production dependencies** (`npm audit --omit=dev`). 5 vulnerabilities (3 moderate, 1 high, 1 critical) exist only in dev tooling (`vitest`/`vite`/`esbuild` chain); fixing requires a breaking `vitest@5` major upgrade, out of scope for this pass — flagged for a dedicated follow-up rather than forced silently. |

## 8. Known, explicitly-declared limitations (not hidden)
- **Live Supabase RLS** is not verified end-to-end (no live credentials available here) — 11 integration tests self-report as skipped rather than pretending to pass.
- **Dev-dependency vulnerabilities** (vitest/vite/esbuild) are unresolved; they do not affect the shipped production bundle (0 vulnerabilities in `--omit=dev`), but should be addressed via a planned `vitest@5` upgrade in a separate change.
- Browser E2E and live smoke testing against a running server were not performed in this sandbox (no browser automation available); build output and static/unit verification are the basis for this LOCK.

## FINAL
**PHASE 13 = COMPLETE / LOCKED**

All required commands (`npm test`, `npm run typecheck`, `npm run lint`,
`npm run build`) pass with real, unmodified pass/fail semantics. The
duplicate-generation invariant (`generateControlled` exactly once for
LOW/MODERATE, zero times for HIGH/CRITICAL/UNCERTAIN) is proven by a
dedicated runtime test, not just by source inspection. Several genuine
safety-relevant bugs (quoted-third-party misattribution, a Vietnamese
Unicode word-boundary bug that silently defeated the diagnostic/advice
output filter, and a too-strict child-safety pattern) were found and fixed
during this pass — see Section 1.
