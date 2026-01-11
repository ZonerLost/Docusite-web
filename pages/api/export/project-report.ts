import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "node:crypto";
import { sha1 } from "js-sha1";
import admin, {
  getAdminApp,
  getAdminBucket,
  getAdminDb,
  getStorageBucketName,
} from "@/lib/server/firebaseAdmin";
import { getUserFromToken } from "@/lib/server/auth";

let didLogBucket = false;

type ExportRequestBody = {
  projectId?: string;
  pdfId?: string;
  fileName?: string;
  fileUrl?: string;
  pdfBase64?: string;
};

function stripQuery(url: string) {
  return url.split("?")[0].split("#")[0];
}

function makeStableFileId(projectId: string, fileUrl: string, fileName: string): string {
  const base = stripQuery(fileUrl);
  const stableKey = `${projectId}::${base}::${fileName}`;
  return sha1(stableKey);
}

function sanitizeFileName(name: string): string {
  const cleaned = name
    .replace(/[\\/:*?"<>|\u0000-\u001F]/g, "_")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || "report.pdf";
}

function buildDownloadUrl(bucket: string, storagePath: string, token: string): string {
  return `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(
    bucket
  )}/o/${encodeURIComponent(storagePath)}?alt=media&token=${encodeURIComponent(
    token
  )}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const envStatus = {
    hasProjectId: !!process.env.FIREBASE_PROJECT_ID,
    hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
    hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
    hasStorageBucket: !!process.env.FIREBASE_STORAGE_BUCKET,
    hasPublicStorageBucket: !!process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    hasServiceAccountPath: !!process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
  };

  if (!didLogBucket) {
    console.log("[export] env:", envStatus);
  }
  let bucketName = "";
  try {
    bucketName = getStorageBucketName();
    const app = getAdminApp();
    if (!didLogBucket) {
      console.log("[export] admin project:", app.options.projectId || "");
    }
  } catch (err: any) {
    console.error("[export] firebase admin init failed:", err);
    return res.status(500).json({
      error: err?.message || "Firebase admin is not configured.",
    });
  }

  if (!didLogBucket) {
    console.log("[export] bucket:", bucketName);
    didLogBucket = true;
  }

  const user = await getUserFromToken(req);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  let body: ExportRequestBody = {};
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: "Invalid JSON payload" });
  }

  const projectId = body.projectId?.trim();
  const fileName = body.fileName?.trim() || "Project Report";
  const fileUrl = body.fileUrl?.trim() || "";
  const pdfBase64 = body.pdfBase64 || "";
  const pdfId = body.pdfId?.trim() || "";

  if (!projectId || !pdfBase64) {
    return res.status(400).json({ error: "Missing required export parameters" });
  }

  console.log("[export] projectId:", projectId);

  const buffer = Buffer.from(pdfBase64, "base64");
  if (!buffer.length) {
    return res.status(400).json({ error: "Empty PDF payload" });
  }

  const safeName = sanitizeFileName(fileName.replace(/\.pdf$/i, "")) + ".pdf";
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const storagePath = `project-report-exports/${projectId}/${stamp}-${safeName}`;
  const token = crypto.randomUUID();

  try {
    const bucket = getAdminBucket(bucketName);
    await bucket.file(storagePath).save(buffer, {
      contentType: "application/pdf",
      resumable: false,
      metadata: {
        contentType: "application/pdf",
        metadata: {
          firebaseStorageDownloadTokens: token,
          projectId,
          pdfId,
        },
      },
    });

    const url = buildDownloadUrl(bucket.name, storagePath, token);

    if (fileUrl && fileName) {
      const fileId = makeStableFileId(projectId, fileUrl, fileName);
      const fileRef = getAdminDb()
        .collection("projects")
        .doc(projectId)
        .collection("files")
        .doc(fileId);

      const historyEntry = {
        url,
        pdfId: pdfId || undefined,
        exportedBy: user.uid,
        exportedAt: admin.firestore.Timestamp.now(),
      };

      await fileRef.set(
        {
          exportedPdfUrl: url,
          exportedAt: admin.firestore.FieldValue.serverTimestamp(),
          exportedBy: user.uid,
          exportHistory: admin.firestore.FieldValue.arrayUnion(historyEntry),
        },
        { merge: true }
      );
    }

    return res.status(200).json({ url });
  } catch (err: any) {
    console.error("Report export upload failed:", err);
    return res.status(500).json({ error: err?.message || "Upload failed" });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "50mb",
    },
  },
};
