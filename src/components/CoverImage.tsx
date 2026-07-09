import { useState, useEffect } from "react";
import { readCoverImage } from "../lib/tauri";

interface CoverImageProps {
  gameId: number;
  coverPath: string | null;
  alt: string;
  className?: string;
}

export function CoverImage({ gameId, coverPath, alt, className = "" }: CoverImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!coverPath) return;

    let cancelled = false;

    readCoverImage(gameId).then((url) => {
      if (!cancelled) {
        setBlobUrl(url);
        if (!url) setErrored(true);
      }
    });

    return () => {
      cancelled = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [gameId, coverPath]);

  const showShimmer = !loaded && !errored && !!blobUrl;
  const showPlaceholder = !blobUrl || errored;

  return (
    <div className={`relative overflow-hidden bg-base-panel ${className}`}>
      {showShimmer && (
        <div className="absolute inset-0 shimmer-bg animate-shimmer" />
      )}
      {showPlaceholder ? (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-base-panel to-base-border">
          <span className="text-3xl font-bold text-muted/30">
            {alt.charAt(0).toUpperCase()}
          </span>
        </div>
      ) : (
        <img
          src={blobUrl ?? undefined}
          alt={alt}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
        />
      )}
    </div>
  );
}
