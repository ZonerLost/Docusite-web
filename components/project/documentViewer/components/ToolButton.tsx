"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type Props = {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  onClick: () => void;
};

const ToolButton = React.memo(function ToolButton({ icon: Icon, label, active, onClick }: Props) {
  return (
    <button
      type="button"
      aria-pressed={!!active}
      onClick={onClick}
      className={cn(
        "h-10 w-10 shrink-0 rounded-full flex items-center justify-center transition",
        active
          ? "bg-action text-white shadow-sm"
          : "bg-white text-action hover:bg-action/10 hover:shadow-sm",
      )}
      title={label}
    >
      <Icon className="h-5 w-5" />
    </button>
  );
});

export default ToolButton;
