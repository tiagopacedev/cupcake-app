import createClient from "openapi-fetch";
import type { paths } from "./schema";

/**
 * Typed API client generated from docs/openapi.yaml (07-api-spec.md §5, D-21).
 * On the server it calls the API service directly (`API_URL`: the Vercel
 * Services binding, or http://localhost:4000 locally); in the browser it uses
 * same-origin relative URLs, which the `/api/*` rewrite routes to the API.
 */
export const api = createClient<paths>({
  baseUrl: typeof window === "undefined" ? (process.env.API_URL ?? "http://localhost:4000") : "",
});
