export function simplifyResultDisplayLabel(label: string): string {
  return label
    .replace(/\s*\(.*?\)\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}
