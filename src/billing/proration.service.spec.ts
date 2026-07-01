import { PlanInterval } from '../shared/enums';
import { ProrationService } from './proration.service';

describe('ProrationService', () => {
  const service = new ProrationService();

  it('calculates upgrade proration', () => {
    const periodStart = new Date('2026-01-01');
    const periodEnd = new Date('2026-01-31');
    const changeDate = new Date('2026-01-16');

    const result = service.calculateUpgrade({
      currentPlanAmount: 3000,
      newPlanAmount: 6000,
      periodStart,
      periodEnd,
      changeDate,
    });

    expect(result.remainingDays).toBeGreaterThan(0);
    expect(result.netAmount).toBeGreaterThan(0);
  });

  it('calculates downgrade credit', () => {
    const periodStart = new Date('2026-01-01');
    const periodEnd = new Date('2026-01-31');

    const result = service.calculateDowngrade({
      currentPlanAmount: 6000,
      newPlanAmount: 3000,
      periodStart,
      periodEnd,
    });

    expect(result.netAmount).toBeLessThanOrEqual(0);
  });

  it('returns interval days', () => {
    expect(service.getIntervalDays(PlanInterval.MONTHLY)).toBe(30);
    expect(service.getIntervalDays(PlanInterval.YEARLY)).toBe(365);
    expect(service.getIntervalDays(PlanInterval.CUSTOM, 14)).toBe(14);
  });
});
