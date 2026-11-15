import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Markdown } from "../components/Markdown";
import { useApp } from "../lib/appContext";
import { streamChat } from "../lib/deepseek";
import { buildIndexFor, buildMessages, retrieve, SUGGESTED_QUESTIONS } from "../lib/rag";
import { storage } from "../lib/storage";
import { clsx } from "../lib/util";
import type { ChatMessage } from "../types";

export function AskPage() {
  const { session, toast } = useApp();
  const settings = useMemo(() => storage.getSettings(), []);
  const index = useMemo(
    () => (session ? buildIndexFor(session.profile, session.digest) : null),
    [session],
  );
  const [messages, setMessages] = useState<ChatMessage[]>(() => storage.getChat());
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const hasKey = Boolean(settings.llmApiKey);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  async function send(text: string) {
    const question = text.trim();
    if (!question || busy || !session || !index) return;
    if (!hasKey) {
      toast("请先在设置里填写 API Key", "error");
      return;
    }

    const history = messages;
    const { hits, sources } = retrieve(index, question, 6);
    const built = buildMessages(session.profile, hits, question, history);
    const now = new Date().toISOString();
    const userMsg: ChatMessage = { role: "user", content: question, at: now };
    const answerMsg: ChatMessage = { role: "assistant", content: "", sources, at: now };

    setMessages([...history, userMsg, answerMsg]);
    setInput("");
    setBusy(true);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await streamChat({
        baseUrl: settings.llmBaseUrl,
        apiKey: settings.llmApiKey,
        model: settings.llmModel,
        messages: built,
        signal: controller.signal,
        onDelta: (delta) => {
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            next[next.length - 1] = { ...last, content: last.content + delta };
            return next;
          });
        },
      });
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        toast("已停止", "info");
      } else {
        const message = (err as Error).message || "回答失败";
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          next[next.length - 1] = {
            ...last,
            error: true,
            content: last.content || message,
          };
          return next;
        });
        toast(message, "error");
      }
    } finally {
      setBusy(false);
      abortRef.current = null;
      setMessages((prev) => {
        storage.saveChat(prev);
        return prev;
      });
    }
  }

  function stop() {
    abortRef.current?.abort();
  }

  function clearChat() {
    storage.clearChat();
    setMessages([]);
    toast("对话已清空", "success");
  }

  return (
    <div className="flex min-h-[calc(100dvh-8.5rem)] flex-col">
      <div className="flex items-center justify-between px-4 pt-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">问一问</h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            基于你的项目、简历和最近岗位作答
          </p>
        </div>
        {messages.length > 0 && (
          <button className="btn-ghost !px-3 !py-1.5 text-xs" onClick={clearChat}>
            清空
          </button>
        )}
      </div>

      {!hasKey && (
        <div className="mx-4 mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
          还没有配置模型 API Key。
          <Link to="/settings" className="ml-1 font-medium underline">
            去设置
          </Link>
        </div>
      )}

      <div className="flex-1 space-y-4 px-4 py-4">
        {messages.length === 0 && (
          <div className="space-y-3 pt-6">
            <p className="text-center text-sm text-slate-500 dark:text-slate-400">
              试试这些问题：
            </p>
            <div className="mx-auto flex max-w-sm flex-wrap justify-center gap-2">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  className="rounded-full border bg-white px-3 py-1.5 text-xs text-slate-600 transition hover:border-brand-300 hover:text-brand-600 dark:bg-slate-900 dark:text-slate-300"
                  onClick={() => send(q)}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={clsx("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={clsx(
                "max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[14px] leading-relaxed",
                msg.role === "user"
                  ? "bg-brand-600 text-white"
                  : msg.error
                    ? "border border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
                    : "card",
              )}
            >
              {msg.role === "assistant" ? (
                msg.content ? (
                  <Markdown content={msg.content} />
                ) : (
                  <span className="inline-flex gap-1 text-slate-400">
                    <Dot delay="0ms" />
                    <Dot delay="150ms" />
                    <Dot delay="300ms" />
                  </span>
                )
              ) : (
                <span className="whitespace-pre-wrap">{msg.content}</span>
              )}

              {msg.role === "assistant" && msg.sources && msg.sources.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1 border-t pt-2">
                  {msg.sources.slice(0, 4).map((s) => (
                    <span
                      key={s.id}
                      className="chip bg-slate-100 text-[10px] text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                    >
                      {s.label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="sticky bottom-[60px] z-20 bg-gradient-to-t from-slate-50 via-slate-50/95 to-transparent px-4 pb-2 pt-3 dark:from-slate-950 dark:via-slate-950/95">
        <div className="card flex items-end gap-2 p-2">
          <textarea
            className="max-h-32 min-h-[40px] flex-1 resize-none bg-transparent px-2 py-2 text-[14px] outline-none"
            rows={1}
            placeholder={hasKey ? "问点什么…" : "请先配置 API Key"}
            value={input}
            disabled={!hasKey}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
          />
          {busy ? (
            <button className="btn-ghost !px-3 !py-2 text-xs" onClick={stop}>
              停止
            </button>
          ) : (
            <button
              className="btn-primary !px-3.5 !py-2 text-sm"
              onClick={() => send(input)}
              disabled={!input.trim() || !hasKey}
            >
              发送
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400"
      style={{ animationDelay: delay }}
    />
  );
}
