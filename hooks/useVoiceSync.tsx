"use client";

import { useRef, useState, useCallback, useEffect } from "react";

/**
 * useVoiceSync
 * Drives real-time, word-level teleprompter advancement using the browser's
 * native SpeechRecognition (instant, streaming) — separate from LiveTranscript's
 * Whisper pipeline, which is batched/chunked and tuned for saved-transcript accuracy.
 *
 * Give it the FULL flat `words` array of the script. It tracks a global
 * wordIndex pointer and calls onAdvance(newIndex) every time it matches
 * forward. Teleprompter derives currentChunkIndex/highlightWordIndex from that.
 */

interface UseVoiceSyncProps {
  words: string[];
  enabled: boolean; // hook starts/stops recognition automatically based on this
  onAdvance?: (newIndex: number) => void;
  matchThreshold?: number; // 0-1, lower = stricter. default 0.3
}

function normalize(word: string): string {
  return word.toLowerCase().replace(/[^\w']/g, "");
}

function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, () =>
    new Array(b.length + 1).fill(0)
  );
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

function isFuzzyMatch(spoken: string, expected: string, threshold: number): boolean {
  if (!spoken || !expected) return false;
  if (spoken === expected) return true;
  const dist = levenshtein(spoken, expected);
  const maxLen = Math.max(spoken.length, expected.length);
  return dist / maxLen <= threshold;
}

export function useVoiceSync({
  words,
  enabled,
  onAdvance,
  matchThreshold = 0.3,
}: UseVoiceSyncProps) {
  const [wordIndex, setWordIndex] = useState(0);
  const [isListening, setIsListening] = useState(false);

  const wordIndexRef = useRef(0);
  const wordsRef = useRef<string[]>([]);
  const recognitionRef = useRef<any>(null);
  const manuallyStoppedRef = useRef(false);

  useEffect(() => {
    wordsRef.current = words.map(normalize);
  }, [words]);

  const start = useCallback(() => {
    if (recognitionRef.current) return; // already running

    const SpeechRecognitionImpl =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionImpl) {
      console.error("Web Speech API not supported in this browser (use Chrome/Edge).");
      return;
    }

    manuallyStoppedRef.current = false;
    const recognition = new SpeechRecognitionImpl();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      const lastResult = event.results[event.results.length - 1];
      const transcript: string = lastResult[0].transcript;
      const spokenWords = transcript.trim().split(/\s+/).map(normalize);

      let idx = wordIndexRef.current;
      const expected = wordsRef.current;

      for (const spokenWord of spokenWords) {
        if (idx >= expected.length) break;
        if (isFuzzyMatch(spokenWord, expected[idx], matchThreshold)) {
          idx++;
        }
      }

      if (idx !== wordIndexRef.current) {
        wordIndexRef.current = idx;
        setWordIndex(idx);
        onAdvance?.(idx);
      }
    };

    recognition.onerror = (e: any) => {
      // 'no-speech' fires constantly during natural pauses — not a real error
      if (e.error !== "no-speech") console.error("Speech recognition error:", e.error);
    };

    recognition.onend = () => {
      // Chrome kills recognition after a stretch of silence — restart unless we asked it to stop
      if (!manuallyStoppedRef.current) {
        recognition.start();
      } else {
        setIsListening(false);
      }
    };

    recognition.start();
    recognitionRef.current = recognition;
    setIsListening(true);
  }, [matchThreshold, onAdvance]);

  const stop = useCallback(() => {
    manuallyStoppedRef.current = true;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
  }, []);

  const reset = useCallback((toIndex: number = 0) => {
    wordIndexRef.current = toIndex;
    setWordIndex(toIndex);
  }, []);

  // Auto start/stop recognition based on `enabled` flag
  useEffect(() => {
    if (enabled) start();
    else stop();
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return { wordIndex, isListening, reset };
}