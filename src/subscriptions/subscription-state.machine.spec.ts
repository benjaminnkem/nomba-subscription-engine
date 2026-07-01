import { BadRequestException } from '@nestjs/common';
import { SubscriptionStatus } from '../shared/enums';
import { SubscriptionStateMachine } from './subscription-state.machine';

describe('SubscriptionStateMachine', () => {
  it('allows valid transitions from PENDING', () => {
    expect(
      SubscriptionStateMachine.canTransition(
        SubscriptionStatus.PENDING,
        SubscriptionStatus.ACTIVE,
      ),
    ).toBe(true);
    expect(
      SubscriptionStateMachine.canTransition(
        SubscriptionStatus.PENDING,
        SubscriptionStatus.TRIALING,
      ),
    ).toBe(true);
    expect(
      SubscriptionStateMachine.canTransition(
        SubscriptionStatus.PENDING,
        SubscriptionStatus.CANCELLED,
      ),
    ).toBe(true);
  });

  it('rejects PENDING to PAST_DUE', () => {
    expect(
      SubscriptionStateMachine.canTransition(
        SubscriptionStatus.PENDING,
        SubscriptionStatus.PAST_DUE,
      ),
    ).toBe(false);
  });

  it('allows valid transitions from TRIALING', () => {
    expect(
      SubscriptionStateMachine.canTransition(
        SubscriptionStatus.TRIALING,
        SubscriptionStatus.ACTIVE,
      ),
    ).toBe(true);
  });

  it('rejects invalid transitions', () => {
    expect(
      SubscriptionStateMachine.canTransition(
        SubscriptionStatus.CANCELLED,
        SubscriptionStatus.PAST_DUE,
      ),
    ).toBe(false);
  });

  it('throws on invalid transition', () => {
    expect(() =>
      SubscriptionStateMachine.assertTransition(
        SubscriptionStatus.EXPIRED,
        SubscriptionStatus.ACTIVE,
      ),
    ).toThrow(BadRequestException);
  });

  it('returns allowed transitions for ACTIVE', () => {
    const allowed = SubscriptionStateMachine.getAllowedTransitions(
      SubscriptionStatus.ACTIVE,
    );
    expect(allowed).toContain(SubscriptionStatus.PAST_DUE);
    expect(allowed).toContain(SubscriptionStatus.CANCELLED);
  });
});
