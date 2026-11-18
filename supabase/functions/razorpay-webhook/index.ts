import { constantTimeEqual, hmacHex, json, razorpayRequest, sendPaymentNotification, serviceClient } from "../_shared/razorpay.ts";
Deno.serve(async req => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const raw = new Uint8Array(await req.arrayBuffer()); const signature = req.headers.get("x-razorpay-signature") || "";
    const secret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET"); if (!secret || !constantTimeEqual(await hmacHex(secret, raw), signature)) return json({ error: "Invalid webhook signature" }, 400);
    const event = JSON.parse(new TextDecoder().decode(raw)); const eventId = req.headers.get("x-razorpay-event-id");
    if (!eventId) return json({ error: "Missing event ID" }, 400);
    const db = serviceClient(); const { data: claimed, error: claimError } = await db.rpc("claim_razorpay_webhook", { p_event_id: eventId, p_event_type: event.event });
    if (claimError) throw new Error("Could not record webhook event"); if (!claimed) return json({ received: true, duplicate: true });
    const entity = event.payload?.payment?.entity || event.payload?.order?.entity;
    const rpOrderId = entity?.order_id || entity?.id;
    if (event.event === "refund.processed" || event.event === "refund.failed") {
      const refund = event.payload?.refund?.entity;
      if (refund?.payment_id) {
        const { data: refundPayment } = await db.from("fulfillment_payments").select("amount,currency").eq("razorpay_payment_id", refund.payment_id).maybeSingle();
        if (refundPayment && refundPayment.currency === "INR" && Number(refund.amount) === Number(refundPayment.amount) && refund.status === (event.event === "refund.processed" ? "processed" : "failed")) {
          await db.rpc("confirm_razorpay_refund", { p_payment_id: refund.payment_id, p_refund_id: refund.id, p_refund_status: event.event === "refund.processed" ? "processed" : "failed" });
        }
      }
      await db.rpc("complete_razorpay_webhook", { p_event_id: eventId });
      return json({ received: true });
    }
    if (!["payment.captured", "payment.failed", "order.paid"].includes(event.event) || !rpOrderId) { await db.rpc("complete_razorpay_webhook", { p_event_id: eventId }); return json({ received: true }); }
    const { data: pay } = await db.from("fulfillment_payments").select("*").eq("razorpay_order_id", rpOrderId).maybeSingle();
    if (!pay) { await db.rpc("complete_razorpay_webhook", { p_event_id: eventId }); return json({ received: true }); }
    if (event.event === "payment.failed") {
      await db.rpc("record_razorpay_failure", { p_razorpay_order_id: rpOrderId, p_payment_id: entity?.id || null });
      await sendPaymentNotification(db, pay.creator_id, pay.brandify_order_id, "Failed", pay.amount, entity?.id || eventId);
    } else {
      const paymentId = event.event === "order.paid" ? entity?.id : entity?.id;
      // order.paid has no captured payment details, so obtain the captured payment before finalizing.
      const verifiedPaymentId = event.event === "order.paid" ? (await razorpayRequest(`orders/${encodeURIComponent(rpOrderId)}/payments`)).items?.find((p: any) => p.status === "captured" && p.order_id === rpOrderId && Number(p.amount) === Number(pay.amount) && p.currency === "INR")?.id : paymentId;
      if (!verifiedPaymentId) return json({ received: true, pending: true });
      const payment = await razorpayRequest(`payments/${encodeURIComponent(verifiedPaymentId)}`);
      if (payment.status === "captured" && payment.order_id === rpOrderId && Number(payment.amount) === Number(pay.amount) && payment.currency === "INR") {
        const { error } = await db.rpc("finalize_razorpay_payment", { p_order_id: pay.brandify_order_id, p_razorpay_order_id: rpOrderId, p_payment_id: verifiedPaymentId });
        if (error) throw new Error("Could not finalize payment");
        await sendPaymentNotification(db, pay.creator_id, pay.brandify_order_id, "Paid", pay.amount, verifiedPaymentId);
      }
    }
    await db.rpc("complete_razorpay_webhook", { p_event_id: eventId });
    return json({ received: true });
  } catch (error) { console.error("razorpay-webhook processing failed"); return json({ error: error instanceof Error ? error.message : "Webhook processing failed" }, 500); }
});
