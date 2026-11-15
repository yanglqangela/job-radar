/**
 * 中文 BM25 检索（浏览器内，<500 chunks 足够快）
 * - 中文连续段取 bigram（单字段取 unigram），拉丁/数字取整词
 * - 标题/标签在 chunk 文本中重复一次，提高权重
 */

export type Chunk = {
  id: string;
  kind: string;
  label: string;
  text: string;
};

export type ScoredChunk = { chunk: Chunk; score: number };

export type Bm25Index = {
  chunks: Chunk[];
  docs: string[][];
  df: Map<string, number>;
  avgdl: number;
  k1: number;
  b: number;
};

const CJK = /[一-鿿]/;
const LATIN = /[a-z0-9+#.-]/i;

export function normalizeText(text: string): string {
  let cleaned = "";
  for (const ch of text.normalize("NFKC").toLowerCase()) {
    const code = ch.codePointAt(0) ?? 32;
    cleaned += code < 32 || code === 127 ? " " : ch;
  }
  return cleaned.replace(/[^一-鿿0-9a-z+#.\-\s]/g, " ");
}

export function tokenize(text: string): string[] {
  const s = normalizeText(text);
  const tokens: string[] = [];
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (CJK.test(ch)) {
      let j = i;
      while (j < s.length && CJK.test(s[j])) j++;
      const run = s.slice(i, j);
      if (run.length === 1) {
        tokens.push(run);
      } else {
        for (let k = 0; k + 1 < run.length; k++) tokens.push(run.slice(k, k + 2));
      }
      i = j;
      continue;
    }
    if (LATIN.test(ch)) {
      let j = i;
      while (j < s.length && LATIN.test(s[j])) j++;
      tokens.push(s.slice(i, j));
      i = j;
      continue;
    }
    i++;
  }
  return tokens;
}

export function buildIndex(chunks: Chunk[]): Bm25Index {
  const docs = chunks.map((c) => tokenize(`${c.label} ${c.label} ${c.text}`));
  const df = new Map<string, number>();
  let total = 0;
  for (const doc of docs) {
    total += doc.length;
    for (const term of new Set(doc)) {
      df.set(term, (df.get(term) || 0) + 1);
    }
  }
  return {
    chunks,
    docs,
    df,
    avgdl: docs.length ? total / docs.length : 0,
    k1: 1.2,
    b: 0.75,
  };
}

export function search(index: Bm25Index, query: string, k = 6): ScoredChunk[] {
  const qTerms = tokenize(query);
  if (!qTerms.length) return [];
  const N = index.docs.length;
  const scored: ScoredChunk[] = [];
  for (let i = 0; i < index.docs.length; i++) {
    const doc = index.docs[i];
    const dl = doc.length;
    const tf = new Map<string, number>();
    for (const term of doc) tf.set(term, (tf.get(term) || 0) + 1);
    let score = 0;
    for (const term of qTerms) {
      const f = tf.get(term);
      if (!f) continue;
      const df = index.df.get(term) || 0;
      const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
      score +=
        (idf * f * (index.k1 + 1)) /
        (f + index.k1 * (1 - index.b + (index.b * dl) / (index.avgdl || 1)));
    }
    if (score > 0) scored.push({ chunk: index.chunks[i], score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k);
}
