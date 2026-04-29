const usernamePattern = /^[a-z0-9_]{3,24}$/;

export const normalizeUsername = (value: string) =>
  value.trim().replace(/^@+/, "").toLowerCase();

export const usernameValidationMessage =
  "Username must be 3-24 characters and use only lowercase letters, numbers, and underscores.";

export const isValidUsername = (value: string) =>
  usernamePattern.test(normalizeUsername(value));
