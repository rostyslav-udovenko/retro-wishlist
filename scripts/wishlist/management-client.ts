import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

const environmentResult = config({
  path: ".env.wishlist-management",
  quiet: true,
  override: true,
});

if (environmentResult.error) {
  throw new Error(
    "Unable to load .env.wishlist-management.",
    {
      cause: environmentResult.error,
    },
  );
}

function getRequiredEnvironmentVariable(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(
      `${name} is not configured. ` +
        "Create .env.wishlist-management from the provided example.",
    );
  }

  return value;
}

const supabaseUrl = getRequiredEnvironmentVariable("SUPABASE_URL");
const supabaseSecretKey = getRequiredEnvironmentVariable("SUPABASE_SECRET_KEY");

if (!supabaseUrl.startsWith("https://")) {
  throw new Error("SUPABASE_URL must use the HTTPS protocol.");
}

export const managementSupabase = createClient(supabaseUrl, supabaseSecretKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});
