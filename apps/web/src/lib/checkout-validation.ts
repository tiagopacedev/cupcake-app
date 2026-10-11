import { normalizePhone } from "shared";

/**
 * Client-side field validation for the checkout (US-12, BR-14). Same rules as
 * the shared `createOrderSchema`; the messages are the pt-BR copy of
 * 04-ui-design-system.md §9.3. The server validates again (US-12 AC4).
 */
export const NAME_ERROR = "Informe seu nome.";
export const PHONE_ERROR = "Celular inválido. Ex.: (11) 91234-5678";

export function validateName(name: string): string | null {
  const length = name.trim().length;
  return length >= 2 && length <= 80 ? null : NAME_ERROR;
}

export function validatePhone(phone: string): string | null {
  return normalizePhone(phone) === null ? PHONE_ERROR : null;
}

/** Maps a server `details.fields[].path` (07 §3.4) to the form field it belongs to. */
export function fieldForPath(path: string): "name" | "phone" | null {
  if (path === "customer.name") return "name";
  if (path === "customer.phone") return "phone";
  return null;
}
