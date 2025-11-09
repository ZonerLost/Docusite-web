import webpush from 'web-push';

const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
const priv = process.env.VAPID_PRIVATE_KEY!;
const subject = process.env.VAPID_SUBJECT || 'mailto:you@example.com';

webpush.setVapidDetails(subject, pub, priv);

export { webpush };

