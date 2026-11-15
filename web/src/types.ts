/* 与具体业务无关的类型定义 */

export type JobMatch = {
  score: number;
  summary: string;
  matchedSkills: string[];
  missingSkills: string[];
  advantages: string[];
  gaps: string[];
  suggestions: string[];
  source: "llm" | "heuristic";
};

export type Job = {
  id: string;
  date: string;
  firstSeenAt: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  category: string;
  url: string;
  applyUrl: string;
  source: "platform" | "official" | "unknown";
  summary: string;
  skills: string[];
  responsibilities: string[];
  requirements: string[];
  match: JobMatch;
  pushed: boolean;
};

export type DigestRun = {
  status: "ok" | "degraded" | "failed";
  counts: {
    searched: number;
    newCandidates: number;
    fetched: number;
    matched: number;
    pushed: number;
  };
  degradedReasons: string[];
};

export type Digest = {
  schemaVersion: 1;
  generatedAt: string;
  runDate: string;
  run: DigestRun;
  jobs: Job[];
  seen?: Record<string, { d: string; r: string }>;
};

export type Profile = {
  schemaVersion: 1;
  generatedAt: string;
  search: {
    queries: { keywords: string; city: string }[];
    excludeCompanies: string[];
    topN: number;
  };
  meta: {
    name: string;
    yearsOfExperience: string;
    summary: string;
  };
  sections: {
    projects: ProfileItem[];
    work: ProfileItem[];
    education: ProfileItem[];
    awards: ProfileItem[];
    certificates: ProfileItem[];
    publications: ProfileItem[];
    portfolio: ProfileItem[];
  };
  matchProfile: {
    skills: string[];
    targetTitles: string[];
    summary: string;
  };
};

export type ProfileItem = {
  id: string;
  kind: string;
  title: string;
  sources: ("kb" | "resume")[];
  /** 已扁平化的展示文本：每行一个要点 */
  lines: string[];
  text: string;
};

export type Meta = {
  schemaVersion: 1;
  lastRunAt: string;
  runDate: string;
  status: "ok" | "degraded" | "failed";
  newJobs: number;
  totalJobs: number;
  degradedReasons: string[];
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  sources?: { id: string; label: string }[];
  at: string;
  error?: boolean;
};
