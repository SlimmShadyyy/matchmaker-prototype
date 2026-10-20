
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export default function useToast(duration = 4000) {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback(
    (message: string) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      setToastMessage(message);

      timeoutRef.current = setTimeout(() => {
        setToastMessage(null);
        timeoutRef.current = null;
      }, duration);
    },
    [duration]
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { toastMessage, showToast };
}
