import { useState } from "react";

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

  if (isRemoteImage && !hasImageError) {
    return (
      <span className="gift-card__icon">
        <img
          className="gift-card__image"
          src={image}
          alt={giftName}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => {
            setFailedImage(image);
          }}
        />
      </span>
    );
  }

  if (hasImageError) {
    return (
      <span
        className="gift-card__icon"
        role="img"
        aria-label={`Image unavailable for ${giftName}`}
      >
        🎁
      </span>
    );
  }

  return (
    <span className="gift-card__icon" aria-hidden="true">
      {image}
    </span>
  );
}

export default GiftMedia;
