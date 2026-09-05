/**
 * OS率計算。DBには保存せず、常にこの関数経由で算出する(データ不整合防止のため)。
 * @see docs/DESIGN.md 「設計判断(要相談)」
 */
export function calcOsRate(osCount: number, proposedCompanyCount: number): number {
  if (!proposedCompanyCount || proposedCompanyCount <= 0) return 0;
  return osCount / proposedCompanyCount;
}

export function formatOsRate(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}
