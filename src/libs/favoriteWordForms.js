// Only accept actual English word forms, not definitions or dictionary markup.
export function normalizeWordForms(forms) {
  return [
    ...new Set(
      (Array.isArray(forms) ? forms : [])
        .filter((form) => typeof form === "string")
        .map((form) => form.trim().toLowerCase())
        .filter((form) => /^[a-z]+(?:['’-][a-z]+)*$/.test(form))
    ),
  ];
}

export function favoriteWordIndex(favorites) {
  const records = new Map();
  const entries = Array.isArray(favorites)
    ? favorites.map((word) => [word, {}])
    : Object.entries(favorites || {});
  for (const [word, data] of entries) {
    if (typeof word !== "string" || !word.trim()) continue;
    const key = word.trim().toLowerCase();
    records.set(
      key,
      normalizeWordForms([
        ...(records.get(key) || []),
        ...(Array.isArray(data?.forms) ? data.forms : []),
      ])
    );
  }
  // Exact favorites always win over another favorite's inflection.
  const owners = new Map([...records.keys()].map((word) => [word, word]));
  for (const [word, forms] of [...records.entries()].sort(([a], [b]) =>
    a.localeCompare(b)
  )) {
    for (const form of forms) if (!owners.has(form)) owners.set(form, word);
  }
  return { records, owners };
}
