# FunScript 🎤

An AI-powered teleprompter web app built with Next.js and TypeScript — designed for creators who want a smarter, hands-free scripting experience.

FunScript doesn't just scroll text. It understands your script, listens to you speak, and keeps pace with you in real time.

## Features

- **AI Script Parsing** — Paste in a raw script and FunScript uses Claude to automatically classify each segment as `speak`, `pause`, `stage-direction`, or `emoji-filler`, so the prompter only displays what you actually need to read.
- **Voice Sync** — Uses the Web Speech API with fuzzy Levenshtein matching to track your spoken words against the script in real time, auto-advancing as you talk.
- **Whisper Transcription Pipeline** — A parallel transcription pipeline (running alongside Voice Sync) for more robust, higher-accuracy speech tracking.
- **Word-by-Word Advancement** — A sliding-window, WPM-based timing system for smooth, natural scroll pacing even without voice tracking.
- **Live Transcript** — Real-time display of what's being picked up from your speech via the `LiveTranscript` component.
- **WPM Gauge** — Visual feedback on your current speaking pace via the `WpmGauge` component.
- **AI Panel** — An in-app panel (`AIPanel`) for interacting with AI-assisted script tools while prompting.
- **Authentication** — User accounts and session management via Supabase Auth.

## Tech Stack

- **Framework:** Next.js (TypeScript)
- **Styling:** Tailwind CSS
- **Auth & Backend:** Supabase
- **Speech Recognition:** Web Speech API
- **Transcription:** Whisper (parallel pipeline)
- **AI Script Parsing:** Claude (Anthropic API)
- **Fuzzy Matching:** Levenshtein distance

## How It Works

1. **Paste your script** — FunScript sends it to Claude, which segments it into speakable lines, pauses, stage directions, and filler/emoji markers.
2. **Start prompting** — The teleprompter begins scrolling based on WPM-calculated timing.
3. **Speak naturally** — Voice Sync listens via the Web Speech API and fuzzy-matches your speech against the script, correcting the scroll position on the fly. The Whisper pipeline runs in parallel as a more accurate transcription backstop.
4. **Track your pace** — The WPM Gauge and Live Transcript give you real-time feedback so you know if you're rushing or lagging.

## Project Status

🚧 Actively in development. Current focus: refining the Voice Sync matching accuracy and reconciling it with the Whisper-based transcription pipeline for a hybrid sync approach.

## Getting Started

\`\`\`bash
# Clone the repo
git clone https://github.com/Anurag-369/funscript.git
cd funscript

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Add your Supabase and Anthropic API keys

# Run the dev server
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

## Roadmap

- [ ] Merge Voice Sync and Whisper pipelines into a single hybrid sync engine
- [ ] Improve fuzzy-matching accuracy for accented/fast speech
- [ ] Script version history
- [ ] Mobile-friendly prompter view
- [ ] Export session recordings with synced transcripts

