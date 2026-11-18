import { randomInt } from 'crypto';

// Avoids look-alike characters (0/O, 1/I) so references are easy to read out loud.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Generates a reference like "FB-7K3M9Q" (FLT-23). Uniqueness is enforced by a unique index. */
export function generateBookingReference(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += ALPHABET[randomInt(ALPHABET.length)];
  }
  return `FB-${code}`;
}