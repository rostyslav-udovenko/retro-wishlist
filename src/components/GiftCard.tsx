import type { Gift } from "../types/gift";

import GiftMedia from "./GiftMedia";

type GiftCardProps = {
  gift: Gift;
  isOwnedByVisitor: boolean;
  isUpdating: boolean;
  onChooseGift: (gift: Gift) => void;
  onReleaseGift: (giftId: number) => void;
};

function GiftCard({
  gift,
  isOwnedByVisitor,
  isUpdating,
  onChooseGift,
  onReleaseGift,
}: GiftCardProps) {
  const canRelease = gift.isReserved && isOwnedByVisitor;

  let statusLabel = "Available";
  let buttonLabel = "Choose this gift";

  if (isUpdating) {
    statusLabel = gift.isReserved ? "Releasing..." : "Reserving...";
    buttonLabel = statusLabel;
  } else if (canRelease) {
    statusLabel = "Reserved by you";
    buttonLabel = "Release my reservation";
  } else if (gift.isReserved) {
    statusLabel = "Already chosen";
    buttonLabel = "Already chosen";
  }

  function handleAction() {
    if (isUpdating) {
      return;
    }

    if (canRelease) {
      onReleaseGift(gift.id);
      return;
    }

    if (!gift.isReserved) {
      onChooseGift(gift);
    }
  }

  return (
    <article
      className={`gift-card gift-card--${gift.accent} ${
        canRelease ? "gift-card--owned" : ""
      }`}
      aria-labelledby={`gift-title-${gift.key}`}
    >
      <div className="gift-card__visual">
        <GiftMedia image={gift.image} giftName={gift.name} />
      </div>

      <div className="gift-card__content">
        <div className="gift-card__status-row">
          <span
            className={`gift-card__status ${
              canRelease
                ? "gift-card__status--owned"
                : gift.isReserved
                  ? "gift-card__status--reserved"
                  : "gift-card__status--available"
            }`}
          >
            {statusLabel}
          </span>

          <span className="gift-card__number">
            #{String(gift.id).padStart(2, "0")}
          </span>
        </div>

        <h2 id={`gift-title-${gift.key}`}>{gift.name}</h2>
        <p className="gift-card__description">{gift.description}</p>

        <div className="gift-card__footer">
          <span className="gift-card__price">{gift.price}</span>

          <div className="gift-card__actions">
            {gift.storeUrl ? (
              <a
                className="retro-button retro-button--secondary retro-button--full"
                href={gift.storeUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                View product
                <span className="visually-hidden">
                  : {gift.name}, opens in a new tab
                </span>
              </a>
            ) : null}

            <button
              className={`retro-button retro-button--primary ${
                canRelease ? "retro-button--release" : ""
              }`}
              type="button"
              disabled={isUpdating || (gift.isReserved && !isOwnedByVisitor)}
              aria-busy={isUpdating || undefined}
              onClick={handleAction}
            >
              {buttonLabel}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

export default GiftCard;
