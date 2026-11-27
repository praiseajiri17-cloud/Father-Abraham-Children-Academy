import crypto from 'node:crypto';
import {
  createServiceRoleSupabaseClient,
  jsonResponse,
  resolveVerifiedCaller,
  verifyClerkBearerToken,
} from './_shared/serverClients';

interface InitializePaymentPayload {
  applicationId?: string;
  callbackUrl?: string;
}

/**
 * Server-Side Paystack Admission Application Fee Checkout Initializer.
 *
 * Security & Integrity Rules:
 * - Requires verified Clerk Bearer session token.
 * - Verifies caller owns the target admission application.
 * - Reads the authoritative fee amount from `school_settings` ('admission_settings')
 *   — NEVER accepts fee amounts from the client browser.
 * - Returns 503 cleanly when Paystack secret key or fee configuration is pending (Phase 5).
 * - Never marks an application as paid during checkout initialization.
 */
export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const verified = await verifyClerkBearerToken(req.headers.get('authorization'));
    if (!verified) {
      return jsonResponse({ error: 'Unauthorized: Valid Clerk session token required.' }, 401);
    }

    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY?.trim();
    if (!paystackSecretKey) {
      return jsonResponse(
        {
          status: 'pending_integration',
          error:
            'Online Paystack checkout is scheduled for Phase 5 and is not yet configured on the server.',
        },
        503
      );
    }

    const body = (await req.json()) as InitializePaymentPayload;
    const applicationId = body.applicationId?.trim();
    if (!applicationId) {
      return jsonResponse({ error: 'applicationId is required.' }, 400);
    }

    const supabase = createServiceRoleSupabaseClient();
    const caller = await resolveVerifiedCaller(supabase, verified.clerkUserId);
    if (!caller) {
      return jsonResponse({ error: 'Active portal profile required.' }, 403);
    }

    const { data: app, error: appErr } = await supabase
      .from('admission_applications')
      .select(
        'id, application_reference, applicant_profile_id, application_status, payment_status, parent_email, application_fee_kobo'
      )
      .eq('id', applicationId)
      .single();

    if (appErr || !app) {
      return jsonResponse({ error: 'Admission application not found.' }, 404);
    }

    if (app.applicant_profile_id !== caller.profileId && !caller.isGeneralAdmin) {
      return jsonResponse({ error: 'Forbidden: You do not own this admission application.' }, 403);
    }

    if (app.application_status === 'draft') {
      return jsonResponse(
        { error: 'Please complete and submit your application before initiating payment.' },
        400
      );
    }

    if (app.payment_status === 'paid') {
      return jsonResponse(
        { error: 'Application fee for this child has already been verified as paid.' },
        409
      );
    }

    // Read authoritative configured fee from school_settings
    const { data: settingRow } = await supabase
      .from('school_settings')
      .select('setting_value')
      .eq('setting_key', 'admission_settings')
      .maybeSingle();

    const rawFee = (settingRow?.setting_value as { application_fee_kobo?: unknown } | null)
      ?.application_fee_kobo;
    const feeKobo =
      typeof rawFee === 'number' && Number.isInteger(rawFee) && rawFee > 0
        ? rawFee
        : typeof app.application_fee_kobo === 'number' && app.application_fee_kobo > 0
          ? app.application_fee_kobo
          : null;

    if (!feeKobo) {
      return jsonResponse(
        {
          status: 'fee_not_configured',
          error:
            'The school administration has not yet configured the official application fee amount.',
        },
        400
      );
    }

    const email = (app.parent_email || caller.email || '').trim();
    if (!email) {
      return jsonResponse(
        { error: 'A valid parent email address is required on the application to pay.' },
        400
      );
    }

    const paymentReference = `FACA-PAY-${app.application_reference}-${crypto
      .randomBytes(4)
      .toString('hex')
      .toUpperCase()}`;

    // Validate callbackUrl if supplied (same-origin / https only)
    let safeCallbackUrl: string | undefined;
    if (body.callbackUrl) {
      try {
        const parsed = new URL(body.callbackUrl);
        if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
          safeCallbackUrl = parsed.toString();
        }
      } catch {
        safeCallbackUrl = undefined;
      }
    }

    const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: feeKobo,
        currency: 'NGN',
        reference: paymentReference,
        ...(safeCallbackUrl ? { callback_url: safeCallbackUrl } : {}),
        metadata: {
          payment_kind: 'admission_application_fee',
          application_id: app.id,
          application_reference: app.application_reference,
          payer_profile_id: caller.profileId,
        },
      }),
    });

    const paystackJson = (await paystackRes.json()) as {
      status?: boolean;
      message?: string;
      data?: { authorization_url?: string; access_code?: string; reference?: string };
    };

    if (!paystackRes.ok || !paystackJson.status || !paystackJson.data?.authorization_url) {
      return jsonResponse(
        { error: paystackJson.message || 'Unable to initialize Paystack transaction.' },
        502
      );
    }

    // Record initialized payment row & update application to pending payment
    await supabase.from('application_payments').insert({
      application_id: app.id,
      payer_profile_id: caller.profileId,
      payment_reference: paymentReference,
      provider: 'paystack',
      currency: 'NGN',
      amount_kobo: feeKobo,
      status: 'initialized',
      gateway_response: paystackJson as unknown as Record<string, unknown>,
    });

    await supabase
      .from('admission_applications')
      .update({
        payment_status: 'pending',
        application_fee_kobo: feeKobo,
        payment_reference: paymentReference,
      })
      .eq('id', app.id);

    return jsonResponse({
      status: 'initialized',
      reference: paymentReference,
      authorizationUrl: paystackJson.data.authorization_url,
      amountKobo: feeKobo,
    });
  } catch (err) {
    console.error('Paystack initialization error:', err);
    return jsonResponse({ error: 'Server error preparing payment checkout.' }, 500);
  }
}
