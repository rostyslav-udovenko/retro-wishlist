const visitorTokenStorageKey = "retro-wishlist.visitor-token";
const reservationStoragePrefix = "retro-wishlist.reservations.";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getReservationStorageKey(wishlistSlug: string): string {
  return `${reservationStoragePrefix}${wishlistSlug.trim().toLowerCase()}`;
}

function isValidVisitorToken(value: unknown): value is string {
  return typeof value === "string" && uuidPattern.test(value);
}

function isValidGiftId(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) > 0;
}

function normalizeReservationIds(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.filter(isValidGiftId))].sort(
    (firstId, secondId) => firstId - secondId,
  );
}

function readLocalStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLocalStorage(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function removeLocalStorage(key: string): boolean {
  try {
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function getOrCreateVisitorToken(): string {
  const storedToken = readLocalStorage(visitorTokenStorageKey);

  if (isValidVisitorToken(storedToken)) {
    return storedToken;
  }

  const visitorToken = crypto.randomUUID();

  writeLocalStorage(visitorTokenStorageKey, visitorToken);

  return visitorToken;
}

export function getReservationIds(wishlistSlug: string): number[] {
  const storageKey = getReservationStorageKey(wishlistSlug);
  const storedValue = readLocalStorage(storageKey);

  if (!storedValue) {
    return [];
  }

  try {
    return normalizeReservationIds(JSON.parse(storedValue));
  } catch {
    removeLocalStorage(storageKey);
    return [];
  }
}

export function hasReservationOwnership(
  wishlistSlug: string,
  giftId: number,
): boolean {
  return getReservationIds(wishlistSlug).includes(giftId);
}

export function addReservationOwnership(
  wishlistSlug: string,
  giftId: number,
): number[] {
  if (!isValidGiftId(giftId)) {
    return getReservationIds(wishlistSlug);
  }

  const storageKey = getReservationStorageKey(wishlistSlug);
  const reservationIds = normalizeReservationIds([
    ...getReservationIds(wishlistSlug),
    giftId,
  ]);

  writeLocalStorage(storageKey, JSON.stringify(reservationIds));

  return reservationIds;
}

export function removeReservationOwnership(
  wishlistSlug: string,
  giftId: number,
): number[] {
  const storageKey = getReservationStorageKey(wishlistSlug);
  const reservationIds = getReservationIds(wishlistSlug).filter(
    (reservationId) => reservationId !== giftId,
  );

  if (reservationIds.length === 0) {
    removeLocalStorage(storageKey);
    return [];
  }

  writeLocalStorage(storageKey, JSON.stringify(reservationIds));

  return reservationIds;
}

export function reconcileReservationOwnership(
  wishlistSlug: string,
  reservedGiftIds: number[],
): number[] {
  const storageKey = getReservationStorageKey(wishlistSlug);
  const reservedGiftIdSet = new Set(normalizeReservationIds(reservedGiftIds));

  const reservationIds = getReservationIds(wishlistSlug).filter((giftId) =>
    reservedGiftIdSet.has(giftId),
  );

  if (reservationIds.length === 0) {
    removeLocalStorage(storageKey);
    return [];
  }

  writeLocalStorage(storageKey, JSON.stringify(reservationIds));

  return reservationIds;
}
