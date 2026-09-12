import { useState } from "react";

type GiftMediaProps = {
  image: string;
  giftName: string;
  iconClassName?: string;
  imageClassName?: string;
  decorative?: boolean;
};

function isImageUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function GiftMedia({
  image,
  giftName,
  iconClassName = "gift-card__icon",
  imageClassName = "gift-card__image",
  decorative = false,
}: GiftMediaProps) {
  const [failedImage, setFailedImage] = useState<string | null>(null);

  const isRemoteImage = isImageUrl(image);
  const hasImageError = failedImage === image;

  if (isRemoteImage && !hasImageError) {
    return (
      <span className={iconClassName} aria-hidden={decorative || undefined}>
        <img
          className={imageClassName}
          src={image}
          alt={decorative ? "" : giftName}
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
        className={iconClassName}
        role={decorative ? undefined : "img"}
        aria-label={
          decorative ? undefined : `Image unavailable for ${giftName}`
        }
        aria-hidden={decorative || undefined}
      >
        🎁
      </span>
    );
  }

  return (
    <span className={iconClassName} aria-hidden="true">
      {image}
    </span>
  );
}

export default GiftMedia;
