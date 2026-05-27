/** Retire des clés d’un enregistrement sans muter l’objet source ni utiliser `delete`. */
export function omitRecordKeys<T extends Record<string, unknown>>(
  obj: T,
  keys: readonly string[],
): T {
  const omit = new Set(keys);
  const entries = Object.entries(obj).filter(([k]) => !omit.has(k));
  return Object.fromEntries(entries) as T;
}
