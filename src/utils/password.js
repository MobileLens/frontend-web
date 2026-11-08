// The backend's password rule (api/src/lib/auth.ts), the same as the mobile apps (iOS: PasswordPolicy.swift).
// Only these characters count as special: a backtick, tilde, space or letter like "ł" does not.
const SPECIAL_CHARACTERS = "!@#$%^&*()_+-=[]{};':\"\\|,.<>/?";

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

export const PASSWORD_RULES = [
  { label: `At least ${PASSWORD_MIN} characters`, test: (password) => password.length >= PASSWORD_MIN },
  { label: "A lowercase letter (a–z)", test: (password) => /[a-z]/.test(password) },
  { label: "An uppercase letter (A–Z)", test: (password) => /[A-Z]/.test(password) },
  { label: "A digit (0–9)", test: (password) => /[0-9]/.test(password) },
  { label: "A special character (! @ # $ …)", test: (password) => [...password].some((char) => SPECIAL_CHARACTERS.includes(char)) },
];

// The first unmet rule as a sentence, or "".
export function passwordProblem(password) {
  if (password.length > PASSWORD_MAX) return `Password can have at most ${PASSWORD_MAX} characters.`;
  const failed = PASSWORD_RULES.find((rule) => !rule.test(password));
  return failed ? `Password needs: ${failed.label.toLowerCase()}.` : "";
}
