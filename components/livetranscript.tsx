"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  active: boolean;
  onWord: (count: number, text?: string) => void;
}

const CHUNK_INTERVAL_MS = 9000; // was 5000 — longer chunks = better accuracy

export default function LiveTranscript({ active, onWord }: Props) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const finalRef = useRef<string>("");
  const isProcessingRef = useRef(false);
  const [transcript, setTranscript] = useState("");
  const [fullTranscript, setFullTranscript] = useState("");
  const [converting, setConverting] = useState(false);

  const saveToFile = () => {
    const text = fullTranscript.trim() || finalRef.current.trim();
    if (!text) {
      alert("Nothing to save yet — start speaking first!");
      return;
    }
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transcript-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    finalRef.current = "";
    setTranscript("");
    setFullTranscript("");
  };

  const convertToHinglish = async () => {
    const text = fullTranscript.trim();
    if (!text) return;
    setConverting(true);
    try {
      const res = await fetch("/api/hinglish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (data.result) {
        finalRef.current = data.result;
        setFullTranscript(data.result);
        setTranscript(data.result);
      }
    } catch (err) {
      console.error("Romanize error:", err);
    } finally {
      setConverting(false);
    }
  };

  const sendChunk = async (blob: Blob) => {
    if (blob.size < 1000 || isProcessingRef.current) return;
    isProcessingRef.current = true;

    try {
      const formData = new FormData();
      formData.append("audio", blob, "chunk.webm");

      // Pass the tail of what we've transcribed so far as context —
      // helps Whisper stay consistent across chunk boundaries and
      // reduces boundary-word garbling.
      // const contextTail = finalRef.current.trim().split(/\s+/).slice(-40).join(" ");
      // if (contextTail) formData.append("prompt", contextTail);

      const res = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      const { transcript: newText } = await res.json();

      if (newText && newText.trim()) {
        const wordCount = newText.trim().split(/\s+/).filter(Boolean).length;
        onWord(wordCount, newText.trim());

        finalRef.current += newText + " ";
        setFullTranscript(finalRef.current);
        setTranscript(finalRef.current.trim());
      }
    } catch (err) {
      console.error("Transcribe error:", err);
    } finally {
      isProcessingRef.current = false;
    }
  };

  useEffect(() => {
    if (!active) {
      mediaRecorderRef.current?.stop();
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      const mimeType = MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      intervalRef.current = setInterval(() => {
        if (recorder.state === "recording") recorder.stop();
      }, CHUNK_INTERVAL_MS);

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        chunksRef.current = [];
        sendChunk(blob);
        if (active) recorder.start();
      };

      recorder.start();
    }).catch((err) => {
      console.error("Mic error:", err);
    });

    return () => {
      mediaRecorderRef.current?.stop();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [active]);

  const saveToCloud = async () => {
    const text = fullTranscript.trim();
    if (!text) return;
    const title = `Transcript ${new Date().toLocaleDateString("en-IN", {
      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
    })}`;
    await fetch("/api/transcripts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content: text }),
    });
    alert("Saved to your account!");
  };

  if (!active && !fullTranscript) return null;

  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 bg-black/80 backdrop-blur-sm px-6 py-5 border-t border-white/10">
      <div className="flex items-center justify-between w-full mb-3">
        <span className={`text-xs font-semibold tracking-widest ${active ? "text-green-400" : "text-white/40"}`}>
          {active ? "● LIVE" : "◎ STOPPED"}
        </span>
        <div className="flex items-center gap-2">
          {!active && fullTranscript && (
            <button
              onClick={convertToHinglish}
              disabled={converting}
              className={`text-xs font-medium rounded px-3 py-1 transition-all ${
                converting
                  ? "bg-orange-900/40 text-orange-300/50 cursor-wait"
                  : "bg-orange-600/30 hover:bg-orange-600/50 text-orange-300 border border-orange-500/30 hover:border-orange-500/60"
              }`}
            >
              {converting ? "⏳ Converting…" : "🔤 Convert to Hinglish"}
            </button>
          )}
          <button
            onClick={handleClear}
            className="text-xs text-white/30 hover:text-white/60 border border-white/10 hover:border-white/30 rounded px-3 py-1 transition-all"
          >
            ✕ Clear
          </button>
          <button
            onClick={saveToFile}
            className="text-xs text-white/50 hover:text-white border border-white/20 hover:border-white/50 rounded px-3 py-1 transition-all"
          >
            ↓ Save .txt
          </button>
        </div>
      </div>
      <button
        onClick={saveToCloud}
        className="text-xs text-violet-300 hover:text-violet-100 border border-violet-500/30 hover:border-violet-500/60 rounded px-3 py-1 transition-all"
      >
        ☁️ Save to Account
      </button>
      <div
        className="overflow-y-auto rounded-lg bg-white/5 p-3"
        style={{ maxHeight: "220px" }}
        ref={(el) => { if (el) el.scrollTop = el.scrollHeight; }}
      >
        <p className="text-yellow-300 text-sm leading-relaxed font-medium whitespace-pre-wrap">
          {fullTranscript || (active ? "Listening..." : "")}
        </p>
      </div>
    </div>
  );
}