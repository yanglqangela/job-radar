import { useMemo } from "react";
import DOMPurify from "dompurify";
import { marked } from "marked";

marked.setOptions({ breaks: true, gfm: true });

export function Markdown({ content }: { content: string }) {
  const html = useMemo(() => {
    const raw = marked.parse(content || "") as string;
    return DOMPurify.sanitize(raw, {
      ALLOWED_TAGS: [
        "p",
        "br",
        "strong",
        "em",
        "del",
        "code",
        "pre",
        "ul",
        "ol",
        "li",
        "blockquote",
        "a",
        "h1",
        "h2",
        "h3",
        "h4",
        "hr",
      ],
      ALLOWED_ATTR: ["href", "target", "rel"],
    });
  }, [content]);

  return <div className="md" dangerouslySetInnerHTML={{ __html: html }} />;
}
