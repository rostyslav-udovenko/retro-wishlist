import { useCallback } from "react";
import { Link } from "react-router";
import { prefetchWishlistPage } from "../services/wishlists";
import type { WishlistDirectoryItem } from "../types/wishlist-directory";

const cardAccents = ["blue", "pink", "yellow"] as const;

type WishlistDirectoryCardProps = {
  wishlist: WishlistDirectoryItem;
  position: number;
};

function WishlistDirectoryCard({
  wishlist,
  position,
}: WishlistDirectoryCardProps) {
  const accent = cardAccents[position % cardAccents.length];
  const reservedGifts = wishlist.totalGifts - wishlist.availableGifts;

  const prefetchWishlist = useCallback(() => {
    void prefetchWishlistPage(wishlist.slug).catch((error: unknown) => {
      console.warn(`Unable to prefetch wishlist "${wishlist.slug}".`, error);
    });
  }, [wishlist.slug]);

  return (
    <article
      className={`directory-card directory-card--${accent}`}
      aria-labelledby={`directory-title-${wishlist.slug}`}
      onPointerEnter={prefetchWishlist}
      onTouchStart={prefetchWishlist}
    >
      <div className="directory-card__visual" aria-hidden="true">
        <span>{wishlist.icon}</span>
      </div>

      <div className="directory-card__content">
        <header className="directory-card__header">
          <p>Public wishlist</p>
          <h2 id={`directory-title-${wishlist.slug}`}>{wishlist.ownerName}</h2>
        </header>

        <h3>{wishlist.title}</h3>
        <p className="directory-card__description">{wishlist.description}</p>

        <dl className="directory-card__statistics">
          <div>
            <dt>Total</dt>
            <dd>{wishlist.totalGifts}</dd>
          </div>
          <div>
            <dt>Available</dt>
            <dd>{wishlist.availableGifts}</dd>
          </div>
          <div>
            <dt>Reserved</dt>
            <dd>{reservedGifts}</dd>
          </div>
        </dl>

        <Link
          className="retro-button directory-card__link"
          to={`/w/${wishlist.slug}`}
          onFocus={prefetchWishlist}
        >
          Open wishlist
        </Link>
      </div>
    </article>
  );
}

export default WishlistDirectoryCard;
