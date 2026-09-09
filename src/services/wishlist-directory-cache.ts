import type { WishlistDirectoryItem } from "../types/wishlist-directory";

type DirectoryCacheEntry = {
  wishlists: WishlistDirectoryItem[];
  updatedAt: number;
};

const directoryCacheTtlMs = 60_000;
let directoryCache: DirectoryCacheEntry | null = null;
let pendingDirectoryRequest: Promise<WishlistDirectoryItem[]> | null = null;

function cloneWishlists(
  wishlists: WishlistDirectoryItem[],
): WishlistDirectoryItem[] {
  return wishlists.map((wishlist) => ({ ...wishlist }));
}

export function getCachedWishlistDirectory(): WishlistDirectoryItem[] | null {
  return directoryCache ? cloneWishlists(directoryCache.wishlists) : null;
}

export function isWishlistDirectoryCacheFresh(): boolean {
  return Boolean(
    directoryCache &&
    Date.now() - directoryCache.updatedAt < directoryCacheTtlMs,
  );
}

export function setCachedWishlistDirectory(
  wishlists: WishlistDirectoryItem[],
): void {
  directoryCache = {
    wishlists: cloneWishlists(wishlists),
    updatedAt: Date.now(),
  };
}

export function updateCachedDirectoryReservation(
  slug: string,
  isReserved: boolean,
): void {
  if (!directoryCache) {
    return;
  }

  const normalizedSlug = slug.trim().toLowerCase();
  const availableDelta = isReserved ? -1 : 1;

  directoryCache = {
    wishlists: directoryCache.wishlists.map((wishlist) => {
      if (wishlist.slug !== normalizedSlug) {
        return { ...wishlist };
      }

      return {
        ...wishlist,
        availableGifts: Math.min(
          wishlist.totalGifts,
          Math.max(0, wishlist.availableGifts + availableDelta),
        ),
      };
    }),
    updatedAt: Date.now(),
  };
}

export async function loadWishlistDirectoryDeduplicated(
  loader: () => Promise<WishlistDirectoryItem[]>,
): Promise<WishlistDirectoryItem[]> {
  if (pendingDirectoryRequest) {
    return cloneWishlists(await pendingDirectoryRequest);
  }

  const request = loader()
    .then((wishlists) => {
      setCachedWishlistDirectory(wishlists);
      return wishlists;
    })
    .finally(() => {
      if (pendingDirectoryRequest === request) {
        pendingDirectoryRequest = null;
      }
    });

  pendingDirectoryRequest = request;

  return cloneWishlists(await request);
}
