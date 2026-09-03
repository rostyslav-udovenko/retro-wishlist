import { useEffect, useRef } from "react";

import { subscribeToWishlistChanges } from "../services/wishlist-realtime";

type UseWishlistSyncOptions = {
  wishlistSlug: string;
  enabled: boolean;
  onRefresh: () => Promise<void>;
};

export function useWishlistSync({
  wishlistSlug,
  enabled,
  onRefresh,
}: UseWishlistSyncOptions): void {
  const onRefreshRef = useRef(onRefresh);
  const isRefreshingRef = useRef(false);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    async function refreshWishlist() {
      if (isRefreshingRef.current) {
        return;
      }

      isRefreshingRef.current = true;

      try {
        await onRefreshRef.current();
      } finally {
        isRefreshingRef.current = false;
      }
    }

    const unsubscribe = subscribeToWishlistChanges(wishlistSlug, () => {
      void refreshWishlist();
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
      unsubscribe();
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled, wishlistSlug]);
}
