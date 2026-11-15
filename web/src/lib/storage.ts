/** localStorage 封装：所有读取容错，坏数据重置而不是崩溃 */

import type { ChatMessage } from "../types";

const PREFIX = "lq.v1.";

export type Settings = {
  llmBaseUrl: string;
  llmModel: string;
  llmApiKey: string;
  rememberDevice: boolean;
  theme: "auto" | "light" | "dark";
};

export type AppliedRecord = {
  at: string;
  title: string;
  company: string;
  url: string;
};

export type Marks = {
  favorites: string[];
  applied: Record<string, AppliedRecord>;
  hidden: string[];
};

export const DEFAULT_SETTINGS: Settings = {
  llmBaseUrl: "https://api.deepseek.com",
  llmModel: "deepseek-chat",
  llmApiKey: "",
  rememberDevice: false,
  theme: "auto",
};

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return fallback;
    return { ...fallback, ...(JSON.parse(raw) as object) } as T;
  } catch {
    try {
      localStorage.removeItem(PREFIX + key);
    } catch {
      /* ignore */
    }
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* 隐私模式/配额满：功能可用但不持久化 */
  }
}

export function readRaw(key: string): string | null {
  try {
    return localStorage.getItem(PREFIX + key);
  } catch {
    return null;
  }
}

export function writeRaw(key: string, value: string): void {
  try {
    localStorage.setItem(PREFIX + key, value);
  } catch {
    /* ignore */
  }
}

export function removeRaw(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    /* ignore */
  }
}

export const storage = {
  getSettings(): Settings {
    const s = read<Settings>("settings", DEFAULT_SETTINGS);
    if (s.llmApiKey === undefined) s.llmApiKey = "";
    return s;
  },
  saveSettings(settings: Settings): void {
    write("settings", settings);
  },
  getMarks(): Marks {
    const m = read<Marks>("marks", { favorites: [], applied: {}, hidden: [] });
    if (!Array.isArray(m.favorites)) m.favorites = [];
    if (!m.applied || typeof m.applied !== "object") m.applied = {};
    if (!Array.isArray(m.hidden)) m.hidden = [];
    return m;
  },
  saveMarks(marks: Marks): void {
    write("marks", marks);
  },
  getChat(): ChatMessage[] {
    const c = read<{ messages: ChatMessage[] }>("chat", { messages: [] });
    return Array.isArray(c.messages) ? c.messages : [];
  },
  saveChat(messages: ChatMessage[]): void {
    write("chat", { messages: messages.slice(-20), updatedAt: new Date().toISOString() });
  },
  clearChat(): void {
    removeRaw("chat");
  },
  getRememberedKey(): string | null {
    return readRaw("key");
  },
  setRememberedKey(b64: string): void {
    writeRaw("key", b64);
  },
  clearAll(): void {
    try {
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith(PREFIX)) localStorage.removeItem(key);
      }
    } catch {
      /* ignore */
    }
  },
};
