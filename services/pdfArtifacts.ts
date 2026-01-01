/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { db, auth, storage } from "@/lib/firebase-client";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  runTransaction,
  serverTimestamp,
  setDoc,
  deleteDoc,
  type DocumentReference,
  type CollectionReference,
} from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { sha1 } from "js-sha1";

export type DocPoint = { x: number; y: number };

export type NormRect = { x: number; y: number; w: number; h: number };

export type StrokeArtifact = {
  type: "stroke";
  color: number;
  width: number;
  toolType: number;
  isEraser: boolean;
  points: DocPoint[];
  pressureValues: number[];
};

export type AnnotationArtifact = {
  type: "annotation";
  id: string;
  annType: number; 
  position: DocPoint;
  text: string;
  color: number;
  width: number;
  height: number;
};

export type CameraPinArtifact = {
  type: "cameraPin";
  id: string;
  position: DocPoint; // (your current system stores absolute pdf-space; keep for backward compat)
  imagePath: string;
  createdAt: number;
  note?: string;

  rect?: NormRect;
  normX?: number;
  normY?: number;
  normW?: number;
  normH?: number;
};

export type PageArtifacts = Array<StrokeArtifact | AnnotationArtifact | CameraPinArtifact>;
export type PdfArtifactsByPage = Record<string, PageArtifacts>;

export type StrokeInput = {
  color: string;
  width: number;
  toolType: number;
  isEraser: boolean;
  points: DocPoint[];
  pressureValues?: number[];
};

export type PdfNoteInput = {
  id: string;
  annType: number;
  position: DocPoint;
  text: string;
  color: string;
  width: number;
  height: number;
};

export type CameraPinInput = {
  id: string;
  position: DocPoint; 
  imagePath: string;
  createdAt: Date;
  note?: string;

  rect?: NormRect;
  normX?: number;
  normY?: number;
  normW?: number;
  normH?: number;
};

export function colorHexToInt(hex: string): number {
  const trimmed = hex.trim();
  if (!trimmed) return 0xff000000;
  const h = trimmed.startsWith("#") ? trimmed.slice(1) : trimmed;
  const normalized =
    h.length === 3
      ? h.split("").map((c) => c + c).join("")
      : h.length === 6
        ? h
        : h.slice(-6);
  const rgb = parseInt(normalized, 16);
  if (Number.isNaN(rgb)) return 0xff000000;
  return (0xff << 24) | rgb;
}

export function colorIntToHex(value: number): string {
  const rgb = value & 0xffffff;
  return `#${rgb.toString(16).padStart(6, "0")}`;
}

const envDebug = process.env.NEXT_PUBLIC_DEBUG_PDF === "1";

function isDebugEnabled(): boolean {
  if (envDebug) return true;
  if (typeof window === "undefined") return false;
  try {
    const w = window as any;
    if (w.__DEBUG_PDF === true) return true;
    return window.localStorage?.getItem("DEBUG_PDF") === "1";
  } catch {
    return false;
  }
}

function logCommit(path: string, payload: unknown) {
  if (isDebugEnabled()) {
    console.log("[PDF-ARTIFACTS] committing", { path, payload });
  }
}

function logCommitError(error: unknown, payload: unknown) {
  if (isDebugEnabled()) {
    console.error("[PDF-ARTIFACTS] commit failed", { error, payload });
  }
}

const INFLIGHT_COUNTERS = new Map<string, Promise<number>>();

function isPlainObject(value: unknown): value is Record<string, any> {
  if (!value || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function clean(value: any): any {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") return value;
  if (value instanceof String) return value.toString();
  if (typeof value === "boolean") return value;
  if (Array.isArray(value)) {
    return value.map(clean).filter((v) => v !== undefined);
  }
  if (isPlainObject(value)) {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      const cv = clean(v);
      if (cv !== undefined) out[k] = cv;
    }
    return out;
  }
  return value;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function normalizeRect(rect?: NormRect | null): NormRect | undefined {
  if (!rect) return undefined;
  const { x, y, w, h } = rect;
  if (![x, y, w, h].every(isFiniteNumber)) return undefined;
  if (w <= 0 || h <= 0) return undefined;
  return { x: clamp01(x), y: clamp01(y), w: clamp01(w), h: clamp01(h) };
}

function makeStableFileId(url: string, name: string, overrideKey?: string): string {
  if (overrideKey && overrideKey.length > 0) return sha1(overrideKey);

  const noQuery = url.split("?")[0].split("#")[0];

  try {
    const u = new URL(url);
    let canonical: string | null = null;

    if (u.protocol === "gs:") {
      canonical = `${u.host}${u.pathname}`;
    } else if (u.host === "firebasestorage.googleapis.com") {
      const seg = u.pathname.split("/").filter(Boolean);
      const bIdx = seg.indexOf("b");
      const oIdx = seg.indexOf("o");
      if (bIdx !== -1 && bIdx + 1 < seg.length && oIdx !== -1 && oIdx + 1 < seg.length) {
        const bucket = seg[bIdx + 1];
        const encodedObject = seg[oIdx + 1];
        const objectPath = decodeURIComponent(encodedObject);
        canonical = `${bucket}/${objectPath}`;
      }
    } else if (u.host === "storage.googleapis.com" && u.pathname.split("/").filter(Boolean).length >= 2) {
      const seg = u.pathname.split("/").filter(Boolean);
      const bucket = seg[0];
      const objectPath = seg.slice(1).join("/");
      canonical = `${bucket}/${objectPath}`;
    }

    const base = (canonical ?? noQuery).toLowerCase();
    return sha1(`${base}|${name.toLowerCase()}`);
  } catch {
    return sha1(`${noQuery.toLowerCase()}|${name.toLowerCase()}`);
  }
}

export class PdfArtifactService {
  private readonly projectId: string | null;
  private readonly fileUrl: string;
  private readonly fileName: string;

  private readonly fileId: string;
  private readonly fileDoc: DocumentReference;

  constructor(opts: { projectId?: string | null; fileUrl: string; fileName: string; overrideKey?: string }) {
    this.projectId = opts.projectId ?? null;
    this.fileUrl = opts.fileUrl;
    this.fileName = opts.fileName;
    this.fileId = makeStableFileId(this.fileUrl, this.fileName, opts.overrideKey);

    this.fileDoc =
      this.projectId && this.projectId.length
        ? doc(db, "projects", this.projectId, "files", this.fileId)
        : doc(db, "files", this.fileId);
  }

  async init(): Promise<void> {
    await this.ensureFileMeta();
  }

  private assertWriteContext(): void {
    const missing: string[] = [];
    if (!this.fileUrl || !this.fileUrl.trim()) missing.push("fileUrl");
    if (!this.fileName || !this.fileName.trim()) missing.push("fileName");
    if (!this.fileId || !this.fileId.trim()) missing.push("fileId");
    if (this.projectId !== null && this.projectId !== undefined && !String(this.projectId).trim()) {
      missing.push("projectId");
    }
    if (missing.length) {
      throw new Error(`[PDF-ARTIFACTS] Invalid write context: ${missing.join(", ")}`);
    }
  }

  private assertNonEmptyId(label: string, value: string): void {
    if (!value || !String(value).trim()) {
      throw new Error(`[PDF-ARTIFACTS] Missing ${label}`);
    }
  }

  private normalizePage(page: number): number {
    if (!Number.isFinite(page) || page < 1) return 1;
    return Math.floor(page);
  }

  private async commitDoc(
    ref: DocumentReference,
    payload: Record<string, any>,
    options?: { merge?: boolean }
  ): Promise<void> {
    const cleaned = clean(payload);
    if (!cleaned || typeof cleaned !== "object") {
      throw new Error("[PDF-ARTIFACTS] Invalid payload");
    }
    logCommit(ref.path, cleaned);
    try {
      if (options) {
        await setDoc(ref, cleaned as Record<string, any>, options);
      } else {
        await setDoc(ref, cleaned as Record<string, any>);
      }
    } catch (error) {
      logCommitError(error, cleaned);
      throw error;
    }
  }

  private pageDoc(page: number): DocumentReference {
    const safePage = this.normalizePage(page);
    return doc(this.fileDoc, "pages", String(safePage));
  }

  private pageCollection(): CollectionReference {
    return collection(this.fileDoc, "pages");
  }

  private async ensurePageDoc(page: number): Promise<DocumentReference> {
    this.assertWriteContext();
    const safePage = this.normalizePage(page);
    const pageRef = this.pageDoc(safePage);
    const snap = await getDoc(pageRef);
    if (!snap.exists()) {
      await this.commitDoc(pageRef, {
        pageNumber: safePage,
        createdAt: serverTimestamp(),
      });
    }
    return pageRef;
  }

  async saveStroke(page: number, stroke: StrokeInput): Promise<void> {
    this.assertWriteContext();
    const safePage = this.normalizePage(page);
    const refNo = await this.nextRefNo(); // ✅ fix
    const pageRef = await this.ensurePageDoc(safePage);

    const col = collection(pageRef, "strokes");
    const sref = doc(col);

    await this.commitDoc(sref, {
      type: "stroke",
      refNo,
      page: safePage,
      color: colorHexToInt(stroke.color),
      width: stroke.width,
      toolType: stroke.toolType,
      isEraser: !!stroke.isEraser,
      points: stroke.points.map((p) => ({ x: p.x, y: p.y })),
      pressureValues: stroke.pressureValues ?? [],
      bbox: this.computeStrokeBBox(stroke.points),
      author: this.author(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await this.touchUpdatedAt();
  }

  async createNote(page: number, note: PdfNoteInput): Promise<void> {
    this.assertWriteContext();
    this.assertNonEmptyId("note.id", note.id);
    const safePage = this.normalizePage(page);
    const pageRef = await this.ensurePageDoc(safePage);

    const col = collection(pageRef, "annotations");
    const nref = doc(col, note.id);

    await this.commitDoc(
      nref,
      {
        type: "annotation",
        page: safePage,
        id: note.id,
        annType: note.annType,
        position: { x: note.position.x, y: note.position.y },
        text: note.text,
        color: colorHexToInt(note.color),
        width: note.width,
        height: note.height,
        author: this.author(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    await this.touchUpdatedAt();
  }

  async updateNote(page: number, note: PdfNoteInput): Promise<void> {
    this.assertWriteContext();
    this.assertNonEmptyId("note.id", note.id);
    const safePage = this.normalizePage(page);
    const pageRef = await this.ensurePageDoc(safePage);

    const col = collection(pageRef, "annotations");
    const nref = doc(col, note.id);

    await this.commitDoc(
      nref,
      {
        type: "annotation",
        page: safePage,
        id: note.id,
        annType: note.annType,
        position: { x: note.position.x, y: note.position.y },
        text: note.text,
        color: colorHexToInt(note.color),
        width: note.width,
        height: note.height,
        author: this.author(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    await this.touchUpdatedAt();
  }

  async deleteNote(page: number, noteId: string): Promise<void> {
    this.assertWriteContext();
    this.assertNonEmptyId("noteId", noteId);
    const safePage = this.normalizePage(page);
    const pageRef = this.pageDoc(safePage);
    const col = collection(pageRef, "annotations");
    await deleteDoc(doc(col, noteId));
    await this.touchUpdatedAt();
  }

  async saveCameraPin(page: number, pin: CameraPinInput, remoteImageUrl?: string | null): Promise<void> {
    this.assertWriteContext();
    this.assertNonEmptyId("pin.id", pin.id);
    const safePage = this.normalizePage(page);
    const refNo = await this.nextRefNo();
    const pageRef = await this.ensurePageDoc(safePage);

    const col = collection(pageRef, "pins");
    const pref = doc(col, pin.id);

    const rectFromNorm = normalizeRect(
      isFiniteNumber(pin.normX) && isFiniteNumber(pin.normY) && isFiniteNumber(pin.normW) && isFiniteNumber(pin.normH)
        ? { x: pin.normX, y: pin.normY, w: pin.normW, h: pin.normH }
        : null
    );
    const safeRect = normalizeRect(pin.rect) ?? rectFromNorm;

    const payload: Record<string, any> = {
      type: "cameraPin",
      refNo,
      page: safePage,
      pinId: pin.id,
      position: { x: pin.position.x, y: pin.position.y }, // absolute (compat)
      imagePath: String(remoteImageUrl ?? pin.imagePath ?? ""),
      note: typeof pin.note === "string" ? pin.note : pin.note ? String(pin.note) : "",
      author: this.author(),
      createdAt: pin.createdAt,
      updatedAt: serverTimestamp(),
    };

      if (safeRect) {
        payload.rect = safeRect;
        payload.normX = safeRect.x;
        payload.normY = safeRect.y;
        payload.normW = safeRect.w;
        payload.normH = safeRect.h;
      } else {
        if (isFiniteNumber(pin.normX)) payload.normX = clamp01(pin.normX);
        if (isFiniteNumber(pin.normY)) payload.normY = clamp01(pin.normY);
        if (isFiniteNumber(pin.normW)) payload.normW = clamp01(pin.normW);
        if (isFiniteNumber(pin.normH)) payload.normH = clamp01(pin.normH);
      }
    await this.commitDoc(pref, payload, { merge: true });

    await this.touchUpdatedAt();
  }

  async deleteCameraPin(page: number, pinId: string): Promise<void> {
    this.assertWriteContext();
    this.assertNonEmptyId("pinId", pinId);
    const safePage = this.normalizePage(page);
    const pageRef = this.pageDoc(safePage);
    const col = collection(pageRef, "pins");
    await deleteDoc(doc(col, pinId));
    await this.touchUpdatedAt();
  }

  async loadAll(): Promise<PdfArtifactsByPage> {
    const out: PdfArtifactsByPage = {};

    const pagesSnap = await getDocs(this.pageCollection());
    if (pagesSnap.empty) return out;

    for (const pageDocSnap of pagesSnap.docs) {
      const pageNum = parseInt(pageDocSnap.id, 10);
      if (!Number.isFinite(pageNum)) continue;

      const items: PageArtifacts = [];

      // strokes
      try {
        const strokesSnap = await getDocs(collection(pageDocSnap.ref, "strokes"));
        strokesSnap.forEach((s) => {
          const d = s.data() as any;
          items.push({
            type: "stroke",
            color: (d.color as number) ?? 0xff000000,
            width: Number(d.width ?? 1),
            toolType: Number(d.toolType ?? 0),
            isEraser: !!d.isEraser,
            points: Array.isArray(d.points) ? d.points.map((p: any) => ({ x: Number(p.x ?? 0), y: Number(p.y ?? 0) })) : [],
            pressureValues: Array.isArray(d.pressureValues) ? d.pressureValues.map((v: any) => Number(v ?? 0)) : [],
          });
        });
      } catch {}

      // annotations
      try {
        const notesSnap = await getDocs(collection(pageDocSnap.ref, "annotations"));
        notesSnap.forEach((n) => {
          const d = n.data() as any;
          items.push({
            type: "annotation",
            id: String(d.id || n.id),
            annType: Number(d.annType ?? 0),
            position: { x: Number(d.position?.x ?? 0), y: Number(d.position?.y ?? 0) },
            text: String(d.text ?? ""),
            color: (d.color as number) ?? 0xff000000,
            width: Number(d.width ?? 150),
            height: Number(d.height ?? 100),
          });
        });
      } catch {}

      // pins
      try {
        const pinsSnap = await getDocs(collection(pageDocSnap.ref, "pins"));
        pinsSnap.forEach((p) => {
          const d = p.data() as any;

          let createdAt: number;
          if (d.createdAt && typeof d.createdAt.toDate === "function") createdAt = d.createdAt.toDate().getTime();
          else if (typeof d.createdAt === "string") createdAt = new Date(d.createdAt).getTime();
          else if (typeof d.createdAt === "number") createdAt = d.createdAt;
          else createdAt = Date.now();

          items.push({
            type: "cameraPin",
            id: String(d.pinId || p.id),
            position: { x: Number(d.position?.x ?? 0), y: Number(d.position?.y ?? 0) },
            imagePath: String(d.imagePath ?? ""),
            createdAt,
            note: typeof d.note === "string" ? d.note : undefined,
            rect: d.rect && typeof d.rect === "object" ? d.rect : undefined,
            normX: typeof d.normX === "number" ? d.normX : undefined,
            normY: typeof d.normY === "number" ? d.normY : undefined,
            normW: typeof d.normW === "number" ? d.normW : undefined,
            normH: typeof d.normH === "number" ? d.normH : undefined,
          });
        });
      } catch {}

      if (items.length) out[String(pageNum)] = items;
    }

    return out;
  }

  async uploadCameraImage(page: number, pinId: string, file: File): Promise<string> {
    this.assertWriteContext();
    this.assertNonEmptyId("pinId", pinId);
    const safePage = this.normalizePage(page);
    const basePath =
      this.projectId && this.projectId.length
        ? `projects/${this.projectId}/files/${this.fileId}`
        : `files/${this.fileId}`;

    const ext = file.type === "image/png" ? "png" : "jpg";
    const path = `${basePath}/pins/${safePage}/${pinId}.${ext}`;

    const sref = storageRef(storage, path);
    await uploadBytes(sref, file, { contentType: file.type || "image/jpeg" });
    return getDownloadURL(sref);
  }

  private async ensureFileMeta(): Promise<void> {
    this.assertWriteContext();
    try {
      const fileSnap = await getDoc(this.fileDoc);
      if (!fileSnap.exists()) {
        await this.commitDoc(this.fileDoc, {
          fileUrl: this.fileUrl,
          fileName: this.fileName,
          projectId: this.projectId ?? null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      const metaDoc = doc(this.fileDoc, "meta", "meta");
      const metaSnap = await getDoc(metaDoc);
      if (!metaSnap.exists()) {
        await this.commitDoc(metaDoc, {
          fileUrl: this.fileUrl,
          fileName: this.fileName,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch {}
  }

  private async touchUpdatedAt(): Promise<void> {
    this.assertWriteContext();
    const metaDoc = doc(this.fileDoc, "meta", "meta");
    await this.commitDoc(metaDoc, { updatedAt: serverTimestamp() }, { merge: true });
  }

  private author(): { uid: string; name?: string | null; email?: string | null } {
    const u = auth.currentUser;
    return { uid: u?.uid ?? "anonymous", name: u?.displayName ?? null, email: u?.email ?? null };
  }

  private async nextRefNo(): Promise<number> {
    this.assertWriteContext();
    const counters = doc(this.fileDoc, "_meta", "counters");
    const pathKey = counters.path;
    const prev = INFLIGHT_COUNTERS.get(pathKey) ?? Promise.resolve(0);

    const task = prev
      .catch(() => undefined)
      .then(() =>
        runTransaction(db, async (tx) => {
          const snap = await tx.get(counters);
          const current =
            typeof snap.data()?.lastRef === "number"
              ? (snap.data()!.lastRef as number)
              : 0;
          const updated = current + 1;
          if (!Number.isFinite(updated)) {
            throw new Error("[PDF-ARTIFACTS] Invalid ref counter");
          }

          if (isDebugEnabled()) {
            console.log("[PDF-ARTIFACTS] nextRefNo commit", {
              path: counters.path,
              payload: { lastRef: updated },
            });
          }

          tx.set(counters, { lastRef: updated }, { merge: true });
          return updated;
        })
      );

    INFLIGHT_COUNTERS.set(pathKey, task);

    try {
      return await task;
    } finally {
      if (INFLIGHT_COUNTERS.get(pathKey) === task) {
        INFLIGHT_COUNTERS.delete(pathKey);
      }
    }
  }

  private computeStrokeBBox(points: DocPoint[]) {
    if (!points.length) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    let minX = points[0].x, maxX = points[0].x, minY = points[0].y, maxY = points[0].y;
    for (const p of points) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    return { minX, minY, maxX, maxY };
  }
}
