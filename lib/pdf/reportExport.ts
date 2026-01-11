import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { PDFImage } from "pdf-lib";
import type { ExportedImage, PhotoMarkerExport, ReportProjectMeta } from "@/types/report";

export type { ExportedImage, PhotoMarkerExport, ReportProjectMeta } from "@/types/report";

const DEFAULT_PAGE = { width: 612, height: 792 }; // Letter
const PAGE_MARGIN = 60;
const BODY_SIZE = 11;
const LINE_HEIGHT = 16;
const PHOTO_MAX_HEIGHT = 280;
const PHOTO_MIN_HEIGHT = 160;
const PHOTO_GAP = 20;

function safeText(value: unknown, fallback = ""): string {
  const str = typeof value === "string" ? value.trim() : "";
  return str.length ? str : fallback;
}

function formatDateLong(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "2-digit",
  });
}

function toMillis(value?: string | number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const ms = Date.parse(value);
    return Number.isFinite(ms) ? ms : 0;
  }
  return 0;
}

function formatDateShort(value?: string | number): string {
  const ms = toMillis(value);
  if (!ms) return "N/A";
  try {
    return new Date(ms).toLocaleDateString("en-US");
  } catch {
    return "N/A";
  }
}

function wrapText(text: string, font: any, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    const width = font.widthOfTextAtSize(next, size);
    if (width <= maxWidth || !line) {
      line = next;
      continue;
    }
    lines.push(line);
    line = word;
  }

  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function truncateText(text: string, font: any, size: number, maxWidth: number): string {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  let trimmed = text.trim();
  while (trimmed.length > 0 && font.widthOfTextAtSize(`${trimmed}...`, size) > maxWidth) {
    trimmed = trimmed.slice(0, -1);
  }
  return trimmed ? `${trimmed}...` : "";
}

function decodeDataUrl(dataUrl: string): { bytes: Uint8Array; mime: string } {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match) {
    return { bytes: new Uint8Array(), mime: "application/octet-stream" };
  }
  const [, mime, base64] = match;

  if (typeof Buffer !== "undefined") {
    const buf = Buffer.from(base64, "base64");
    return { bytes: new Uint8Array(buf), mime };
  }

  if (typeof atob === "function") {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return { bytes, mime };
  }

  return { bytes: new Uint8Array(), mime };
}

function drawCentered(
  page: any,
  text: string,
  yTop: number,
  font: any,
  size: number,
  color = rgb(0, 0, 0),
) {
  const { width, height } = page.getSize();
  const textWidth = font.widthOfTextAtSize(text, size);
  const x = (width - textWidth) / 2;
  const y = height - yTop - size;
  page.drawText(text, { x, y, size, font, color });
}

function addCoverPage(
  doc: PDFDocument,
  meta: ReportProjectMeta,
  pageSize: { width: number; height: number },
  font: any,
  fontBold: any
) {
  // Cover page layout: centered title stack + report meta for quick scanning.
  const page = doc.addPage([pageSize.width, pageSize.height]);
  const { height } = page.getSize();
  const title = safeText(meta.name, "Project Report");
  const reportTarget = safeText(
    meta.clientName || meta.projectOwner || meta.ownerName || meta.ownerEmail,
    title
  );
  const owner = safeText(meta.projectOwner || meta.ownerName || meta.ownerEmail, "Not specified");
  const now = formatDateLong(new Date());

  drawCentered(page, title, height * 0.3, fontBold, 28, rgb(0.1, 0.1, 0.1));
  drawCentered(page, `Project Report ${reportTarget}`, height * 0.38, font, 16, rgb(0.25, 0.25, 0.25));
  drawCentered(page, `Owner: ${owner}`, height * 0.46, font, 12, rgb(0.35, 0.35, 0.35));
  drawCentered(page, `Generated on ${now}`, height * 0.51, font, 12, rgb(0.35, 0.35, 0.35));
  drawCentered(page, "Prepared by DocuSite", height * 0.75, fontBold, 12, rgb(0.15, 0.15, 0.15));
}

function addSummaryPage(
  doc: PDFDocument,
  meta: ReportProjectMeta,
  pageSize: { width: number; height: number },
  font: any,
  fontBold: any
) {
  // Executive summary + conclusion layout (multi-page if content is long).
  let page = doc.addPage([pageSize.width, pageSize.height]);
  const { width, height } = page.getSize();

  let yTop = PAGE_MARGIN;
  page.drawText("Executive Summary", {
    x: PAGE_MARGIN,
    y: height - yTop - 18,
    size: 18,
    font: fontBold,
    color: rgb(0.12, 0.2, 0.55),
  });
  yTop += 28;

  const summaryText =
    safeText(meta.description) ||
    `This report summarizes the project ${safeText(meta.name, "")} and documents the latest review notes, annotations, and photo evidence.`;

  const maxWidth = width - PAGE_MARGIN * 2;
  const summaryLines = wrapText(summaryText, font, BODY_SIZE, maxWidth);

  for (const line of summaryLines) {
    if (yTop + LINE_HEIGHT > height - PAGE_MARGIN) {
      page = doc.addPage([pageSize.width, pageSize.height]);
      yTop = PAGE_MARGIN;
    }
    page.drawText(line, {
      x: PAGE_MARGIN,
      y: height - yTop - BODY_SIZE,
      size: BODY_SIZE,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });
    yTop += LINE_HEIGHT;
  }

  yTop += 20;

  if (yTop + 40 > height - PAGE_MARGIN) {
    page = doc.addPage([pageSize.width, pageSize.height]);
    yTop = PAGE_MARGIN;
  }

  page.drawText("Conclusion", {
    x: PAGE_MARGIN,
    y: height - yTop - 16,
    size: 16,
    font: fontBold,
    color: rgb(0.12, 0.2, 0.55),
  });
  yTop += 24;

  const conclusionText = safeText(meta.conclusion, "No conclusion provided.");
  const conclusionLines = wrapText(conclusionText, font, BODY_SIZE, maxWidth);
  for (const line of conclusionLines) {
    if (yTop + LINE_HEIGHT > height - PAGE_MARGIN) {
      page = doc.addPage([pageSize.width, pageSize.height]);
      yTop = PAGE_MARGIN;
    }
    page.drawText(line, {
      x: PAGE_MARGIN,
      y: height - yTop - BODY_SIZE,
      size: BODY_SIZE,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });
    yTop += LINE_HEIGHT;
  }
}

async function addAnnotatedPages(doc: PDFDocument, pages: ExportedImage[]) {
  for (const p of pages) {
    const { bytes, mime } = decodeDataUrl(p.dataUrl);
    if (!bytes.length) continue;
    const image =
      mime === "image/jpeg" || mime === "image/jpg"
        ? await doc.embedJpg(bytes)
        : await doc.embedPng(bytes);

    const page = doc.addPage([image.width, image.height]);
    page.drawImage(image, {
      x: 0,
      y: 0,
      width: image.width,
      height: image.height,
    });
  }
}

type PhotoEntry = {
  id: string;
  refNo: string;
  page: number;
  createdAt?: string | number;
  note?: string;
  imageUrl?: string;
};

function flattenPhotoMarkers(markers: PhotoMarkerExport[]): PhotoEntry[] {
  const entries: PhotoEntry[] = [];
  markers.forEach((marker) => {
    const refNo = safeText(marker.refNo, marker.id);
    const page = Number.isFinite(marker.page) ? marker.page : 1;
    const createdAt = marker.createdAt;
    const note = marker.note;
    const urls = Array.isArray(marker.imageUrls) ? marker.imageUrls : [];

    if (urls.length) {
      urls.forEach((url) => {
        entries.push({
          id: marker.id,
          refNo,
          page,
          createdAt,
          note,
          imageUrl: url,
        });
      });
    } else {
      entries.push({ id: marker.id, refNo, page, createdAt, note });
    }
  });

  entries.sort((a, b) => toMillis(a.createdAt) - toMillis(b.createdAt));
  return entries;
}

function drawCameraIcon(page: any, x: number, y: number, size: number) {
  const bodyHeight = size * 0.6;
  const bodyColor = rgb(0.85, 0.86, 0.9);
  const lineColor = rgb(0.35, 0.35, 0.4);

  page.drawRectangle({
    x,
    y,
    width: size,
    height: bodyHeight,
    color: bodyColor,
    borderColor: lineColor,
    borderWidth: 0.5,
  });
  page.drawRectangle({
    x: x + size * 0.15,
    y: y + bodyHeight,
    width: size * 0.35,
    height: size * 0.18,
    color: lineColor,
  });
  page.drawCircle({
    x: x + size * 0.55,
    y: y + bodyHeight * 0.5,
    size: size * 0.18,
    color: lineColor,
  });
}

type PhotoIndexContext = { page: any; yTop: number };

function addPhotoIndex(
  doc: PDFDocument,
  entries: PhotoEntry[],
  pageSize: { width: number; height: number },
  font: any,
  fontBold: any
): PhotoIndexContext {
  const maxWidth = pageSize.width - PAGE_MARGIN * 2;
  const headerHeight = 22;
  const rowHeight = 18;
  const colIcon = 28;
  const colRef = 120;
  const colDescription = Math.max(120, maxWidth - colIcon - colRef);

  let page = doc.addPage([pageSize.width, pageSize.height]);
  let yTop = PAGE_MARGIN;

  const drawHeader = (title: string) => {
    page.drawText(title, {
      x: PAGE_MARGIN,
      y: pageSize.height - yTop - 16,
      size: 16,
      font: fontBold,
      color: rgb(0.12, 0.2, 0.55),
    });
    yTop += 26;
  };

  drawHeader("Photo Index");

  const drawTableHeader = () => {
    page.drawRectangle({
      x: PAGE_MARGIN,
      y: pageSize.height - yTop - headerHeight,
      width: maxWidth,
      height: headerHeight,
      color: rgb(0.12, 0.22, 0.55),
    });
    page.drawText("Image", {
      x: PAGE_MARGIN + 6,
      y: pageSize.height - yTop - 16,
      size: 10,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
    page.drawText("Description", {
      x: PAGE_MARGIN + colIcon + 6,
      y: pageSize.height - yTop - 16,
      size: 10,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
    page.drawText("Ref No", {
      x: PAGE_MARGIN + colIcon + colDescription + 6,
      y: pageSize.height - yTop - 16,
      size: 10,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
    yTop += headerHeight;
  };

  drawTableHeader();

  if (!entries.length) {
    page.drawText("No photos uploaded.", {
      x: PAGE_MARGIN,
      y: pageSize.height - yTop - BODY_SIZE,
      size: BODY_SIZE,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });
    yTop += LINE_HEIGHT;
  }

  for (const entry of entries) {
    if (yTop + rowHeight > pageSize.height - PAGE_MARGIN) {
      page = doc.addPage([pageSize.width, pageSize.height]);
      yTop = PAGE_MARGIN;
      drawHeader("Photo Index (cont.)");
      drawTableHeader();
    }

    const descriptionRaw = `Page ${entry.page || "?"} - ${formatDateShort(entry.createdAt)}`;
    const refRaw = safeText(entry.refNo, "N/A");
    const description = truncateText(descriptionRaw, font, BODY_SIZE, colDescription - 12);
    const ref = truncateText(refRaw, font, BODY_SIZE, colRef - 12);

    page.drawRectangle({
      x: PAGE_MARGIN,
      y: pageSize.height - yTop - rowHeight,
      width: maxWidth,
      height: rowHeight,
      borderColor: rgb(0.85, 0.85, 0.85),
      borderWidth: 0.5,
      color: rgb(1, 1, 1),
    });

    const iconSize = 10;
    const iconY = pageSize.height - yTop - rowHeight + (rowHeight - iconSize) / 2;
    drawCameraIcon(page, PAGE_MARGIN + 8, iconY, iconSize);

    page.drawText(description, {
      x: PAGE_MARGIN + colIcon + 6,
      y: pageSize.height - yTop - BODY_SIZE,
      size: BODY_SIZE,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });
    page.drawText(ref, {
      x: PAGE_MARGIN + colIcon + colDescription + 6,
      y: pageSize.height - yTop - BODY_SIZE,
      size: BODY_SIZE,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });

    yTop += rowHeight;
  }

  yTop += 24;

  if (yTop + 40 > pageSize.height - PAGE_MARGIN) {
    page = doc.addPage([pageSize.width, pageSize.height]);
    yTop = PAGE_MARGIN;
  }

  page.drawText("Photos", {
    x: PAGE_MARGIN,
    y: pageSize.height - yTop - 16,
    size: 16,
    font: fontBold,
    color: rgb(0.12, 0.2, 0.55),
  });
  yTop += 24;

  return { page, yTop };
}

async function fetchImageBytes(url: string): Promise<{ bytes: Uint8Array; mime: string } | null> {
  if (!url) return null;
  if (url.startsWith("data:")) {
    const decoded = decodeDataUrl(url);
    return decoded.bytes.length ? decoded : null;
  }

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    const mime = res.headers.get("content-type") || "";
    return { bytes: new Uint8Array(arrayBuffer), mime };
  } catch {
    return null;
  }
}

function fitContain(containerW: number, containerH: number, imageW: number, imageH: number) {
  const scale = Math.min(containerW / imageW, containerH / imageH, 1);
  return { width: imageW * scale, height: imageH * scale };
}

async function addPhotoGallery(
  doc: PDFDocument,
  entries: PhotoEntry[],
  pageSize: { width: number; height: number },
  font: any,
  fontBold: any,
  startCtx: PhotoIndexContext
) {
  let page = startCtx.page;
  let yTop = startCtx.yTop;

  const maxWidth = pageSize.width - PAGE_MARGIN * 2;
  const headerGap = 8;

  const imageCache = new Map<string, { bytes: Uint8Array; mime: string } | null>();
  const embedCache = new Map<string, PDFImage | null>();

  const drawHeading = (title: string) => {
    page.drawText(title, {
      x: PAGE_MARGIN,
      y: pageSize.height - yTop - 16,
      size: 16,
      font: fontBold,
      color: rgb(0.12, 0.2, 0.55),
    });
    yTop += 24;
  };

  const startNewPage = (title: string) => {
    page = doc.addPage([pageSize.width, pageSize.height]);
    yTop = PAGE_MARGIN;
    drawHeading(title);
  };

  if (!entries.length) {
    page.drawText("No photos available.", {
      x: PAGE_MARGIN,
      y: pageSize.height - yTop - BODY_SIZE,
      size: BODY_SIZE,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });
    return;
  }

  for (const entry of entries) {
    const headerRaw = `${safeText(entry.refNo, "N/A")} | Page ${entry.page || "?"} | ${formatDateShort(entry.createdAt)}`;
    const header = truncateText(headerRaw, font, BODY_SIZE, maxWidth);
    const headerHeight = LINE_HEIGHT;

    const availableHeight = pageSize.height - PAGE_MARGIN - yTop - headerHeight - headerGap;
    if (availableHeight < PHOTO_MIN_HEIGHT) {
      startNewPage("Photos (cont.)");
    }

    page.drawText(header, {
      x: PAGE_MARGIN,
      y: pageSize.height - yTop - BODY_SIZE,
      size: BODY_SIZE,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });
    yTop += headerHeight + headerGap;

    const maxImageHeight = Math.min(
      PHOTO_MAX_HEIGHT,
      pageSize.height - PAGE_MARGIN - yTop
    );

    let image: PDFImage | null = null;
    if (entry.imageUrl) {
      if (embedCache.has(entry.imageUrl)) {
        image = embedCache.get(entry.imageUrl) || null;
      } else {
        let payload = imageCache.get(entry.imageUrl);
        if (!payload) {
          payload = await fetchImageBytes(entry.imageUrl);
          imageCache.set(entry.imageUrl, payload);
        }

        if (payload?.bytes?.length) {
          const mime = payload.mime.toLowerCase();
          try {
            image = mime.includes("jpeg") || mime.includes("jpg")
              ? await doc.embedJpg(payload.bytes)
              : await doc.embedPng(payload.bytes);
          } catch {
            try {
              image = await doc.embedPng(payload.bytes);
            } catch {
              image = null;
            }
          }
        }

        embedCache.set(entry.imageUrl, image);
      }
    }

    if (!image) {
      page.drawText("Image unavailable.", {
        x: PAGE_MARGIN,
        y: pageSize.height - yTop - BODY_SIZE,
        size: BODY_SIZE,
        font,
        color: rgb(0.45, 0.45, 0.45),
      });
      yTop += LINE_HEIGHT + PHOTO_GAP;
      continue;
    }

    const resolvedImage: PDFImage = image;
    const { width, height } = fitContain(
      maxWidth,
      maxImageHeight,
      resolvedImage.width,
      resolvedImage.height
    );
    const x = PAGE_MARGIN + (maxWidth - width) / 2;
    const y = pageSize.height - yTop - height;
    page.drawImage(resolvedImage, { x, y, width, height });
    yTop += height + PHOTO_GAP;
  }
}

export async function buildReportPdf(args: {
  project: ReportProjectMeta;
  fileName?: string | null;
  pages: ExportedImage[];
  photoMarkers: PhotoMarkerExport[];
}): Promise<Uint8Array> {
  const { project, pages, photoMarkers } = args;
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  // Cover + executive summary use a clean template page size to match the mobile report layout.
  addCoverPage(doc, project, DEFAULT_PAGE, font, fontBold);
  addSummaryPage(doc, project, DEFAULT_PAGE, font, fontBold);

  // Append the annotated PDF pages rendered in the browser (annotations flattened into images).
  await addAnnotatedPages(doc, pages);

  const photoEntries = flattenPhotoMarkers(photoMarkers);
  const indexCtx = addPhotoIndex(doc, photoEntries, DEFAULT_PAGE, font, fontBold);
  await addPhotoGallery(doc, photoEntries, DEFAULT_PAGE, font, fontBold, indexCtx);

  return await doc.save();
}
