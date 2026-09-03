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

export function subscribeToWishlistChanges(
  wishlistSlug: string,
  onWishlistChange: WishlistChangeHandler,
): () => void {
  const channel = supabase
    .channel(getWishlistChannelName(wishlistSlug))
    .on(
      "broadcast",
      {
        event: giftChangedEvent,
      },
      () => {
        onWishlistChange();
      },
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

export async function broadcastWishlistChange(
  wishlistSlug: string,
): Promise<void> {
  const channel = supabase.channel(getWishlistChannelName(wishlistSlug));

  try {
    await waitForSubscription(channel);

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
  } finally {
    await supabase.removeChannel(channel);
  }
}

function waitForSubscription(channel: RealtimeChannel): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      void supabase.removeChannel(channel);

      reject(new Error("Realtime channel subscription timed out."));
    }, 10_000);

    channel.subscribe((status, error) => {
      if (status === "SUBSCRIBED") {
        window.clearTimeout(timeoutId);
        resolve();
        return;
      }

      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        window.clearTimeout(timeoutId);

        reject(
          error ??
            new Error(`Unable to subscribe to the Realtime channel: ${status}`),
        );
      }
    });
  });
}
