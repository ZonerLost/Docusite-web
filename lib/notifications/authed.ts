"use client";

import { auth } from "@/lib/firebase-client";

import { normalizeEmail } from "./keys";

export function getAuthedEmailKey(): string {
  const key = normalizeEmail(auth.currentUser?.email);
  if (!key) throw new Error("Missing auth email");
  return key;
}

