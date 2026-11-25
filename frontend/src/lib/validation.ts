export const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,64}$/;

export const PASSWORD_MESSAGE =
  "Password must be 8-64 characters and include at least one letter and one digit";

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const EMAIL_MESSAGE = "Enter a valid email address";

export const MONGO_ID_REGEX = /^[a-f\d]{24}$/i;

export const PHONE_REGEX = /^(?=(?:\D*\d){7,15}\D*$)\+?[\d\s\-()]+$/;

export const PHONE_MESSAGE =
  "Phone must have 7-15 digits, may start with +, and may use spaces, dashes and parentheses";

export function isRequired(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export function validateEmail(value: string): string | null {
  if (!isRequired(value)) return "Email is required";
  if (!EMAIL_REGEX.test(value.trim())) return EMAIL_MESSAGE;
  return null;
}

export function validatePassword(value: string): string | null {
  if (!isRequired(value)) return "Password is required";
  if (!PASSWORD_REGEX.test(value)) return PASSWORD_MESSAGE;
  return null;
}

export function validateName(value: string): string | null {
  if (!isRequired(value)) return "Name is required";
  if (value.trim().length > 100) return "Name must be 100 characters or fewer";
  return null;
}

export function validatePhone(value: string): string | null {
  if (!isRequired(value)) return null;
  if (value.trim().length > 25) return "Phone must be 25 characters or fewer";
  if (!PHONE_REGEX.test(value.trim())) return PHONE_MESSAGE;
  return null;
}

export function isValidMongoId(value: string): boolean {
  return MONGO_ID_REGEX.test(value.trim());
}

export function validateCurrency(value: string): string | null {
  if (!isRequired(value)) return "Preferred currency is required";
  if (!/^[A-Z]{3}$/.test(value.trim().toUpperCase())) {
    return "Use a 3-letter currency code, for example USD";
  }
  return null;
}
