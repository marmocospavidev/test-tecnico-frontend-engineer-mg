"use client";

import parse from "html-react-parser";
import DOMPurify from "dompurify";

type HTMLRendererProps = {
  html: string;
};

export function HTMLRenderer({ html }: HTMLRendererProps) {
  const sanitizedHTML = DOMPurify.sanitize(html.trim());

  return <div className="chat-prose">{parse(sanitizedHTML)}</div>;
}
