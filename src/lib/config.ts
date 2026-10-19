export const APP_NAME = "ConfirmRoute";

/** Fixed identifier of the single fictional organization used in demo mode. */
export const DEMO_ORGANIZATION_ID = "a1b2c3d4-0000-4000-8000-000000000001";

export const DEMO_ORGANIZATION_NAME = "K2 Horizon Travels";

/**
 * Maximum accepted PDF upload size in bytes. Configurable through the
 * MAX_UPLOAD_MB environment variable (default 5 MB).
 */
export function getUploadLimitBytes(): number {
  const parsed = Number.parseInt(process.env.MAX_UPLOAD_MB ?? "", 10);
  if (Number.isFinite(parsed) && parsed > 0) return parsed * 1024 * 1024;
  return 5 * 1024 * 1024;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
}

/** Persists demo-mode data locally (never on serverless hosting). */
export function getDemoDataDir(): string {
  return process.env.DEMO_DATA_DIR ?? ".demo-data";
}
