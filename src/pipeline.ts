import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { extractContent } from "@wrtnlabs/web-content-extractor";
import { upsertDocument } from "./db.js";
import type { ExtractedData, ExtractedLink } from "./types.js";

const State = Annotation.Root({
  url: Annotation<string>,
  html: Annotation<string>,
  extracted: Annotation<ExtractedData>,
  summary: Annotation<string>,
  storedId: Annotation<number>,
});

const llm = process.env.OPENAI_API_KEY
  ? new ChatOpenAI({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      temperature: 0.2,
    })
  : null;

function normalizeLinks(baseUrl: string, links: ExtractedLink[]): ExtractedLink[] {
  const seen = new Set<string>();
  const normalized: ExtractedLink[] = [];

  for (const link of links) {
    try {
      const absolute = new URL(link.url, baseUrl).toString();
      if (seen.has(absolute)) continue;
      seen.add(absolute);
      normalized.push({ url: absolute, content: link.content ?? "" });
    } catch {
      continue;
    }
  }

  if (!seen.has(baseUrl)) {
    normalized.unshift({ url: baseUrl, content: "original source" });
  }

  return normalized;
}

async function fetchNode(state: typeof State.State) {
  const response = await fetch(state.url, {
    headers: {
      "User-Agent": "snap-url-bot/0.1 (+https://localhost)",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  return { html };
}

async function extractNode(state: typeof State.State) {
  const extracted = extractContent(state.html);
  const normalizedLinks = normalizeLinks(state.url, extracted.links ?? []);

  return {
    extracted: {
      title: extracted.title ?? "",
      description: extracted.description ?? "",
      content: extracted.content ?? "",
      contentHtmls: extracted.contentHtmls ?? [],
      links: normalizedLinks,
    },
  };
}

function fallbackSummary(text: string): string {
  const collapsed = text.replace(/\s+/g, " ").trim();
  if (!collapsed) return "요약할 본문이 비어 있습니다.";
  if (collapsed.length <= 500) return collapsed;
  return `${collapsed.slice(0, 500)}...`;
}

async function summarizeNode(state: typeof State.State) {
  const { title, description, content } = state.extracted;

  if (!llm) {
    return {
      summary: fallbackSummary(`${title}\n${description}\n${content}`),
    };
  }

  const trimmed = content.slice(0, 12000);
  const prompt = [
    "다음 웹 문서를 한국어로 간결하게 요약해줘.",
    "출력 형식:",
    "1) 한 줄 핵심",
    "2) 주요 포인트 3개",
    "3) 원문 읽기 전에 알아야 할 맥락 1개",
    "문서 제목:",
    title || "(제목 없음)",
    "문서 설명:",
    description || "(설명 없음)",
    "문서 본문:",
    trimmed || "(본문 없음)",
  ].join("\n");

  const result = await llm.invoke(prompt);
  return {
    summary: result.content.toString().trim(),
  };
}

async function persistNode(state: typeof State.State) {
  const row = upsertDocument({
    url: state.url,
    title: state.extracted.title,
    description: state.extracted.description,
    content: state.extracted.content,
    summary: state.summary,
    links: state.extracted.links,
  });

  return { storedId: row.id };
}

const graph = new StateGraph(State)
  .addNode("fetch", fetchNode)
  .addNode("extract", extractNode)
  .addNode("summarize", summarizeNode)
  .addNode("persist", persistNode)
  .addEdge(START, "fetch")
  .addEdge("fetch", "extract")
  .addEdge("extract", "summarize")
  .addEdge("summarize", "persist")
  .addEdge("persist", END)
  .compile();

export async function ingestUrl(url: string) {
  const output = await graph.invoke({ url });
  return {
    id: output.storedId,
    extracted: output.extracted,
    summary: output.summary,
  };
}
