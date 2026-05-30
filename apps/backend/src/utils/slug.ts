// Maximum number of times generateUniqueSlug will probe for a free slug
// before giving up.  Under normal traffic this limit is never reached;
// it exists solely to make infinite-loop impossible.
export const MAX_SLUG_RETRIES = 10;

export function createSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]+/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Returns a slug derived from `name` that does not yet exist according to
 * `slugExists`.  Appends a short random suffix on each collision and retries
 * up to MAX_SLUG_RETRIES times.  Throws if no free slug is found within the
 * allowed attempts (this should only occur under extreme contention).
 */
export async function generateUniqueSlug(
  name: string,
  slugExists: (slug: string) => Promise<boolean>,
): Promise<string> {
  const cleanSlug = createSlug(name);
  let candidate = cleanSlug;

  for (let attempt = 0; attempt < MAX_SLUG_RETRIES; attempt++) {
    if (!(await slugExists(candidate))) {
      return candidate;
    }
    const suffix = Math.random().toString(36).substring(2, 6);
    candidate = `${cleanSlug}-${suffix}`;
  }

  // Last-ditch: append a longer random suffix to maximise the chance of a
  // unique value while keeping a deterministic upper bound on retries.
  const fallback = `${cleanSlug}-${Math.random().toString(36).substring(2, 10)}`;
  if (!(await slugExists(fallback))) {
    return fallback;
  }

  throw new Error(`Unable to generate a unique slug for "${name}" after ${MAX_SLUG_RETRIES + 1} attempts`);
}
