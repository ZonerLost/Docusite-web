"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type ModalPortalProps = {
  isOpen: boolean;
  onClose?: () => void;
  children: React.ReactNode;
  contentClassName?: string;
  backdropClassName?: string;
};

export default function ModalPortal({
  isOpen,
  onClose,
  children,
  contentClassName,
  backdropClassName,
}: ModalPortalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted || typeof document === "undefined") return null;

  const stop = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const backdropClasses = [
    "fixed inset-0 z-[999999] flex items-center justify-center bg-black/50",
    backdropClassName,
  ]
    .filter(Boolean)
    .join(" ");

  const contentClasses = [
    "relative w-[92vw] max-w-[720px] max-h-[85vh] overflow-auto rounded-lg bg-white shadow-2xl",
    contentClassName,
  ]
    .filter(Boolean)
    .join(" ");

  return createPortal(
    <div className={backdropClasses} role="dialog" aria-modal="true" onClick={onClose}>
      <div className={contentClasses} onClick={stop}>
        {children}
      </div>
    </div>,
    document.body
  );
}
