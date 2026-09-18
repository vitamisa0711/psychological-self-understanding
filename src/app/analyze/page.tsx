"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AnalysisInput } from "@/components/analysis/AnalysisInput";
import { AnalysisLoading } from "@/components/analysis/AnalysisLoading";
import { AnalysisResult } from "@/components/result/AnalysisResult";
import { SafetyPanel } from "@/components/safety/SafetyPanel";
import { ErrorState } from "@/components/common/ErrorState";
import { postAnalyze } from "@/lib/api/analyze-client";

type UiPhase = "input" | "loading" | "result" | "safety" | "uncertain" | "error";

export default function AnalyzePage() {
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<UiPhase>("input");
  const [payload, setPayload] = useState<Record<string, unknown> | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/session", { credentials: "same-origin" });
        if (!res.ok) return;
        const data = (await res.json()) as { sessionId?: string };
        if (!cancelled && data.sessionId) setSessionId(data.sessionId);
      } catch {
        // Session optional for analyze UX without DB
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onSubmit = useCallback(async () => {
    if (submitting) return;
    const trimmed = text.trim();
    if (trimmed.length < 10) {
      setErrorMessage("Hãy mô tả cụ thể hơn một chút (ít nhất vài câu).");
      setPhase("error");
      return;
    }
    if (trimmed.length > 4000) {
      setErrorMessage("Nội dung vượt quá giới hạn 4000 ký tự.");
      setPhase("error");
      return;
    }

    setSubmitting(true);
    setPhase("loading");
    setErrorMessage("");
    setPayload(null);

    try {
      const data = await postAnalyze({ text: trimmed, sessionId });
      setPayload(data as unknown as Record<string, unknown>);

      if (data.kind === "SAFETY_RESPONSE") {
        setPhase("safety");
      } else if (
        data.kind === "SAFE_FAILURE" ||
        data.kind === "VALIDATION_FAILURE"
      ) {
        setPhase("uncertain");
      } else if (data.kind === "FORMULATION") {
        setPhase("result");
      } else {
        setErrorMessage(data.message || "Đã xảy ra lỗi.");
        setPhase("error");
      }
    } catch {
      setErrorMessage("Không thể kết nối. Vui lòng thử lại.");
      setPhase("error");
    } finally {
      setSubmitting(false);
    }
  }, [text, sessionId, submitting]);

  function reset() {
    setPhase("input");
    setPayload(null);
    setErrorMessage("");
  }

  const messageFromPayload =
    (typeof payload?.message === "string" && payload.message) ||
    (typeof (payload?.safetyResponse as { message?: string } | undefined)
      ?.message === "string" &&
      (payload?.safetyResponse as { message?: string }).message) ||
    (typeof (payload?.safeFailure as { message?: string } | undefined)
      ?.message === "string" &&
      (payload?.safeFailure as { message?: string }).message) ||
    undefined;

  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-4 py-6">
      <header className="mb-6 flex items-center justify-between">
        <Link href="/" className="text-sm text-stone-500 hover:text-stone-800">
          ← Trang chủ
        </Link>
      </header>

      <main className="flex flex-1 flex-col gap-6">
        {phase === "input" && (
          <AnalysisInput
            value={text}
            onChange={setText}
            onSubmit={onSubmit}
            disabled={submitting}
          />
        )}
        {phase === "loading" && <AnalysisLoading />}
        {phase === "result" && payload && (
          <AnalysisResult data={payload} onReset={reset} />
        )}
        {phase === "safety" && (
          <SafetyPanel
            variant="safety"
            message={messageFromPayload}
            onReset={reset}
          />
        )}
        {phase === "uncertain" && (
          <SafetyPanel
            variant="uncertain"
            message={messageFromPayload}
            onReset={reset}
          />
        )}
        {phase === "error" && (
          <ErrorState message={errorMessage} onReset={reset} />
        )}
      </main>
    </div>
  );
}
