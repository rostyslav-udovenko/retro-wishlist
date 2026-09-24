import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router";

import AboutDialog from "../components/AboutDialog";
import AppMenuBar from "../components/AppMenuBar";
import {
  AppDesktop,
  RetroWindow,
  WindowFooter,
  WindowTitleBar,
} from "../components/AppShell";
import GiftCard from "../components/GiftCard";
import ReservationDialog from "../components/ReservationDialog";
import { useWishlistSync } from "../hooks/use-wishlist-sync";
import {
  fetchWishlistPage,
  releaseGift,
  reserveGift,
} from "../services/wishlists";
import { updateCachedDirectoryReservation } from "../services/wishlist-directory-cache";
import {
  getCachedWishlistPage,
  setCachedWishlistPage,
  updateCachedGiftReservation,
} from "../services/wishlist-cache";
import type { Gift } from "../types/gift";
import type { Wishlist } from "../types/wishlist";
import {
  addReservationOwnership,
  getOrCreateVisitorToken,
  getReservationIds,
  reconcileReservationOwnership,
  removeReservationOwnership,
} from "../utils/reservation-storage";

type PageState = {
  wishlist: Wishlist | null;
  gifts: Gift[];
  isInitialLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
};

const initialPageState: PageState = {
  wishlist: null,
  gifts: [],
  isInitialLoading: true,
  isRefreshing: false,
  error: null,
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "An unexpected error occurred while loading the wishlist.";
}

function WishlistPage() {
  const { slug } = useParams<{ slug: string }>();
  const wishlistSlug = slug?.trim().toLowerCase() ?? "";

  const [pageState, setPageState] = useState<PageState>(() => {
    const cachedResult = wishlistSlug
      ? getCachedWishlistPage(wishlistSlug)
      : null;

    if (!cachedResult) return initialPageState;

    return {
      wishlist: cachedResult.wishlist,
      gifts: cachedResult.gifts,
      isInitialLoading: false,
      isRefreshing: true,
      error: null,
    };
  });
  const [reservationIds, setReservationIds] = useState<number[]>(() =>
    wishlistSlug ? getReservationIds(wishlistSlug) : [],
  );
  const [selectedGift, setSelectedGift] = useState<Gift | null>(null);
  const [updatingGiftId, setUpdatingGiftId] = useState<number | null>(null);
  const [reservationError, setReservationError] = useState<string | null>(null);
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  const applyWishlistResult = useCallback(
    (result: Awaited<ReturnType<typeof fetchWishlistPage>>) => {
      const reservedGiftIds = result.gifts
        .filter((gift) => gift.isReserved)
        .map((gift) => gift.id);

      setReservationIds(
        reconcileReservationOwnership(wishlistSlug, reservedGiftIds),
      );
      setCachedWishlistPage(wishlistSlug, result);
      setPageState({
        wishlist: result.wishlist,
        gifts: result.gifts,
        isInitialLoading: false,
        isRefreshing: false,
        error: null,
      });
    },
    [wishlistSlug],
  );

  const reloadWishlist = useCallback(async () => {
    if (!wishlistSlug) return;

    setPageState((currentState) => ({
      ...currentState,
      isInitialLoading: currentState.wishlist === null,
      isRefreshing: currentState.wishlist !== null,
      error: null,
    }));

    try {
      applyWishlistResult(await fetchWishlistPage(wishlistSlug));
    } catch (error) {
      setPageState((currentState) => ({
        ...currentState,
        isInitialLoading: false,
        isRefreshing: false,
        error: getErrorMessage(error),
      }));
    }
  }, [applyWishlistResult, wishlistSlug]);

  useEffect(() => {
    let isCancelled = false;
    const cachedResult = wishlistSlug
      ? getCachedWishlistPage(wishlistSlug)
      : null;

    if (cachedResult) {
      const reservedGiftIds = cachedResult.gifts
        .filter((gift) => gift.isReserved)
        .map((gift) => gift.id);

      setReservationIds(
        reconcileReservationOwnership(wishlistSlug, reservedGiftIds),
      );
      setPageState({
        wishlist: cachedResult.wishlist,
        gifts: cachedResult.gifts,
        isInitialLoading: false,
        isRefreshing: true,
        error: null,
      });
    } else {
      setReservationIds(wishlistSlug ? getReservationIds(wishlistSlug) : []);
      setPageState(initialPageState);
    }

    async function loadInitialWishlist() {
      if (!wishlistSlug) return;

      try {
        const result = await fetchWishlistPage(wishlistSlug);
        if (isCancelled) return;
        applyWishlistResult(result);
      } catch (error) {
        if (isCancelled) return;

        setPageState((currentState) => ({
          wishlist: currentState.wishlist,
          gifts: currentState.gifts,
          isInitialLoading: false,
          isRefreshing: false,
          error: getErrorMessage(error),
        }));
      }
    }

    void loadInitialWishlist();
    return () => {
      isCancelled = true;
    };
  }, [applyWishlistResult, wishlistSlug]);

  const { broadcastChange } = useWishlistSync({
    wishlistSlug,
    enabled:
      wishlistSlug.length > 0 && pageState.wishlist?.slug === wishlistSlug,
    onRefresh: reloadWishlist,
  });

  const notifyWishlistChanged = useCallback(() => {
    void broadcastChange().catch((error: unknown) => {
      console.warn(
        "The wishlist was updated, but the Realtime notification failed.",
        error,
      );
    });
  }, [broadcastChange]);

  const updateGiftReservationLocally = useCallback(
    (giftId: number, isReserved: boolean) => {
      updateCachedGiftReservation(wishlistSlug, giftId, isReserved);
      updateCachedDirectoryReservation(wishlistSlug, isReserved);
      setPageState((currentState) => ({
        ...currentState,
        gifts: currentState.gifts.map((gift) =>
          gift.id === giftId ? { ...gift, isReserved } : gift,
        ),
      }));
    },
    [wishlistSlug],
  );

  const closeReservationDialog = useCallback(() => {
    if (updatingGiftId !== null) return;
    setSelectedGift(null);
    setReservationError(null);
  }, [updatingGiftId]);

  function handleChooseGift(gift: Gift) {
    if (gift.isReserved || updatingGiftId !== null) return;
    setReservationError(null);
    setSelectedGift(gift);
  }

  async function handleConfirmReservation(guestName: string) {
    if (!selectedGift || updatingGiftId !== null || !wishlistSlug) return;

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
        applyWishlistResult(await fetchWishlistPage(wishlistSlug));
        return;
      }

      setReservationIds(addReservationOwnership(wishlistSlug, giftId));
      updateGiftReservationLocally(giftId, true);
      setSelectedGift(null);
      notifyWishlistChanged();
    } catch (error) {
      setReservationError(getErrorMessage(error));
    } finally {
      setUpdatingGiftId(null);
    }
  }

  async function handleReleaseGift(giftId: number) {
    if (updatingGiftId !== null || !wishlistSlug) return;

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
        setReservationIds(removeReservationOwnership(wishlistSlug, giftId));
        applyWishlistResult(await fetchWishlistPage(wishlistSlug));
        setPageState((currentState) => ({
          ...currentState,
          error:
            "This reservation could not be released. The local ownership record was removed and the wishlist was refreshed.",
        }));
        return;
      }

      setReservationIds(removeReservationOwnership(wishlistSlug, giftId));
      updateGiftReservationLocally(giftId, false);
      notifyWishlistChanged();
    } catch (error) {
      setPageState((currentState) => ({
        ...currentState,
        error: getErrorMessage(error),
      }));
    } finally {
      setUpdatingGiftId(null);
    }
  }

  const { wishlist, gifts, isInitialLoading, isRefreshing, error } = pageState;
  const availableCount = gifts.filter((gift) => !gift.isReserved).length;
  const isCurrentWishlist = wishlist?.slug === wishlistSlug;

  let pageContent;

  if ((isInitialLoading && !wishlist) || (wishlist && !isCurrentWishlist)) {
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
          className="retro-button retro-button--yellow page-state__button"
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
      <RetroWindow labelledBy="wishlist-title">
        <WindowTitleBar icon={wishlist.icon} />
        <AppMenuBar isRefreshing={isRefreshing}>
          <Link className="menu-bar__link" to="/">
            <span aria-hidden="true">←</span>
            All wishlists
          </Link>
          <a className="menu-bar__link" href="#gift-section-title">
            Gifts
          </a>
          <button
            className="menu-bar__link menu-bar__button"
            type="button"
            onClick={() => setIsAboutOpen(true)}
          >
            Help
          </button>
        </AppMenuBar>

        <div className="wishlist-window__body">
          {error ? (
            <div className="inline-error" role="alert">
              <div>
                <strong>Refresh failed</strong>
                <span>{error}</span>
              </div>
              <button
                className="retro-button retro-button--secondary"
                type="button"
                onClick={() => void reloadWishlist()}
              >
                Retry
              </button>
            </div>
          ) : null}

          <section className="hero">
            <div className="hero__copy">
              <p className="hero__eyebrow">Birthday protocol activated</p>
              <h1 id="wishlist-title">
                {wishlist.ownerName}&apos;s<span>birthday wishlist!</span>
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
                    onReleaseGift={(giftId) => void handleReleaseGift(giftId)}
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

        <WindowFooter />
      </RetroWindow>
    );
  }

  return (
    <AppDesktop>
      {pageContent}

      {selectedGift ? (
        <ReservationDialog
          gift={selectedGift}
          isSubmitting={updatingGiftId === selectedGift.id}
          submitError={reservationError}
          onCancel={closeReservationDialog}
          onConfirm={(guestName) => void handleConfirmReservation(guestName)}
        />
      ) : null}

      {isAboutOpen ? (
        <AboutDialog onClose={() => setIsAboutOpen(false)} />
      ) : null}
    </AppDesktop>
  );
}

export default WishlistPage;
