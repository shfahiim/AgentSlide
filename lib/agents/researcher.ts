import { generateText } from "../gemini";
import { DeckPlan } from "../types";

const TEMPERATURE = parseFloat(process.env.GEMINI_TEMPERATURE_RESEARCH || "0.3");

/**
 * MVP: Uses Gemini's built-in knowledge to produce research notes.
 * v2: Will add Google Search grounding / tool use.
 */
export async function runResearch(plan: DeckPlan): Promise<string> {
  const slideTopics = plan.slides
    .map((s) => `- Slide ${s.slideNumber}: ${s.purpose}`)
    .join("\n");

  const prompt = `I'm creating a presentation titled "${plan.title}".
Here are the planned slides:
${slideTopics}

Provide concise factual notes (key dates, statistics, names, and sources)
that I can reference when writing the slide content. Be specific and accurate.
Format as bullet points grouped by slide number.`;

  return generateText({
    prompt,
    systemPrompt:
      "You are a research assistant. Provide factual, citation-worthy information.",
    temperature: TEMPERATURE,
  });
}
