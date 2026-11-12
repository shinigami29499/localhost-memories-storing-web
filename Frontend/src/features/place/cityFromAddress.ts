export function cityFromAddress(address: string): string {
  const normalized = address.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLowerCase();
  if (/\b(ha\s*noi|hanoi)\b/.test(normalized)) return "Hà Nội";
  if (/\b(ho\s*chi\s*minh|hcmc?|sai\s*gon)\b/.test(normalized)) return "Hồ Chí Minh";
  const parts = address.split(",").map((part) => part.trim());
  const explicit = parts.find((part) => /^(th\u00e0nh ph\u1ed1|t\u1ec9nh|tp\.?|city of|province of)\s+/i.test(part));
  if (explicit) return explicit;
  const country = parts.at(-1)?.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\u0111/gi, "d").toLowerCase();
  if (parts.length >= 2 && country && /^(viet nam|vietnam|united states|usa|united kingdom|uk|japan|thailand|singapore|france|germany|australia|canada|south korea)$/.test(country)) return parts[parts.length - 2];
  return "";
}
