import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { z } from "zod";

import {
  wishlistDefinitionSchema,
  type WishlistDefinition,
} from "./definition.js";
import { managementSupabase } from "./management-client.js";

const syncItemSchema = z.object({
  key: z.string(),
  name: z.string(),
});

const syncPlanSchema = z.object({
  slug: z.string(),
  applied: z.boolean(),
  wishlistChanged: z.boolean(),
  additions: z.array(syncItemSchema),
  updates: z.array(syncItemSchema),
  reorders: z.array(syncItemSchema),
  hides: z.array(syncItemSchema),
  restores: z.array(syncItemSchema),
  unchangedCount: z.number().int().nonnegative(),
});

type SyncPlan = z.infer<typeof syncPlanSchema>;

type SyncArguments = {
  filePath: string;
  confirmed: boolean;
};

function getArguments(): SyncArguments {
  const argumentsList = process.argv.slice(2);
  const inputPath = argumentsList.find((argument) => argument !== "--confirm");

  if (!inputPath) {
    throw new Error(
      "A wishlist definition file is required.\n" +
        "Usage: npm run wishlist:sync -- <file> [--confirm]",
    );
  }

  return {
    filePath: resolve(process.cwd(), inputPath),
    confirmed: argumentsList.includes("--confirm"),
  };
}

async function readDefinition(filePath: string): Promise<WishlistDefinition> {
  let contents: string;

  try {
    contents = await readFile(filePath, "utf8");
  } catch (error) {
    throw new Error(`Unable to read wishlist definition: ${filePath}`, {
      cause: error,
    });
  }

  let input: unknown;

  try {
    input = JSON.parse(contents) as unknown;
  } catch (error) {
    throw new Error("Wishlist definition contains invalid JSON.", {
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

async function runSync(
  definition: WishlistDefinition,
  apply: boolean,
): Promise<SyncPlan> {
  const { data, error } = await managementSupabase.rpc(
    "sync_wishlist_definition",
    {
      p_definition: definition,
      p_apply: apply,
    },
  );

  if (error) {
    if (error.message.includes("wishlist_not_found")) {
      throw new Error(
        `Wishlist "${definition.slug}" was not found. ` +
          "Use wishlist:import for a new wishlist.",
        { cause: error },
      );
    }

    if (error.message.includes("reserved_gift_hide_conflict")) {
      const conflictList = error.message.split(":").slice(1).join(":");

      throw new Error(
        "Sync cannot hide reserved gifts: " +
          `${conflictList.trim()}. Release those reservations or keep ` +
          "the gifts visible in the definition.",
        { cause: error },
      );
    }

    throw new Error(`Wishlist sync failed: ${error.message}`, {
      cause: error,
    });
  }

  const result = syncPlanSchema.safeParse(data);

  if (!result.success) {
    throw new Error("Wishlist sync returned an invalid response.");
  }

  return result.data;
}

function printItems(label: string, items: SyncPlan["additions"]): void {
  console.log(`${label}: ${items.length}`);

  items.forEach((item) => {
    console.log(`  - ${item.key} | ${item.name}`);
  });
}

function printPlan(filePath: string, plan: SyncPlan): void {
  console.log(
    plan.applied
      ? "Wishlist synchronization completed."
      : "Wishlist synchronization preview.",
  );
  console.log("");
  console.log(
    plan.applied
      ? "All planned database changes were applied atomically."
      : "No database changes were made.",
  );
  console.log("");
  console.log(`File: ${filePath}`);
  console.log(`Slug: ${plan.slug}`);
  console.log(
    `Wishlist metadata: ${plan.wishlistChanged ? "UPDATE" : "UNCHANGED"}`,
  );
  console.log("");
  printItems("ADD", plan.additions);
  printItems("UPDATE", plan.updates);
  printItems("REORDER", plan.reorders);
  printItems("HIDE", plan.hides);
  printItems("RESTORE", plan.restores);
  console.log(`UNCHANGED: ${plan.unchangedCount}`);
}

async function main(): Promise<void> {
  const { filePath, confirmed } = getArguments();
  const definition = await readDefinition(filePath);
  const plan = await runSync(definition, confirmed);

  printPlan(filePath, plan);

  if (!confirmed) {
    console.log("");
    console.log("Run the command again with --confirm to apply this plan:");
    console.log(`npm run wishlist:sync -- ${filePath} --confirm`);
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);

  console.error(message);
  process.exitCode = 1;
});
