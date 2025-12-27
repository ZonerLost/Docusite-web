"use client";

import React from "react";
import type { InviteSummary } from "@/lib/notifications";

type Props = {
  open: boolean;
  loading: boolean;
  summary?: InviteSummary | null;
  accepting?: boolean;
  onClose: () => void;
  onAccept: () => void;
  onDecline: () => void;
};

const InvitePreviewModal: React.FC<Props> = ({
  open,
  loading,
  summary,
  accepting,
  onClose,
  onAccept,
  onDecline,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-sm border border-border-dark-gray p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-black">Project Invitation</span>
          <button onClick={onClose} className="text-gray-600 hover:text-black">
            ✕
          </button>
        </div>

        {loading ? (
          <div className="text-sm text-text-gray">Loading…</div>
        ) : (
          <div className="space-y-2">
            <div>
              <div className="text-xs text-placeholder-gray">Project</div>
              <div className="text-sm text-black">{summary?.projectTitle || "Untitled project"}</div>
            </div>

            <div>
              <div className="text-xs text-placeholder-gray">Invited by</div>
              <div className="text-sm text-black">
                {summary?.invitedByName || summary?.invitedByEmail || "Unknown"}
              </div>
              {summary?.invitedByEmail && (
                <div className="text-xs text-text-gray">{summary.invitedByEmail}</div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={onDecline}
                className="px-3 py-1 text-xs rounded-md border border-border-gray text-black hover:bg-gray-50"
              >
                Decline
              </button>

              <button
                onClick={onAccept}
                disabled={!!accepting}
                className={`px-3 py-1 text-xs rounded-md bg-action text-white hover:bg-action/90 ${
                  accepting ? "opacity-60 cursor-not-allowed" : ""
                }`}
              >
                {accepting ? "Accepting…" : "Accept"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvitePreviewModal;
