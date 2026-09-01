import { supabase } from "../lib/supabase";
import { isGiftAccent, type Gift, type GiftAccent } from "../types/gift";
import type { Wishlist, WishlistVisibility } from "../types/wishlist";

type WishlistRow = {
  slug: string;
  title: string;
  owner_name: string;
  description: string;
  icon: string;
  visibility: string;
};

type GiftRow = {
  id: number;
  gift_key: string;
  name: string;
  description: string;
  price: string;
  image: string;
  store_url: string | null;
  accent: string;
  display_order: number;
  is_reserved: boolean;
};

export type ReserveGiftInput = {
  wishlistSlug: string;
  giftId: number;
  guestName: string;
  visitorToken: string;
};

export type ReleaseGiftInput = {
  wishlistSlug: string;
  giftId: number;
  visitorToken: string;
};

function normalizeWishlistSlug(slug: string): string {
  return slug.trim().toLowerCase();
}

function normalizeGuestName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

function isWishlistVisibility(value: unknown): value is WishlistVisibility {
  return value === "public" || value === "unlisted";
}

function mapWishlist(row: WishlistRow): Wishlist {
  if (!isWishlistVisibility(row.visibility)) {
    throw new Error(`Unsupported wishlist visibility: ${row.visibility}`);
  }

  return {
    slug: row.slug,
    title: row.title,
    ownerName: row.owner_name,
    description: row.description,
    icon: row.icon,
    visibility: row.visibility,
  };
}

function resolveGiftAccent(value: unknown): GiftAccent {
  return isGiftAccent(value) ? value : "blue";
}

function mapGift(row: GiftRow): Gift {
  return {
    id: row.id,
    key: row.gift_key,
    name: row.name,
    description: row.description,
    price: row.price,
    image: row.image,
    storeUrl: row.store_url,
    accent: resolveGiftAccent(row.accent),
    displayOrder: row.display_order,
    isReserved: row.is_reserved,
  };
}

export async function fetchWishlist(slug: string): Promise<Wishlist | null> {
  const { data, error } = await supabase.rpc("get_wishlist", {
    p_wishlist_slug: normalizeWishlistSlug(slug),
  });

  if (error) {
    throw new Error(`Unable to load wishlist: ${error.message}`);
  }

  const rows = (data ?? []) as WishlistRow[];

  if (rows.length === 0) {
    return null;
  }

  return mapWishlist(rows[0]);
}

export async function fetchWishlistGifts(slug: string): Promise<Gift[]> {
  const { data, error } = await supabase.rpc("get_wishlist_gifts", {
    p_wishlist_slug: normalizeWishlistSlug(slug),
  });

  if (error) {
    throw new Error(`Unable to load wishlist gifts: ${error.message}`);
  }

  const rows = (data ?? []) as GiftRow[];

  return rows.map(mapGift);
}

export async function fetchWishlistPage(slug: string): Promise<{
  wishlist: Wishlist | null;
  gifts: Gift[];
}> {
  const [wishlist, gifts] = await Promise.all([
    fetchWishlist(slug),
    fetchWishlistGifts(slug),
  ]);

  if (!wishlist) {
    return {
      wishlist: null,
      gifts: [],
    };
  }

  return {
    wishlist,
    gifts,
  };
}

export async function reserveGift({
  wishlistSlug,
  giftId,
  guestName,
  visitorToken,
}: ReserveGiftInput): Promise<boolean> {
  const normalizedGuestName = normalizeGuestName(guestName);

  if (normalizedGuestName.length < 2 || normalizedGuestName.length > 50) {
    throw new Error("Your name must contain between 2 and 50 characters.");
  }

  const { data, error } = await supabase.rpc("reserve_gift", {
    p_wishlist_slug: normalizeWishlistSlug(wishlistSlug),
    p_gift_id: giftId,
    p_guest_name: normalizedGuestName,
    p_visitor_token: visitorToken,
  });

  if (error) {
    throw new Error(`Unable to reserve gift: ${error.message}`);
  }

  return data === true;
}

export async function releaseGift({
  wishlistSlug,
  giftId,
  visitorToken,
}: ReleaseGiftInput): Promise<boolean> {
  const { data, error } = await supabase.rpc("release_gift", {
    p_wishlist_slug: normalizeWishlistSlug(wishlistSlug),
    p_gift_id: giftId,
    p_visitor_token: visitorToken,
  });

  if (error) {
    throw new Error(`Unable to release gift: ${error.message}`);
  }

  return data === true;
}
