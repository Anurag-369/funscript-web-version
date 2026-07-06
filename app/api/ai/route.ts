import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const prompts = {
  correct: (script: string) =>
    `Fix grammar, filler words, and transcript errors in this script. Return only the corrected script, nothing else:\n\n${script}`,
  rewrite: (script: string) =>
    `Rewrite this script to be punchier and more engaging for a short-form video (Reels/Shorts). Keep it under 60 seconds when spoken. Return only the rewritten script, nothing else:\n\n${script}`,
  hooks: (script: string) =>
    `Based on this script, suggest 3 strong video hooks that would stop someone from scrolling. Number them 1, 2, 3. Be punchy and creative:\n\n${script}`,
};

export async function POST(req: NextRequest) {
  const { script, mode } = await req.json();
  const prompt = prompts[mode as keyof typeof prompts]?.(script);
  if (!prompt) return NextResponse.json({ error: "Invalid mode" }, { status: 400 });

  const chat = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 1024,
  });

  return NextResponse.json({ result: chat.choices[0].message.content });
}