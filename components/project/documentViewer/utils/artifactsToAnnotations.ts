import type { Annotation, ImageAnnotation } from "../types";
import type { PdfArtifactsByPage } from "@/services/pdfArtifacts";
import { colorIntToHex } from "@/services/pdfArtifacts";

export function artifactsToAnnotations(data: PdfArtifactsByPage): Annotation[] {
  const result: Annotation[] = [];

  Object.entries(data).forEach(([pageKey, items]) => {
    const page = Number.parseInt(pageKey, 10) || 1;

    items.forEach((item: any) => {
      if (item.type === "stroke") {
        const pts = item.points || [];
        if (pts.length < 2) return;

        const xs = pts.map((p: any) => p.x);
        const ys = pts.map((p: any) => p.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);

        const width = Math.max(maxX - minX, 1);
        const height = Math.max(maxY - minY, 1);

        let penSize: Annotation["penSize"] = "medium";
        const w = item.width ?? 3;
        if (w <= 2) penSize = "small";
        else if (w >= 5) penSize = "large";

        result.push({
          id: `stroke-${page}-${result.length}`,
          type: "draw",
          x: minX,
          y: minY,
          width,
          height,
          color: colorIntToHex(item.color ?? 0xff000000),
          pathData: pts.map((p: any) => ({ x: p.x, y: p.y })),
          penSize,
          page,
        });

        return;
      }

      if (item.type === "annotation") {
        const isSticky = item.annType === 1;

        result.push({
          id: item.id,
          type: isSticky ? "note" : "text",
          x: item.position.x,
          y: item.position.y,
          width: item.width || (isSticky ? 200 : 120),
          height: item.height || (isSticky ? 60 : 32),
          content: item.text || "",
          color: colorIntToHex(item.color ?? 0xff000000),
          page,
        });

        return;
      }

      if (item.type === "cameraPin") {
        const images = item.imagePath ? [{ url: item.imagePath, storageKey: item.imagePath }] : [];
        const imageAnn: ImageAnnotation = {
          id: item.id,
          type: "image",
          x: item.position.x,
          y: item.position.y,
          width: 300,
          height: 200,
          images,
          currentImageIndex: 0, // legacy fallback
          content: item.note || "",
          description: item.note || "",
          rect: { x: 0, y: 0, w: 0.12, h: 0.1 },
          page,
          createdAt: typeof item.createdAt === "number" ? item.createdAt : undefined,
          updatedAt: typeof item.createdAt === "number" ? item.createdAt : undefined,
        };

        result.push({
          ...imageAnn,
          page,
        });
      }
    });
  });

  return result;
}
