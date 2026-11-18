import { useCallback, useEffect, useRef, useState } from 'react';

interface FullscreenDocument extends Document {
  webkitFullscreenEnabled?: boolean;
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
}

interface FullscreenElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void> | void;
}

export function getFullscreenElement(): Element | null {
  if (typeof document === 'undefined') return null;
  const doc = document as FullscreenDocument;
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

export function isFullscreenSupported(): boolean {
  if (typeof document === 'undefined') return false;
  const doc = document as FullscreenDocument;
  const root = doc.documentElement as FullscreenElement | null;
  if (!root) return false;

  const hasRequest =
    typeof root.requestFullscreen === 'function' ||
    typeof root.webkitRequestFullscreen === 'function';
  const hasExit =
    typeof doc.exitFullscreen === 'function' ||
    typeof doc.webkitExitFullscreen === 'function';

  if (!hasRequest || !hasExit) return false;

  if (typeof doc.fullscreenEnabled === 'boolean') {
    if (!doc.fullscreenEnabled && doc.webkitFullscreenEnabled !== true) {
      return false;
    }
  } else if (
    typeof doc.webkitFullscreenEnabled === 'boolean' &&
    !doc.webkitFullscreenEnabled
  ) {
    return false;
  }

  return true;
}

const UNSUPPORTED_MESSAGE =
  'Полноэкранный режим не поддерживается этим браузером или ограничен настройками просмотра.';

export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(
    () => getFullscreenElement() !== null,
  );
  const [supported, setSupported] = useState<boolean>(() => isFullscreenSupported());
  const [notice, setNotice] = useState<string | null>(null);

  const noticeTimerRef = useRef<number | null>(null);
  const verifyTimerRef = useRef<number | null>(null);

  const clearNoticeTimer = useCallback(() => {
    if (noticeTimerRef.current !== null) {
      window.clearTimeout(noticeTimerRef.current);
      noticeTimerRef.current = null;
    }
  }, []);

  const clearVerifyTimer = useCallback(() => {
    if (verifyTimerRef.current !== null) {
      window.clearTimeout(verifyTimerRef.current);
      verifyTimerRef.current = null;
    }
  }, []);

  const showNotice = useCallback(
    (message: string) => {
      clearNoticeTimer();
      setNotice(message);
      noticeTimerRef.current = window.setTimeout(() => {
        noticeTimerRef.current = null;
        setNotice(null);
      }, 4200);
    },
    [clearNoticeTimer],
  );

  const dismissNotice = useCallback(() => {
    clearNoticeTimer();
    setNotice(null);
  }, [clearNoticeTimer]);

  useEffect(() => {
    setSupported(isFullscreenSupported());
    setIsFullscreen(getFullscreenElement() !== null);

    const syncState = () => {
      clearVerifyTimer();
      const active = getFullscreenElement() !== null;
      setIsFullscreen(active);
      if (active) {
        dismissNotice();
      }
    };

    const onError = () => {
      clearVerifyTimer();
      setIsFullscreen(getFullscreenElement() !== null);
      showNotice(UNSUPPORTED_MESSAGE);
    };

    document.addEventListener('fullscreenchange', syncState);
    document.addEventListener('webkitfullscreenchange', syncState);
    document.addEventListener('fullscreenerror', onError);
    document.addEventListener('webkitfullscreenerror', onError);

    return () => {
      clearNoticeTimer();
      clearVerifyTimer();
      document.removeEventListener('fullscreenchange', syncState);
      document.removeEventListener('webkitfullscreenchange', syncState);
      document.removeEventListener('fullscreenerror', onError);
      document.removeEventListener('webkitfullscreenerror', onError);
    };
  }, [clearNoticeTimer, clearVerifyTimer, dismissNotice, showNotice]);

  const enterFullscreen = useCallback(async () => {
    if (!isFullscreenSupported()) {
      setSupported(false);
      setIsFullscreen(false);
      showNotice(UNSUPPORTED_MESSAGE);
      return;
    }

    const doc = document as FullscreenDocument;
    const root = doc.documentElement as FullscreenElement;

    try {
      if (typeof root.requestFullscreen === 'function') {
        await root.requestFullscreen();
      } else if (typeof root.webkitRequestFullscreen === 'function') {
        await Promise.resolve(root.webkitRequestFullscreen());
      } else {
        setIsFullscreen(false);
        showNotice(UNSUPPORTED_MESSAGE);
        return;
      }

      clearVerifyTimer();
      verifyTimerRef.current = window.setTimeout(() => {
        verifyTimerRef.current = null;
        const active = getFullscreenElement() !== null;
        setIsFullscreen(active);
        if (!active) {
          showNotice(UNSUPPORTED_MESSAGE);
        }
      }, 180);
    } catch {
      clearVerifyTimer();
      setIsFullscreen(getFullscreenElement() !== null);
      showNotice(UNSUPPORTED_MESSAGE);
    }
  }, [clearVerifyTimer, showNotice]);

  const exitFullscreen = useCallback(async () => {
    const doc = document as FullscreenDocument;
    if (getFullscreenElement() === null) {
      setIsFullscreen(false);
      return;
    }
    try {
      if (typeof doc.exitFullscreen === 'function') {
        await doc.exitFullscreen();
      } else if (typeof doc.webkitExitFullscreen === 'function') {
        await Promise.resolve(doc.webkitExitFullscreen());
      }
    } catch {
      // Ignore exit errors and sync with actual DOM state
    } finally {
      setIsFullscreen(getFullscreenElement() !== null);
    }
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (getFullscreenElement() !== null) {
      await exitFullscreen();
    } else {
      await enterFullscreen();
    }
  }, [enterFullscreen, exitFullscreen]);

  return {
    isFullscreen,
    supported,
    notice,
    dismissNotice,
    toggleFullscreen,
    enterFullscreen,
    exitFullscreen,
  };
}
