// import type { Annotation, ImageAnnotation } from "../types";
// import type { PdfArtifactsByPage } from "@/services/pdfArtifacts";
// import { colorIntToHex } from "@/services/pdfArtifacts";

// export function artifactsToAnnotations(data: PdfArtifactsByPage): Annotation[] {
//   const result: Annotation[] = [];

//   Object.entries(data).forEach(([pageKey, items]) => {
//     const page = Number.parseInt(pageKey, 10) || 1;

//     items.forEach((item: any) => {
//       if (item.type === "stroke") {
//         const pts = item.points || [];
//         if (pts.length < 2) return;

//         const xs = pts.map((p: any) => p.x);
//         const ys = pts.map((p: any) => p.y);
//         const minX = Math.min(...xs);
//         const maxX = Math.max(...xs);
//         const minY = Math.min(...ys);
//         const maxY = Math.max(...ys);

//         const width = Math.max(maxX - minX, 1);
//         const height = Math.max(maxY - minY, 1);

//         let penSize: Annotation["penSize"] = "medium";
//         const w = item.width ?? 3;
//         if (w <= 2) penSize = "small";
//         else if (w >= 5) penSize = "large";

//         result.push({
//           id: `stroke-${page}-${result.length}`,
//           type: "draw",
//           x: minX,
//           y: minY,
//           width,
//           height,
//           color: colorIntToHex(item.color ?? 0xff000000),
//           pathData: pts.map((p: any) => ({ x: p.x, y: p.y })),
//           penSize,
//           page,
//         });

//         return;
//       }

//       if (item.type === "annotation") {
//         const isSticky = item.annType === 1;

//         result.push({
//           id: item.id,
//           type: isSticky ? "note" : "text",
//           x: item.position.x,
//           y: item.position.y,
//           width: item.width || (isSticky ? 200 : 120),
//           height: item.height || (isSticky ? 60 : 32),
//           content: item.text || "",
//           color: colorIntToHex(item.color ?? 0xff000000),
//           page,
//         });

//         return;
//       }

//       if (item.type === "cameraPin") {
//         const images = item.imagePath ? [{ url: item.imagePath, storageKey: item.imagePath }] : [];
//         const imageAnn: ImageAnnotation = {
//           id: item.id,
//           type: "image",
//           x: item.position.x,
//           y: item.position.y,
//           width: 300,
//           height: 200,
//           images,
//           currentImageIndex: 0, // legacy fallback
//           content: item.note || "",
//           description: item.note || "",
//           rect: { x: 0, y: 0, w: 0.12, h: 0.1 },
//           page,
//           createdAt: typeof item.createdAt === "number" ? item.createdAt : undefined,
//           updatedAt: typeof item.createdAt === "number" ? item.createdAt : undefined,
//         };

//         result.push({
//           ...imageAnn,
//           page,
//         });
//       }
//     });
//   });

//   return result;
// }

import type {
  Annotation,
  ImageAnnotation,
  PenSize,
  NormalizedRect,
} from "../types";
import type { PdfArtifactsByPage } from "@/services/pdfArtifacts";
import { colorIntToHex } from "@/services/pdfArtifacts";

function isNum(v: any): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function parseCreatedAtMs(v: any): number | undefined {
  if (!v) return undefined;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const ms = new Date(v).getTime();
    return Number.isFinite(ms) ? ms : undefined;
  }
  if (typeof v?.toDate === "function") {
    const ms = v.toDate().getTime();
    return Number.isFinite(ms) ? ms : undefined;
  }
  return undefined;
}

function stableStrokeId(item: any, page: number, index: number) {
  const refNo = isNum(item?.refNo) ? item.refNo : undefined;
  const id = typeof item?.id === "string" ? item.id : undefined;
  return id || (refNo ? `stroke-${page}-${refNo}` : `stroke-${page}-${index}`);
}

export function artifactsToAnnotations(data: PdfArtifactsByPage): Annotation[] {
  const result: Annotation[] = [];

  Object.entries(data).forEach(([pageKey, items]) => {
    const page = Number.parseInt(pageKey, 10) || 1;

    (items as any[]).forEach((item: any, index: number) => {
      // -------------------- STROKES --------------------
      if (item?.type === "stroke") {
        const pts = Array.isArray(item.points) ? item.points : [];
        if (pts.length < 2) return;

        const xs = pts.map((p: any) => Number(p?.x ?? 0));
        const ys = pts.map((p: any) => Number(p?.y ?? 0));
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);

        const width = Math.max(maxX - minX, 1);
        const height = Math.max(maxY - minY, 1);

        let penSize: PenSize = "medium";
        const w = Number(item.width ?? 3);
        if (w <= 2) penSize = "small";
        else if (w >= 5) penSize = "large";

        result.push({
          id: stableStrokeId(item, page, index),
          type: "draw",
          x: minX,
          y: minY,
          width,
          height,
          color: colorIntToHex(item.color ?? 0xff000000),
          pathData: pts.map((p: any) => ({
            x: Number(p?.x ?? 0),
            y: Number(p?.y ?? 0),
          })),
          penSize,
          page,
        });

        return;
      }

      // -------------------- TEXT / NOTE --------------------
      if (item?.type === "annotation") {
        const isSticky = Number(item.annType ?? 0) === 1;
        const pos = item.position || {};
        const x = Number(pos.x ?? 0);
        const y = Number(pos.y ?? 0);

        const ann: Annotation = {
          id: String(item.id || `${page}-ann-${index}`),
          type: isSticky ? "note" : "text",
          x,
          y,
          width: Number(item.width ?? (isSticky ? 200 : 120)),
          height: Number(item.height ?? (isSticky ? 60 : 32)),
          content: String(item.text ?? ""),
          color: colorIntToHex(item.color ?? 0xff000000),
          page,
        };

        if (isNum(item.normX)) ann.normX = item.normX;
        if (isNum(item.normY)) ann.normY = item.normY;
        if (isNum(item.normW)) ann.normW = item.normW;
        if (isNum(item.normH)) ann.normH = item.normH;

        result.push(ann);
        return;
      }

      // -------------------- CAMERA PIN --------------------
      if (item?.type === "cameraPin") {
        const pos = item.position || {};
        const absX = Number(pos.x ?? 0);
        const absY = Number(pos.y ?? 0);

        const createdAtMs = parseCreatedAtMs(item.createdAt);

        const images = item.imagePath
          ? [
              {
                url: String(item.imagePath),
                storageKey: String(item.imagePath),
              },
            ]
          : [];

        const rect: NormalizedRect | undefined =
          item.rect &&
          isNum(item.rect.x) &&
          isNum(item.rect.y) &&
          isNum(item.rect.w) &&
          isNum(item.rect.h)
            ? { x: item.rect.x, y: item.rect.y, w: item.rect.w, h: item.rect.h }
            : isNum(item.normX) &&
              isNum(item.normY) &&
              isNum(item.normW) &&
              isNum(item.normH)
            ? { x: item.normX, y: item.normY, w: item.normW, h: item.normH }
            : undefined;

        const normX = isNum(item.normX) ? item.normX : undefined;
        const normY = isNum(item.normY) ? item.normY : undefined;
        const normW = isNum(item.normW) ? item.normW : undefined;
        const normH = isNum(item.normH) ? item.normH : undefined;

        const imageAnn: ImageAnnotation = {
          id: String(item.id || item.pinId || `${page}-pin-${index}`),
          type: "image",
          page,

          x: absX,
          y: absY,

          width: Number(item.width ?? 300),
          height: Number(item.height ?? 200),

          images,
          currentImageIndex: 0,

          content: String(item.note ?? ""),
          description: String(item.note ?? ""),
          displayMode:
            item.displayMode === "expanded" || item.displayMode === "icon"
              ? item.displayMode
              : "icon",

          ...(rect
            ? {
                rect,
                normX: rect.x,
                normY: rect.y,
                normW: rect.w,
                normH: rect.h,
              }
            : {
                ...(normX !== undefined ? { normX } : {}),
                ...(normY !== undefined ? { normY } : {}),
                ...(normW !== undefined ? { normW } : {}),
                ...(normH !== undefined ? { normH } : {}),
              }),

          createdAt: createdAtMs,
          updatedAt: createdAtMs,
        };

        result.push(imageAnn);
        return;
      }
    });
  });

  return result;
}
