"use client";

export type ExportProjectReportPayload = {
  projectId: string;
  pdfId: string;
  fileName: string;
  fileUrl: string;
  pdfBase64: string;
};

export async function exportProjectReport(
  payload: ExportProjectReportPayload,
  token?: string
): Promise<{ url?: string }> {
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

  return res.json();
}
