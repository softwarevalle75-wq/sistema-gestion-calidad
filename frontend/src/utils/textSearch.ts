const SKIP_KEY_PATTERN =
  /^(id|.*_id|password|contrasena.*|.*hash|token|foto_url|ruta_archivo)$/i;

export const SEARCH_ANY_PLACEHOLDER =
  "Buscar por cualquier dato (CC, nombre, teléfono, correo...)";

export function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

function collectSearchableValues(
  value: unknown,
  acc: string[],
  depth = 0
): void {
  if (value == null || depth > 6) return;

  if (typeof value === "string" || typeof value === "number") {
    const text = String(value).trim();
    if (text) acc.push(text);
    return;
  }

  if (typeof value === "boolean") return;

  if (Array.isArray(value)) {
    value.forEach((item) => collectSearchableValues(item, acc, depth + 1));
    return;
  }

  if (typeof value === "object") {
    Object.entries(value as Record<string, unknown>).forEach(([key, nested]) => {
      if (SKIP_KEY_PATTERN.test(key)) return;
      collectSearchableValues(nested, acc, depth + 1);
    });
  }
}

function tokenMatches(token: string, haystack: string, haystackDigits: string): boolean {
  if (haystack.includes(token)) return true;

  const tokenDigits = digitsOnly(token);
  return tokenDigits.length >= 3 && haystackDigits.includes(tokenDigits);
}

export function matchesTextSearch(query: string, ...sources: unknown[]): boolean {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;

  const values: string[] = [];
  sources.forEach((source) => collectSearchableValues(source, values));

  const haystack = normalizeSearchText(values.join(" "));
  const haystackDigits = digitsOnly(haystack);
  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);

  return tokens.every((token) => tokenMatches(token, haystack, haystackDigits));
}
