import type { Gift } from "../types/gift";

export const gifts: Gift[] = [
  {
    id: 1,
    key: "mechanical-keyboard",
    name: "Mechanical Keyboard",
    description:
      "A compact wireless keyboard with tactile switches and colorful keycaps.",
    price: "Around €100",
    image: "⌨️",
    storeUrl: null,
    accent: "blue",
    isReserved: false,
  },
  {
    id: 2,
    key: "coffee-grinder",
    name: "Coffee Grinder",
    description:
      "A reliable electric grinder for fresh coffee at home every morning.",
    price: "Around €80",
    image: "☕",
    storeUrl: null,
    accent: "pink",
    isReserved: true,
  },
  {
    id: 3,
    key: "lego-architecture-set",
    name: "LEGO Architecture Set",
    description:
      "A detailed building set for a calm evening and a colorful bookshelf.",
    price: "Around €60",
    image: "🧱",
    storeUrl: null,
    accent: "yellow",
    isReserved: false,
  },
];
