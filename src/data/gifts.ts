import type { Gift } from "../types/gift";

export const gifts: Gift[] = [
  {
    id: 1,
    name: "Mechanical Keyboard",
    description:
      "A compact wireless keyboard with tactile switches and colorful keycaps.",
    price: "Around €100",
    icon: "⌨️",
    accent: "blue",
    isReserved: false,
  },
  {
    id: 2,
    name: "Coffee Grinder",
    description:
      "A reliable electric grinder for fresh coffee at home every morning.",
    price: "Around €80",
    icon: "☕",
    accent: "pink",
    isReserved: true,
  },
  {
    id: 3,
    name: "LEGO Architecture Set",
    description:
      "A detailed building set for a calm evening and a colorful bookshelf.",
    price: "Around €60",
    icon: "🧱",
    accent: "yellow",
    isReserved: false,
  },
];
