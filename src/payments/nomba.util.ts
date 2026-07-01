export function toKobo(amountNaira: number): number {
  return Math.round(amountNaira * 100);
}

export function buildMerchantTxRef(
  paymentId: string,
  attemptNumber: number,
): string {
  return `sub_${paymentId}_attempt_${attemptNumber}`;
}
