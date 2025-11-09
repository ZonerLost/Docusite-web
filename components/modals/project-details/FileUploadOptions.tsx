import React, { forwardRef } from "react";
import { GoogleIcon } from "@/components/ui/Icons";

interface FileUploadOptionsProps {
  isOpen: boolean;
  onSelectDevice: () => void;
  onSelectDrive: () => void;
}

const FileUploadOptions = forwardRef<HTMLDivElement, FileUploadOptionsProps>(
  ({ isOpen, onSelectDevice, onSelectDrive }, ref) => {
    if (!isOpen) return null;

    return (
      <div
        ref={ref}
        className="absolute mt-2 z-50 bg-white border border-border-gray rounded-xl shadow-lg w-52 overflow-hidden"
      >
        <button
          type="button"
          onClick={onSelectDevice}
          className="w-full px-3 py-2 text-left text-sm text-black hover:bg-light-gray transition-colors"
        >
          From device
        </button>
        <button
          type="button"
          onClick={onSelectDrive}
          className="w-full px-3 py-2 text-left text-sm text-black hover:bg-light-gray transition-colors flex items-center gap-2"
        >
          <span className="inline-flex items-center justify-center w-4 h-4">
            <GoogleIcon />
          </span>
          <span>From Google Drive</span>
        </button>
      </div>
    );
  }
);

FileUploadOptions.displayName = "FileUploadOptions";

export default FileUploadOptions;
