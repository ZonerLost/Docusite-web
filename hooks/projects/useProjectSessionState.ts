"use client";

import { useCallback, useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { SelectedFile, StoredProject } from "@/types/project";

type ProjectSessionState = {
  project: StoredProject | null;
  setProject: Dispatch<SetStateAction<StoredProject | null>>;
  selectedFile: SelectedFile | null;
  setSelectedFile: Dispatch<SetStateAction<SelectedFile | null>>;
};

export function useProjectSessionState(projectId: string): ProjectSessionState {
  const [project, setProject] = useState<StoredProject | null>(null);
  const [selectedFile, setSelectedFileState] = useState<SelectedFile | null>(
    null
  );

  const setSelectedFile = useCallback(
    (value: SetStateAction<SelectedFile | null>) => {
      setSelectedFileState((prev) => {
        const next =
          typeof value === "function"
            ? (value as (current: SelectedFile | null) => SelectedFile | null)(
                prev
              )
            : value;
        try {
          if (typeof window !== "undefined") {
            if (next) {
              sessionStorage.setItem("selectedFile", JSON.stringify(next));
            } else {
              sessionStorage.removeItem("selectedFile");
            }
          }
        } catch {}
        return next;
      });
    },
    []
  );

  useEffect(() => {
    try {
      const raw =
        typeof window !== "undefined"
          ? sessionStorage.getItem("currentProject")
          : null;
      if (raw) {
        const parsed = JSON.parse(raw) as StoredProject;
        setProject(parsed);
      } else if (projectId) {
        setProject({
          id: projectId,
          name: `Project ${projectId}`,
          status: "in-progress",
          location: "Not specified",
        });
      }
    } catch {
      if (projectId) {
        setProject({
          id: projectId,
          name: `Project ${projectId}`,
          status: "in-progress",
          location: "Not specified",
        });
      }
    }

    try {
      const fileRaw =
        typeof window !== "undefined"
          ? sessionStorage.getItem("selectedFile")
          : null;
      if (fileRaw) {
        const fileParsed = JSON.parse(fileRaw) as SelectedFile;
        setSelectedFileState(fileParsed);
      }
    } catch (error) {
      console.error("Error loading selected file:", error);
    }
  }, [projectId]);

  return { project, setProject, selectedFile, setSelectedFile };
}
