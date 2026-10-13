/**
 * Generate a friendly order ID like KH-2026-0042
 */
export function generateOrderId() {
  const year = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `KH-${year}-${rand}`;
}
