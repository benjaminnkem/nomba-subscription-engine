import { BadRequestException } from '@nestjs/common';
import { SubscriptionStatus } from '../shared/enums';

const ALLOWED_TRANSITIONS: Record<SubscriptionStatus, SubscriptionStatus[]> = {
  [SubscriptionStatus.PENDING]: [
    SubscriptionStatus.ACTIVE,
    SubscriptionStatus.TRIALING,
    SubscriptionStatus.CANCELLED,
  ],
  [SubscriptionStatus.TRIALING]: [
    SubscriptionStatus.ACTIVE,
    SubscriptionStatus.CANCELLED,
    SubscriptionStatus.EXPIRED,
  ],
  [SubscriptionStatus.ACTIVE]: [
    SubscriptionStatus.PAST_DUE,
    SubscriptionStatus.CANCELLED,
    SubscriptionStatus.SUSPENDED,
  ],
  [SubscriptionStatus.PAST_DUE]: [
    SubscriptionStatus.ACTIVE,
    SubscriptionStatus.GRACE_PERIOD,
    SubscriptionStatus.SUSPENDED,
    SubscriptionStatus.CANCELLED,
  ],
  [SubscriptionStatus.GRACE_PERIOD]: [
    SubscriptionStatus.ACTIVE,
    SubscriptionStatus.SUSPENDED,
    SubscriptionStatus.CANCELLED,
  ],
  [SubscriptionStatus.SUSPENDED]: [
    SubscriptionStatus.ACTIVE,
    SubscriptionStatus.CANCELLED,
    SubscriptionStatus.EXPIRED,
  ],
  [SubscriptionStatus.CANCELLED]: [SubscriptionStatus.ACTIVE],
  [SubscriptionStatus.EXPIRED]: [],
};

export class SubscriptionStateMachine {
  static canTransition(
    from: SubscriptionStatus,
    to: SubscriptionStatus,
  ): boolean {
    return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
  }

  static assertTransition(
    from: SubscriptionStatus,
    to: SubscriptionStatus,
  ): void {
    if (!this.canTransition(from, to)) {
      throw new BadRequestException(
        `Invalid subscription transition from ${from} to ${to}`,
      );
    }
  }

  static getAllowedTransitions(
    status: SubscriptionStatus,
  ): SubscriptionStatus[] {
    return ALLOWED_TRANSITIONS[status] ?? [];
  }
}
