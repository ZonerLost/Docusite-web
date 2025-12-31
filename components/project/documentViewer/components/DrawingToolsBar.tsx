"use client";

import * as React from "react";
import ToolButton from "./ToolButton";
import PenMenu from "./PenMenu";
import { ANNOTATE_TOOLS } from "../constants";
import type { AnnotationTool, PenColor, PenSize } from "../types";
import { useLongPress } from "../hooks/useLongPress";
import { UndoIcon, RedoIcon } from "lucide-react"; // keep your icons if these exist in your project

type Props = {
  selectedTool: AnnotationTool | null;
  onToolSelect: (tool: AnnotationTool | null) => void;
  penColor: PenColor;
  penSize: PenSize;
  onPenSettingsChange: (cfg: { color?: PenColor; size?: PenSize }) => void;

  onUndo: () => void;
  onRedo: () => void;

  onOpenPhotos: () => void;
  onAddNote: () => void;
};

export default React.memo(function DrawingToolsBar({
  selectedTool,
  onToolSelect,
  penColor,
  penSize,
  onPenSettingsChange,
  onUndo,
  onRedo,
  onOpenPhotos,
  onAddNote,
}: Props) {
  const [penMenuOpen, setPenMenuOpen] = React.useState(false);
  const [penMenuPos, setPenMenuPos] = React.useState({ x: 0, y: 0 });

  const longPress = useLongPress({
    onLongPress: (pos) => {
      setPenMenuPos(pos);
      setPenMenuOpen(true);
    },
  });

  return (
    <div className="flex items-center gap-2 px-4 sm:px-6 py-3 bg-gray-100 rounded-lg mx-4 sm:mx-6 overflow-x-auto">
      {ANNOTATE_TOOLS.map((t) => {
        const isActive = selectedTool === t.id;

        // actions (photos/note) don’t toggle tool mode
        if (t.id === "image") {
          return (
            <ToolButton
              key={t.id}
              icon={t.icon}
              label={t.label}
              active={false}
              onClick={onOpenPhotos}
            />
          );
        }
        if (t.id === "note") {
          return (
            <ToolButton
              key={t.id}
              icon={t.icon}
              label={t.label}
              active={isActive}
              onClick={() => {
                onToolSelect("note");
                onAddNote();
              }}
            />
          );
        }

        // draw tool supports long-press for pen settings
        if (t.id === "draw") {
          return (
            <div key={t.id} className="relative">
              <button
                type="button"
                onClick={() => onToolSelect(isActive ? null : "draw")}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setPenMenuPos({ x: e.clientX, y: e.clientY });
                  setPenMenuOpen(true);
                }}
                onPointerDown={longPress.onPointerDown}
                onPointerUp={longPress.onPointerUp}
                onPointerLeave={longPress.onPointerLeave}
                className={[
                  "h-10 w-10 rounded-full flex items-center justify-center transition",
                  isActive
                    ? "bg-action text-white shadow-sm"
                    : "bg-white text-action hover:bg-action/10 hover:shadow-sm",
                ].join(" ")}
                title="Draw (right click / long press for pen settings)"
              >
                <t.icon className="h-5 w-5" />
              </button>

              <PenMenu
                open={penMenuOpen}
                pos={penMenuPos}
                penColor={penColor}
                penSize={penSize}
                onChange={(cfg) => {
                  onPenSettingsChange(cfg);
                  setPenMenuOpen(false);
                }}
                onClose={() => setPenMenuOpen(false)}
              />
            </div>
          );
        }

        return (
          <ToolButton
            key={t.id}
            icon={t.icon}
            label={t.label}
            active={isActive}
            onClick={() => onToolSelect(isActive ? null : t.id)}
          />
        );
      })}

      <div className="w-px h-8 bg-gray-300 mx-2" />

      <ToolButton icon={UndoIcon as any} label="Undo" onClick={onUndo} />
      <ToolButton icon={RedoIcon as any} label="Redo" onClick={onRedo} />
    </div>
  );
});
