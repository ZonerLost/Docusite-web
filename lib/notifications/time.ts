import type { Timestamp } from "firebase/firestore";

export function timeAgo(ts?: Timestamp): string {
  if (!ts) return "";
  try {
    const ms = ts.toDate().getTime();
    const diff = Date.now() - ms;
    const m = Math.floor(diff / 60000);
    if (m < 1) return "Just now";
    if (m < 60) return `${m} min${m > 1 ? "s" : ""} ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} hour${h > 1 ? "s" : ""} ago`;
    const d = Math.floor(h / 24);
    return `${d} day${d > 1 ? "s" : ""} ago`;
  } catch {
    return "";
  }
}
