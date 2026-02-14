import { generateText } from "../gemini";
import { PipelineProgress } from "../types";
import { renderKnowledgeGraphHtml } from "@/lib/renderers/knowledge-graph-renderer";

type ProgressCallback = (progress: PipelineProgress) => void;

function emit(
  onProgress: ProgressCallback | undefined,
  step: PipelineProgress["step"],
  status: PipelineProgress["status"],
  message: string,
  detail?: string,
) {
  onProgress?.({ step, status, message, detail, timestamp: Date.now() });
}

export interface KnowledgeGraphNode {
  id: string;
  label: string;
  description: string;
  category: string;
  importance: number; // 1-10
}

export interface KnowledgeGraphEdge {
  source: string;
  target: string;
  label: string;
  strength: number; // 1-5
}

export interface KnowledgeGraphData {
  title: string;
  nodes: KnowledgeGraphNode[];
  edges: KnowledgeGraphEdge[];
  summary: string;
}

export interface KnowledgeGraphGeneratorOptions {
  userPrompt: string;
  depth?: number; // 1=shallow, 2=medium, 3=deep
  onProgress?: ProgressCallback;
}

export interface KnowledgeGraphResult {
  html: string;
  title: string;
  graphData: KnowledgeGraphData;
}

const KG_RESEARCH_PROMPT = `You are a research assistant specialized in knowledge extraction.
Analyze the given topic thoroughly and provide structured information about:
- Key concepts and entities involved
- Relationships between concepts
- Hierarchical structures
- Cause-and-effect relationships
- Categories and classifications
- Important sub-topics and related areas
Be comprehensive but factual. Include specific details.`;

const KG_GENERATION_PROMPT = `You are a knowledge graph architect. Given a topic and research notes, create a structured knowledge graph.

Output ONLY valid JSON with this exact structure:
{
  "title": "Graph title",
  "summary": "2-3 sentence summary of the knowledge domain",
  "nodes": [
    {
      "id": "unique_id",
      "label": "Short display name",
      "description": "Brief description (1-2 sentences)",
      "category": "Category name for color coding",
      "importance": 7
    }
  ],
  "edges": [
    {
      "source": "node_id_1",
      "target": "node_id_2",
      "label": "relationship type",
      "strength": 3
    }
  ]
}

Rules:
- importance is 1-10 (10 = most central/important concept)
- strength is 1-5 (5 = strongest relationship)
- Use concise, clear labels
- Categories should be meaningful groupings (e.g., "Technology", "People", "Events")
- Ensure all edge source/target IDs exist in nodes
- Make the graph connected - avoid isolated nodes
- The central topic should have the highest importance
- No markdown, no explanation, ONLY the JSON object`;

export async function runKnowledgeGraphPipeline(
  opts: KnowledgeGraphGeneratorOptions,
): Promise<KnowledgeGraphResult> {
  const { userPrompt, depth = 2, onProgress } = opts;

  const nodeCountGuide = depth === 1 ? "8-12" : depth === 2 ? "15-25" : "25-40";
  const depthDescription =
    depth === 1
      ? "Focus on the most essential concepts only. Keep it concise."
      : depth === 2
        ? "Cover main concepts and their direct relationships. Medium detail level."
        : "Go deep. Include sub-topics, secondary relationships, and nuanced connections.";

  // ─── Step 1: Research ─────────────────────────────────────
  emit(onProgress, "research", "running", "Researching topic...");
  let researchNotes = "";
  try {
    researchNotes = await generateText({
      prompt: `Research the following topic thoroughly for building a knowledge graph:\n\n${userPrompt}\n\nDepth level: ${depthDescription}\n\nProvide detailed information about key entities, concepts, relationships, hierarchies, and categorizations.`,
      systemPrompt: KG_RESEARCH_PROMPT,
      temperature: 0.3,
    });
    emit(onProgress, "research", "done", "Research complete");
  } catch {
    emit(onProgress, "research", "skipped", "Skipped research (non-critical)");
  }

  // ─── Step 2: Generate Graph Data ─────────────────────────
  emit(onProgress, "generation", "running", "Building knowledge graph structure...");

  const prompt = `Create a knowledge graph about:

"${userPrompt}"

Target approximately ${nodeCountGuide} nodes.
${depthDescription}

${researchNotes ? `Use these researched facts:\n${researchNotes}` : ""}

Output ONLY the JSON object. No markdown fences.`;

  const raw = await generateText({
    prompt,
    systemPrompt: KG_GENERATION_PROMPT,
    temperature: 0.5,
  });

  emit(onProgress, "generation", "done", "Graph structure created");

  // Clean and parse
  let jsonStr = raw.trim();
  if (jsonStr.startsWith("```json")) jsonStr = jsonStr.slice(7);
  if (jsonStr.startsWith("```")) jsonStr = jsonStr.slice(3);
  if (jsonStr.endsWith("```")) jsonStr = jsonStr.slice(0, -3);
  jsonStr = jsonStr.trim();

  const graphData: KnowledgeGraphData = JSON.parse(jsonStr);

  // ─── Step 3: Render to interactive HTML ──────────────────
  emit(onProgress, "rendering", "running", "Rendering interactive visualization...");

  const html = renderKnowledgeGraphHtml(graphData, { layout: "tree_lr", theme: "mono" });

  emit(onProgress, "rendering", "done", "Knowledge graph ready");

  return { html, title: graphData.title, graphData };
}

