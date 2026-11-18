# Razorpay fulfillment payments

The customer sale remains outside Brandify. Razorpay is used only when a creator pays Brandify's approved fulfillment cost.

## Database setup

1. In the Supabase SQL Editor, run `schema.sql` if this project has not already been initialized.
2. Run `razorpay-payment-migration.sql` once. This migration keeps the current `brandify_records` order storage, adds a paise based payment ledger, attempt history and webhook event table, restricts creator writes to official order records, and adds checked RPCs for approval, cancellation and verified payment transitions.
3. Confirm at least one admin remains in `public.admin_users`. Admin approval uses the existing `is_brandify_admin()` authorization check.

## Supabase Function secrets and deploy

Create Razorpay **Test Mode** API credentials in the Razorpay Dashboard. From the project root, link the existing Supabase project and set secrets without putting values in browser files or Git:

```powershell
supabase link --project-ref wnbqizlbfxuhlgmeeobc
supabase secrets set RAZORPAY_KEY_ID=rzp_test_REPLACE RAZORPAY_KEY_SECRET=REPLACE RAZORPAY_WEBHOOK_SECRET=REPLACE
supabase functions deploy create-razorpay-order
supabase functions deploy verify-razorpay-payment
supabase functions deploy razorpay-webhook
supabase functions deploy request-razorpay-refund
```

The Supabase project URL and publishable key already live in `frontend/js/supabase-config.js`; never put a service role key, Razorpay key secret, or webhook secret there. Supabase injects its URL, anon key, and service role key into Edge Functions.

## Razorpay webhook

In Razorpay Dashboard → Account & Settings → Webhooks, add the deployed function URL:

`https://wnbqizlbfxuhlgmeeobc.supabase.co/functions/v1/razorpay-webhook`

Use the same value stored as `RAZORPAY_WEBHOOK_SECRET`, and subscribe to `payment.captured`, `payment.failed`, `order.paid`, `refund.processed`, and `refund.failed`. Do not reuse the Razorpay API key secret as the webhook secret. Razorpay retries are deduplicated by its event ID; state changes are idempotent.

In the Razorpay Dashboard, enable automatic payment capture for the Orders API. The fulfillment workflow starts only for a captured payment; an authorized but uncaptured payment remains unpaid.

## Test Mode checklist

1. Sign in as an admin, review a request, enter the fulfillment amount, and approve it. The official order must show `Awaiting Payment`; payment status is `Pending`.
2. As that creator, open Order Details and choose Pay Now. Use the Test Mode success and failure instruments described in [Razorpay's official integration steps](https://razorpay.com/docs/server-integration/python/test-app/).
3. Confirm captured payment becomes `Paid` and the order becomes `Processing` only after the server verifier or signed webhook confirms capture. Confirm creator and admin notifications and the admin payment summary.
4. Try a failed payment and retry; verify the order remains `Awaiting Payment` and prior Razorpay payment attempts remain in the ledger.
5. Deliver the same callback and webhook event twice; payment and notifications must remain single and consistent.
6. Send an invalid checkout signature and invalid webhook signature; neither may change order/payment state.
7. As a second creator, try to start payment against the first creator's Brandify order ID; the function must reject it.
8. Change the browser amount before calling Checkout; the server must continue using the approved paise amount from `fulfillment_payments`.
9. Close the browser after paying. Reopen Order Details and confirm webhook reconciliation moves the order to `Processing`.
10. Delay webhook delivery after payment. Server verification should reconcile captured status; replay the signed event and confirm one transition.
11. Cancel a paid `Processing` order. Razorpay must accept the refund request before cancellation; payment stays `Refund Pending` until signed `refund.processed` and only then becomes `Refunded`. A signed `refund.failed` event returns it to `Paid` for admin follow-up.
12. Compare Creator and Admin Order Details, lists, totals, payment status, reference, and date after every state transition.

Keep Live Mode disabled until this test cycle passes. Test keys and test webhook credentials must be used for all initial verification.

## Netlify deployment

Publish the existing project root as the Netlify site root so its current `frontend/` paths remain intact. Commit the migration and Edge Function source, deploy the Supabase functions and secrets separately, then deploy the site. Do not add Razorpay secrets to Netlify environment variables or frontend JavaScript.
