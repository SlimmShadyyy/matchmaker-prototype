
'use client';

import { CheckCircle2 } from 'lucide-react';

interface ToastNotificationProps {
  message: string | null;
}

export default function ToastNotification({
  message,
}: ToastNotificationProps) {
  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 bg-stone-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-sm"
    >
      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
