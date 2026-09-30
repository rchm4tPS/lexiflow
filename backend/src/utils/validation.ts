/**
 * Shared field-level validation for the Authentication module.
 *
 * These rules are the source of truth: the frontend mirrors them in
 * `src/features/auth/validation.ts` so it can flag a field before submitting,
 * but a request is only ever trusted after passing the checks here.
 *
 * Every validator trims its input first, so "  ada  " is evaluated as "ada".
 * Returns `null` when valid, otherwise a user-facing message.
 */

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;
export const FULLNAME_MIN = 2;
export const FULLNAME_MAX = 100;
export const PASSWORD_MIN = 6;

export type RegistrationFields = {
  email?: unknown;
  username?: unknown;
  fullName?: unknown;
  password?: unknown;
  confirmPassword?: unknown;
};

/** Field name -> message. Empty when the payload is valid. */
export type FieldErrors = Record<string, string>;

// ASCII letters, digits and underscore only. This deliberately excludes
// whitespace, non-Latin scripts, symbols — and accented Latin / umlaut
// characters, which are legitimate in a full name but not in a handle.
const USERNAME_ALLOWED = /^[A-Za-z0-9_]+$/;
const USERNAME_HAS_LETTER = /[A-Za-z]/;

/**
 * Deliberately narrower than RFC 5322.
 *
 * The spec permits `=`, `}`, `"`, `|`, `\` and friends in the local part, but
 * those addresses are quoted-string or legacy forms that no mail provider
 * issues. Accepting them only produces addresses that can never receive mail,
 * so this allows the punctuation people actually use — `. _ % + -` — and
 * nothing else.
 *
 * Structure: dot-separated local atoms, an `@`, then dot-separated domain
 * labels that start and end alphanumeric, ending in an alphabetic TLD.
 * Anchored, so leading/trailing/consecutive dots are all rejected.
 */
const EMAIL_SHAPE =
  /^[A-Za-z0-9]+(?:[._%+-][A-Za-z0-9]+)*@([A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/;

const EMAIL_MAX = 254;
// RFC 5321 caps the local part at 64 octets.
const EMAIL_LOCAL_MAX = 64;

// Control / format characters (e.g. NUL, zero-width joiner). Accented Latin
// letters and umlauts are letters, not control characters, so they pass.
const CONTROL_CHARS = /[\p{Cc}\p{Cf}]/u;

/**
 * A person's name: letters from any script, ordinary spaces, apostrophes and
 * hyphens.
 *
 * \p{L} covers accented Latin and umlauts ("José", "Müller") as well as
 * non-Latin scripts, since those are legitimate names. \p{M} allows combining
 * marks so a decomposed "é" (e + U+0301) is not rejected for looking like two
 * characters. Apostrophes appear as both ' (U+0027) and ’ (U+2019).
 *
 * Digits are absent on purpose — a name containing "2" or "007" is a typo, not
 * a name. So is every other punctuation mark and symbol; only the apostrophe
 * and hyphen survive, because "O'Brien" and "Anne-Marie" are real names.
 *
 * Literal spaces only, rather than \s, so a newline or tab cannot be smuggled
 * into a name.
 */
const FULLNAME_ALLOWED = /^[\p{L}\p{M}'’\- ]+$/u;

function asTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function validateUsername(raw: unknown): string | null {
  const value = asTrimmedString(raw);
  if (!value) return 'Username is required.';
  if (value.length < USERNAME_MIN) {
    return `Username must be at least ${USERNAME_MIN} characters.`;
  }
  if (value.length > USERNAME_MAX) {
    return `Username must be ${USERNAME_MAX} characters or fewer.`;
  }
  if (!USERNAME_ALLOWED.test(value)) {
    return 'Username can only contain letters, numbers and underscores — no spaces, accents or symbols.';
  }
  if (!USERNAME_HAS_LETTER.test(value)) {
    return 'Username must contain at least one letter.';
  }
  return null;
}

export function validateFullName(raw: unknown): string | null {
  const value = asTrimmedString(raw);
  if (!value) return 'Full name is required.';
  if (value.length < FULLNAME_MIN) {
    return `Full name must be at least ${FULLNAME_MIN} characters.`;
  }
  if (value.length > FULLNAME_MAX) {
    return `Full name must be ${FULLNAME_MAX} characters or fewer.`;
  }
  if (CONTROL_CHARS.test(value)) {
    return 'Full name contains characters that are not allowed.';
  }
  if (!FULLNAME_ALLOWED.test(value)) {
    return 'Full name may only contain letters, spaces, apostrophes and hyphens — no digits or other symbols.';
  }
  return null;
}

export function validateEmail(raw: unknown): string | null {
  const value = asTrimmedString(raw);
  if (!value) return 'Email is required.';
  if (value.length > EMAIL_MAX) return `Email must be ${EMAIL_MAX} characters or fewer.`;
  const at = value.lastIndexOf('@');
  if (at > EMAIL_LOCAL_MAX) return `The part before "@" must be ${EMAIL_LOCAL_MAX} characters or fewer.`;
  if (!EMAIL_SHAPE.test(value)) return 'Enter a valid email.';
  return null;
}

export function validatePassword(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw) return 'Password is required.';
  // Passwords are NOT trimmed — leading/trailing spaces can be intentional.
  if (raw.length < PASSWORD_MIN) {
    return `Password must be at least ${PASSWORD_MIN} characters.`;
  }
  if (raw.length > 128) return 'Password must be 128 characters or fewer.';
  return null;
}

/**
 * Validate a registration payload and return trimmed values ready to persist.
 * `values` always carries the trimmed strings so outer whitespace is removed
 * before evaluation rather than after.
 */
export function validateRegistration(body: RegistrationFields): {
  errors: FieldErrors;
  values: { email: string; username: string; fullName: string; password: string };
} {
  const email = asTrimmedString(body.email);
  const username = asTrimmedString(body.username);
  const fullName = asTrimmedString(body.fullName);
  const password = typeof body.password === 'string' ? body.password : '';

  const errors: FieldErrors = {};
  const add = (field: string, message: string | null) => {
    if (message && !errors[field]) errors[field] = message;
  };

  add('email', validateEmail(email));
  add('username', validateUsername(username));
  add('fullName', validateFullName(fullName));
  add('password', validatePassword(password));

  return { errors, values: { email, username, fullName, password } };
}
