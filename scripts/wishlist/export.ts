import { mkdir, rename, unlink, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";

import { wishlistDefinitionSchema } from "./definition.js";
import { managementSupabase } from "./management-client.js";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type ExportArguments = {
  slug: string;
  outputPath: string;
};

function getArguments(): ExportArguments {
  const argumentsList = process.argv.slice(2);
  const outputFlagIndex = argumentsList.indexOf("--output");

  const slugArgument = argumentsList.find((argument, index) => {
    if (argument === "--output") {
      return false;
    }

    if (outputFlagIndex >= 0 && index === outputFlagIndex + 1) {
      return false;
    }

    return true;
  });

  const slug = slugArgument?.trim().toLowerCase() ?? "";

  if (!slug) {
    throw new Error(
      "A wishlist slug is required.\n" +
        "Usage: npm run wishlist:export -- <slug> [--output <file>]",
    );
  }

  if (!slugPattern.test(slug)) {
    throw new Error(
      "Wishlist slug must contain lowercase letters, numbers, " +
        "and single hyphens only.",
    );
  }

  const explicitOutputPath =
    outputFlagIndex >= 0 ? argumentsList[outputFlagIndex + 1] : undefined;

  if (outputFlagIndex >= 0 && !explicitOutputPath) {
    throw new Error("The --output option requires a file path.");
  }

  return {
    slug,
    outputPath: resolve(
      process.cwd(),
      explicitOutputPath ?? `wishlists/private/${slug}.json`,
    ),
  };
}

async function fetchWishlistDefinition(slug: string): Promise<unknown> {
  const { data, error } = await managementSupabase.rpc(
    "export_wishlist_definition",
    {
      p_slug: slug,
    },
  );

  if (error) {
    if (error.message.includes("wishlist_not_found")) {
      throw new Error(`Wishlist "${slug}" was not found.`, {
        cause: error,
      });
    }

    throw new Error(`Unable to export wishlist: ${error.message}`, {
      cause: error,
    });
  }

  return data;
}

async function writeJsonFile(
  outputPath: string,
  value: unknown,
): Promise<void> {
  const outputDirectory = dirname(outputPath);
  const temporaryPath = resolve(
    outputDirectory,
    `.${basename(outputPath)}.${process.pid}.${Date.now()}.tmp`,
  );

  await mkdir(outputDirectory, {
    recursive: true,
  });

  try {
    await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, {
      encoding: "utf8",
      mode: 0o600,
      flag: "wx",
    });

    await rename(temporaryPath, outputPath);
  } catch (error) {
    try {
      await unlink(temporaryPath);
    } catch {
      // The temporary file may not exist if writing failed early.
    }

    throw new Error(`Unable to write wishlist export to ${outputPath}.`, {
      cause: error,
    });
  }
}

function formatValidationPath(path: readonly PropertyKey[]): string {
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

async function main(): Promise<void> {
  const { slug, outputPath } = getArguments();
  const input = await fetchWishlistDefinition(slug);
  const result = wishlistDefinitionSchema.safeParse(input);

  if (!result.success) {
    const issues = result.error.issues
      .map(
        (issue, index) =>
          `${index + 1}. ${formatValidationPath(issue.path)}: ` + issue.message,
      )
      .join("\n");

    throw new Error(
      `Supabase returned an invalid wishlist definition:\n${issues}`,
    );
  }

  await writeJsonFile(outputPath, result.data);

  const visibleGiftCount = result.data.gifts.filter(
    (gift) => gift.isVisible,
  ).length;
  const hiddenGiftCount = result.data.gifts.length - visibleGiftCount;

  console.log("Wishlist export completed.");
  console.log("");
  console.log(`Slug: ${result.data.slug}`);
  console.log(`Output: ${outputPath}`);
  console.log(`Total gifts: ${result.data.gifts.length}`);
  console.log(`Visible gifts: ${visibleGiftCount}`);
  console.log(`Hidden gifts: ${hiddenGiftCount}`);
  console.log("");
  console.log("Reservation names, tokens, and timestamps were not exported.");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);

  console.error(message);
  process.exitCode = 1;
});
