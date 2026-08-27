// Derived from POST headless-auth/v1/{login,refresh}. Our own plugin, not
// third-party WordPress data, so no loose-typing gotchas here — the shape
// is exactly what wp/plugin-headless/includes/class-rest-controller.php
// returns.
import { z } from "zod";

export const authUserSchema = z.object({
  id: z.number(),
  name: z.string(),
  mention_name: z.string(),
});

export const tokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.number(),
  user: authUserSchema,
});

export type AuthUser = z.infer<typeof authUserSchema>;
export type TokenResponse = z.infer<typeof tokenResponseSchema>;
