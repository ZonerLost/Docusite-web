'use client';

import React from 'react';
import { getFcmTokenAndSync } from '@/lib/fcm';

export default function EnablePushButton() {
  const [status, setStatus] = React.useState<'idle' | 'ok' | 'err'>('idle');

  const onClick = async () => {
    try {
      const token = await getFcmTokenAndSync();
      if (!token) throw new Error('No token');
      setStatus('ok');
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[EnablePushButton] failed', e);
      setStatus('err');
    }
  };

  return (
    <button onClick={onClick} aria-label="Enable notifications" className="text-sm text-action hover:underline">
      {status === 'idle' && 'Enable notifications'}
      {status === 'ok' && 'Notifications enabled ✅'}
      {status === 'err' && 'Enable failed ❌'}
    </button>
  );
}

