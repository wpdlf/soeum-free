/**
 * Format price from 만원 units to human-readable Korean format.
 * e.g., 92000 -> "9.2억", 5100 -> "5.1억", 120 -> "120만"
 */
export function formatPrice(price: number): string {
  if (price >= 10000) {
    const eok = price / 10000;
    const rounded = Math.round(eok * 10) / 10;
    if (rounded === Math.floor(rounded)) {
      return `${Math.floor(rounded)}억`;
    }
    return `${rounded}억`;
  }
  return `${price}만`;
}

/**
 * Format area in m² and pyeong.
 * e.g., 84.5 -> "84.5m² (25.6평)"
 */
export function formatArea(area: number): string {
  const pyeong = Math.round(area * 0.3025 * 10) / 10;
  return `${area}m² (${pyeong}평)`;
}
