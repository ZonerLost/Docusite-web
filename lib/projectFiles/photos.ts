"use client";

import { collection, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase-client";
import { ensureSignedIn } from "@/lib/auth.init";
import type { ProjectFilePhoto } from "@/components/project/documentViewer/types";

type UploadProjectFilePhotoInput = {
  projectId: string;
  pdfId: string;
  file: File;
  description?: string;
  annotationId?: string | null;
  page?: number;
  normX?: number;
  normY?: number;
  normW?: number;
  normH?: number;
  refNo?: string;
  originalName?: string;
};

function generateId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    // fallback to timestamp
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function determineExtension(file: File): string {
  const name = file.name || "";
  const match = name.match(/(\.\w+)$/);
  if (match && match[1]) {
    return match[1].toLowerCase();
  }
  const type = file.type || "";
  const fallback = type.split("/")[1] || "";
  return fallback ? `.${fallback.replace(/[^a-z0-9]+/gi, "")}` : "";
}

export async function uploadProjectFilePhoto(
  input: UploadProjectFilePhotoInput,
): Promise<ProjectFilePhoto> {
  const {
    projectId,
    pdfId,
    file,
    description = "",
    annotationId = null,
    page,
    normX,
    normY,
    normW,
    normH,
    refNo,
    originalName,
  } = input;

  if (!projectId || !pdfId) {
    throw new Error("projectId and pdfId are required to upload a photo");
  }

  await ensureSignedIn();

  const photoId = generateId();
  const extension = determineExtension(file);
  const storagePath = `project-file-photos/${projectId}/${pdfId}/${photoId}${extension}`;
  const storageReference = storageRef(storage, storagePath);
  await uploadBytes(storageReference, file, {
    contentType: file.type || "application/octet-stream",
  });
  const url = await getDownloadURL(storageReference);

  const payload: ProjectFilePhoto = {
    id: photoId,
    projectId,
    pdfId,
    url,
    storagePath,
    storageKey: storagePath,
    description,
    refNo: refNo || photoId,
    annotationId,
    mimeType: file.type || undefined,
    contentType: file.type || undefined,
    sizeBytes: typeof file.size === "number" ? file.size : undefined,
    originalName: originalName || file.name,
    createdAt: serverTimestamp(),
    createdAtMs: Date.now(),
    page: typeof page === "number" ? page : undefined,
    normX: typeof normX === "number" ? normX : undefined,
    normY: typeof normY === "number" ? normY : undefined,
    normW: typeof normW === "number" ? normW : undefined,
    normH: typeof normH === "number" ? normH : undefined,
  };

  const docRef = doc(collection(db, "projectFilePhotos"), photoId);
  const docData: Record<string, unknown> = {
    ...payload,
    createdAt: payload.createdAt,
  };
  Object.keys(docData).forEach((key) => {
    if (docData[key] === undefined) {
      delete docData[key];
    }
  });
  await setDoc(docRef, docData);

  return payload;
}
