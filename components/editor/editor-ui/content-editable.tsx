"use client";

import { ContentEditable as LexicalContentEditable } from "@lexical/react/LexicalContentEditable";

interface ContentEditableProps {
  className?: string;
}

export function ContentEditable({ className }: ContentEditableProps) {
  return <LexicalContentEditable className={className} />;
}
