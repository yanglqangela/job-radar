/** 公开 Agent 只在服务器站点可用；GitHub Pages 是纯静态镜像。 */

export const AGENT_SERVER_URL = "http://8.148.67.50/#/agent";
export const WORKSPACE_PAGES_URL = "https://yanglqangela.github.io/job-radar/#/unlock";

export function isMirrorHost(): boolean {
  return typeof window !== "undefined" && window.location.hostname.endsWith("github.io");
}

export function agentHref(): string {
  return isMirrorHost() ? AGENT_SERVER_URL : "#/agent";
}

/** Web Crypto 只在安全上下文可用；HTTP 服务器上的工作台跳到 HTTPS 的 Pages。 */
export function workspaceHref(): string {
  if (typeof window === "undefined") return WORKSPACE_PAGES_URL;
  return window.isSecureContext ? "#/unlock" : WORKSPACE_PAGES_URL;
}
