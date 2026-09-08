import type { Gift } from "../types/gift";
import type { Wishlist } from "../types/wishlist";

export type WishlistPageResult = {
  wishlist: Wishlist | null;
  gifts: Gift[];
};

type CacheEntry = {
  result: WishlistPageResult;
  updatedAt: number;
};

const CACHE_TTL_MS = 60_000;
const cache = new Map<string, CacheEntry>();
const pendingRequests = new Map<string, Promise<WishlistPageResult>>();

export function normalizeWishlistSlug(slug: string): string {
  return slug.trim().toLowerCase();
}

function cloneResult(result: WishlistPageResult): WishlistPageResult {
  return {
    wishlist: result.wishlist ? { ...result.wishlist } : null,
    gifts: result.gifts.map((gift) => ({ ...gift })),
  };
}

export function getCachedWishlistPage(slug: string): WishlistPageResult | null {
  const entry = cache.get(normalizeWishlistSlug(slug));
  return entry ? cloneResult(entry.result) : null;
}

export function isWishlistCacheFresh(slug: string): boolean {
  const entry = cache.get(normalizeWishlistSlug(slug));
  return Boolean(entry && Date.now() - entry.updatedAt < CACHE_TTL_MS);
}

export function setCachedWishlistPage(
  slug: string,
  result: WishlistPageResult,
): void {
  cache.set(normalizeWishlistSlug(slug), {
    result: cloneResult(result),
    updatedAt: Date.now(),
  });
}

export function updateCachedGiftReservation(
  slug: string,
  giftId: number,
  isReserved: boolean,
): void {
  const key = normalizeWishlistSlug(slug);
  const entry = cache.get(key);

  if (!entry) return;

  setCachedWishlistPage(key, {
    wishlist: entry.result.wishlist,
    gifts: entry.result.gifts.map((gift) =>
      gift.id === giftId ? { ...gift, isReserved } : gift,
    ),
  });
}

export async function loadWishlistPageDeduplicated(
  slug: string,
  loader: () => Promise<WishlistPageResult>,
): Promise<WishlistPageResult> {
  const key = normalizeWishlistSlug(slug);
  const existingRequest = pendingRequests.get(key);

  if (existingRequest) {
    return cloneResult(await existingRequest);
  }

  const request = loader()
    .then((result) => {
      setCachedWishlistPage(key, result);
      return result;
    })
    .finally(() => {
      pendingRequests.delete(key);
    });

  pendingRequests.set(key, request);
  return cloneResult(await request);
}
