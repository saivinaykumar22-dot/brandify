import { authenticatedUser, constantTimeEqual, corsHeaders, hmacHex, json, razorpayRequest, sendPaymentNotification, serviceClient } from "../_shared/razorpay.ts";
Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
    const user = await authenticatedUser(req); const body = await req.json();
    const { razorpay_order_id: rpOrderId, razorpay_payment_id: paymentId, razorpay_signature: signature, brandify_order_id: brandifyOrderId } = body;
    if (![rpOrderId, paymentId, signature, brandifyOrderId].every(x => typeof x === "string" && x)) return json({ error: "Invalid payment response" }, 400);
    const db = serviceClient();
    const { data: pay, error } = await db.from("fulfillment_payments").select("*").eq("brandify_order_id", brandifyOrderId).eq("creator_id", user.id).single();
    if (error || !pay || pay.razorpay_order_id !== rpOrderId) return json({ error: "Payment does not match this order" }, 403);
    const expected = await hmacHex(Deno.env.get("RAZORPAY_KEY_SECRET")!, `${rpOrderId}|${paymentId}`);
    if (!constantTimeEqual(expected, signature)) return json({ error: "Payment signature is invalid" }, 400);
    const payment = await razorpayRequest(`payments/${encodeURIComponent(paymentId)}`);
    if (payment.order_id !== rpOrderId || Number(payment.amount) !== Number(pay.amount) || payment.currency !== "INR" || payment.status !== "captured") return json({ status: "pending", message: "Payment is not captured yet. Brandify will update this order when Razorpay confirms it." }, 202);
    const { data: finalized, error: finalError } = await db.rpc("finalize_razorpay_payment", { p_order_id: brandifyOrderId, p_razorpay_order_id: rpOrderId, p_payment_id: paymentId });
    if (finalError || !finalized) throw new Error("Could not finalize verified payment");
    await sendPaymentNotification(db, user.id, brandifyOrderId, "Paid", pay.amount, paymentId);
    return json({ status: "Paid", brandifyOrderId, paymentId });
  } catch (error) { console.error("verify-razorpay-payment failed"); return json({ error: error instanceof Error ? error.message : "Payment verification failed" }, 400); }
});
