"use client";

import { type ReactNode } from "react";
import { createPortal } from "react-dom";

type ModalShellProps = {
  open: boolean;
  onClose?: () => void;
  children: ReactNode;
  containerClassName?: string;
  panelClassName?: string;
  closeOnBackdrop?: boolean;
};

export default function ModalShell({
  open,
  onClose,
  children,
  containerClassName = "p-4",
  panelClassName = "",
  closeOnBackdrop = true,
}: ModalShellProps) {
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className={`fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto ${containerClassName}`}>
      <div
        className="absolute inset-0 bg-slate-950/35 backdrop-blur-[2px]"
        onClick={closeOnBackdrop ? onClose : undefined}
      />
      <div className={`relative my-auto w-full ${panelClassName}`}>{children}</div>
    </div>,
    document.body
  );
}
