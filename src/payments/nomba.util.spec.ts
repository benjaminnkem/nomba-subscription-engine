import { buildMerchantTxRef, toKobo } from './nomba.util';

describe('nomba.util', () => {
  describe('toKobo', () => {
    it('converts naira to kobo', () => {
      expect(toKobo(2500)).toBe(250000);
      expect(toKobo(25.5)).toBe(2550);
    });

    it('rounds fractional kobo', () => {
      expect(toKobo(10.005)).toBe(1001);
    });
  });

  describe('buildMerchantTxRef', () => {
    it('builds a unique ref per attempt', () => {
      expect(buildMerchantTxRef('pay_123', 1)).toBe('sub_pay_123_attempt_1');
      expect(buildMerchantTxRef('pay_123', 2)).toBe('sub_pay_123_attempt_2');
    });
  });
});
