import {
  generateNombaSignature,
  verifyNombaSignature,
} from './nomba-signature.util';
import { NombaWebhookPayload } from './nomba-webhook.types';

describe('nomba-signature.util', () => {
  const payload: NombaWebhookPayload = {
    event_type: 'payment_success',
    requestId: '45f2dc2d-d559-4773-bba3-2d5ec17b2e20',
    data: {
      merchant: {
        walletId: '6756ff80aafe04a795f18b38',
        userId: 'b7b10e81-e57d-41d0-8fdc-f4e23a132bbf',
      },
      transaction: {
        transactionId:
          'API-VACT_TRA-B7B10-0435b274-807a-4bc7-8abe-9dbb4548fd7a',
        type: 'vact_transfer',
        time: '2025-09-29T10:51:44Z',
        responseCode: '',
      },
    },
  };

  const secret = 'HkatexKDZg7CLWy96q5sfrVHSvtoz92B';
  const timestamp = '2025-09-29T10:51:44Z';
  const signature = 'Kt9095hQxfgmVbx6iz7G2tPhHdbdXgLlyY/mf35sptw=';

  it('generates the documented Nomba signature', () => {
    expect(generateNombaSignature(payload, secret, timestamp)).toBe(signature);
  });

  it('verifies a valid Nomba signature', () => {
    expect(verifyNombaSignature(payload, secret, signature, timestamp)).toBe(
      true,
    );
  });

  it('rejects an invalid Nomba signature', () => {
    expect(
      verifyNombaSignature(payload, secret, 'invalid-signature', timestamp),
    ).toBe(false);
  });
});
