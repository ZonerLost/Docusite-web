"use client";

import type { ExportProjectReportPayload } from "@/types/report";

export type ExportProjectReportResult = {
  blob: Blob;
  fileName: string;
};

function getFileNameFromHeader(value: string | null): string {
  if (!value) return "";

  const utf8Match = value.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
  if (utf8Match && utf8Match[1]) {
    try {
      return decodeURIComponent(utf8Match[1].replace(/["']/g, ""));
    } catch {
      return utf8Match[1].replace(/["']/g, "");
    }
  }

  const match = value.match(/filename\s*=\s*"?([^";]+)"?/i);
  if (match && match[1]) {
    return match[1];
  }

  return "";
}

export async function exportProjectReport(
  payload: ExportProjectReportPayload,
  token?: string
): Promise<ExportProjectReportResult> {
  const res = await fetch("/api/export/project-report", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let message = "Export failed.";
    try {
      const data = await res.json();
      message = data?.error || message;
    } catch {}
    throw new Error(message);
  }

  const contentType = res.headers.get("Content-Type") || "";
  if (contentType.includes("application/json")) {
    try {
      const data = await res.json();
      throw new Error(data?.error || "Export failed.");
    } catch (err: any) {
      throw err instanceof Error ? err : new Error("Export failed.");
    }
  }

  const blob = await res.blob();
  if (!blob.size) {
    throw new Error("Export failed. Empty PDF received.");
  }

  const fileName =
    getFileNameFromHeader(res.headers.get("Content-Disposition")) ||
    "Project Report.pdf";

  return { blob, fileName };
}
