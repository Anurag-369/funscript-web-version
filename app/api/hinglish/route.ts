import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!text?.trim()) {
      return NextResponse.json({ result: "" });
    }

    const res = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content: `You are a Hinglish romanizer for Indian content creators.
Convert any Devanagari Hindi script in the text to Roman letters exactly as it sounds phonetically.

Rules:
- Keep all English words exactly as they are
- Convert Hindi/Devanagari words to Roman phonetic spelling
  Examples: यार → yaar, भाई → bhai, क्या → kya, हाँ → haan, नहीं → nahi, बहुत → bahut
- Do NOT translate Hindi to English — only romanize the pronunciation
- Keep the same word order, punctuation, and sentence structure
- If text is already fully in Roman/English, return it as-is
- Output plain text only, no explanation, no commentary`,
        },
        {
          role: "user",
          content: text,
        },
      ],
    });

    const result = res.choices?.[0]?.message?.content?.trim() ?? text;
    return NextResponse.json({ result });
  } catch (err: any) {
    console.error("Romanize error:", err?.message || err);
    return NextResponse.json({ result: "", error: err?.message }, { status: 500 });
  }
}