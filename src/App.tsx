import { useCallback, useEffect, useState } from "react";

import GiftCard from "./components/GiftCard";
import ReservationDialog from "./components/ReservationDialog";
import { useWishlistSync } from "./hooks/use-wishlist-sync";
import { broadcastWishlistChange } from "./services/wishlist-realtime";
import {
  fetchWishlistPage,
  releaseGift,
  reserveGift,
} from "./services/wishlists";
import type { Gift } from "./types/gift";
import type { Wishlist } from "./types/wishlist";
import {
  addReservationOwnership,
  getOrCreateVisitorToken,
  getReservationIds,
  reconcileReservationOwnership,
  removeReservationOwnership,
} from "./utils/reservation-storage";

import "./App.css";

const wishlistSlug = "rostyslav";

type PageState = {
  wishlist: Wishlist | null;
  gifts: Gift[];
  isLoading: boolean;
  error: string | null;
};

const initialPageState: PageState = {
  wishlist: null,
  gifts: [],
  isLoading: true,
  error: null,
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "An unexpected error occurred while loading the wishlist.";
}

async function notifyWishlistChanged(): Promise<void> {
  try {
    await broadcastWishlistChange(wishlistSlug);
  } catch (error) {
    console.warn(
      "The wishlist was updated, but the Realtime notification failed.",
      error,
    );
  }
}

function App() {
  const [pageState, setPageState] = useState<PageState>(initialPageState);
  const [reservationIds, setReservationIds] = useState<number[]>(() =>
    getReservationIds(wishlistSlug),
  );
  const [selectedGift, setSelectedGift] = useState<Gift | null>(null);
  const [updatingGiftId, setUpdatingGiftId] = useState<number | null>(null);
  const [reservationError, setReservationError] = useState<string | null>(null);

  const applyWishlistResult = useCallback(
    (result: Awaited<ReturnType<typeof fetchWishlistPage>>) => {
      const reservedGiftIds = result.gifts
        .filter((gift) => gift.isReserved)
        .map((gift) => gift.id);

      const nextReservationIds = reconcileReservationOwnership(
        wishlistSlug,
        reservedGiftIds,
      );

      setReservationIds(nextReservationIds);
      setPageState({
        wishlist: result.wishlist,
        gifts: result.gifts,
        isLoading: false,
        error: null,
      });
    },
    [],
  );

  const reloadWishlist = useCallback(async () => {
    setPageState((currentState) => ({
      ...currentState,
      isLoading: true,
      error: null,
    }));

    try {
      const result = await fetchWishlistPage(wishlistSlug);
      applyWishlistResult(result);
    } catch (error) {
      setPageState((currentState) => ({
        ...currentState,
        isLoading: false,
        error: getErrorMessage(error),
      }));
    }
  }, [applyWishlistResult]);

  useEffect(() => {
    let isCancelled = false;

    async function loadInitialWishlist() {
      try {
        const result = await fetchWishlistPage(wishlistSlug);

        if (isCancelled) {
          return;
        }

        const reservedGiftIds = result.gifts
          .filter((gift) => gift.isReserved)
          .map((gift) => gift.id);

        const nextReservationIds = reconcileReservationOwnership(
          wishlistSlug,
          reservedGiftIds,
        );

        setReservationIds(nextReservationIds);
        setPageState({
          wishlist: result.wishlist,
          gifts: result.gifts,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        if (isCancelled) {
          return;
        }

        setPageState({
          wishlist: null,
          gifts: [],
          isLoading: false,
          error: getErrorMessage(error),
        });
      }
    }

    void loadInitialWishlist();

    return () => {
      isCancelled = true;
    };
  }, []);

  useWishlistSync({
    wishlistSlug,
    enabled: pageState.wishlist !== null,
    onRefresh: reloadWishlist,
  });

  const closeReservationDialog = useCallback(() => {
    if (updatingGiftId !== null) {
      return;
    }

    setSelectedGift(null);
    setReservationError(null);
  }, [updatingGiftId]);

  function handleChooseGift(gift: Gift) {
    if (gift.isReserved || updatingGiftId !== null) {
      return;
    }

    setReservationError(null);
    setSelectedGift(gift);
  }

  async function handleConfirmReservation(guestName: string) {
    if (!selectedGift || updatingGiftId !== null) {
      return;
    }

    const giftId = selectedGift.id;

    setUpdatingGiftId(giftId);
    setReservationError(null);

    try {
      const visitorToken = getOrCreateVisitorToken();
      const wasReserved = await reserveGift({
        wishlistSlug,
        giftId,
        guestName,
        visitorToken,
      });

      if (!wasReserved) {
        setReservationError(
          "This gift has just been chosen by another visitor. The wishlist has been refreshed.",
        );

        const result = await fetchWishlistPage(wishlistSlug);
        applyWishlistResult(result);
        return;
      }

      await notifyWishlistChanged();

      const nextReservationIds = addReservationOwnership(wishlistSlug, giftId);

      setReservationIds(nextReservationIds);
      setSelectedGift(null);

      const result = await fetchWishlistPage(wishlistSlug);
      applyWishlistResult(result);
    } catch (error) {
      setReservationError(getErrorMessage(error));
    } finally {
      setUpdatingGiftId(null);
    }
  }

  async function handleReleaseGift(giftId: number) {
    if (updatingGiftId !== null) {
      return;
    }

    setUpdatingGiftId(giftId);
    setReservationError(null);

    try {
      const visitorToken = getOrCreateVisitorToken();
      const wasReleased = await releaseGift({
        wishlistSlug,
        giftId,
        visitorToken,
      });

      if (!wasReleased) {
        const nextReservationIds = removeReservationOwnership(
          wishlistSlug,
          giftId,
        );

        setReservationIds(nextReservationIds);

        const result = await fetchWishlistPage(wishlistSlug);
        applyWishlistResult(result);

        setPageState((currentState) => ({
          ...currentState,
          error:
            "This reservation could not be released. The local ownership record was removed and the wishlist was refreshed.",
        }));
        return;
      }

      await notifyWishlistChanged();

      const nextReservationIds = removeReservationOwnership(
        wishlistSlug,
        giftId,
      );

      setReservationIds(nextReservationIds);

      const result = await fetchWishlistPage(wishlistSlug);
      applyWishlistResult(result);
    } catch (error) {
      setPageState((currentState) => ({
        ...currentState,
        error: getErrorMessage(error),
      }));
    } finally {
      setUpdatingGiftId(null);
    }
  }

  const { wishlist, gifts, isLoading, error } = pageState;
  const availableCount = gifts.filter((gift) => !gift.isReserved).length;

  let pageContent;

  if (isLoading && !wishlist) {
    pageContent = (
      <section
        className="page-state page-state--loading"
        aria-live="polite"
        aria-busy="true"
      >
        <span className="page-state__icon" aria-hidden="true">
          ⏳
        </span>
        <p className="page-state__eyebrow">Accessing database</p>
        <h1>Loading wishlist...</h1>
        <p>Please wait while the gift directory is being prepared.</p>
      </section>
    );
  } else if (error && !wishlist) {
    pageContent = (
      <section className="page-state page-state--error" role="alert">
        <span className="page-state__icon" aria-hidden="true">
          ⚠️
        </span>
        <p className="page-state__eyebrow">Connection error</p>
        <h1>Wishlist unavailable</h1>
        <p>{error}</p>
        <button
          className="page-state__button"
          type="button"
          onClick={() => void reloadWishlist()}
        >
          Try again
        </button>
      </section>
    );
  } else if (!wishlist) {
    pageContent = (
      <section className="page-state page-state--not-found">
        <span className="page-state__icon" aria-hidden="true">
          🔍
        </span>
        <p className="page-state__eyebrow">Error 404</p>
        <h1>Wishlist not found</h1>
        <p>
          The requested wishlist does not exist or is currently unavailable.
        </p>
      </section>
    );
  } else {
    pageContent = (
      <section className="wishlist-window" aria-labelledby="wishlist-title">
        <header className="title-bar">
          <div className="title-bar__identity">
            <span className="title-bar__icon" aria-hidden="true">
              {wishlist.icon}
            </span>
            <span>WISHLIST.EXE</span>
          </div>

          <div className="window-controls" aria-hidden="true">
            <span className="window-control window-control--minimize" />
            <span className="window-control window-control--maximize" />
            <span className="window-control window-control--close" />
          </div>
        </header>

        <nav className="menu-bar" aria-label="Application menu">
          <span>File</span>
          <span>Gifts</span>
          <span>Help</span>
          <span className="menu-bar__status">
            {isLoading ? "SYNCING" : "ONLINE"}
          </span>
        </nav>

        <div className="wishlist-window__body">
          {error ? (
            <div className="inline-error" role="alert">
              <div>
                <strong>Refresh failed</strong>
                <span>{error}</span>
              </div>
              <button type="button" onClick={() => void reloadWishlist()}>
                Retry
              </button>
            </div>
          ) : null}

          <section className="hero">
            <div className="hero__copy">
              <p className="hero__eyebrow">Birthday protocol activated</p>
              <h1 id="wishlist-title">
                {wishlist.ownerName}&apos;s
                <span>birthday wishlist!</span>
              </h1>
              <p className="hero__description">{wishlist.description}</p>

              <div className="hero__tags" aria-label="Wishlist features">
                <span>No duplicates</span>
                <span>No account needed</span>
                <span>Maximum surprise</span>
              </div>
            </div>

            <div className="hero__art" aria-hidden="true">
              <div className="wow-burst">WOW!</div>
              <div className="gift-box">
                <div className="gift-box__bow gift-box__bow--left" />
                <div className="gift-box__bow gift-box__bow--right" />
                <div className="gift-box__lid" />
                <div className="gift-box__body">
                  <span />
                </div>
              </div>
            </div>
          </section>

          <section className="system-panel" aria-label="Wishlist status">
            <div className="system-panel__heading">
              <span className="system-panel__light" />
              <strong>System status</strong>
            </div>

            <dl className="statistics">
              <div>
                <dt>Total gifts</dt>
                <dd>{gifts.length}</dd>
              </div>
              <div>
                <dt>Available</dt>
                <dd>{availableCount}</dd>
              </div>
              <div>
                <dt>Reserved</dt>
                <dd>{gifts.length - availableCount}</dd>
              </div>
            </dl>
          </section>

          <section
            className="gift-section"
            aria-labelledby="gift-section-title"
          >
            <div className="section-heading">
              <div>
                <p>Directory: /birthday/gifts</p>
                <h2 id="gift-section-title">Choose your gift</h2>
              </div>
              <span>
                {gifts.length} {gifts.length === 1 ? "item" : "items"} found
              </span>
            </div>

            {gifts.length > 0 ? (
              <div className="gift-grid">
                {gifts.map((gift) => (
                  <GiftCard
                    gift={gift}
                    key={gift.key}
                    isOwnedByVisitor={reservationIds.includes(gift.id)}
                    isUpdating={updatingGiftId === gift.id}
                    onChooseGift={handleChooseGift}
                    onReleaseGift={(giftId) => {
                      void handleReleaseGift(giftId);
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <span aria-hidden="true">📭</span>
                <div>
                  <h3>No gifts found</h3>
                  <p>This wishlist does not contain any visible gifts yet.</p>
                </div>
              </div>
            )}
          </section>
        </div>

        <footer className="window-footer">
          <span>Made with ♥ and too many colors</span>
          <span>Rostyslav Udovenko © 2026</span>
        </footer>
      </section>
    );
  }

  return (
    <main className="desktop">
      <div className="desktop__decoration desktop__decoration--circle" />
      <div className="desktop__decoration desktop__decoration--triangle" />

      {pageContent}

      {selectedGift ? (
        <ReservationDialog
          gift={selectedGift}
          isSubmitting={updatingGiftId === selectedGift.id}
          submitError={reservationError}
          onCancel={closeReservationDialog}
          onConfirm={(guestName) => {
            void handleConfirmReservation(guestName);
          }}
        />
      ) : null}
    </main>
  );
}

export default App;
