export function createSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]+/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const MAX_SLUG_ATTEMPTS = 10;

export async function generateUniqueSlug(
  name: string,
  slugExists: (slug: string) => Promise<boolean>,
): Promise<string> {
  const baseSlug = createSlug(name);

  if (!(await slugExists(baseSlug))) { return baseSlug; }

  for (let i = 1; i <= MAX_SLUG_ATTEMPTS; i++) {
    const candidate = `${baseSlug}-${i}`;
    if (!(await slugExists(candidate))) { return candidate; }
  }

  throw new Error(`Unable to generate unique slug for "${name}" after ${MAX_SLUG_ATTEMPTS} attempts`);
}
