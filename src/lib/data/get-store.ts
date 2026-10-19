import { isSupabaseConfigured } from "@/lib/config";
import { getDemoStore } from "./demo-store";
import type { DataStore } from "./store";

/**
 * Returns the active data store: the Supabase-backed store when credentials
 * are configured, otherwise the clearly-labeled demo store with fictional
 * data. Server-side only.
 */
export async function getStore(): Promise<DataStore> {
  if (isSupabaseConfigured()) {
    const { getSupabaseStore } = await import("./supabase-store");
    return getSupabaseStore();
  }
  return getDemoStore();
}

export type { DataStore };
