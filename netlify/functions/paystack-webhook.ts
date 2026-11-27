import crypto from 'node:crypto';
import { createServiceRoleSupabaseClient, jsonResponse } from './_shared/serverClients';

interface PaystackWebhookEvent {
  event?: string;
  data?: {
    id?: number | string;
    reference?: string;
    amount?: number;
    currency?: string;
    status?: string;
    paid_at?: string;
    metadata?: {
      payment_kind?: string;
      application_id?: string;
    };
  };
}

/**
 * Server-Side Paystack Webhook Verification & Idempotent Reconciliation.
 *
 * Security Rules:
 * - Verifies Paystack x-paystack-signature using HMAC SHA-512 with PAYSTACK_SECRET_KEY.
 * - Records event idempotently in payment_webhook_events (provider, provider_event_id).
 * - Never trusts frontend checkout success callbacks alone.
 * - Only marks an application paid when verified amount & currency match the backend record.
 */
export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const secretKey = process.env.PAYSTACK_SECRET_KEY?.trim();
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

  let parsed: PaystackWebhookEvent;
  try {
    parsed = JSON.parse(rawBody) as PaystackWebhookEvent;
  } catch {
    return jsonResponse({ error: 'Invalid JSON payload.' }, 400);
  }

  const eventType = parsed.event || 'unknown';
  const reference = parsed.data?.reference?.trim() || null;
  const providerEventId = parsed.data?.id
    ? `${eventType}:${String(parsed.data.id)}`
    : `${eventType}:${reference || crypto.createHash('sha256').update(rawBody).digest('hex')}`;

  try {
    const supabase = createServiceRoleSupabaseClient();

    // Idempotent deduplication insert
    const { data: existingEvent } = await supabase
      .from('payment_webhook_events')
      .select('id, processing_status')
      .eq('provider', 'paystack')
      .eq('provider_event_id', providerEventId)
      .maybeSingle();

    if (existingEvent?.processing_status === 'processed') {
      return jsonResponse({ received: true, deduplicated: true });
    }

    if (!existingEvent) {
      await supabase.from('payment_webhook_events').insert({
        provider: 'paystack',
        provider_event_id: providerEventId,
        event_type: eventType,
        payment_reference: reference,
        payload: parsed as unknown as Record<string, unknown>,
        signature_verified: true,
        processing_status: 'received',
      });
    }

    if (eventType === 'charge.success' && reference) {
      const { data: appPayment } = await supabase
        .from('application_payments')
        .select('id, application_id, amount_kobo, currency, status')
        .eq('payment_reference', reference)
        .maybeSingle();

      if (appPayment) {
        const paidAmount = parsed.data?.amount;
        const paidCurrency = (parsed.data?.currency || 'NGN').toUpperCase();

        if (
          paidCurrency !== appPayment.currency ||
          typeof paidAmount !== 'number' ||
          paidAmount < appPayment.amount_kobo
        ) {
          await supabase
            .from('payment_webhook_events')
            .update({
              processing_status: 'failed',
              error_message: 'Amount or currency mismatch against initialized payment.',
            })
            .eq('provider', 'paystack')
            .eq('provider_event_id', providerEventId);

          return jsonResponse({ error: 'Payment amount or currency mismatch.' }, 400);
        }

        const verifiedAt = parsed.data?.paid_at || new Date().toISOString();

        await supabase
          .from('application_payments')
          .update({
            status: 'verified',
            verified_at: verifiedAt,
            verified_via_webhook: true,
            gateway_response: parsed as unknown as Record<string, unknown>,
          })
          .eq('id', appPayment.id);

        await supabase
          .from('admission_applications')
          .update({
            payment_status: 'paid',
            paid_at: verifiedAt,
            payment_reference: reference,
          })
          .eq('id', appPayment.application_id);

        await supabase
          .from('payment_webhook_events')
          .update({
            processing_status: 'processed',
            processed_at: new Date().toISOString(),
          })
          .eq('provider', 'paystack')
          .eq('provider_event_id', providerEventId);

        return jsonResponse({ received: true, reconciled: 'application_payment' });
      }
    }

    await supabase
      .from('payment_webhook_events')
      .update({
        processing_status: 'ignored',
        processed_at: new Date().toISOString(),
      })
      .eq('provider', 'paystack')
      .eq('provider_event_id', providerEventId);

    return jsonResponse({ received: true, status: 'ignored' });
  } catch (err) {
    console.error('Paystack webhook reconciliation error:', err);
    return jsonResponse({ error: 'Webhook processing error.' }, 500);
  }
}
