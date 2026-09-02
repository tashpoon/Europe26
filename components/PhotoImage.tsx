"use client";

import { useState } from "react";
import { photoUrl } from "@/lib/photos";

/**
 * Hotlinked Unsplash photo. The leg emoji sits behind it so a photo that 404s
 * (or a viewer offline in a Slovenian valley) still leaves something deliberate
 * in the frame rather than an empty band.
 */
export function PhotoImage({
  legId,
  dayIndex,
  emoji,
  alt,
}: {
  legId: string;
  dayIndex: number;
  emoji: string;
  alt: string;
}) {
  const [failed, setFailed] = useState(false);
  const src = photoUrl(legId, dayIndex);
  if (!src) return null;

  return (
    <div className="photo">
      <span className="photo-fallback" aria-hidden="true">
        {emoji}
      </span>
      {!failed && (
        <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} />
      )}
    </div>
  );
}
