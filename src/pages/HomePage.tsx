import { useEffect, useState } from "react";

import AboutDialog from "../components/AboutDialog";
import WishlistDirectoryCard from "../components/WishlistDirectoryCard";
import { fetchFeaturedWishlists } from "../services/wishlist-directory";
import {
  getCachedWishlistDirectory,
  setCachedWishlistDirectory,
} from "../services/wishlist-directory-cache";
import type { WishlistDirectoryItem } from "../types/wishlist-directory";

type DirectoryState = {
  wishlists: WishlistDirectoryItem[];
  isLoading: boolean;
  error: string | null;
};

const initialDirectoryState: DirectoryState = {
  wishlists: [],
  isLoading: true,
  error: null,
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "An unexpected error occurred while loading the wishlist directory.";
}

function HomePage() {
  const [directoryState, setDirectoryState] = useState<DirectoryState>(() => {
    const cachedWishlists = getCachedWishlistDirectory();

    return cachedWishlists
      ? {
          wishlists: cachedWishlists,
          isLoading: true,
          error: null,
        }
      : initialDirectoryState;
  });
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    async function loadDirectory() {
      try {
        const wishlists = await fetchFeaturedWishlists();

        if (isCancelled) return;

        setCachedWishlistDirectory(wishlists);
        setDirectoryState({
          wishlists,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        if (isCancelled) return;

        setDirectoryState((currentState) => ({
          wishlists: currentState.wishlists,
          isLoading: false,
          error: getErrorMessage(error),
        }));
      }
    }

    void loadDirectory();

    return () => {
      isCancelled = true;
    };
  }, []);

  async function retryDirectoryLoad() {
    setDirectoryState((currentState) => ({
      ...currentState,
      isLoading: true,
      error: null,
    }));

    try {
      const wishlists = await fetchFeaturedWishlists();
      setCachedWishlistDirectory(wishlists);
      setDirectoryState({
        wishlists,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      setDirectoryState((currentState) => ({
        wishlists: currentState.wishlists,
        isLoading: false,
        error: getErrorMessage(error),
      }));
    }
  }

  const { wishlists, isLoading, error } = directoryState;

  if (isLoading && wishlists.length === 0) {
    return (
      <main className="desktop">
        <div className="desktop__decoration desktop__decoration--circle" />
        <div className="desktop__decoration desktop__decoration--triangle" />

        <section
          className="page-state page-state--loading"
          aria-live="polite"
          aria-busy="true"
        >
          <span className="page-state__icon" aria-hidden="true">
            ⏳
          </span>
          <p className="page-state__eyebrow">Scanning directory</p>
          <h1>Loading wishlists...</h1>
          <p>
            Please wait while the public wishlist directory is being prepared.
          </p>
        </section>
      </main>
    );
  }

  if (error && wishlists.length === 0) {
    return (
      <main className="desktop">
        <div className="desktop__decoration desktop__decoration--circle" />
        <div className="desktop__decoration desktop__decoration--triangle" />

        <section className="page-state page-state--error" role="alert">
          <span className="page-state__icon" aria-hidden="true">
            ⚠️
          </span>
          <p className="page-state__eyebrow">Directory error</p>
          <h1>Wishlists unavailable</h1>
          <p>{error}</p>
          <button
            className="retro-button retro-button--yellow page-state__button"
            type="button"
            onClick={() => void retryDirectoryLoad()}
          >
            Try again
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="desktop">
      <div className="desktop__decoration desktop__decoration--circle" />
      <div className="desktop__decoration desktop__decoration--triangle" />

      <section
        className="wishlist-window directory-window"
        aria-labelledby="directory-title"
      >
        <header className="title-bar">
          <div className="title-bar__identity">
            <span className="title-bar__icon" aria-hidden="true">
              🎁
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
          <a className="menu-bar__link" href="#wishlist-list-title">
            Wishlists
          </a>
          <button
            className="menu-bar__link menu-bar__button"
            type="button"
            onClick={() => setIsAboutOpen(true)}
          >
            Help
          </button>
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
              <button
                className="retro-button retro-button--secondary"
                type="button"
                onClick={() => void retryDirectoryLoad()}
              >
                Retry
              </button>
            </div>
          ) : null}

          <section className="directory-hero">
            <div className="directory-hero__copy">
              <p className="hero__eyebrow">Public directory online</p>
              <h1 id="directory-title">
                Birthday<span>wishlists!</span>
              </h1>
              <p>
                Pick a person. Open a wishlist. Choose a gift without creating
                duplicates or coordinating in a group chat.
              </p>
            </div>

            <div className="directory-hero__art" aria-hidden="true">
              <span className="directory-hero__primary-icon">🎂</span>
              <span className="directory-hero__spark directory-hero__spark--one">
                ★
              </span>
              <span className="directory-hero__spark directory-hero__spark--two">
                ✦
              </span>
              <span className="directory-hero__spark directory-hero__spark--three">
                ●
              </span>
            </div>
          </section>

          <section
            className="directory-section"
            aria-labelledby="wishlist-list-title"
          >
            <div className="section-heading">
              <div>
                <p>Directory: /public/wishlists</p>
                <h2 id="wishlist-list-title">Choose a wishlist</h2>
              </div>
              <span>
                {wishlists.length}{" "}
                {wishlists.length === 1 ? "wishlist" : "wishlists"} found
              </span>
            </div>

            {wishlists.length > 0 ? (
              <div className="directory-grid">
                {wishlists.map((wishlist, position) => (
                  <WishlistDirectoryCard
                    key={wishlist.slug}
                    wishlist={wishlist}
                    position={position}
                  />
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <span aria-hidden="true">📭</span>
                <div>
                  <h3>No public wishlists</h3>
                  <p>
                    There are no featured public wishlists available right now.
                  </p>
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

      {isAboutOpen ? (
        <AboutDialog onClose={() => setIsAboutOpen(false)} />
      ) : null}
    </main>
  );
}

export default HomePage;
