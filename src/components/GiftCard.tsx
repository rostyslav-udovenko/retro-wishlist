import type { Gift } from "../types/gift";

type GiftCardProps = {
  gift: Gift;
};

function GiftCard({ gift }: GiftCardProps) {
  const statusLabel = gift.isReserved ? "Already chosen" : "Available";
  const buttonLabel = gift.isReserved ? "Already chosen" : "Choose this gift";

  return (
    <article
      className={`gift-card gift-card--${gift.accent}`}
      aria-labelledby={`gift-title-${gift.id}`}
    >
      <div className="gift-card__visual" aria-hidden="true">
        <span className="gift-card__icon">{gift.icon}</span>
      </div>

      <div className="gift-card__content">
        <div className="gift-card__status-row">
          <span
            className={`gift-card__status ${
              gift.isReserved
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

        <h2 id={`gift-title-${gift.id}`}>{gift.name}</h2>

        <p className="gift-card__description">{gift.description}</p>

        <div className="gift-card__footer">
          <span className="gift-card__price">{gift.price}</span>

          <button
            className="retro-button"
            type="button"
            disabled={gift.isReserved}
          >
            {buttonLabel}
          </button>
        </div>
      </div>
    </article>
  );
}

export default GiftCard;
