export type GiftAccent = "blue" | "pink" | "yellow";

export type Gift = {
  id: number;
  name: string;
  description: string;
  price: string;
  icon: string;
  accent: GiftAccent;
  isReserved: boolean;
};
