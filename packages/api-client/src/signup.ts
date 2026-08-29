import { wpFetch } from "./wp-fetch";

export interface SignUpFields {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  /** Doubles as the account's username (`user_login`) — confirmed live:
   * BuddyBoss's `field_3` (Nickname) becomes the login name directly,
   * there's no separate username field on this install's signup form. */
  username: string;
}

/** Keyed by our own field names, not WP's (`signup_email`, `field_3`, ...) — see signUp's doc comment. */
export type SignUpFieldErrors = Partial<Record<keyof SignUpFields, string>>;

export class SignUpValidationError extends Error {
  constructor(public readonly fieldErrors: SignUpFieldErrors) {
    super("Sign-up validation failed");
    this.name = "SignUpValidationError";
  }
}

const WP_FIELD_TO_OURS: Record<string, keyof SignUpFields> = {
  signup_email: "email",
  signup_password: "password",
  field_1: "firstName",
  field_2: "lastName",
  field_3: "username",
};

/**
 * `POST /buddyboss/v1/signup` — creates an account. Confirmed live:
 * - Required fields are `signup_email`, `signup_password`, `field_1`
 *   (First Name), `field_2` (Last Name), `field_3` (Nickname — see
 *   `SignUpFields.username`'s doc comment). Other xprofile fields on this
 *   install's signup form are optional, not sent here.
 * - **Success is a bare 302 redirect to the WP homepage, not a JSON
 *   body** — `redirect: "manual"` so `wpFetch`'s underlying `fetch()`
 *   never actually follows it (this project's browser/server must never
 *   render raw WP HTML). No account id comes back either way; the caller
 *   already has the username it just chose.
 * - Validation failures are a real 400 with
 *   `{message: {field_name: "error text"}}` — mapped back to this
 *   module's own field names via `WP_FIELD_TO_OURS`.
 * - The created account is immediately usable — no email activation
 *   step on this install (confirmed by logging in right after with the
 *   same credentials) — so the caller can chain straight into
 *   `login()` from `./auth`.
 */
export async function signUp(fields: SignUpFields): Promise<void> {
  const res = await wpFetch("/buddyboss/v1/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    redirect: "manual",
    cache: "no-store",
    body: JSON.stringify({
      signup_email: fields.email,
      signup_password: fields.password,
      field_1: fields.firstName,
      field_2: fields.lastName,
      field_3: fields.username,
    }),
  });

  if (res.status === 302 || res.ok) return;

  const body = await res.json().catch(() => null);
  if (res.status === 400 && body?.message && typeof body.message === "object") {
    const fieldErrors: SignUpFieldErrors = {};
    for (const [wpField, message] of Object.entries(body.message as Record<string, string>)) {
      const ourField = WP_FIELD_TO_OURS[wpField];
      if (ourField) fieldErrors[ourField] = message;
    }
    throw new SignUpValidationError(fieldErrors);
  }

  throw new Error(`Sign-up failed (${res.status})`);
}
