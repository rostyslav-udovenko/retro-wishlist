export const giftAccents = ["blue", "pink", "yellow"] as const;

export type GiftAccent = (typeof giftAccents)[number];

export type Gift = {
  id: number;
  key: string;
  name: string;
  description: string;
  price: string;
  image: string;
  storeUrl: string | null;
  accent: GiftAccent;
  displayOrder: number;
  isReserved: boolean;
};

export function isGiftAccent(value: unknown): value is GiftAccent {
  return giftAccents.includes(value as GiftAccent);
}
