import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { managementSupabase } from "./management-client.js";
import {
  wishlistDefinitionSchema,
  type WishlistDefinition,
} from "./definition.js";

function getInputPath(): string {
  const inputPath = process.argv[2];

  if (!inputPath) {
    throw new Error(
      "A wishlist definition file is required.\n" +
        "Usage: npm run wishlist:preflight -- <file>",
    );
  }

  return resolve(process.cwd(), inputPath);
}

async function readWishlistDefinition(
  filePath: string,
): Promise<WishlistDefinition> {
  let fileContents: string;

  try {
    fileContents = await readFile(filePath, "utf8");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    throw new Error(`Unable to read wishlist definition:\n${message}`);
  }

  let input: unknown;

  try {
    input = JSON.parse(fileContents) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    throw new Error(`Wishlist definition contains invalid JSON:\n${message}`);
  }

  const result = wishlistDefinitionSchema.safeParse(input);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue, index) => {
        const path = issue.path.length > 0 ? issue.path.join(".") : "<root>";

        return `${index + 1}. ${path}: ${issue.message}`;
      })
      .join("\n");

    throw new Error(`Wishlist definition is invalid:\n${issues}`);
  }

  return result.data;
}

async function checkExistingWishlist(slug: string): Promise<boolean> {
  const { data, error } = await managementSupabase
    .from("wishlists")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to check the wishlist slug: ${error.message}`);
  }

  return data !== null;
}

function printPreflightPlan(
  filePath: string,
  definition: WishlistDefinition,
): void {
  const visibleGifts = definition.gifts.filter((gift) => gift.isVisible);
  const hiddenGifts = definition.gifts.filter((gift) => !gift.isVisible);

  console.log("Wishlist import preflight passed.");
  console.log("");
  console.log("No database changes were made.");
  console.log("");
  console.log(`File: ${filePath}`);
  console.log(`Slug: ${definition.slug}`);
  console.log(`Title: ${definition.title}`);
  console.log(`Owner: ${definition.ownerName}`);
  console.log(`Visibility: ${definition.visibility}`);
  console.log(`Featured: ${definition.isFeatured}`);
  console.log(`Active: ${definition.isActive}`);
  console.log(`Display order: ${definition.displayOrder}`);
  console.log(`Total gifts: ${definition.gifts.length}`);
  console.log(`Visible gifts: ${visibleGifts.length}`);
  console.log(`Hidden gifts: ${hiddenGifts.length}`);
  console.log("");
  console.log("Planned operation:");
  console.log(
    `CREATE wishlist "${definition.slug}" with ` +
      `${definition.gifts.length} gift(s).`,
  );

  if (definition.gifts.length === 0) {
    console.log("");
    console.log("The wishlist will be created without gifts.");
    return;
  }

  console.log("");
  console.log("Gifts:");

  definition.gifts.forEach((gift, index) => {
    const visibility = gift.isVisible ? "VISIBLE" : "HIDDEN";

    console.log(
      `${index + 1}. [${visibility}] ` +
        `${gift.key} | ${gift.name} | order ${gift.displayOrder}`,
    );
  });
}

async function main(): Promise<void> {
  const filePath = getInputPath();
  const definition = await readWishlistDefinition(filePath);

  const wishlistExists = await checkExistingWishlist(definition.slug);

  if (wishlistExists) {
    throw new Error(
      `Wishlist slug "${definition.slug}" already exists.\n` +
        "Import was not planned. Use the future sync command " +
        "to update an existing wishlist.",
    );
  }

  printPreflightPlan(filePath, definition);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);

  console.error(message);
  process.exitCode = 1;
});
