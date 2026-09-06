import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { z } from "zod";

import {
  wishlistDefinitionSchema,
  type WishlistDefinition,
  type WishlistGiftDefinition,
} from "./definition.js";

function getInputPath(): string {
  const inputPath = process.argv[2];

  if (!inputPath) {
    throw new Error(
      "A wishlist definition file is required.\n" +
        "Usage: npm run wishlist:validate -- <file>",
    );
  }

  return resolve(process.cwd(), inputPath);
}

async function readJsonFile(filePath: string): Promise<unknown> {
  let contents: string;

  try {
    contents = await readFile(filePath, "utf8");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    throw new Error(`Unable to read wishlist definition:\n${message}`, {
      cause: error,
    });
  }

  try {
    return JSON.parse(contents) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    throw new Error(`Wishlist definition contains invalid JSON:\n${message}`, {
      cause: error,
    });
  }
}

function formatPath(path: PropertyKey[]): string {
  if (path.length === 0) {
    return "<root>";
  }

  return path
    .map((segment) =>
      typeof segment === "number" ? `[${segment}]` : String(segment),
    )
    .join(".")
    .replaceAll(".[", "[");
}

function printValidationErrors(error: z.ZodError): void {
  console.error(
    `Wishlist definition is invalid: ${error.issues.length} issue(s).\n`,
  );

  error.issues.forEach((issue, index) => {
    console.error(`${index + 1}. ${formatPath(issue.path)}: ${issue.message}`);
  });
}

function printValidationSummary(
  filePath: string,
  definition: WishlistDefinition,
): void {
  const visibleGiftCount = definition.gifts.filter(
    (gift: WishlistGiftDefinition) => gift.isVisible,
  ).length;

  const hiddenGiftCount = definition.gifts.length - visibleGiftCount;

  console.log("Wishlist definition is valid.");
  console.log("");
  console.log(`File: ${filePath}`);
  console.log(`Slug: ${definition.slug}`);
  console.log(`Title: ${definition.title}`);
  console.log(`Owner: ${definition.ownerName}`);
  console.log(`Visibility: ${definition.visibility}`);
  console.log(`Featured: ${definition.isFeatured}`);
  console.log(`Active: ${definition.isActive}`);
  console.log(`Total gifts: ${definition.gifts.length}`);
  console.log(`Visible gifts: ${visibleGiftCount}`);
  console.log(`Hidden gifts: ${hiddenGiftCount}`);
}

async function main(): Promise<void> {
  const filePath = getInputPath();
  const input = await readJsonFile(filePath);
  const result = wishlistDefinitionSchema.safeParse(input);

  if (!result.success) {
    printValidationErrors(result.error);
    process.exitCode = 1;
    return;
  }

  printValidationSummary(filePath, result.data);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);

  console.error(message);
  process.exitCode = 1;
});
