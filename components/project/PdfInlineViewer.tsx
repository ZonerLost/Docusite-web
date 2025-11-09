"use client";

import React from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { storage } from "@/lib/firebase-client";
import { ref as storageRef, getDownloadURL } from "firebase/storage";

type Props = {
  fileUrl: string;
  onClose?: () => void;
  height?: number | string;
  // Provide the scroll container to parent so it can anchor overlays to PDF content
  onContainerRef?: (el: HTMLDivElement | null) => void;
};

const PdfInlineViewer: React.FC<Props> = ({ fileUrl, onClose, height = "80vh", onContainerRef }) => {
  const [numPages, setNumPages] = React.useState<number>(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadTick, setReloadTick] = React.useState(0);
  const [iframeSrc, setIframeSrc] = React.useState<string | null>(null);
  const [proxiedUrl, setProxiedUrl] = React.useState<string | null>(null);
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    if (onContainerRef) onContainerRef(scrollRef.current);
    return () => {
      if (onContainerRef) onContainerRef(null);
    };
  }, [onContainerRef]);

  // Configure pdf.js worker
  React.useEffect(() => {
    try {
      pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
    } catch (e) {
      // optional: console.warn
    }
  }, []);

  // Prepare a same-origin URL for pdf.js (handles CORS + Range)
  React.useEffect(() => {
    let cancelled = false;

    const resolveFirebaseDownloadUrl = async (raw: string): Promise<string> => {
      try {
        // Matches: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{encodedPath}?...
        const m = raw.match(/\/v0\/b\/([^/]+)\/o\/([^?]+)/);
        if (!m) return raw;
        const bucket = m[1];
        const objectPath = decodeURIComponent(m[2]);
        const gsUrl = `gs://${bucket}/${objectPath}`;
        const sref = storageRef(storage, gsUrl);
        return await getDownloadURL(sref); // refreshes token if expired
      } catch {
        return raw;
      }
    };

    const buildDrivePreview = (raw: string): string | null => {
      try {
        const u = new URL(raw);
        if (!/google\.com$/i.test(u.hostname)) return null;
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
      setIframeSrc(null);
      setProxiedUrl(null);
      setNumPages(0);

      try {
        if (!fileUrl) {
          setLoading(false);
          return;
        }

        // 1) Ensure Firebase links are fresh
        const fresh = await resolveFirebaseDownloadUrl(fileUrl);

        // 2) If it's a public Drive share link, try the embeddable preview as a fallback
        const host = new URL(fresh).hostname;
        if (/google\.com$/i.test(host)) {
          const preview = buildDrivePreview(fresh);
          if (preview) {
            if (!cancelled) {
              setIframeSrc(preview);
              setLoading(false);
            }
            return;
          }
        }

        // 3) Build same-origin proxy URL
        const proxy = `/api/pdf-proxy?url=${encodeURIComponent(fresh)}`;
        if (!cancelled) setProxiedUrl(proxy);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to prepare PDF");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [fileUrl, reloadTick]);

  if (!fileUrl) return null;

  return (
    <div className="w-full border border-border-gray rounded-lg bg-white shadow-sm">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border-gray">
        <span className="text-sm text-black font-medium">PDF Preview</span>
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

      <div ref={scrollRef} className="overflow-auto" style={{ height }}>
        {loading ? (
          <div className="p-6 text-sm text-text-gray">Loading viewer…</div>
        ) : iframeSrc ? (
          <iframe
            title="Drive PDF preview"
            src={iframeSrc}
            className="w-full"
            style={{
              height: typeof height === "number" ? `${height}px` : height,
              border: 0,
            }}
            allow="autoplay"
          />
        ) : proxiedUrl ? (
          <Document
            file={proxiedUrl}
            loading={<div className="p-6 text-sm text-text-gray">Loading PDF…</div>}
            onLoadSuccess={(info: { numPages: number }) => setNumPages(info.numPages)}
            onLoadError={(e: any) => setError(e?.message || "Failed to load PDF")}
            renderMode="canvas"
          >
            {Array.from({ length: numPages }, (_, i) => (
              <Page
                key={`page_${i + 1}`}
                pageNumber={i + 1}
                width={900}
                renderAnnotationLayer={false}
                renderTextLayer={false}
              />
            ))}
          </Document>
        ) : (
          <div className="p-6 text-sm text-red-600">
            Unable to prepare PDF URL.
          </div>
        )}

        {error && (
          <div className="p-4 text-xs text-red-600 flex items-center gap-3">
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
};

export default PdfInlineViewer;
 
