import { randomInt } from "node:crypto";
import { ORDER_CODE_ALPHABET } from "shared";

/** Source of random integers in [0, max); injectable so tests can force collisions (05-testing-strategy.md §3.2). */
export type RandomInt = (max: number) => number;

/**
 * Order code `CUP-XXXXXX` (BR-13): six characters from a 31-character alphabet
 * without 0/O/1/I/L, from a cryptographic source so codes are non-sequential
 * and not guessable. Uniqueness is guaranteed by the database constraint; the
 * order transaction retries on a collision (02-architecture.md §6.1).
 */
export function generateOrderCode(random: RandomInt = randomInt): string {
  let suffix = "";
  for (let i = 0; i < 6; i += 1) {
    suffix += ORDER_CODE_ALPHABET.charAt(random(ORDER_CODE_ALPHABET.length));
  }
  return `CUP-${suffix}`;
}
