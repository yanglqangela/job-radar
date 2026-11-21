import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { Markdown } from "../components/Markdown";
import { ScrollProgress } from "../components/portfolio/ScrollProgress";
import { SiteHeader } from "../components/portfolio/SiteHeader";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import { AGENT_SERVER_URL, isMirrorHost } from "../lib/agent";

type AgentSource = { id: number; title: string };

type AgentMessage = {
  role: "user" | "agent";
  content: string;
  sources?: AgentSource[];
  error?: boolean;
};

type AgentTraceStep = {
  tool_calls?: Array<{
    observed_entries?: Array<{ id?: number; title?: string }>;
  }>;
};

type AgentResponse = {
  answer: string;
  session_id: string;
  trace?: { steps?: AgentTraceStep[] };
};

const INITIAL_MESSAGE =
  "你好，我是杨李清的公开知识库 Agent。可以问项目、技术决策、工作经历或技能；回答只来自公开的作品集和项目资料。";

const SAMPLES = [
  "OfferPilot 为什么用 Java 和 Python 两套服务？",
  "DO&SH 海外站的后台能做什么？",
  "算力换股的调研流程是怎样的？",
  "你最熟悉的技术栈是什么？",
];

const MAX_INPUT = 500;

function collectSources(trace?: AgentResponse["trace"]): AgentSource[] {
  const found = new Map<number, string>();
  for (const step of trace?.steps || []) {
    for (const call of step.tool_calls || []) {
      for (const entry of call.observed_entries || []) {
        if (typeof entry.id === "number" && entry.title) {
          found.set(entry.id, entry.title);
        }
      }
    }
  }
  return Array.from(found.entries())
    .slice(0, 5)
    .map(([id, title]) => ({ id, title }));
}

export function AgentPage() {
  useDocumentTitle("问 Agent · 杨李清");
  const reduced = usePrefersReducedMotion();
  const [mirror] = useState(() => isMirrorHost());
  const [messages, setMessages] = useState<AgentMessage[]>([
    { role: "agent", content: INITIAL_MESSAGE },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const log = logRef.current;
    if (!log) return;
    log.scrollTo({ top: log.scrollHeight, behavior: reduced ? "auto" : "smooth" });
  }, [messages, busy, reduced]);

  async function send(text: string) {
    const message = text.trim().slice(0, MAX_INPUT);
    if (!message || busy) return;

    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setInput("");
    setBusy(true);

    try {
      const res = await fetch("/api/public/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, session_id: sessionId || undefined }),
      });

      if (res.status === 429) {
        setMessages((prev) => [
          ...prev,
          { role: "agent", content: "问得有点快，等几秒再试。", error: true },
        ]);
        return;
      }
      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            role: "agent",
            content: `Agent 暂时不可用（HTTP ${res.status}），稍后再试。`,
            error: true,
          },
        ]);
        return;
      }

      const data = (await res.json()) as AgentResponse;
      setSessionId(data.session_id || sessionId);
      setMessages((prev) => [
        ...prev,
        {
          role: "agent",
          content: data.answer || "这次没有生成回答，换个问法再试。",
          sources: collectSources(data.trace),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "agent", content: "网络或服务暂时不可用，稍后再试。", error: true },
      ]);
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    if (busy) return;
    setMessages([{ role: "agent", content: INITIAL_MESSAGE }]);
    setSessionId(null);
    setInput("");
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void send(input);
    }
  }

  if (mirror) {
    return (
      <div className="pf min-h-[100dvh]">
        <ScrollProgress />
        <SiteHeader identity={{ name: "杨李清", headlineEn: "Public Agent" }} />
        <main className="pf-container pf-agent-mirror">
          <p className="pf-agent-kicker">公开知识库 Agent</p>
          <h1 className="pf-agent-title">Agent 运行在服务器站点</h1>
          <p className="pf-agent-lede">
            GitHub Pages 只能托管静态页面，公开 Agent 需要访问服务器上的知识库接口。
            请到服务器站点使用。
          </p>
          <a href={AGENT_SERVER_URL} className="pf-text-link pf-text-link--signal mt-6 inline-block">
            前往 http://8.148.67.50
          </a>
        </main>
        <div className="pf-grain" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="pf min-h-[100dvh]">
      <ScrollProgress />
      <SiteHeader identity={{ name: "杨李清", headlineEn: "Public Agent" }} />

      <main className="pf-container pf-agent-layout">
        <div className="pf-agent-side">
          <aside className="pf-agent-intro">
            <p className="pf-agent-kicker">Ask my public knowledge base</p>
            <h1 className="pf-agent-title">问 Agent</h1>
            <p className="pf-agent-lede">
              关于项目、技术决策、工作经历和技能，直接问。回答来自公开作品集和项目资料，
              不涉及私密工作台数据。
            </p>
          </aside>

          <aside className="pf-agent-notes">
            <p className="pf-agent-disclaimer">
              回答由 AI 生成，可能有遗漏，以项目详情页为准。公开知识库只包含作品集和项目资料，
              不包含邮箱、电话和岗位线索。
            </p>
            <p className="pf-agent-disclaimer">公开 Agent 每人每分钟最多 10 次提问。</p>
          </aside>
        </div>

        <section className="pf-agent-chat" aria-label="知识库对话">
          <div className="pf-agent-chat-head">
            <span>对话</span>
            <button type="button" onClick={reset} className="pf-agent-reset" disabled={busy}>
              新对话
            </button>
          </div>

          <div className="pf-agent-log" ref={logRef} aria-live="polite">
            {messages.map((message, index) => (
              <div
                key={`${index}-${message.role}`}
                className={`pf-agent-msg pf-agent-msg--${message.role}${message.error ? " is-error" : ""}`}
              >
                <p className="pf-agent-msg-label">{message.role === "user" ? "你" : "Agent"}</p>
                {message.role === "agent" ? (
                  message.error ? (
                    <p className="pf-agent-error">{message.content}</p>
                  ) : (
                    <>
                      <div className="pf-agent-answer">
                        <Markdown content={message.content} />
                      </div>
                      {message.sources && message.sources.length > 0 && (
                        <p className="pf-agent-sources">
                          参考：
                          {message.sources.map((source) => source.title).join(" / ")}
                        </p>
                      )}
                    </>
                  )
                ) : (
                  <p className="pf-agent-msg-text">{message.content}</p>
                )}
              </div>
            ))}

            {busy && (
              <div className="pf-agent-status">
                <span className="pf-status-dot" aria-hidden="true" />
                正在查知识库…
              </div>
            )}

            {!busy && messages.length === 1 && (
              <div className="pf-agent-starters">
                <p className="pf-agent-starters-label">可以试试</p>
                {SAMPLES.map((sample) => (
                  <button
                    key={sample}
                    type="button"
                    className="pf-agent-sample"
                    onClick={() => void send(sample)}
                  >
                    {sample}
                  </button>
                ))}
              </div>
            )}
          </div>

          <form
            className="pf-agent-composer"
            onSubmit={(event) => {
              event.preventDefault();
              void send(input);
            }}
          >
            <textarea
              className="pf-agent-input"
              value={input}
              onChange={(event) => setInput(event.target.value.slice(0, MAX_INPUT))}
              onKeyDown={onKeyDown}
              rows={2}
              maxLength={MAX_INPUT}
              placeholder="问一个关于项目或技术决策的问题…"
              aria-label="问题"
            />
            <button
              type="submit"
              className="pf-agent-send"
              disabled={busy || !input.trim()}
            >
              {busy ? "思考中" : "发送"}
            </button>
          </form>
          <p className="pf-agent-hint">
            Enter 发送，Shift + Enter 换行 · 最多 {MAX_INPUT} 字
          </p>
        </section>
      </main>

      <div className="pf-grain" aria-hidden="true" />
    </div>
  );
}
