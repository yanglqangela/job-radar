export const EDITOR_PASSWORD = "020804ylq@";
export const EDITOR_SESSION_KEY = "job-radar-editor-session";

export function hasEditorSession(): boolean {
  try {
    return window.sessionStorage.getItem(EDITOR_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function setEditorSession(active: boolean): void {
  try {
    if (active) window.sessionStorage.setItem(EDITOR_SESSION_KEY, "1");
    else window.sessionStorage.removeItem(EDITOR_SESSION_KEY);
  } catch {
    // 隐私模式下 sessionStorage 可能不可用，当前会话仍可继续使用。
  }
}
