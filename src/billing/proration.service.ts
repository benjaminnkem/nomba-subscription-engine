import { Injectable } from '@nestjs/common';
import { PlanInterval } from '../shared/enums';

export interface ProrationInput {
  currentPlanAmount: number;
  newPlanAmount: number;
  periodStart: Date;
  periodEnd: Date;
  changeDate?: Date;
}

export interface ProrationResult {
  creditAmount: number;
  chargeAmount: number;
  netAmount: number;
  remainingDays: number;
  totalDays: number;
}

@Injectable()
export class ProrationService {
  calculateUpgrade(input: ProrationInput): ProrationResult {
    const changeDate = input.changeDate ?? new Date();
    const { remainingDays, totalDays } = this.getPeriodFraction(
      input.periodStart,
      input.periodEnd,
      changeDate,
    );

    const unusedCredit = (input.currentPlanAmount / totalDays) * remainingDays;
    const newPlanCharge = (input.newPlanAmount / totalDays) * remainingDays;
    const netAmount = Math.max(newPlanCharge - unusedCredit, 0);

    return {
      creditAmount: this.round(unusedCredit),
      chargeAmount: this.round(newPlanCharge),
      netAmount: this.round(netAmount),
      remainingDays,
      totalDays,
    };
  }

  calculateDowngrade(input: ProrationInput): ProrationResult {
    const changeDate = input.changeDate ?? new Date();
    const { remainingDays, totalDays } = this.getPeriodFraction(
      input.periodStart,
      input.periodEnd,
      changeDate,
    );

    const unusedCredit = (input.currentPlanAmount / totalDays) * remainingDays;
    const newPlanCharge = (input.newPlanAmount / totalDays) * remainingDays;
    const netAmount = Math.min(newPlanCharge - unusedCredit, 0);

    return {
      creditAmount: this.round(unusedCredit),
      chargeAmount: this.round(newPlanCharge),
      netAmount: this.round(netAmount),
      remainingDays,
      totalDays,
    };
  }

  getIntervalDays(interval: PlanInterval, customDays?: number): number {
    switch (interval) {
      case PlanInterval.MONTHLY:
        return 30;
      case PlanInterval.QUARTERLY:
        return 90;
      case PlanInterval.YEARLY:
        return 365;
      case PlanInterval.CUSTOM:
        return customDays ?? 30;
      default:
        return 30;
    }
  }

  private getPeriodFraction(
    periodStart: Date,
    periodEnd: Date,
    changeDate: Date,
  ): { remainingDays: number; totalDays: number } {
    const totalMs = periodEnd.getTime() - periodStart.getTime();
    const remainingMs = Math.max(periodEnd.getTime() - changeDate.getTime(), 0);
    const dayMs = 24 * 60 * 60 * 1000;
    return {
      totalDays: Math.max(Math.ceil(totalMs / dayMs), 1),
      remainingDays: Math.max(Math.ceil(remainingMs / dayMs), 0),
    };
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
