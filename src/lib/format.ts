const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

export function toFaDigits(input: string | number): string {
  return String(input).replace(/\d/g, (d) => FA_DIGITS[Number(d)]!);
}

export function formatNumber(value: number): string {
  return toFaDigits(new Intl.NumberFormat("en-US").format(Math.round(value || 0)));
}

export function formatToman(value: number): string {
  return `${formatNumber(value)} تومان`;
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return "—";
  const units = ["بایت", "کیلوبایت", "مگابایت", "گیگابایت"];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i += 1;
  }
  return `${toFaDigits(size.toFixed(i === 0 ? 0 : 1))} ${units[i]}`;
}

export function effectivePrice(product: { price: number; sale_price?: number | null }): number {
  return product.sale_price && product.sale_price > 0 ? product.sale_price : product.price;
}

/** Public URL for an image stored in the protected media bucket. */
export function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `/api/public/media/${path.replace(/^\/+/, "")}`;
}

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "در انتظار پرداخت",
  paid: "پرداخت شده",
  failed: "ناموفق",
  canceled: "لغو شده",
  refunded: "بازگشت وجه",
};

export const GATEWAY_LABELS: Record<string, string> = {
  zarinpal: "زرین‌پال",
  idpay: "آیدی‌پی",
  nextpay: "نکست‌پی",
};
