import webpush from 'web-push';

const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const priv = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT || 'mailto:you@example.com';

// Defer configuration until runtime and avoid throwing during import/build.
let configured = false;
function configureIfPossible() {
  if (configured) return true;
  if (pub && priv) {
    try {
      webpush.setVapidDetails(subject, pub, priv);
      configured = true;
      return true;
    } catch {
      // leave unconfigured; caller can surface a friendly error
      configured = false;
    }
  }
  return false;
}

export const isWebPushConfigured = (): boolean => configured || configureIfPossible();
export { webpush };
