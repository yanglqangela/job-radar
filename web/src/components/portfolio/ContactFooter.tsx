import { useEffect, useRef, useState } from "react";
import { emailHref } from "../../lib/portfolio";
import { workspaceHref } from "../../lib/agent";
import { copyText } from "../../lib/util";
import type { PortfolioData } from "../../types.portfolio";
import { SectionShell } from "./SectionShell";

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
    <SectionShell
      id="contact"
      index="04"
      title="有合适的岗位，直接聊。"
      titleEn="Contact"
      tone="ink"
    >
      <p className="pf-contact-body">
        我目前在找 AI 应用开发 / AI 产品方向的机会，也愿意接有意思的独立项目。
      </p>

      <div className="mt-9 flex flex-wrap items-baseline gap-x-8 gap-y-4">
        {href && (
          <>
            <a href={href} className="pf-contact-link pf-contact-mail">
              {contact.email}
            </a>
            <button type="button" onClick={copyEmail} className="pf-contact-link text-[13px]">
              {copied ? "已复制" : "复制邮箱"}
            </button>
          </>
        )}
        {contact.links.map((link) => (
          <a
            key={link.url}
            href={link.url}
            target="_blank"
            rel="noreferrer noopener"
            className="pf-contact-link text-[14px]"
          >
            {link.label}
          </a>
        ))}
      </div>

      <div className="pf-contact-footer">
        <div>
          <p className="text-[13px] text-[var(--pf-ink)]">
            {workspace?.label || "求职工作台"}
          </p>
          <p className="mt-0.5">{workspace?.hint || "私密，需要密码"}</p>
        </div>
        <a href={workspaceHref()} className="pf-contact-link text-[13px]">
          进入工作台
        </a>
      </div>

      <div className="mt-10 flex flex-wrap items-baseline justify-between gap-2 text-[12px] text-[rgba(232,235,227,0.6)]">
        <span>
          © {new Date().getFullYear()} {identity.name}
        </span>
        <span>
          {identity.nameEn} / {identity.headlineEn}
        </span>
      </div>
    </SectionShell>
  );
}
