import { ReactNode } from "react";

export interface SubTabItem<TId extends string = string> {
  id: TId;
  label: string;
}

interface SubTabsHeaderProps<TId extends string = string> {
  tabs: ReadonlyArray<SubTabItem<TId>>;
  activeId: TId;
  onChange: (id: TId) => void;
  rightActions?: ReactNode;
}

export function SubTabsHeader<TId extends string = string>({
  tabs,
  activeId,
  onChange,
  rightActions,
}: SubTabsHeaderProps<TId>) {
  // Keep events simple to avoid interfering with clicks

  return (
    <div className="flex items-center px-2 py-1.5">
      <div className="flex items-center overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`px-4 py-1.5 text-xs font-medium whitespace-nowrap transition-colors duration-200 cursor-pointer ${
              activeId === tab.id
                ? "text-foreground bg-muted/50 border"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/20"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {rightActions ? (
        <div className="flex items-center gap-2 ml-4">
          <div className="h-4 w-px bg-border" />
          {rightActions}
        </div>
      ) : null}
    </div>
  );
}
