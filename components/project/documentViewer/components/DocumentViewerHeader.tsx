"use client";

import * as React from "react";
import Button from "@/components/ui/Button";
import FormInput from "@/components/ui/FormInput";
import { PDFIcon, SearchIcon, EyeIcon } from "@/components/ui/Icons";
import { FileTextIcon } from "lucide-react";

import DrawingToolsBar from "./DrawingToolsBar";
import type { ActiveTab, AnnotationTool, CategoryChip, PenColor, PenSize, SearchResults } from "../types";

const AddPicturesWithNotesModal = React.lazy(() => import("@/components/modals/AddPicturesWithNotesModal"));

type Props = {
  projectName: string;
  selectedFile?: { id: string; name: string; category?: string } | null;

  searchQuery: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;

  onExportPdf: () => void;
  onOpenReportMeta?: () => void;

  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;

  selectedTool: AnnotationTool | null;
  onToolSelect: (tool: AnnotationTool | null) => void;

  onUndo: () => void;
  onRedo: () => void;

  searchResults: SearchResults;
  onNavigateSearch: (direction: "next" | "prev") => void;

  categories?: CategoryChip[];
  onCategoryClick?: (name: string) => void;

  penColor: PenColor;
  penSize: PenSize;
  onPenSettingsChange: (cfg: { color?: PenColor; size?: PenSize }) => void;

  onAddImageNote?: () => void;
  onAddPicturesWithDescription?: (files: File[], description: string) => void;
  onAddNote: () => void;
  onOpenFullView?: () => void;
  disableFullView?: boolean;
};

export default function DocumentViewerHeader(props: Props) {
  const {
    projectName,
    selectedFile,

    searchQuery,
    onSearchChange,

    onExportPdf,
    onOpenReportMeta,

    activeTab,
    onTabChange,

    selectedTool,
    onToolSelect,

    onUndo,
    onRedo,

    searchResults,
    onNavigateSearch,

    categories,
    onCategoryClick,

    penColor,
    penSize,
    onPenSettingsChange,

    onAddImageNote,
    onAddPicturesWithDescription,
    onAddNote,
    onOpenFullView,
    disableFullView,
  } = props;

  const [photosModalOpen, setPhotosModalOpen] = React.useState(false);

  return (
    <div className="bg-white border-b border-border-gray rounded-t-xl sticky top-0 z-50">
      {/* Top Row */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between px-4 sm:px-6 py-4 gap-4">
        <div className="flex flex-col gap-2 min-w-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 bg-cancelled-color/15 rounded flex items-center justify-center shrink-0">
              <PDFIcon className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-semibold text-black truncate">
                {selectedFile?.name || `${projectName}.pdf`}
              </h1>
            </div>
          </div>

          {!!categories?.length && (
            <div className="flex items-center gap-2 ml-11 flex-wrap">
              {categories.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => onCategoryClick?.(c.name)}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-action/10 text-action border border-action/20 hover:bg-action/15"
                  title={`Open ${c.name}`}
                >
                  <span>{c.name}</span>
                  <span className="ml-1 text-[10px] text-action/70">{c.count}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative">
            <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-placeholder-gray pointer-events-none" />
            <FormInput
              label=""
              placeholder="Search here..."
              className="w-full sm:w-64 bg-light-gray border-none focus:ring-0"
              value={searchQuery}
              onChange={onSearchChange}
            />
            {searchResults.count > 0 && (
              <div className="absolute -bottom-8 left-0 right-0 flex items-center justify-between text-xs text-text-gray bg-white border border-border-gray rounded px-2 py-1 z-10">
                <span className="truncate">
                  {searchResults.currentIndex} of {searchResults.count} results
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onNavigateSearch("prev")}
                    className="p-1 hover:bg-light-gray rounded"
                    title="Previous result"
                  >
                    ƒ+`
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigateSearch("next")}
                    className="p-1 hover:bg-light-gray rounded"
                    title="Next result"
                  >
                    ƒ+"
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onOpenFullView && (
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={onOpenFullView}
                disabled={disableFullView}
              >
                Complete View
              </Button>
            )}
            {/* {onOpenReportMeta && (
              <Button type="button" variant="secondary" className="hidden sm:inline-flex" onClick={onOpenReportMeta}>
                Report Info
              </Button>
            )} */}
            <Button onClick={onExportPdf} variant="primary" className="w-full sm:w-auto">
              <span className="hidden sm:inline">Save & Export</span>
              <span className="sm:hidden">Export</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 px-6 py-3 bg-white border-t border-border-gray overflow-x-auto">
        <button
          type="button"
          onClick={() => onTabChange("view")}
          className={[
            "flex items-center gap-2 transition-colors whitespace-nowrap pb-1",
            activeTab === "view" ? "text-action border-b-2 border-action" : "text-text-gray hover:text-action",
          ].join(" ")}
        >
          <EyeIcon className="w-4 h-4" />
          <span className="text-sm font-medium">View File</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange("annotate")}
          className={[
            "flex items-center gap-2 transition-colors whitespace-nowrap pb-1",
            activeTab === "annotate" ? "text-action border-b-2 border-action" : "text-text-gray hover:text-action",
          ].join(" ")}
        >
          <FileTextIcon className="w-4 h-4" />
          <span className="text-sm font-medium">Annotate</span>
        </button>
      </div>

      {/* Tools */}
      {activeTab === "annotate" && (
        <DrawingToolsBar
          selectedTool={selectedTool}
          onToolSelect={onToolSelect}
          penColor={penColor}
          penSize={penSize}
          onPenSettingsChange={onPenSettingsChange}
          onUndo={onUndo}
          onRedo={onRedo}
          onOpenPhotos={() => {
            if (onAddImageNote) {
              onAddImageNote();
              return;
            }
            setPhotosModalOpen(true);
          }}
          onAddNote={onAddNote}
        />
      )}

      {/* Lazy modal (perf) */}
      {photosModalOpen && (
        <React.Suspense fallback={null}>
          <AddPicturesWithNotesModal
            isOpen={photosModalOpen}
            onClose={() => setPhotosModalOpen(false)}
            onAdd={(pictures, note) => {
              try {
                onAddPicturesWithDescription?.(pictures, note);
              } finally {
                setPhotosModalOpen(false);
              }
            }}
          />
        </React.Suspense>
      )}
    </div>
  );
}
