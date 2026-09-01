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
  const normalizedSlug = slug.trim().toLowerCase();

  const { data, error } = await supabase.rpc("get_wishlist", {
    p_wishlist_slug: normalizedSlug,
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
  const normalizedSlug = slug.trim().toLowerCase();

  const { data, error } = await supabase.rpc("get_wishlist_gifts", {
    p_wishlist_slug: normalizedSlug,
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
