# 🎯 SlideMaker — AI Presentation Agent

An AI agent that takes a text prompt and produces complete presentations — either as downloadable `.pptx` files, interactive web decks, or both.

## Features

- **Multi-format output**: Generate PowerPoint files and/or web presentations from a single prompt
- **AI-powered content**: Uses Google Gemini to plan structure, research facts, and write slide content
- **Smart layouts**: Automatically selects appropriate layouts (title, bullets, charts, two-column, etc.)
- **Interactive charts**: Vega-Lite charts that are static in PPTX, interactive in web
- **Theme system**: 4 built-in themes (Modern Dark, Minimal Light, Corporate, Vibrant)
- **Quality assurance**: Automatic compression of overcrowded slides
- **Real-time progress**: SSE streaming shows generation progress step-by-step

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env.local` and add your Google AI API key:

```bash
cp .env.example .env.local
```

Edit `.env.local` and set your API key:

```env
GOOGLE_GENAI_API_KEY=your_api_key_here
```

Get your API key from: https://aistudio.google.com/apikey

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and start creating presentations!

## Environment Variables

All configuration is done via environment variables in `.env.local`:

### Required

| Variable | Description | Example |
|---|---|---|
| `GOOGLE_GENAI_API_KEY` | Your Google AI API key | `AIzaSy...` |

### AI Model Configuration

| Variable | Default | Description |
|---|---|---|
| `GEMINI_MODEL` | `gemini-2.5-flash` | Gemini model to use |
| `GEMINI_TEMPERATURE_INTAKE` | `0.3` | Temperature for prompt parsing (0.0-1.0) |
| `GEMINI_TEMPERATURE_PLANNING` | `0.7` | Temperature for deck planning |
| `GEMINI_TEMPERATURE_CONTENT` | `0.7` | Temperature for slide content generation |
| `GEMINI_TEMPERATURE_RESEARCH` | `0.3` | Temperature for research notes |
| `GEMINI_TEMPERATURE_COMPRESSION` | `0.3` | Temperature for content compression |
| `GEMINI_MAX_RETRIES` | `3` | Max retry attempts on validation failures |

### Pipeline Configuration

| Variable | Default | Description |
|---|---|---|
| `SLIDE_GENERATION_BATCH_SIZE` | `3` | Number of slides to generate in parallel (1-5) |

### Development

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_DEBUG_MODE` | `false` | Enable debug features (raw IR viewer, etc.) |

## Usage

### Basic Example

1. Navigate to `/create`
2. Enter a prompt like: `"Create a 10-slide presentation about renewable energy in Bangladesh for university students"`
3. Click **Generate**
4. Watch real-time progress as the AI:
   - Parses your requirements
   - Plans the slide structure
   - Researches key facts
   - Generates slide content
   - Processes charts and visuals
   - Runs quality checks
   - Renders PPTX and/or web output
5. Download the PPTX or view the interactive web presentation

### Advanced Prompts

You can specify:
- **Slide count**: `"Create a 15-slide deck..."`
- **Audience**: `"...for high school students"` / `"...for investors"`
- **Style**: `"...in a minimal style"` / `"...corporate style"`
- **Language**: `"...in Bengali"` (supports `en` and `bn`)

## Architecture

See [`docs/architecture.md`](./docs/architecture.md) for the full system design.

**Key concepts:**

- **Intermediate Representation (IR)**: The agent produces a structured `DeckSpec` JSON that separates content from presentation
- **Multi-step pipeline**: Intake → Planning → Research → Generation → Assets → QA → Rendering
- **Pluggable renderers**: Same IR feeds both PPTX and web renderers
- **Structured outputs**: Every AI call uses Zod schemas + Gemini Structured Outputs for reliability

## Project Structure

```
slidemaker/
├── app/                    # Next.js App Router
│   ├── api/               # API routes (SSE generation, PPTX download)
│   ├── create/            # Creation wizard page
│   └── presentation/      # Web viewer
├── lib/
│   ├── agents/            # AI pipeline steps
│   │   ├── orchestrator.ts
│   │   ├── intake.ts
│   │   ├── planner.ts
│   │   ├── slide-generator.ts
│   │   └── ...
│   ├── renderers/         # Output renderers
│   │   ├── pptx-renderer.ts
│   │   └── chart-renderer.ts
│   ├── schemas.ts         # Zod schemas (IR definitions)
│   ├── types.ts           # TypeScript types
│   ├── gemini.ts          # Gemini client wrapper
│   └── themes.ts          # Theme definitions
├── components/
│   └── presentation/      # Web slide components
└── docs/                  # Architecture & implementation guides
```

## Development

### Type Checking

```bash
npm run typecheck
```

### Build

```bash
npm run build
```

### Debug Mode

Add `?debug=true` to the presentation URL to see raw slide JSON:

```
http://localhost:3000/presentation/[deck-id]?debug=true
```

## License

MIT

## Credits

Built with:
- [Next.js 15](https://nextjs.org/)
- [Google Gemini](https://ai.google.dev/)
- [Vega-Lite](https://vega.github.io/vega-lite/)
- [PptxGenJS](https://gitbrent.github.io/PptxGenJS/)
- [Framer Motion](https://www.framer.com/motion/)
- [Zod](https://zod.dev/)
