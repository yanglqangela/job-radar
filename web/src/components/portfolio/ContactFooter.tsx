import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { emailHref } from "../../lib/portfolio";
import type { PortfolioData } from "../../types.portfolio";
import { copyText } from "../../lib/util";

export function ContactFooter({ data }: { data: PortfolioData }) {
  const { identity, contact, workspace } = data;
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);
  const href = emailHref(contact.email);

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  async function copyEmail() {
    if (!contact.email) return;
    await copyText(contact.email);
    setCopied(true);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <section id="contact" className="portfolio-section border-b-0">
      <div className="portfolio-container">
        <div className="relative overflow-hidden rounded-3xl bg-slate-950 px-6 py-14 text-white sm:px-12 sm:py-16">
          <div
            className="pointer-events-none absolute inset-0 opacity-70"
            style={{
              backgroundImage:
                "radial-gradient(60% 80% at 85% 10%, rgba(26,110,245,0.45), transparent 65%)",
            }}
          />
          <div className="relative">
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/50">
              04 / Contact
            </p>
            <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
              有合适的岗位或项目，直接聊。
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/65">
              我目前在找 AI 应用开发 / AI 产品方向的机会，也接受有意思的独立项目。
            </p>

            {href ? (
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <a
                  href={href}
                  className="text-xl font-medium underline decoration-white/25 underline-offset-4 transition hover:decoration-white sm:text-2xl"
                >
                  {contact.email}
                </a>
                <button
                  type="button"
                  onClick={copyEmail}
                  className="rounded-full border border-white/20 px-3 py-1 text-xs text-white/70 transition hover:border-white/40 hover:text-white"
                >
                  {copied ? "已复制" : "复制邮箱"}
                </button>
              </div>
            ) : (
              <p className="mt-6 text-sm text-white/60">邮箱待补充。</p>
            )}

            {contact.links.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-4">
                {contact.links.map((link) => (
                  <a
                    key={link.url}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-sm text-white/70 underline decoration-white/20 underline-offset-4 transition hover:text-white hover:decoration-white/60"
                  >
                    {link.label} ↗
                  </a>
                ))}
              </div>
            )}

            <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6">
              <div>
                <p className="text-sm font-medium">{workspace?.label || "求职工作台"}</p>
                <p className="mt-0.5 text-xs text-white/50">
                  {workspace?.hint || "私密 · 需要密码"}
                </p>
              </div>
              <Link
                to="/unlock"
                className="inline-flex items-center gap-1 rounded-full border border-white/20 px-4 py-2 text-sm text-white/80 transition hover:border-white/40 hover:text-white"
              >
                进入工作台 →
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-400">
          <span>
            © {new Date().getFullYear()} {identity.name}
          </span>
          <span>
            {identity.nameEn} · {identity.headlineEn}
          </span>
        </div>
      </div>
    </section>
  );
}
