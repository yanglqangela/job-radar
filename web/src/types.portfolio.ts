/** 公开作品集数据结构（与 scripts/build_portfolio.py 的输出对应） */

export type PortfolioLink = {
  label: string;
  url: string;
};

export type PortfolioMetric = {
  value: string;
  label: string;
};

export type PortfolioDecision = {
  title: string;
  detail: string;
};

export type PortfolioBackendFeature = {
  title: string;
  detail: string;
};

export type PortfolioScreenshot = {
  src: string;
  alt?: string;
  caption?: string;
};

export type PortfolioProject = {
  slug: string;
  name: string;
  nameEn?: string;
  year?: string;
  pitch: string;
  problem?: string;
  role?: string;
  decisions: PortfolioDecision[];
  backend?: PortfolioBackendFeature[];
  stack: string[];
  highlights: string[];
  metrics: PortfolioMetric[];
  links: PortfolioLink[];
  screenshots: PortfolioScreenshot[];
  cover?: string;
};

export type TimelineItem = {
  kind: "work" | "education";
  period?: string;
  org: string;
  role?: string;
  roleEn?: string;
  location?: string;
  bullets: string[];
  tags?: string[];
};

export type TimelineCompactItem = {
  kind: string;
  title: string;
  meta?: string;
};

export type SkillItem = {
  name: string;
  evidence?: string;
};

export type SkillGroup = {
  name: string;
  nameEn?: string;
  items: SkillItem[];
};

export type PortfolioData = {
  schemaVersion: 1;
  contentUpdatedAt?: string;
  profileGeneratedAt?: string;
  identity: {
    name: string;
    nameEn?: string;
    headline?: string;
    headlineEn?: string;
    location?: string;
    availability?: string;
  };
  contact: {
    email?: string;
    links: PortfolioLink[];
  };
  hero: {
    eyebrow?: string;
    title?: string;
    subtitleEn?: string;
    paragraphs: string[];
    scrollHint?: string;
  };
  timeline: {
    title: string;
    titleEn?: string;
    items: TimelineItem[];
    compactItems: TimelineCompactItem[];
  };
  projects: PortfolioProject[];
  skills: {
    title: string;
    titleEn?: string;
    groups: SkillGroup[];
  };
  seo?: {
    title?: string;
    description?: string;
  };
  workspace?: {
    label?: string;
    hint?: string;
  };
};
