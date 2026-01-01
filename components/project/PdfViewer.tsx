"use client";

import React from "react";
import PdfInlineViewer from "@/components/project/PdfInlineViewer";

export type PdfViewerProps = React.ComponentProps<typeof PdfInlineViewer>;

export default function PdfViewer(props: PdfViewerProps) {
  return <PdfInlineViewer {...props} />;
}
