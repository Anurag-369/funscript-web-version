"use client";

import { useState } from "react";

interface Props {
  script: string;
  onScriptUpdate: (s: string) => void;
}

type Mode = "correct" | "rewrite" | "hooks";

export default function AIPanel({ script, onScriptUpdate }: Props) {
  const [mode, setMode] = useState<Mode>("correct");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setResult("");
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script, mode }),
      });
      const data = await res.json();
      setResult(data.result || "Something went wrong.");
    } catch {
      setResult("Error calling AI. Check your API key.");
    }
    setLoading(false);
  };

  return (
    <div className="w-72 shrink-0 bg-neutral-900 border-l border-neutral-800 flex flex-col gap-4 p-4 overflow-y-auto">
      <p className="text-sm font-semibold text-violet-400">✨ AI Assistant</p>

      <div className="flex flex-col gap-2">
        {([
          { id: "correct", label: "🔧 Fix transcript errors" },
          { id: "rewrite", label: "✏️ Rewrite (punchier)" },
          { id: "hooks",   label: "🎣 Suggest 3 hooks" },
        ] as { id: Mode; label: string }[]).map(m => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={`text-left text-sm px-3 py-2 rounded-lg border transition-colors ${
              mode === m.id
                ? "bg-violet-700 border-violet-500 text-white"
                : "bg-neutral-800 border-neutral-700 text-neutral-300 hover:bg-neutral-700"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <button
        onClick={run}
        disabled={loading}
        className="bg-violet-600 hover:bg-violet-500 disabled:bg-neutral-700 disabled:text-neutral-500 rounded-lg py-2 text-sm font-medium transition-colors"
      >
        {loading ? "Thinking..." : "Run AI ✨"}
      </button>

      {result && (
        <div className="flex flex-col gap-3">
          <div className="bg-neutral-800 rounded-lg p-3 text-sm text-neutral-200 whitespace-pre-wrap leading-relaxed border border-neutral-700">
            {result}
          </div>
          {mode !== "hooks" && (
            <button
              onClick={() => onScriptUpdate(result)}
              className="bg-green-700 hover:bg-green-600 rounded-lg py-2 text-sm font-medium transition-colors"
            >
              ✅ Use as script
            </button>
          )}
        </div>
      )}
    </div>
  );
}