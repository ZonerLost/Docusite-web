/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { db, auth, storage } from '@/lib/firebase-client';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  runTransaction,
  serverTimestamp,
  setDoc,
  deleteDoc,
  DocumentReference,
  CollectionReference,
} from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { sha1 } from 'js-sha1';

export type DocPoint = { x: number; y: number };

export type StrokeArtifact = {
  type: 'stroke';
  color: number;
  width: number;
  toolType: number;
  isEraser: boolean;
  points: DocPoint[];
  pressureValues: number[];
};

export type AnnotationArtifact = {
  type: 'annotation';
  id: string;
  annType: number; // 0 = text, 1 = sticky note (AnnotationToolType)
  position: DocPoint;
  text: string;
  color: number;
  width: number;
  height: number;
};

export type CameraPinArtifact = {
  type: 'cameraPin';
  id: string;
  position: DocPoint;
  imagePath: string;
  createdAt: number; // epoch ms
  note?: string;
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
};

export function colorHexToInt(hex: string): number {
  const trimmed = hex.trim();
  if (!trimmed) return 0xff000000;
  const h = trimmed.startsWith('#') ? trimmed.slice(1) : trimmed;
  const normalized = h.length === 3
    ? h.split('').map((c) => c + c).join('')
    : h.length === 6
      ? h
      : h.slice(-6);
  const rgb = parseInt(normalized, 16);
  if (Number.isNaN(rgb)) return 0xff000000;
  return (0xff << 24) | rgb;
}

export function colorIntToHex(value: number): string {
  const rgb = value & 0xffffff;
  return `#${rgb.toString(16).padStart(6, '0')}`;
}

function makeStableFileId(url: string, name: string, overrideKey?: string): string {
  if (overrideKey && overrideKey.length > 0) {
    return sha1(overrideKey);
  }

  const noQuery = url.split('?')[0].split('#')[0];

  try {
    const u = new URL(url);
    let canonical: string | null = null;

    if (u.protocol === 'gs:') {
      canonical = `${u.host}${u.pathname}`;
    } else if (u.host === 'firebasestorage.googleapis.com') {
      const seg = u.pathname.split('/').filter(Boolean);
      const bIdx = seg.indexOf('b');
      const oIdx = seg.indexOf('o');
      if (bIdx !== -1 && bIdx + 1 < seg.length && oIdx !== -1 && oIdx + 1 < seg.length) {
        const bucket = seg[bIdx + 1];
        const encodedObject = seg[oIdx + 1];
        const objectPath = decodeURIComponent(encodedObject);
        canonical = `${bucket}/${objectPath}`;
      }
    } else if (u.host === 'storage.googleapis.com' && u.pathname.split('/').filter(Boolean).length >= 2) {
      const seg = u.pathname.split('/').filter(Boolean);
      const bucket = seg[0];
      const objectPath = seg.slice(1).join('/');
      canonical = `${bucket}/${objectPath}`;
    }

    const base = (canonical ?? noQuery).toLowerCase();
    const material = `${base}|${name.toLowerCase()}`;
    return sha1(material);
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

    this.fileDoc = this.projectId && this.projectId.length
      ? doc(db, 'projects', this.projectId, 'files', this.fileId)
      : doc(db, 'files', this.fileId);
  }

  async init(): Promise<void> {
    await this.ensureFileMeta();
  }

  private pageDoc(page: number): DocumentReference {
    return doc(this.fileDoc, 'pages', String(page));
  }

  private pageCollection(): CollectionReference {
    return collection(this.fileDoc, 'pages');
  }

  async saveStroke(page: number, stroke: StrokeInput): Promise<void> {
    const refNo = await this.nextRefNo();
    const pageRef = this.pageDoc(page);
    const snap = await getDoc(pageRef);
    if (!snap.exists()) {
      await setDoc(pageRef, {
        pageNumber: page,
        createdAt: serverTimestamp(),
      });
    }

    const col = collection(pageRef, 'strokes');
    const sref = doc(col);
    await setDoc(sref, {
      type: 'stroke',
      refNo,
      page,
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
    const pageRef = this.pageDoc(page);
    const col = collection(pageRef, 'annotations');
    const nref = doc(col, note.id);
    await setDoc(
      nref,
      {
        type: 'annotation',
        page,
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
    const pageRef = this.pageDoc(page);
    const col = collection(pageRef, 'annotations');
    const nref = doc(col, note.id);
    await setDoc(
      nref,
      {
        type: 'annotation',
        page,
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
    const pageRef = this.pageDoc(page);
    const col = collection(pageRef, 'annotations');
    const nref = doc(col, noteId);
    await deleteDoc(nref);
    await this.touchUpdatedAt();
  }

  async saveCameraPin(page: number, pin: CameraPinInput, remoteImageUrl?: string | null): Promise<void> {
    const refNo = await this.nextRefNo();
    const pageRef = this.pageDoc(page);
    const col = collection(pageRef, 'pins');
    const pref = doc(col, pin.id);

    await setDoc(pref, {
      type: 'cameraPin',
      refNo,
      page,
      pinId: pin.id,
      position: { x: pin.position.x, y: pin.position.y },
      imagePath: remoteImageUrl ?? pin.imagePath,
      note: pin.note || '',
      author: this.author(),
      createdAt: pin.createdAt,
      updatedAt: serverTimestamp(),
    });

    await this.touchUpdatedAt();
  }

  async deleteCameraPin(page: number, pinId: string): Promise<void> {
    const pageRef = this.pageDoc(page);
    const col = collection(pageRef, 'pins');
    const pref = doc(col, pinId);
    await deleteDoc(pref);
    await this.touchUpdatedAt();
  }

  async loadAll(): Promise<PdfArtifactsByPage> {
    const out: PdfArtifactsByPage = {};

    const pagesSnap = await getDocs(this.pageCollection());
    if (pagesSnap.empty) return out;

    for (const pageDoc of pagesSnap.docs) {
      const pageNum = parseInt(pageDoc.id, 10);
      if (!Number.isFinite(pageNum)) continue;

      const items: PageArtifacts = [];

      try {
        const strokesSnap = await getDocs(collection(pageDoc.ref, 'strokes'));
        strokesSnap.forEach((s) => {
          const d = s.data() as any;
          try {
            const artifact: StrokeArtifact = {
              type: 'stroke',
              color: (d.color as number) ?? 0xff000000,
              width: Number(d.width ?? 1),
              toolType: Number(d.toolType ?? 0),
              isEraser: !!d.isEraser,
              points: Array.isArray(d.points)
                ? d.points.map((p: any) => ({ x: Number(p.x ?? 0), y: Number(p.y ?? 0) }))
                : [],
              pressureValues: Array.isArray(d.pressureValues)
                ? d.pressureValues.map((v: any) => Number(v ?? 0))
                : [],
            };
            items.push(artifact);
          } catch {
            // ignore parse errors
          }
        });
      } catch {
        // ignore strokes load errors
      }

      try {
        const notesSnap = await getDocs(collection(pageDoc.ref, 'annotations'));
        notesSnap.forEach((n) => {
          const d = n.data() as any;
          try {
            const artifact: AnnotationArtifact = {
              type: 'annotation',
              id: String(d.id || n.id),
              annType: Number(d.annType ?? 0),
              position: {
                x: Number(d.position?.x ?? 0),
                y: Number(d.position?.y ?? 0),
              },
              text: String(d.text ?? ''),
              color: (d.color as number) ?? 0xff000000,
              width: Number(d.width ?? 150),
              height: Number(d.height ?? 100),
            };
            items.push(artifact);
          } catch {
            // ignore parse errors
          }
        });
      } catch {
        // ignore annotations load errors
      }

      try {
        const pinsSnap = await getDocs(collection(pageDoc.ref, 'pins'));
        pinsSnap.forEach((p) => {
          const d = p.data() as any;
          try {
            let createdAt: number;
            if (d.createdAt && typeof (d.createdAt as any).toDate === 'function') {
              createdAt = (d.createdAt as any).toDate().getTime();
            } else if (typeof d.createdAt === 'string') {
              createdAt = new Date(d.createdAt).getTime();
            } else if (typeof d.createdAt === 'number') {
              createdAt = d.createdAt;
            } else {
              createdAt = Date.now();
            }

            const artifact: CameraPinArtifact = {
              type: 'cameraPin',
              id: String(d.pinId || p.id),
              position: {
                x: Number(d.position?.x ?? 0),
                y: Number(d.position?.y ?? 0),
              },
              imagePath: String(d.imagePath ?? ''),
              createdAt,
              note: typeof d.note === 'string' ? d.note : undefined,
            };
            items.push(artifact);
          } catch {
            // ignore parse errors
          }
        });
      } catch {
        // ignore pins load errors
      }

      if (items.length) {
        out[String(pageNum)] = items;
      }
    }

    return out;
  }

  async uploadCameraImage(page: number, pinId: string, file: File): Promise<string> {
    const basePath = this.projectId && this.projectId.length
      ? `projects/${this.projectId}/files/${this.fileId}`
      : `files/${this.fileId}`;
    const path = `${basePath}/pins/${page}/${pinId}.jpg`;

    const sref = storageRef(storage, path);
    await uploadBytes(sref, file, { contentType: 'image/jpeg' });
    return getDownloadURL(sref);
  }

  private async ensureFileMeta(): Promise<void> {
    try {
      const fileSnap = await getDoc(this.fileDoc);
      if (!fileSnap.exists()) {
        await setDoc(this.fileDoc, {
          fileUrl: this.fileUrl,
          fileName: this.fileName,
          projectId: this.projectId ?? null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      const metaDoc = doc(this.fileDoc, 'meta', 'meta');
      const metaSnap = await getDoc(metaDoc);
      if (!metaSnap.exists()) {
        await setDoc(metaDoc, {
          fileUrl: this.fileUrl,
          fileName: this.fileName,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch {
      // swallow meta errors
    }
  }

  private async touchUpdatedAt(): Promise<void> {
    const metaDoc = doc(this.fileDoc, 'meta', 'meta');
    await setDoc(metaDoc, { updatedAt: serverTimestamp() }, { merge: true });
  }

  private author(): { uid: string; name?: string | null; email?: string | null } {
    const u = auth.currentUser;
    return {
      uid: u?.uid ?? 'anonymous',
      name: u?.displayName ?? null,
      email: u?.email ?? null,
    };
  }

  private async nextRefNo(): Promise<number> {
    const counters = doc(this.fileDoc, '_meta', 'counters');
    const next = await runTransaction(db, async (tx) => {
      const snap = await tx.get(counters);
      const current = typeof snap.data()?.lastRef === 'number'
        ? (snap.data()!.lastRef as number)
        : 0;
      const updated = current + 1;
      tx.set(counters, { lastRef: updated }, { merge: true });
      return updated;
    });
    return next;
  }

  private computeStrokeBBox(points: DocPoint[]) {
    if (!points.length) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    let minX = points[0].x;
    let maxX = points[0].x;
    let minY = points[0].y;
    let maxY = points[0].y;
    for (const p of points) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    return { minX, minY, maxX, maxY };
  }
}
