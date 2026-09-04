import { useEffect, useState } from "react";

type GiftMediaProps = {
  image: string;
  giftName: string;
};

function isImageUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function GiftMedia({ image, giftName }: GiftMediaProps) {
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const isRemoteImage = isImageUrl(image);
  const hasImageError = failedImage === image;

  useEffect(() => {
    setFailedImage(null);
  }, [image]);

  if (isRemoteImage && !hasImageError) {
    return (
      <img
        className="gift-card__image"
        src={image}
        alt={giftName}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailedImage(image)}
      />
    );
  }

  return (
    <span
      className="gift-card__icon"
      aria-label={
        hasImageError ? `Image unavailable for ${giftName}` : undefined
      }
      aria-hidden={hasImageError ? undefined : true}
    >
      {hasImageError ? "🎁" : image}
    </span>
  );
}

export default GiftMedia;
