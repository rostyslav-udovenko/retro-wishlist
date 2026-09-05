import { z } from "zod";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const httpsUrlPattern = /^https:\/\//;

export const giftAccentSchema = z.enum(["blue", "pink", "yellow"]);

export const wishlistVisibilitySchema = z.enum(["public", "unlisted"]);

const giftKeySchema = z
  .string()
  .min(2, "Gift key must contain at least 2 characters.")
  .max(100, "Gift key must contain no more than 100 characters.")
  .regex(
    slugPattern,
    "Gift key must contain lowercase letters, numbers, and single hyphens only.",
  );

const giftImageSchema = z
  .string()
  .min(1, "Gift image is required.")
  .max(2048, "Gift image must contain no more than 2048 characters.");

const storeUrlSchema = z
  .string()
  .max(2048, "Store URL must contain no more than 2048 characters.")
  .regex(httpsUrlPattern, "Store URL must use the HTTPS protocol.")
  .nullable();

export const wishlistGiftDefinitionSchema = z
  .object({
    key: giftKeySchema,
    name: z
      .string()
      .min(1, "Gift name is required.")
      .max(160, "Gift name must contain no more than 160 characters."),
    description: z
      .string()
      .max(2000, "Gift description must contain no more than 2000 characters.")
      .default(""),
    price: z
      .string()
      .max(120, "Gift price must contain no more than 120 characters.")
      .default(""),
    image: giftImageSchema.default("🎁"),
    storeUrl: storeUrlSchema.default(null),
    accent: giftAccentSchema.default("blue"),
    displayOrder: z
      .number()
      .int("Gift display order must be an integer.")
      .min(0, "Gift display order cannot be negative."),
    isVisible: z.boolean().default(true),
  })
  .strict();

export const wishlistDefinitionSchema = z
  .object({
    slug: z
      .string()
      .min(3, "Wishlist slug must contain at least 3 characters.")
      .max(80, "Wishlist slug must contain no more than 80 characters.")
      .regex(
        slugPattern,
        "Wishlist slug must contain lowercase letters, numbers, and single hyphens only.",
      ),
    title: z
      .string()
      .min(1, "Wishlist title is required.")
      .max(120, "Wishlist title must contain no more than 120 characters."),
    ownerName: z
      .string()
      .min(1, "Wishlist owner name is required.")
      .max(
        100,
        "Wishlist owner name must contain no more than 100 characters.",
      ),
    description: z
      .string()
      .max(
        1000,
        "Wishlist description must contain no more than 1000 characters.",
      )
      .default(""),
    icon: z
      .string()
      .min(1, "Wishlist icon is required.")
      .max(32, "Wishlist icon must contain no more than 32 characters.")
      .default("🎁"),
    visibility: wishlistVisibilitySchema.default("public"),
    isFeatured: z.boolean().default(false),
    isActive: z.boolean().default(true),
    displayOrder: z
      .number()
      .int("Wishlist display order must be an integer.")
      .min(0, "Wishlist display order cannot be negative.")
      .default(100),
    gifts: z
      .array(wishlistGiftDefinitionSchema)
      .max(500, "A wishlist cannot contain more than 500 gifts."),
  })
  .strict()
  .superRefine((definition, context) => {
    const giftKeyIndexes = new Map<string, number>();
    const displayOrderIndexes = new Map<number, number>();

    definition.gifts.forEach((gift, index) => {
      const existingKeyIndex = giftKeyIndexes.get(gift.key);

      if (existingKeyIndex !== undefined) {
        context.addIssue({
          code: "custom",
          path: ["gifts", index, "key"],
          message:
            `Duplicate gift key "${gift.key}". ` +
            `The key is already used by gifts[${existingKeyIndex}].`,
        });
      } else {
        giftKeyIndexes.set(gift.key, index);
      }

      const existingOrderIndex = displayOrderIndexes.get(gift.displayOrder);

      if (existingOrderIndex !== undefined) {
        context.addIssue({
          code: "custom",
          path: ["gifts", index, "displayOrder"],
          message:
            `Duplicate gift display order ${gift.displayOrder}. ` +
            `The order is already used by gifts[${existingOrderIndex}].`,
        });
      } else {
        displayOrderIndexes.set(gift.displayOrder, index);
      }
    });
  });

export type GiftAccent = z.infer<typeof giftAccentSchema>;
export type WishlistVisibility = z.infer<typeof wishlistVisibilitySchema>;
export type WishlistGiftDefinition = z.infer<
  typeof wishlistGiftDefinitionSchema
>;
export type WishlistDefinition = z.infer<typeof wishlistDefinitionSchema>;
