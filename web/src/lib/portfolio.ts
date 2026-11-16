/** 公开作品集数据加载；与加密的 meta/profile/digest 无关 */

import type { PortfolioData } from "../types.portfolio";

const BASE = import.meta.env.BASE_URL;

export async function loadPortfolio(): Promise<PortfolioData | null> {
  try {
    const res = await fetch(`${BASE}data/portfolio.json?ts=${Date.now()}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as PortfolioData;
    if (
      !data ||
      data.schemaVersion !== 1 ||
      !data.identity?.name ||
      !Array.isArray(data.projects) ||
      !data.timeline ||
      !data.skills
    ) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

/** 截图和静态资源都走 BASE_URL，兼容 "./" 与 "/<repo>/" 两种部署 base */
export function assetUrl(src: string): string {
  return `${BASE}${src.replace(/^\/+/, "")}`;
}

export function mailtoHref(email: string): string {
  return `mailto:${email.trim()}`;
}

export function emailHref(email?: string): string | null {
  const value = (email || "").trim();
  return value.includes("@") ? mailtoHref(value) : null;
}
