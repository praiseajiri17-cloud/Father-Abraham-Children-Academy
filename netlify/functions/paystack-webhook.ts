import crypto from 'node:crypto';
import { jsonResponse } from './_shared/serverClients';

/**
 * Server-Side Paystack Webhook Verification Skeleton (Prepared for Phase 4+).
 *
 * Security Rules:
 * - Verifies Paystack x-paystack-signature using HMAC SHA-512 with PAYSTACK_SECRET_KEY.
 * - Records event idempotently in payment_webhook_events (provider, provider_event_id).
 * - Never trusts frontend checkout success callbacks alone.
 */
export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  const signature = req.headers.get('x-paystack-signature') || '';

  if (!secretKey) {
    return jsonResponse({ error: 'PAYSTACK_SECRET_KEY is not configured.' }, 503);
  }

  const rawBody = await req.text();
  const computedHash = crypto
    .createHmac('sha512', secretKey)
    .update(rawBody)
    .digest('hex');

  const expectedBuf = Buffer.from(computedHash, 'utf8');
  const providedBuf = Buffer.from(signature, 'utf8');

  if (
    expectedBuf.length !== providedBuf.length ||
    !crypto.timingSafeEqual(expectedBuf, providedBuf)
  ) {
    return jsonResponse({ error: 'Invalid webhook signature.' }, 401);
  }

  return jsonResponse(
    {
      received: true,
      message:
        'Signature verified. Full Paystack invoice/application reconciliation activates in Phase 4.',
    },
    200
  );
}
