import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audio = formData.get("audio") as File;
    const romanize = formData.get("romanize") === "true";

    if (!audio || audio.size < 1000) {
      return NextResponse.json({ transcript: "" });
    }

    const transcription = await groq.audio.transcriptions.create({
      file: audio,
      model: "whisper-large-v3",
      language: "hi",
      response_format: "text",
    });

    let result = transcription as unknown as string;

    // If romanize is on, convert Devanagari to Roman using LLM
    if (romanize && result.trim()) {
      const romanized = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        temperature: 0.1,
        messages: [
          {
            role: "system",
            content: `You are a Hinglish romanizer. Convert any Devanagari Hindi script to Roman letters exactly as it sounds.
Rules:
- Keep English words exactly as they are
- Convert Hindi/Devanagari words to their Roman phonetic spelling (e.g. यार → yaar, भाई → bhai, क्या → kya)
- Do NOT translate — just romanize the pronunciation
- Keep the same word order and sentence structure
- Output plain text only, no explanation`,
          },
          {
            role: "user",
            content: result,
          },
        ],
      });
      result = romanized.choices?.[0]?.message?.content?.trim() ?? result;
    }

    return NextResponse.json({ transcript: result });
  } catch (err: any) {
    console.error("Whisper error:", err?.message || err);
    return NextResponse.json({ transcript: "", error: err?.message }, { status: 200 });
  }
}