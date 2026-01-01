"use client";

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { ProjectFilePhoto } from "@/components/project/documentViewer/types";

export type ExportedImage = { width: number; height: number; dataUrl: string };

export type ReportProjectMeta = {
  id: string;
  name?: string;
  clientName?: string;
  projectOwner?: string;
  ownerName?: string;
  ownerEmail?: string;
  description?: string;
  conclusion?: string;
};

const DEFAULT_PAGE = { width: 612, height: 792 }; // Letter
const PAGE_MARGIN = 60;
const BODY_SIZE = 11;
const LINE_HEIGHT = 16;

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

function formatDateShort(ms?: number): string {
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
  const binary = typeof atob === "function" ? atob(base64) : "";
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return { bytes, mime };
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

function addPhotoIndex(
  doc: PDFDocument,
  photos: ProjectFilePhoto[],
  pageSize: { width: number; height: number },
  font: any,
  fontBold: any
) {
  const maxWidth = pageSize.width - PAGE_MARGIN * 2;
  const headerHeight = 22;
  const rowHeight = 18;
  const colDescription = Math.round(maxWidth * 0.7);
  const colRef = maxWidth - colDescription;

  const sorted = [...photos].sort((a, b) => (a.createdAtMs || 0) - (b.createdAtMs || 0));

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
    page.drawText("Image Description", {
      x: PAGE_MARGIN + 6,
      y: pageSize.height - yTop - 16,
      size: 10,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
    page.drawText("Ref No", {
      x: PAGE_MARGIN + colDescription + 6,
      y: pageSize.height - yTop - 16,
      size: 10,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
    yTop += headerHeight;
  };

  drawTableHeader();

  if (!sorted.length) {
    page.drawText("No photos uploaded.", {
      x: PAGE_MARGIN,
      y: pageSize.height - yTop - BODY_SIZE,
      size: BODY_SIZE,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });
    yTop += LINE_HEIGHT;
  }

  for (const photo of sorted) {
    if (yTop + rowHeight > pageSize.height - PAGE_MARGIN) {
      page = doc.addPage([pageSize.width, pageSize.height]);
      yTop = PAGE_MARGIN;
      drawHeader("Photo Index (cont.)");
      drawTableHeader();
    }

    const descriptionRaw = safeText(
      photo.description,
      `Page ${photo.page || "?"} - ${formatDateShort(photo.createdAtMs)}`
    );
    const refRaw = safeText(photo.refNo || photo.id, "N/A");
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

    page.drawText(description, {
      x: PAGE_MARGIN + 6,
      y: pageSize.height - yTop - BODY_SIZE,
      size: BODY_SIZE,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });
    page.drawText(ref, {
      x: PAGE_MARGIN + colDescription + 6,
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

  for (const photo of sorted) {
    if (yTop + LINE_HEIGHT > pageSize.height - PAGE_MARGIN) {
      page = doc.addPage([pageSize.width, pageSize.height]);
      yTop = PAGE_MARGIN;
    }
    const lineRaw = `${safeText(photo.refNo || photo.id, "N/A")} | Page ${
      photo.page || "?"
    } | ${formatDateShort(photo.createdAtMs)}`;
    const line = truncateText(lineRaw, font, BODY_SIZE, maxWidth);
    page.drawText(line, {
      x: PAGE_MARGIN,
      y: pageSize.height - yTop - BODY_SIZE,
      size: BODY_SIZE,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });
    yTop += LINE_HEIGHT;
  }
}

export async function buildReportPdf(args: {
  project: ReportProjectMeta;
  fileName?: string | null;
  pages: ExportedImage[];
  photos: ProjectFilePhoto[];
}): Promise<Uint8Array> {
  const { project, pages, photos } = args;
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  // Cover + executive summary use a clean template page size to match the mobile report layout.
  addCoverPage(doc, project, DEFAULT_PAGE, font, fontBold);
  addSummaryPage(doc, project, DEFAULT_PAGE, font, fontBold);

  // Append the annotated PDF pages rendered in the browser (annotations flattened into images).
  await addAnnotatedPages(doc, pages);

  // Photo index is appended at the end to mirror the mobile export flow.
  addPhotoIndex(doc, photos, DEFAULT_PAGE, font, fontBold);

  return await doc.save();
}
