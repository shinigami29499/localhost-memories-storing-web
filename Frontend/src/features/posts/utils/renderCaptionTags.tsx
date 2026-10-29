import type { ReactNode } from "react";

export function renderCaptionTags(caption: string): ReactNode[] {
  const content: ReactNode[] = [];
  const pattern = /(^|[^\p{L}\p{N}_@])(@[A-Za-z0-9_.-]+|#[\p{L}\p{N}_]+)/gu;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(caption)) !== null) {
    const tagStart = match.index + match[1].length;
    const tag = match[2];
    content.push(caption.slice(lastIndex, tagStart));
    content.push(
      <span
        key={tagStart}
        className={`post-card__tag ${tag.startsWith("@") ? "post-card__tag--mention" : "post-card__tag--hashtag"}`}
      >
        {tag}
      </span>,
    );
    lastIndex = tagStart + tag.length;
  }

  content.push(caption.slice(lastIndex));
  return content;
}
