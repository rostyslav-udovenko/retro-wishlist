import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { managementSupabase } from "./management-client.js";
import {
  wishlistDefinitionSchema,
  type WishlistDefinition,
} from "./definition.js";

type ImportResult = {
  wishlistId: number;
  slug: string;
  giftCount: number;
};

function getArguments(): {
  filePath: string;
  confirmed: boolean;
} {
  const argumentsList = process.argv.slice(2);
  const inputPath = argumentsList.find((argument) => argument !== "--confirm");

  if (!inputPath) {
    throw new Error(
      "A wishlist definition file is required.\n" +
        "Usage: npm run wishlist:import -- <file> --confirm",
    );
  }

  return {
    filePath: resolve(process.cwd(), inputPath),
    confirmed: argumentsList.includes("--confirm"),
  };
}

async function readWishlistDefinition(
  filePath: string,
): Promise<WishlistDefinition> {
  let contents: string;

  try {
    contents = await readFile(filePath, "utf8");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    throw new Error(`Unable to read wishlist definition:\n${message}`, {
      cause: error,
    });
  }

  let input: unknown;

  try {
    input = JSON.parse(contents) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    throw new Error(`Wishlist definition contains invalid JSON:\n${message}`, {
      cause: error,
    });
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

function printConfirmationRequired(
  filePath: string,
  definition: WishlistDefinition,
): void {
  console.log("Wishlist import confirmation is required.");
  console.log("");
  console.log("No database changes were made.");
  console.log("");
  console.log(`File: ${filePath}`);
  console.log(`Slug: ${definition.slug}`);
  console.log(`Title: ${definition.title}`);
  console.log(`Owner: ${definition.ownerName}`);
  console.log(`Gifts: ${definition.gifts.length}`);
  console.log("");
  console.log("Run the command again with --confirm:");
  console.log(`npm run wishlist:import -- ${filePath} --confirm`);
}

async function importWishlist(
  definition: WishlistDefinition,
): Promise<ImportResult> {
  const { data, error } = await managementSupabase.rpc(
    "import_wishlist_definition",
    {
      p_definition: definition,
    },
  );

  if (error) {
    if (error.message.includes("wishlist_slug_exists")) {
      throw new Error(
        `Wishlist slug "${definition.slug}" already exists. ` +
          "No data was imported.",
      );
    }

    throw new Error(`Wishlist import failed: ${error.message}`);
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Wishlist import returned an invalid response.");
  }

  const result = data as Partial<ImportResult>;

  if (
    typeof result.wishlistId !== "number" ||
    typeof result.slug !== "string" ||
    typeof result.giftCount !== "number"
  ) {
    throw new Error("Wishlist import returned an incomplete response.");
  }

  return {
    wishlistId: result.wishlistId,
    slug: result.slug,
    giftCount: result.giftCount,
  };
}

async function main(): Promise<void> {
  const { filePath, confirmed } = getArguments();
  const definition = await readWishlistDefinition(filePath);

  if (!confirmed) {
    printConfirmationRequired(filePath, definition);
    return;
  }

  console.log(`Importing wishlist "${definition.slug}"...`);

  const result = await importWishlist(definition);

  console.log("");
  console.log("Wishlist import completed.");
  console.log("");
  console.log(`Wishlist ID: ${result.wishlistId}`);
  console.log(`Slug: ${result.slug}`);
  console.log(`Imported gifts: ${result.giftCount}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);

  console.error(message);
  process.exitCode = 1;
});
