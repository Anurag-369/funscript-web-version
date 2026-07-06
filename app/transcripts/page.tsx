"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Transcript {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

export default function TranscriptsPage() {
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const loadTranscripts = () => {
    setLoading(true);
    setError(null);
    fetch("/api/transcripts")
      .then(async (r) => {
        if (!r.ok) throw new Error(`Request failed: ${r.status}`);
        return r.json();
      })
      .then(({ data }) => {
        setTranscripts(data ?? []);
      })
      .catch((err) => {
        console.error("Failed to load transcripts:", err);
        setError("Couldn't load transcripts. Try refreshing.");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadTranscripts();
  }, []);

  const handleDelete = async (id: string) => {
    await fetch("/api/transcripts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setTranscripts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleDownload = (t: Transcript) => {
    const blob = new Blob([t.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${t.title}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleUse = (t: Transcript) => {
    sessionStorage.setItem(
      "funscript:loadedTranscript",
      JSON.stringify({ title: t.title, content: t.content })
    );
    router.push("/");
  };

  const handleAddTranscript = async () => {
    if (!newTitle.trim() || !newContent.trim()) {
      alert("Please add both a title and some content.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/transcripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle, content: newContent, script: newContent }),
      });
      if (!res.ok) throw new Error(`Save failed: ${res.status}`);
      const { data } = await res.json();
      if (data) setTranscripts((prev) => [data, ...prev]);
      setNewTitle("");
      setNewContent("");
      setShowAddForm(false);
    } catch (err) {
      console.error(err);
      alert("Couldn't save transcript. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-violet-400">📄 My Transcripts</h1>
          <div className="flex gap-3">
            <button
              onClick={() => setShowAddForm((s) => !s)}
              className="text-sm text-violet-300 hover:text-white border border-violet-500/40 hover:border-violet-500 rounded-lg px-4 py-2"
            >
              {showAddForm ? "✕ Cancel" : "+ Add Transcript"}
            </button>
            <button
              onClick={() => router.push("/")}
              className="text-sm text-neutral-400 hover:text-white border border-neutral-700 rounded-lg px-4 py-2"
            >
              ← Back to Studio
            </button>
          </div>
        </div>

        {showAddForm && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 mb-6 flex flex-col gap-3">
            <input
              type="text"
              placeholder="Title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
            />
            <textarea
              placeholder="Paste or type your script content here…"
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              className="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white h-32 resize-none focus:outline-none focus:border-violet-500"
            />
            <button
              onClick={handleAddTranscript}
              disabled={saving}
              className={`rounded-lg py-2 text-sm font-medium self-start px-5 ${
                saving ? "bg-neutral-600 text-neutral-400 cursor-wait" : "bg-violet-600 hover:bg-violet-500"
              }`}
            >
              {saving ? "Saving…" : "Save Transcript"}
            </button>
          </div>
        )}

        {loading ? (
          <p className="text-neutral-500">Loading…</p>
        ) : error ? (
          <p className="text-red-400">{error}</p>
        ) : transcripts.length === 0 ? (
          <p className="text-neutral-500">No transcripts saved yet. Record something first!</p>
        ) : (
          <div className="flex flex-col gap-4">
            {transcripts.map((t) => (
              <div key={t.id}
                className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-white">{t.title}</p>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {new Date(t.created_at).toLocaleDateString("en-IN", {
                        day: "numeric", month: "short", year: "numeric",
                        hour: "2-digit", minute: "2-digit"
                      })}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleUse(t)}
                      className="text-xs text-violet-300 hover:text-violet-200 border border-violet-500/30 hover:border-violet-500/60 rounded px-3 py-1 transition-all"
                    >
                      ▶ Use
                    </button>
                    <button
                      onClick={() => handleDownload(t)}
                      className="text-xs text-white/50 hover:text-white border border-white/20 hover:border-white/50 rounded px-3 py-1 transition-all"
                    >
                      ↓ Download
                    </button>
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="text-xs text-red-400/50 hover:text-red-400 border border-red-500/20 hover:border-red-500/40 rounded px-3 py-1 transition-all"
                    >
                      ✕ Delete
                    </button>
                  </div>
                </div>
                <p className="text-sm text-neutral-400 leading-relaxed line-clamp-3">
                  {t.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}