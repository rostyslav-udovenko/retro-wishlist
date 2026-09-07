import type { RealtimeChannel } from "@supabase/supabase-js";

import { supabase } from "../lib/supabase";

const giftChangedEvent = "gift-changed";
const wishlistChannelPrefix = "wishlist:";

type WishlistChangeHandler = () => void;

function normalizeWishlistSlug(slug: string): string {
  return slug.trim().toLowerCase();
}

function getWishlistChannelName(slug: string): string {
  return `${wishlistChannelPrefix}${normalizeWishlistSlug(slug)}`;
}

export function createWishlistChannel(
  wishlistSlug: string,
  onWishlistChange: WishlistChangeHandler,
): RealtimeChannel {
  return supabase
    .channel(getWishlistChannelName(wishlistSlug), {
      config: {
        broadcast: {
          self: false,
          ack: true,
        },
      },
    })
    .on(
      "broadcast",
      {
        event: giftChangedEvent,
      },
      () => {
        onWishlistChange();
      },
    );
}

export async function broadcastWishlistChange(
  channel: RealtimeChannel,
): Promise<void> {
  const response = await channel.send({
    type: "broadcast",
    event: giftChangedEvent,
    payload: {},
  });

  if (response !== "ok") {
    throw new Error(
      `Realtime broadcast returned an unexpected status: ${response}`,
    );
  }
}

export async function removeWishlistChannel(
  channel: RealtimeChannel,
): Promise<void> {
  await supabase.removeChannel(channel);
}
