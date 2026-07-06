import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { script } = await req.json();

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      temperature: 0.1,
      messages: [
        {
          role: "system",
         content: `You are a script cleaner for a teleprompter app.
The user will give you raw social media/Instagram/YouTube script text.
Return ONLY the clean spoken words — exactly what a person would say out loud.

Remove ALL of the following without exception:
- Emoji of any kind
- Hashtags (#fyp, #trending etc.)
- @mentions
- Markdown formatting (**bold**, *italic*, __underline__)
- Bracket/parenthesis directions ([HOOK], [Cut], (pause), [0:00-0:05] etc.)
- Section labels (HOOK:, CTA:, INTRO:, OUTRO: etc.)
- Timestamps (0:00, 0:05-0:10 etc.)
- Quoted strings that are text overlay instructions ("Text Overlay", "Caption:" etc.)
- Instagram/YouTube CTAs (Follow for more, Link in bio, Like and subscribe etc.)
- Scene directions, camera notes, b-roll notes
- Any line that is purely a label or instruction with no spoken content

Rules:
- Do NOT rephrase or rewrite any spoken content
- Do NOT add punctuation that wasn't there
- Do NOT add any commentary or explanation
- Output plain flowing text only, with natural sentence spacing
- Separate sentences with a single space, not newlines`,
        },
        { role: "user", content: script },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    return NextResponse.json({ error: err?.error?.message ?? "Groq error" }, { status: 500 });
  }

  const data = await res.json();
  const cleaned = data.choices?.[0]?.message?.content?.trim() ?? script;
  return NextResponse.json({ cleaned });
}