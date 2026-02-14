import { generateText } from "../gemini";
import { DeckPlan } from "../types";

export async function runResearch(plan: DeckPlan): Promise<string> {
  const slideTopics = plan.slides.map((s) => `- ${s.slideNumber}: ${s.purpose}`).join("\n");
  return generateText({
    prompt: `Title: ${plan.title}\nSlides:\n${slideTopics}\nProvide concise factual research notes by slide.`,
    systemPrompt: "You are a research assistant.",
    temperature: 0.3,
  });
}
