import { useEffect, useState } from 'react';
import { BuiltinIllustration } from '../assets/illustrations';
import { resolveStarImageSettings } from '../scene/paletteConfig';
import { getImageBlob } from '../services/database';
import type {
  BuiltinIllustrationId,
  StarIllustrationRef,
  StarImageSettings,
} from '../types/project';

interface StarIllustrationViewProps {
  illustration: StarIllustrationRef;
  imageSettings?: StarImageSettings;
  alt: string;
  className?: string;
}

export function StarIllustrationView({
  illustration,
  imageSettings,
  alt,
  className = 'w-full h-full',
}: StarIllustrationViewProps) {
  const [customUrl, setCustomUrl] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    if (illustration.type !== 'custom') {
      setCustomUrl(null);
      setLoadFailed(false);
      return;
    }

    let active = true;
    let objectUrl: string | null = null;

    getImageBlob(illustration.id)
      .then((blob) => {
        if (!active) return;
        if (blob) {
          objectUrl = URL.createObjectURL(blob);
          setCustomUrl(objectUrl);
          setLoadFailed(false);
        } else {
          setCustomUrl(null);
          setLoadFailed(true);
        }
      })
      .catch(() => {
        if (active) {
          setCustomUrl(null);
          setLoadFailed(true);
        }
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [illustration.type, illustration.id]);

  const resolved = imageSettings
    ? resolveStarImageSettings({ imageSettings })
    : null;

  const transformStyle = resolved
    ? {
        transform: `translate(${resolved.offsetX}%, ${resolved.offsetY}%) scale(${resolved.scale})`,
        transformOrigin: 'center center',
      }
    : undefined;

  const fitClass = resolved?.fit === 'cover' ? 'object-cover' : 'object-contain';

  if (illustration.type === 'builtin') {
    if (resolved) {
      return (
        <div className={`${className} overflow-hidden flex items-center justify-center`}>
          <div
            className="w-full h-full flex items-center justify-center transition-transform duration-75"
            style={transformStyle}
          >
            <BuiltinIllustration
              id={illustration.id as BuiltinIllustrationId}
              className="w-full h-full object-contain"
            />
          </div>
        </div>
      );
    }

    return (
      <BuiltinIllustration
        id={illustration.id as BuiltinIllustrationId}
        className={className}
      />
    );
  }

  if (customUrl && !loadFailed) {
    if (resolved) {
      return (
        <div className={`${className} overflow-hidden flex items-center justify-center rounded-xl`}>
          <img
            src={customUrl}
            alt={alt}
            referrerPolicy="no-referrer"
            onError={() => setLoadFailed(true)}
            style={transformStyle}
            className={`w-full h-full ${fitClass} transition-transform duration-75 select-none pointer-events-none`}
          />
        </div>
      );
    }

    return (
      <img
        src={customUrl}
        alt={alt}
        referrerPolicy="no-referrer"
        onError={() => setLoadFailed(true)}
        className={`${className} object-contain rounded-xl`}
      />
    );
  }

  // Resilient fallback if custom Blob is missing
  return <BuiltinIllustration id="heart" className={className} />;
}
