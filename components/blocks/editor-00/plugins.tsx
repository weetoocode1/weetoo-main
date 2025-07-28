"use client";

import { useState } from "react";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { PlainTextPlugin } from "@lexical/react/LexicalPlainTextPlugin";
import { ContentEditable } from "@/components/editor/editor-ui/content-editable";

export function Plugins() {
  const [, setFloatingAnchorElem] = useState<HTMLDivElement | null>(null);

  const onRef = (_floatingAnchorElem: HTMLDivElement) => {
    if (_floatingAnchorElem !== null) {
      setFloatingAnchorElem(_floatingAnchorElem);
    }
  };

  return (
    <div className="relative">
      {/* toolbar plugins */}
      <div className="relative">
        <PlainTextPlugin
          contentEditable={
            <div>
              <div ref={onRef}>
                <ContentEditable className="ContentEditable__root relative block min-h-72 overflow-auto p-4 focus:outline-none" />
              </div>
            </div>
          }
          placeholder={
            <div className="pointer-events-none absolute left-4 top-[18px] select-none text-muted-foreground/60">
              Start typing...
            </div>
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
        {/* editor plugins */}
      </div>
      {/* actions plugins */}
    </div>
  );
}
