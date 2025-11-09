import { NextRequest, NextResponse } from 'next/server';
import { listSubscriptions, removeSubscription } from '@/lib/subscriptions';
import { webpush } from '@/lib/webpush';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const payload = JSON.stringify({
    title: body.title ?? 'Hello from Next.js',
    body: body.body ?? 'This is a test push.',
    icon: body.icon ?? '/docusite.svg',
    url: body.url ?? '/',
  });

  const subs = listSubscriptions();
  const results = await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(sub as any, payload);
        return { endpoint: sub.endpoint, ok: true };
      } catch (err: any) {
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          removeSubscription(sub.endpoint);
        }
        return { endpoint: sub.endpoint, ok: false, error: err?.message };
      }
    })
  );

  const ok = results.filter((r) => r.status === 'fulfilled').length;
  return NextResponse.json({ ok, total: subs.length, results });
}

