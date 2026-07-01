const tokenize = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, ' ').trim().split(/\s+/).filter(Boolean);

export const fuzzyProductSearch = (products, query) => {
  const term = String(query || '').toLowerCase();
  const tokens = tokenize(term);
  return (products || []).filter((product) => {
    const haystack = [product.name, product.brandName, product.category, product.unitType]
      .filter(Boolean)
      .map((value) => String(value || '').toLowerCase())
      .join(' ');

    if (!term) return true;
    if (haystack.includes(term)) return true;
    return tokens.every((token) => haystack.includes(token));
  });
};
