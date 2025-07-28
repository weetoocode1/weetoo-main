"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Helper to split markdown by chapters (h1)
function splitByChapters(markdown: string) {
  const chapters: string[] = [];
  const lines = markdown.split(/\r?\n/);
  let current: string[] = [];
  for (const line of lines) {
    if (line.startsWith("# ")) {
      if (current.length > 0) chapters.push(current.join("\n"));
      current = [line];
    } else {
      current.push(line);
    }
  }
  if (current.length > 0) chapters.push(current.join("\n"));
  return chapters;
}

function getChapterTitle(chapter: string) {
  const match = chapter.match(/^# (.+)$/m);
  return match ? match[1] : "";
}

export function TermsMarkdown({ markdown }: { markdown: string }) {
  const chapters = splitByChapters(markdown);
  // All open by default
  const [openStates, setOpenStates] = useState(chapters.map(() => true));

  const handleToggle = (idx: number) => {
    setOpenStates((prev) => prev.map((open, i) => (i === idx ? !open : open)));
  };

  return (
    <div className="space-y-1">
      {chapters.map((chapter, idx) => {
        const title = getChapterTitle(chapter);
        const content = chapter.replace(/^# .+$/m, "").trim();
        return (
          <Collapsible
            key={idx}
            open={openStates[idx]}
            onOpenChange={() => handleToggle(idx)}
            className="bg-muted/60 rounded-none shadow-sm border border-border"
          >
            <CollapsibleTrigger className="w-full flex items-center justify-between px-7 py-4 cursor-pointer select-none font-bold text-primary text-lg hover:bg-muted transition border-b">
              <span>{title}</span>
              <svg
                className={`ml-2 transition-transform ${
                  openStates[idx] ? "rotate-90" : "rotate-0"
                }`}
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M7 7L10 10L13 7"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </CollapsibleTrigger>
            <CollapsibleContent className="px-7 pb-7 pt-2">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: () => null,
                  h2: ({ node, ...props }) => (
                    <h3
                      className="text-lg font-semibold mt-6 mb-2"
                      {...props}
                    />
                  ),
                  h3: ({ node, ...props }) => (
                    <h4
                      className="text-base font-semibold mt-4 mb-1"
                      {...props}
                    />
                  ),
                  p: ({ node, ...props }) => (
                    <p className="mb-3 leading-relaxed" {...props} />
                  ),
                  ul: ({ node, ...props }) => (
                    <ul className="list-disc pl-6 mb-3" {...props} />
                  ),
                  ol: ({ node, ...props }) => (
                    <ol className="list-decimal pl-6 mb-3" {...props} />
                  ),
                  li: ({ node, ...props }) => (
                    <li className="mb-1" {...props} />
                  ),
                  hr: () => <hr className="my-8 border-muted" />,
                  strong: ({ node, ...props }) => (
                    <strong className="font-semibold" {...props} />
                  ),
                  em: ({ node, ...props }) => (
                    <em className="italic" {...props} />
                  ),
                }}
              >
                {content}
              </ReactMarkdown>
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );
}
