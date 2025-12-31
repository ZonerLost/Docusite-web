"use client";

import React from "react";
import PdfInlineViewer from "@/components/project/PdfInlineViewer";

export type PdfViewerProps = React.ComponentProps<typeof PdfInlineViewer>;

/**
 * PdfViewer is the single public wrapper your app uses.
 * If you later replace PdfInlineViewer with another library,
 * you only change it here.
 */
export default function PdfViewer(props: PdfViewerProps) {
  return <PdfInlineViewer {...props} />;
}
