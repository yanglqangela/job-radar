import { useEffect } from "react";

export const DEFAULT_TITLE = "杨李清 · AI 应用开发作品集";

export function useDocumentTitle(title?: string) {
  useEffect(() => {
    if (!title) return;
    document.title = title;
    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [title]);
}
