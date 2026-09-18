import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Phase 12 integration contracts", () => {
  it("analyze client exists and does not set safety fields", () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), "src/lib/api/analyze-client.ts"),
      "utf-8"
    );
    expect(src).toMatch(/postAnalyze/);
    expect(src).not.toMatch(/riskLevel/);
    expect(src).not.toMatch(/allowReasoning/);
  });

  it("analyze page uses postAnalyze and session bootstrap", () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), "src/app/analyze/page.tsx"),
      "utf-8"
    );
    expect(src).toMatch(/postAnalyze/);
    expect(src).toMatch(/\/api\/session/);
    expect(src).toMatch(/submitting/);
  });

  it("session route sets HttpOnly cookie", () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), "src/app/api/session/route.ts"),
      "utf-8"
    );
    expect(src).toMatch(/httpOnly:\s*true/);
    expect(src).toMatch(/createSessionCookieValue/);
  });

  it("api analyze prefers cookie session and does not itself call generateControlled", () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), "src/app/api/analyze/route.ts"),
      "utf-8"
    );
    expect(src).toMatch(/parseSessionCookieValue/);
    // Phase 13 fix (S2): the route must NOT import/call generateControlled
    // directly — the pipeline (product-safety-gate.ts) owns the single
    // generation call. A duplicate call site in the route was the Phase 12
    // bug this test previously (incorrectly) required.
    expect(src).not.toMatch(/generateControlled/);
  });

  it("product safety gate owns the single generateControlled call site", () => {
    const src = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/lib/pipeline/product-safety-gate.ts"
      ),
      "utf-8"
    );
    const calls = src.split("generateControlled").length - 1;
    // Exactly two textual occurrences expected: the import statement and the
    // single `await generateControlled(...)` call site.
    expect(calls).toBe(2);
  });

  it("no service role in browser client", () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), "src/lib/supabase/browser.ts"),
      "utf-8"
    );
    expect(src).not.toMatch(/SERVICE_ROLE/);
  });
});
