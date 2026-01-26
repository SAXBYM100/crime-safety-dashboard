const isNonEmptyStr = (value) => typeof value === "string" && value.trim().length > 0;

function validateAndNormalizeMedia(article) {
  const out = { ...article };

  if (out.heroImage && typeof out.heroImage === "object") {
    const hero = out.heroImage;
    const url = isNonEmptyStr(hero.url) ? hero.url.trim() : null;
    const alt = isNonEmptyStr(hero.alt) ? hero.alt.trim() : null;
    const credit = isNonEmptyStr(hero.credit) ? hero.credit.trim() : null;
    out.heroImage = url && alt && credit ? { url, alt, credit } : undefined;
  } else {
    out.heroImage = undefined;
  }

  if (Array.isArray(out.gallery)) {
    const gallery = out.gallery
      .filter((entry) => entry && typeof entry === "object")
      .map((entry) => ({
        url: isNonEmptyStr(entry.url) ? entry.url.trim() : null,
        alt: isNonEmptyStr(entry.alt) ? entry.alt.trim() : null,
      }))
      .filter((entry) => entry.url && entry.alt);
    out.gallery = gallery.length ? gallery : undefined;
  } else {
    out.gallery = undefined;
  }

  return out;
}

module.exports = { validateAndNormalizeMedia };
