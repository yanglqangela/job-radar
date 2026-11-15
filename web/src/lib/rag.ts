/** 把个人资料与岗位数据切成检索块，并拼装 LLM 提示词 */

import type { ChatMessage, Digest, Profile, ProfileItem } from "../types";
import { buildIndex, search, type Bm25Index, type Chunk } from "./bm25.ts";

export type RetrievedSource = { id: string; label: string };

const SECTION_LABELS: Record<string, string> = {
  projects: "项目",
  work: "工作",
  education: "教育",
  awards: "奖项",
  certificates: "证书",
  publications: "论文",
  portfolio: "作品",
};

function itemChunk(section: string, item: ProfileItem): Chunk {
  const label = `${SECTION_LABELS[section] || section}：${item.title}`;
  return { id: item.id, kind: section, label, text: item.lines.join("\n") };
}

export function buildChunks(profile: Profile, digest: Digest): Chunk[] {
  const chunks: Chunk[] = [];
  for (const [section, items] of Object.entries(profile.sections || {})) {
    for (const item of items || []) {
      if (item.text?.trim() || item.lines?.length) chunks.push(itemChunk(section, item));
    }
  }
  if (profile.matchProfile?.summary) {
    chunks.push({
      id: "summary",
      kind: "summary",
      label: "个人概述",
      text: profile.matchProfile.summary,
    });
  }
  for (const job of digest.jobs || []) {
    chunks.push({
      id: job.id,
      kind: "job",
      label: `岗位：${job.company || ""} ${job.title}`.trim(),
      text: [
        job.title,
        job.company,
        job.location,
        job.salary,
        job.summary,
        `技能：${(job.skills || []).join("、")}`,
        ...(job.requirements || []).slice(0, 6),
        `匹配分：${job.match?.score ?? ""}，${job.match?.summary || ""}`,
      ]
        .filter(Boolean)
        .join("\n"),
    });
  }
  return chunks;
}

export function buildIndexFor(profile: Profile, digest: Digest): Bm25Index {
  return buildIndex(buildChunks(profile, digest));
}

export function retrieve(index: Bm25Index, question: string, k = 6) {
  const hits = search(index, question, k);
  const sources: RetrievedSource[] = [];
  const seen = new Set<string>();
  for (const hit of hits) {
    if (!seen.has(hit.chunk.id)) {
      seen.add(hit.chunk.id);
      sources.push({ id: hit.chunk.id, label: hit.chunk.label });
    }
  }
  return { hits, sources };
}

const SYSTEM_PROMPT = `你是我的个人求职助手，回答必须只依据下面提供的【个人资料】和【岗位信息】。

规则：
1. 用中文回答，简洁、具体、直接；能引用项目/岗位名称时优先引用。
2. 资料里没有的内容，明确说「资料里没有」，不要编造经历、数字或技能。
3. 涉及岗位匹配时，结合匹配分、已匹配技能和缺失技能说明理由。
4. 回答控制在 300 字以内，除非我明确要求展开。`;

export function buildMessages(
  profile: Profile,
  hits: { chunk: Chunk }[],
  question: string,
  history: ChatMessage[],
): { role: "system" | "user" | "assistant"; content: string }[] {
  const context = hits.map((h, i) => `[${i + 1}] ${h.chunk.label}\n${h.chunk.text}`).join("\n\n");
  const overview = profile.matchProfile?.skills?.length
    ? `我的技能：${profile.matchProfile.skills.slice(0, 30).join("、")}`
    : "";
  const system = `${SYSTEM_PROMPT}\n\n${overview}\n\n【检索到的资料】\n${context || "（没有检索到相关资料）"}`;

  const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: system.slice(0, 12000) },
  ];
  for (const msg of history.slice(-4)) {
    messages.push({ role: msg.role, content: msg.content.slice(0, 2000) });
  }
  messages.push({ role: "user", content: question });
  return messages;
}

export const SUGGESTED_QUESTIONS = [
  "用三句话介绍我的核心项目",
  "我的技术栈和主要成果是什么",
  "今天推荐的岗位里哪个最匹配我？",
  "我最需要补强的技能是什么",
];
