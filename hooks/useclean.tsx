import { useState } from "react";

export function useGroqClean() {
  const [cleaning, setCleaning] = useState(false);

  const cleanScript = async (raw: string): Promise<string> => {
    setCleaning(true);
    try {
      const res = await fetch("/api/clean-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script: raw }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.error ?? "Failed to clean script");
      }

      const data = await res.json();
      return data.cleaned ?? raw;
    } finally {
      setCleaning(false);
    }
  };

  return { cleanScript, cleaning };
}