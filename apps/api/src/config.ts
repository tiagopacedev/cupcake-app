import { z } from "zod";

/**
 * Environment configuration (02-architecture.md §9). Parsed once at startup;
 * an invalid or missing required variable exits the process with a clear
 * message instead of failing later at first use.
 *
 * DATABASE_URL and DIRECT_URL are listed here but stay optional until E2-05
 * wires the Prisma plugin — this task (E1-04) has no database yet.
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  WEB_ORIGIN: z.string().min(1, "WEB_ORIGIN is required (CORS allow-list, 02-architecture §8)"),
  DATABASE_URL: z.string().optional(),
  DIRECT_URL: z.string().optional(),
  // Default rate limit (02-architecture §8: 120/min). Overridable only for
  // tests that need to trigger 429 without waiting a minute (05-testing §3.2).
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
});

export type Config = z.infer<typeof envSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");
    console.error(`Invalid environment configuration:\n${issues}`);
    process.exit(1);
  }
  return parsed.data;
}
