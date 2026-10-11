/**
 * Mask for the Celular field while typing: `(DD) 9XXXX-XXXX` (04-ui-design-system.md §8.1).
 * Accepts digits in any format, including a pasted `+55` / `55` prefix, which
 * is dropped (the API normalizes to `+55DD9XXXXXXXX`, BR-14).
 */
export function maskPhone(input: string): string {
  let digits = input.replace(/\D/g, "");
  const hasPlus = input.trim().startsWith("+");
  if (digits.startsWith("55") && (hasPlus || digits.length > 11)) digits = digits.slice(2);
  digits = digits.slice(0, 11);

  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}
