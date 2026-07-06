"use client";

import { useRef, useState, useEffect } from "react";
import LiveTranscript from "./livetranscript";
import AIPanel from "./aipanel";
import { useWpm } from "@/hooks/usewpm";
import WpmGauge from "@/components/wpmgauge";
import { useGroqClean } from "@/hooks/useclean";
import { useVoiceSync } from "@/hooks/useVoiceSync";
import { createClient } from "@/lib/supabase/client";

const CHUNK_SIZE = 6;
const DEFAULT_SPEED = 3;

function chunkWords(words: string[], size: number): string[][] {
  const chunks: string[][] = [];
  for (let i = 0; i < words.length; i += size) {
    chunks.push(words.slice(i, i + size));
  }
  return chunks;
}

export default function Teleprompter() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const chunkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transcriptBufferRef = useRef<string>("");
  const pausedForVoiceRef = useRef(false);
  const lastTranscriptTime = useRef<number>(0);
  const voicePauseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [romanize, setRomanize] = useState(false);

  const [camOn, setCamOn] = useState(false);
  const [script, setScript] = useState(
`This is a sample script for the teleprompter. You can edit this text to test the scrolling functionality. The script will scroll automatically based on the speed you set, and you can also use voice synchronization if you have a microphone connected. Enjoy using the teleprompter!
Feel free to add more text here to see how the teleprompter handles longer scripts. The text will be divided into chunks, and each chunk will be highlighted as it scrolls. You can also adjust the font size and speed to suit your preferences. Happy prompting!`
  );
  const [isScrolling, setIsScrolling] = useState(false);
  const [speed, setSpeed] = useState(DEFAULT_SPEED);
  const [fontSize, setFontSize] = useState(48);
  const [micOn, setMicOn] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [highlightWordIndex, setHighlightWordIndex] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [voiceSync, setVoiceSync] = useState(false);
  const [waitingForVoice, setWaitingForVoice] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const { data: wpmData, recordWords, reset } = useWpm();
  const { cleanScript, cleaning } = useGroqClean();

  const words = script.split(/\s+/).filter(Boolean);
  const chunks = chunkWords(words, CHUNK_SIZE);
  const totalChunks = chunks.length;
  const totalWords = words.length;

  const currentWordIndex = currentChunkIndex * CHUNK_SIZE + highlightWordIndex;
  const progress = totalWords > 0 ? Math.round((currentWordIndex / totalWords) * 100) : 0;

  // Add at top of component
  const supabase = createClient();
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? "");
    });
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/auth/login";
  };

  // ── Voice sync: real word-level matching via Web Speech API ──
  // Separate from LiveTranscript's Whisper pipeline (which is chunked/batched
  // for saved-transcript accuracy). This drives instant word-by-word advancement.
  const handleVoiceAdvance = (newIndex: number) => {
    const clamped = Math.min(newIndex, totalWords - 1);
    setCurrentChunkIndex(Math.floor(clamped / CHUNK_SIZE));
    setHighlightWordIndex(clamped % CHUNK_SIZE);
    if (newIndex >= totalWords) setIsScrolling(false); // reached script end by voice
  };

  const { reset: resetVoiceSync } = useVoiceSync({
    words,
    enabled: voiceSync && micOn && isScrolling,
    onAdvance: handleVoiceAdvance,
  });

  const handleCleanScript = async () => {
    const cleaned = await cleanScript(script);
    setScript(cleaned);
    handleReset();
  };

  const handleStart = () => {
    if (isScrolling) {
      setIsScrolling(false);
      return;
    }
    setCountdown(3);
  };

  // Countdown effect
  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      const t = setTimeout(() => {
        setCountdown(null);
        setIsScrolling(true);
      }, 700);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setCountdown(countdown - 1), 900);
    return () => clearTimeout(t);
  }, [countdown]);

  // Called from LiveTranscript on each transcription chunk
  const handleTranscriptWord = (count: number, text?: string) => {
    recordWords(count);

    if (text) {
      const allWords = (transcriptBufferRef.current + " " + text).trim().split(/\s+/);
      transcriptBufferRef.current = allWords.slice(-60).join(" ");
    }

    if (voiceSync && micOn && text && text.trim().length > 0) {
      // Real speech detected — unpause
      lastTranscriptTime.current = Date.now();
      pausedForVoiceRef.current = false;
      setWaitingForVoice(false);

      // Start silence detector — if no new transcript in 1.5s, pause again
      if (voicePauseTimer.current) clearTimeout(voicePauseTimer.current);
      voicePauseTimer.current = setTimeout(() => {
        pausedForVoiceRef.current = true;
        setWaitingForVoice(true);
      }, 1500);
    }
  };

  // Main scroll loop
  useEffect(() => {
    if (!isScrolling) {
      if (chunkTimerRef.current) clearTimeout(chunkTimerRef.current);
      return;
    }

    // When voice sync is active, word position is driven by live speech matching
    // (see useVoiceSync above), not this fixed-WPM timer. Skip the timer loop.
    if (voiceSync && micOn) return;

    const msPerWord = 1000 / speed;
    const currentChunk = chunks[currentChunkIndex] ?? [];

    const moveToNextChunk = () => {
      const next = currentChunkIndex + 1;
      if (next >= totalChunks) {
        setIsScrolling(false);
        return;
      }
      setAnimating(true);
      chunkTimerRef.current = setTimeout(() => {
        setCurrentChunkIndex(next);
        setHighlightWordIndex(0);
        setAnimating(false);
      }, msPerWord * 0.6);
    };

    const advanceWord = (wordIdx: number) => {
      // Voice sync: pause if user stopped speaking
      if (voiceSync && micOn && pausedForVoiceRef.current) {
        chunkTimerRef.current = setTimeout(() => advanceWord(wordIdx), 200);
        return;
      }

      if (wordIdx >= currentChunk.length) {
        moveToNextChunk();
        return;
      }

      setHighlightWordIndex(wordIdx);
      chunkTimerRef.current = setTimeout(() => advanceWord(wordIdx + 1), msPerWord);
    };

    chunkTimerRef.current = setTimeout(() => advanceWord(highlightWordIndex), msPerWord);

    return () => {
      if (chunkTimerRef.current) clearTimeout(chunkTimerRef.current);
    };
  }, [isScrolling, speed, currentChunkIndex, totalChunks, voiceSync, micOn]);

  const toggleCam = async () => {
    if (!camOn) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        if (videoRef.current) videoRef.current.srcObject = stream;
        setCamOn(true);
      } catch (err) {
        alert("Camera access denied: " + err);
      }
    } else {
      const stream = videoRef.current?.srcObject as MediaStream;
      stream?.getTracks().forEach((t) => t.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
      setCamOn(false);
    }
  };

  const handleReset = () => {
    setIsScrolling(false);
    setCurrentChunkIndex(0);
    setHighlightWordIndex(0);
    setAnimating(false);
    setCountdown(null);
    setWaitingForVoice(false);
    transcriptBufferRef.current = "";
    pausedForVoiceRef.current = false;
    lastTranscriptTime.current = 0;
    if (chunkTimerRef.current) clearTimeout(chunkTimerRef.current);
    if (voicePauseTimer.current) clearTimeout(voicePauseTimer.current);
    resetVoiceSync(0);
    reset();
  };

  // Load a transcript picked from the "My Transcripts" page, if any
  useEffect(() => {
    const saved = sessionStorage.getItem("funscript:loadedTranscript");
    if (saved) {
      try {
        const { content } = JSON.parse(saved);
        if (content) {
          setScript(content);
          handleReset();
        }
      } catch (err) {
        console.error("Failed to parse loaded transcript:", err);
      } finally {
        sessionStorage.removeItem("funscript:loadedTranscript");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentChunk = chunks[currentChunkIndex] ?? [];
  const nextChunk = chunks[currentChunkIndex + 1] ?? [];
  const [saving, setSaving] = useState(false);

  const handleSaveTranscript = async () => {
    const title = window.prompt("Name this transcript:", `Script ${new Date().toLocaleDateString("en-IN")}`);
    if (!title) return; // user cancelled

    setSaving(true);
    try {
      const res = await fetch("/api/transcripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content: script, script }),
      });
      if (!res.ok) throw new Error(`Save failed: ${res.status}`);
      alert("Transcript saved!");
    } catch (err) {
      console.error(err);
      alert("Couldn't save transcript. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-screen bg-black text-white">

      {/* ── Sidebar ── */}
      <div className="w-64 shrink-0 bg-neutral-900 border-r border-neutral-800 flex flex-col gap-5 p-4 overflow-y-auto">
        <p className="font-semibold text-sm text-violet-400">🎬 FunScript</p>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-neutral-400">SCRIPT</label>
          <textarea
            className="bg-neutral-800 rounded-lg p-2 text-sm resize-none border border-neutral-700 focus:outline-none focus:border-violet-500 h-40"
            value={script}
            onChange={(e) => { setScript(e.target.value); handleReset(); }}
          />
        </div>

        <button
          onClick={handleCleanScript}
          disabled={cleaning}
          className={`rounded-lg py-2 text-sm font-medium transition-colors ${
            cleaning ? "bg-neutral-600 text-neutral-400 cursor-wait" : "bg-violet-600 hover:bg-violet-500"
          }`}
        >
          {cleaning ? "✨ Cleaning…" : "✨ Clean Script"}
        </button>
        <button
          onClick={handleSaveTranscript}
          disabled={saving}
          className={`rounded-lg py-2 text-sm font-medium transition-colors ${
            saving ? "bg-neutral-600 text-neutral-400 cursor-wait" : "bg-neutral-700 hover:bg-neutral-600"
          }`}
        >
          {saving ? "💾 Saving…" : "💾 Save Transcript"}
        </button>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-neutral-400">SPEED: {Math.round(speed * 60)} WPM</label>
          <input type="range" min="0.8" max="4" step="0.1" value={speed}
            onChange={(e) => setSpeed(+e.target.value)} className="accent-violet-500" />
          <div className="flex justify-between text-[10px] text-neutral-500">
            <span>48 WPM</span><span>240 WPM</span>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-neutral-400">FONT SIZE: {fontSize}px</label>
          <input type="range" min="24" max="72" value={fontSize}
            onChange={(e) => setFontSize(+e.target.value)} className="accent-violet-500" />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-neutral-400">PROGRESS: {progress}%</label>
          <div className="h-2 bg-neutral-700 rounded-full overflow-hidden">
            <div className="h-full bg-violet-500 transition-all duration-300"
              style={{ width: `${progress}%` }} />
          </div>
          <p className="text-[10px] text-neutral-500">
            Word {currentWordIndex + 1} / {totalWords}
          </p>
        </div>

        <button onClick={toggleCam}
          className={`rounded-lg py-2 text-sm font-medium ${camOn ? "bg-violet-700" : "bg-neutral-700"}`}>
          {camOn ? "📷 Camera On" : "📷 Camera Off"}
        </button>

        <button onClick={() => setMicOn((m) => !m)}
          className={`rounded-lg py-2 text-sm font-medium ${micOn ? "bg-green-700" : "bg-neutral-700"}`}>
          {micOn ? "🎙 Mic On" : "🎙 Mic Off"}
        </button>
        <div className="mt-auto pt-4 border-t border-neutral-800 flex flex-col gap-2">
          <p className="text-[10px] text-neutral-500 truncate">{userEmail}</p>
          <button
            onClick={() => window.location.href = "/transcripts"}
            className="rounded-lg py-2 text-sm font-medium bg-neutral-800 hover:bg-neutral-700"
          >
            📄 My Transcripts
          </button>
          <button
            onClick={handleSignOut}
            className="rounded-lg py-2 text-sm font-medium bg-neutral-800 hover:bg-red-900/40 text-red-400"
          >
            Sign Out
          </button>
        </div>
        <button onClick={() => {
          setVoiceSync((v) => {
            const next = !v;
            if (!next) {
              // turning off — clear pause so prompter resumes
              pausedForVoiceRef.current = false;
              setWaitingForVoice(false);
              if (voicePauseTimer.current) clearTimeout(voicePauseTimer.current);
            }
            return next;
          });
        }}
          className={`rounded-lg py-2 text-sm font-medium ${voiceSync ? "bg-green-700" : "bg-neutral-700"}`}>
          {voiceSync ? "🎤 Voice Sync On" : "🎤 Voice Sync Off"}
        </button>

        <button onClick={() => setShowAI((s) => !s)}
          className={`rounded-lg py-2 text-sm font-medium ${showAI ? "bg-violet-700" : "bg-neutral-700"}`}>
          {showAI ? "✨ AI On" : "✨ AI Off"}
        </button>

        <button onClick={handleStart}
          className="rounded-lg py-2 text-sm font-medium bg-violet-600">
          {isScrolling ? "⏸ Pause" : "▶ Start"}
        </button>

        <button onClick={handleReset}
          className="rounded-lg py-2 text-sm font-medium bg-neutral-700">
          ↺ Reset
        </button>
      </div>

      {/* ── Main view ── */}
      <div className="relative flex-1 overflow-hidden bg-black">

        <video ref={videoRef} autoPlay muted playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-70" />

        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/60 pointer-events-none" />

        {/* Countdown overlay */}
        {countdown !== null && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 pointer-events-none">
            <span
              key={countdown}
              style={{
                fontSize: "180px",
                fontWeight: 900,
                color: countdown === 0 ? "#4ade80" : "#a78bfa",
                lineHeight: 1,
                animation: "countPop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                textShadow: countdown === 0
                  ? "0 0 80px rgba(74,222,128,0.8)"
                  : "0 0 80px rgba(167,139,250,0.8)",
              }}
            >
              {countdown === 0 ? "GO!" : countdown}
            </span>
          </div>
        )}

        {/* Waiting for voice indicator */}
        {waitingForVoice && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-yellow-500/20 border border-yellow-500/40 rounded-full px-4 py-1">
            <span className="text-yellow-400 text-sm font-medium">⏳ Waiting for you…</span>
          </div>
        )}

        {/* Chunk display */}
        <div ref={containerRef}
          className="absolute inset-0 flex flex-col items-center justify-center px-10 gap-6 pointer-events-none">

          <div className="text-center leading-tight" style={{
            opacity: animating ? 0 : 1,
            transform: animating ? "translateY(-8px)" : "translateY(0)",
            transition: "opacity 0.15s ease, transform 0.15s ease",
          }}>
            {currentChunk.map((word, i) => {
              const isActive = i === highlightWordIndex;
              const isPast = i < highlightWordIndex;
              return (
                <span key={i} style={{
                  display: "inline-block",
                  marginRight: "0.3em",
                  fontSize: `${fontSize}px`,
                  fontWeight: isActive ? 800 : 600,
                  color: isActive ? "#a78bfa" : isPast ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.95)",
                  transform: isActive ? "scale(1.1)" : "scale(1)",
                  transition: "color 0.12s ease, transform 0.12s ease",
                  textShadow: isActive
                    ? "0 0 40px rgba(167,139,250,0.7)"
                    : "0 2px 16px rgba(0,0,0,0.9)",
                }}>
                  {word}
                </span>
              );
            })}
          </div>

          {nextChunk.length > 0 && (
            <div className="text-center leading-tight" style={{
              opacity: 0.35, filter: "blur(1px)",
              transition: "opacity 0.15s ease",
              pointerEvents: "none", userSelect: "none",
            }}>
              {nextChunk.map((word, i) => (
                <span key={i} style={{
                  display: "inline-block", marginRight: "0.3em",
                  fontSize: `${fontSize * 0.65}px`, fontWeight: 400,
                  color: "rgba(255,255,255,0.6)",
                }}>
                  {word}
                </span>
              ))}
            </div>
          )}
        </div>

        <LiveTranscript active={micOn} onWord={handleTranscriptWord} />

        {showAI && (
          <div className="relative z-50 pointer-events-auto">
            <AIPanel script={script} onScriptUpdate={setScript} />
          </div>
        )}

        <WpmGauge wpm={wpmData.wpm} status={wpmData.status} visible={micOn} />
      </div>

      <style>{`
        @keyframes countPop {
          0% { transform: scale(0.5); opacity: 0; }
          70% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}