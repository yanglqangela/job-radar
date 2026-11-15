/** 浏览器直连 DeepSeek（OpenAI 兼容），SSE 流式解析 */

export type ChatTurn = { role: "system" | "user" | "assistant"; content: string };

export class DeepSeekError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "DeepSeekError";
    this.status = status;
  }
}

function normalizeBase(baseUrl: string): string {
  return (baseUrl || "https://api.deepseek.com").trim().replace(/\/+$/, "");
}

function mapStatus(status: number, detail: string): string {
  if (status === 401) return "API Key 无效或已失效";
  if (status === 402) return "账户余额不足";
  if (status === 429) return "请求过于频繁，请稍后重试";
  if (status === 400) return `请求参数或模型不支持：${detail.slice(0, 120)}`;
  if (status >= 500) return "模型服务暂时不可用，请稍后重试";
  return `请求失败（HTTP ${status}）：${detail.slice(0, 120)}`;
}

async function readError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    return String(body?.error?.message || body?.message || JSON.stringify(body));
  } catch {
    try {
      return await res.text();
    } catch {
      return "";
    }
  }
}

export type StreamOptions = {
  baseUrl: string;
  apiKey: string;
  model: string;
  messages: ChatTurn[];
  signal?: AbortSignal;
  onDelta: (text: string) => void;
  onReasoning?: (text: string) => void;
};

export async function streamChat(opts: StreamOptions): Promise<string> {
  const url = `${normalizeBase(opts.baseUrl)}/chat/completions`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${opts.apiKey}`,
      },
      body: JSON.stringify({
        model: opts.model,
        messages: opts.messages,
        stream: true,
        temperature: 0.3,
        max_tokens: 2048,
      }),
      signal: opts.signal,
    });
  } catch (err) {
    if ((err as Error).name === "AbortError") throw err;
    throw new DeepSeekError("无法连接模型服务，请检查网络或 Base URL");
  }

  if (!res.ok) {
    throw new DeepSeekError(mapStatus(res.status, await readError(res)), res.status);
  }
  if (!res.body) throw new DeepSeekError("响应没有可读流");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");
    let idx: number;
    while ((idx = buffer.indexOf("\n\n")) >= 0) {
      const event = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      for (const line of event.split("\n")) {
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (!data || data === "[DONE]") continue;
        let json: any;
        try {
          json = JSON.parse(data);
        } catch {
          continue;
        }
        if (json.error) {
          throw new DeepSeekError(String(json.error.message || "模型返回错误"));
        }
        const delta = json.choices?.[0]?.delta;
        if (delta?.reasoning_content && opts.onReasoning) opts.onReasoning(delta.reasoning_content);
        if (delta?.content) {
          full += delta.content;
          opts.onDelta(delta.content);
        }
      }
    }
  }
  buffer += decoder.decode();
  return full;
}

export async function testConnection(
  baseUrl: string,
  apiKey: string,
  model: string,
): Promise<void> {
  const url = `${normalizeBase(baseUrl)}/chat/completions`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "只回复 ok" }],
        max_tokens: 8,
        temperature: 0,
      }),
    });
  } catch {
    throw new DeepSeekError("无法连接模型服务，请检查网络或 Base URL");
  }
  if (!res.ok) {
    throw new DeepSeekError(mapStatus(res.status, await readError(res)), res.status);
  }
}
