import { useCallback, useEffect, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  broadcastWishlistChange,
  createWishlistChannel,
  removeWishlistChannel,
} from "../services/wishlist-realtime";

type UseWishlistSyncOptions = {
  wishlistSlug: string;
  enabled: boolean;
  onRefresh: () => Promise<void>;
};

type UseWishlistSyncResult = {
  broadcastChange: () => Promise<void>;
};

export function useWishlistSync({
  wishlistSlug,
  enabled,
  onRefresh,
}: UseWishlistSyncOptions): UseWishlistSyncResult {
  const onRefreshRef = useRef(onRefresh);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isSubscribedRef = useRef(false);
  const isRefreshingRef = useRef(false);
  const refreshPendingRef = useRef(false);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  const refreshWishlist = useCallback(async () => {
    if (isRefreshingRef.current) {
      refreshPendingRef.current = true;
      return;
    }

    isRefreshingRef.current = true;

    try {
      do {
        refreshPendingRef.current = false;
        await onRefreshRef.current();
      } while (refreshPendingRef.current);
    } finally {
      isRefreshingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      channelRef.current = null;
      isSubscribedRef.current = false;
      return;
    }

    let isDisposed = false;
    let hasSubscribedOnce = false;
    const channel = createWishlistChannel(wishlistSlug, () => {
      void refreshWishlist();
    });

    channelRef.current = channel;

    channel.subscribe((status) => {
      if (isDisposed) {
        return;
      }

      if (status === "SUBSCRIBED") {
        const isReconnect = hasSubscribedOnce;
        hasSubscribedOnce = true;
        isSubscribedRef.current = true;

        if (isReconnect) {
          void refreshWishlist();
        }
        return;
      }

      if (
        status === "CHANNEL_ERROR" ||
        status === "TIMED_OUT" ||
        status === "CLOSED"
      ) {
        isSubscribedRef.current = false;
      }
    });

    function handleWindowFocus() {
      void refreshWishlist();
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void refreshWishlist();
      }
    }

    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isDisposed = true;
      isSubscribedRef.current = false;

      if (channelRef.current === channel) {
        channelRef.current = null;
      }

      void removeWishlistChannel(channel);
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled, refreshWishlist, wishlistSlug]);

  const broadcastChange = useCallback(async () => {
    const channel = channelRef.current;

    if (!channel || !isSubscribedRef.current) {
      throw new Error("Realtime channel is not currently subscribed.");
    }

    await broadcastWishlistChange(channel);
  }, []);

  return {
    broadcastChange,
  };
}
