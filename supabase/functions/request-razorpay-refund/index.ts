import { authenticatedUser, corsHeaders, json, razorpayRequest, serviceClient } from "../_shared/razorpay.ts";
Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const user = await authenticatedUser(req); const { orderId, reason, notes } = await req.json(); const db = serviceClient();
    if (typeof reason !== "string" || !reason) return json({ error: "Cancellation reason required" }, 400);
    const { data: pay, error } = await db.from("fulfillment_payments").select("*").eq("brandify_order_id", orderId).eq("creator_id", user.id).single();
    if (error || !pay || pay.payment_status !== "Paid" || !pay.razorpay_payment_id || pay.razorpay_refund_id) return json({ error: "A verified paid order without an active or previous refund request is required" }, 409);
    const { data: row } = await db.from("brandify_records").select("data").eq("owner_id", user.id).eq("record_type", "order").eq("record_id", orderId).single();
    if (!row || row.data?.status !== "Processing") return json({ error: "This order is not eligible for cancellation and refund" }, 409);
    const { error: lockError } = await db.rpc("set_razorpay_refund_pending", { p_order_id: orderId, p_refund_id: "requested" });
    if (lockError) return json({ error: "Refund is already being processed" }, 409);
    let refund;
    try { refund = await razorpayRequest(`payments/${encodeURIComponent(pay.razorpay_payment_id)}/refund`, { amount: pay.amount, receipt: `rf_${String(orderId).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32)}`, notes: { brandify_order_id: orderId, requested_by: "creator" } }); }
    catch (error) { await db.rpc("confirm_razorpay_refund", { p_payment_id: pay.razorpay_payment_id, p_refund_id: "", p_refund_status: "failed" }); throw error; }
    if (refund.payment_id !== pay.razorpay_payment_id || Number(refund.amount) !== Number(pay.amount) || refund.currency !== "INR" || !["pending", "processed"].includes(refund.status)) throw new Error("Razorpay returned an unexpected refund record. The request needs admin reconciliation.");
    if (refund.status === "failed") {
      await db.rpc("confirm_razorpay_refund", { p_payment_id: pay.razorpay_payment_id, p_refund_id: refund.id, p_refund_status: "failed" });
      return json({ error: "Razorpay could not process the refund. The order was not cancelled." }, 409);
    }
    const { error: cancelError } = await db.rpc("finalize_paid_order_cancellation", { p_order_id: orderId, p_reason: reason, p_notes: typeof notes === "string" ? notes : "", p_refund_id: refund.id });
    if (cancelError) throw new Error("Refund was accepted. Cancellation is awaiting reconciliation.");
    return json({ status: "Refund Pending", refundId: refund.id, cancelled: true });
  } catch (error) { console.error("request-razorpay-refund failed"); return json({ error: error instanceof Error ? error.message : "Could not request refund" }, 400); }
});
