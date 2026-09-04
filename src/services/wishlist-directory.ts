import { supabase } from "../lib/supabase";
import type { WishlistDirectoryItem } from "../types/wishlist-directory";

type WishlistDirectoryRow = {
  slug: string;
  title: string;
  owner_name: string;
  description: string;
  icon: string;
  total_gifts: number;
  available_gifts: number;
};

function mapWishlistDirectoryItem(
  row: WishlistDirectoryRow,
): WishlistDirectoryItem {
  return {
    slug: row.slug,
    title: row.title,
    ownerName: row.owner_name,
    description: row.description,
    icon: row.icon,
    totalGifts: Number(row.total_gifts),
    availableGifts: Number(row.available_gifts),
  };
}

export async function fetchFeaturedWishlists(): Promise<
  WishlistDirectoryItem[]
> {
  const { data, error } = await supabase.rpc("get_featured_wishlists");

  if (error) {
    throw new Error(`Unable to load wishlist directory: ${error.message}`);
  }

  const rows = (data ?? []) as WishlistDirectoryRow[];

  return rows.map(mapWishlistDirectoryItem);
}
