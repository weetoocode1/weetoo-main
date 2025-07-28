"use client";

import { ClearEditorPlugin } from "@lexical/react/LexicalClearEditorPlugin";
import {
  InitialConfigType,
  LexicalComposer,
} from "@lexical/react/LexicalComposer";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { PlainTextPlugin } from "@lexical/react/LexicalPlainTextPlugin";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { ParagraphNode, TextNode } from "lexical";
import { useState } from "react";

import { ContentEditable } from "@/components/editor/editor-ui/content-editable";
import { ActionsPlugin } from "@/components/editor/plugins/actions/actions-plugin";
import { ClearEditorActionPlugin } from "@/components/editor/plugins/actions/clear-editor-plugin";
import { HistoryToolbarPlugin } from "@/components/editor/plugins/toolbar/history-toolbar-plugin";
import { ToolbarPlugin } from "@/components/editor/plugins/toolbar/toolbar-plugin";
import { editorTheme } from "@/components/editor/themes/editor-theme";
import { TooltipProvider } from "@/components/ui/tooltip";

const editorConfig: InitialConfigType = {
  namespace: "Editor",
  theme: editorTheme,
  nodes: [HeadingNode, ParagraphNode, TextNode, QuoteNode],
  onError: (error: Error) => {
    console.error(error);
  },
};

interface RichTextEditorProps {
  onChange?: (content: string) => void;
}

export function RichTextEditor({ onChange }: RichTextEditorProps) {
  return (
    <div className="bg-background w-full overflow-hidden rounded-none border">
      <LexicalComposer
        initialConfig={{
          ...editorConfig,
        }}
      >
        <TooltipProvider>
          <Plugins onChange={onChange} />
        </TooltipProvider>
      </LexicalComposer>
    </div>
  );
}

const placeholder = "Start typing...";

interface PluginsProps {
  onChange?: (content: string) => void;
}

export function Plugins({ onChange }: PluginsProps) {
  const [, setFloatingAnchorElem] = useState<HTMLDivElement | null>(null);

  const onRef = (_floatingAnchorElem: HTMLDivElement) => {
    if (_floatingAnchorElem !== null) {
      setFloatingAnchorElem(_floatingAnchorElem);
    }
  };

  return (
    <div className="relative">
      <ToolbarPlugin>
        <HistoryToolbarPlugin />
      </ToolbarPlugin>

      <div className="relative">
        <PlainTextPlugin
          contentEditable={
            <div>
              <div ref={onRef}>
                <ContentEditable className="ContentEditable__root relative block h-72 min-h-72 overflow-auto p-4 focus:outline-none text-sm" />
              </div>
            </div>
          }
          placeholder={
            <div className="pointer-events-none absolute left-4 top-[18px] select-none text-muted-foreground/60">
              {placeholder}
            </div>
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
        {onChange && (
          <OnChangePlugin
            onChange={(editorState) => {
              editorState.read(() => {
                const textContent = editorState.read(
                  () => editorState._nodeMap.get("root")?.getTextContent() || ""
                );
                onChange(textContent);
              });
            }}
          />
        )}
        <HistoryPlugin />
      </div>
      <ActionsPlugin>
        <div className="clear-both flex items-center justify-between gap-2 overflow-auto border-t p-1">
          <div className="flex flex-1 justify-start">
            {/* left side action buttons */}
          </div>
          <div>{/* center action buttons */}</div>
          <div className="flex flex-1 justify-end">
            {/* right side action buttons */}
            <>
              <ClearEditorActionPlugin />
              <ClearEditorPlugin />
            </>
          </div>
        </div>
      </ActionsPlugin>
    </div>
  );
}
