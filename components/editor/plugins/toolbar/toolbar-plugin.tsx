"use client";

import { ReactNode } from "react";

interface ToolbarPluginProps {
  children: ReactNode;
}

export function ToolbarPlugin({ children }: ToolbarPluginProps) {
  return (
    <div className="sticky top-0 z-10 flex items-center gap-2 overflow-auto border-b p-1">
      {children}
    </div>
  );
}
