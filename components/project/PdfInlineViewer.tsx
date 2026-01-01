"use client";

import React from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { storage } from "@/lib/firebase-client";
import { ref as storageRef, getDownloadURL } from "firebase/storage";

const pdfjsMajor = Number(String(pdfjs.version).split(".")[0] || 0);
const workerExt = pdfjsMajor >= 4 ? "mjs" : "js";
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.${workerExt}`;

type Props = {
  fileUrl: string;
  onClose?: () => void;
  height?: number | string;
  // Provide the scroll container to parent so it can anchor overlays to PDF content
  onContainerRef?: (el: HTMLDivElement | null) => void;
};

function stripQuery(url: string) {
  return String(url || "")
    .split("?")[0]
    .split("#")[0];
}

const PdfInlineViewer = React.memo(function PdfInlineViewer({
  fileUrl,
  onClose,
  height = "100%",
  onContainerRef,
}: Props) {
  const INITIAL_PAGE_COUNT = 6;
  const PAGE_BATCH = 6;
  const [numPages, setNumPages] = React.useState<number>(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadTick, setReloadTick] = React.useState(0);
  const [visiblePages, setVisiblePages] = React.useState(INITIAL_PAGE_COUNT);

  const [iframeSrc, setIframeSrc] = React.useState<string | null>(null);
  const [proxiedUrl, setProxiedUrl] = React.useState<string | null>(null);

  const scrollRef = React.useRef<HTMLDivElement | null>(null);

  // Responsive page width
  const [pageWidth, setPageWidth] = React.useState<number>(900);

  const docOptions = React.useMemo(
    () => ({ disableRange: true, disableStream: true }),
    []
  );

  // Track base URL so token changes don't reload viewer
  const lastBaseRef = React.useRef<string>("");
  const baseKey = React.useMemo(() => stripQuery(fileUrl), [fileUrl]);

  React.useEffect(() => {
    onContainerRef?.(scrollRef.current);
    return () => onContainerRef?.(null);
  }, [onContainerRef]);

  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const compute = () => {
      const w = el.clientWidth || 0;
      const next = Math.max(280, w - 24);
      setPageWidth(next);
    };

    compute();

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => compute());
      ro.observe(el);
    } else {
      window.addEventListener("resize", compute);
    }

    return () => {
      if (ro) ro.disconnect();
      else window.removeEventListener("resize", compute);
    };
  }, []);

  // Prepare a same-origin URL for pdf.js (handles CORS + Range)
  React.useEffect(() => {
    let cancelled = false;

    const resolveFirebaseDownloadUrl = async (raw: string): Promise<string> => {
      try {
        const m = raw.match(/\/v0\/b\/([^/]+)\/o\/([^?]+)/);
        if (!m) return raw;
        const bucket = m[1];
        const objectPath = decodeURIComponent(m[2]);
        const gsUrl = `gs://${bucket}/${objectPath}`;
        const sref = storageRef(storage, gsUrl);
        return await getDownloadURL(sref);
      } catch {
        return raw;
      }
    };

    const buildDrivePreview = (raw: string): string | null => {
      try {
        const u = new URL(raw);
        if (!u.hostname.includes("google")) return null;

        let id = u.searchParams.get("id") || "";
        if (!id) {
          const m = u.pathname.match(/\/d\/([a-zA-Z0-9_-]+)/);
          if (m?.[1]) id = m[1];
        }
        return id ? `https://drive.google.com/file/d/${id}/preview` : null;
      } catch {
        return null;
      }
    };

    const run = async () => {
      setLoading(true);
      setError(null);
      setNumPages(0);
      setVisiblePages(INITIAL_PAGE_COUNT);

      const base = stripQuery(fileUrl);
      const baseChanged = base && base !== lastBaseRef.current;
      const forceReload = reloadTick > 0;

      if (!base) {
        setLoading(false);
        setIframeSrc(null);
        setProxiedUrl(null);
        lastBaseRef.current = "";
        return;
      }

      if (!baseChanged && !forceReload && (proxiedUrl || iframeSrc)) {
        setLoading(false);
        return;
      }

      setIframeSrc(null);
      setProxiedUrl(null);

      try {
        const fresh = await resolveFirebaseDownloadUrl(fileUrl);

        const preview = buildDrivePreview(fresh);
        if (preview) {
          if (!cancelled) {
            lastBaseRef.current = base;
            setIframeSrc(preview);
            setLoading(false);
          }
          return;
        }

        const proxy = `/api/pdf-proxy?url=${encodeURIComponent(fresh)}`;
        if (!cancelled) {
          lastBaseRef.current = base;
          setProxiedUrl(proxy);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to prepare PDF");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileUrl, reloadTick]);

  if (!fileUrl) return null;

  const containerStyle = {
    height: typeof height === "number" ? `${height}px` : height,
  };

  return (
    <div
      className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-lg border border-border-gray bg-white shadow-sm"
      style={containerStyle}
    >
      <div className="relative z-20 flex shrink-0 items-center justify-between border-b border-border-gray px-3 py-2">
        <span className="text-sm font-medium text-black">PDF Preview</span>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-action hover:text-action/80"
          >
            Close
          </button>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 min-h-0 overflow-auto">
        {loading ? (
          <div className="p-6 text-sm text-text-gray">Loading viewer...</div>
        ) : iframeSrc ? (
          <iframe
            title="Drive PDF preview"
            src={iframeSrc}
            className="h-full w-full"
            style={{
              height: "100%",
              border: 0,
            }}
            allow="autoplay"
          />
        ) : proxiedUrl ? (
          <>
            <Document
              key={baseKey || "pdf"}
              file={proxiedUrl}
              loading={
                <div className="p-6 text-sm text-text-gray">Loading PDF...</div>
              }
              onLoadSuccess={(info: { numPages: number }) => {
                setNumPages(info.numPages);
                setVisiblePages(Math.min(info.numPages, INITIAL_PAGE_COUNT));
              }}
              onLoadError={(e: any) =>
                setError(e?.message || "Failed to load PDF")
              }
              renderMode="canvas"
              options={docOptions}
            >
              <div className="flex flex-col items-center gap-4 py-4">
                {Array.from(
                  { length: Math.min(numPages, visiblePages) },
                  (_, i) => (
                    <div
                      key={`pagewrap_${i + 1}`}
                      data-pdf-page="true"
                      data-page-index={i}
                      data-page-number={i + 1}
                      className="relative flex w-full justify-center overflow-hidden"
                    >
                      <Page
                        pageNumber={i + 1}
                        width={pageWidth}
                        renderAnnotationLayer={false}
                        renderTextLayer={false}
                        className="pdf-page"
                      />
                    </div>
                  )
                )}
              </div>
            </Document>
            {numPages > visiblePages && (
              <div className="flex justify-center pb-4">
                <button
                  type="button"
                  className="rounded border border-border-gray px-3 py-1 text-xs text-action hover:text-action/80"
                  onClick={() =>
                    setVisiblePages((v) => Math.min(numPages, v + PAGE_BATCH))
                  }
                >
                  Load more pages
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="p-6 text-sm text-red-600">
            Unable to prepare PDF URL.
          </div>
        )}

        {error && (
          <div className="flex items-center gap-3 p-4 text-xs text-red-600">
            <span>Unable to load PDF. {error}</span>
            <button
              type="button"
              className="text-action underline"
              onClick={() => setReloadTick((v) => v + 1)}
            >
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

PdfInlineViewer.displayName = "PdfInlineViewer";
export default PdfInlineViewer;
