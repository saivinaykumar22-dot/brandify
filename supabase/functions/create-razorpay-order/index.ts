import { authenticatedUser, corsHeaders, json, razorpayRequest, serviceClient } from "../_shared/razorpay.ts";
Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
    const user = await authenticatedUser(req); const { orderId } = await req.json();
    if (typeof orderId !== "string" || !orderId) return json({ error: "Order ID required" }, 400);
    const db = serviceClient();
    const { data: pay, error: payError } = await db.from("fulfillment_payments").select("*").eq("brandify_order_id", orderId).eq("creator_id", user.id).single();
    if (payError || !pay || !["Pending", "Failed"].includes(pay.payment_status)) return json({ error: "This order is not eligible for payment" }, 403);
    const { data: row, error } = await db.from("brandify_records").select("data").eq("record_type", "order").eq("record_id", orderId).eq("owner_id", user.id).single();
    if (error || !row || row.data?.status !== "Awaiting Payment" || !["Pending", "Failed"].includes(row.data?.paymentStatus) || Math.round(Number(row.data?.amount ?? row.data?.total) * 100) !== Number(pay.amount)) return json({ error: "Order is not awaiting payment" }, 409);
    const { data: claim, error: claimError } = await db.rpc("claim_razorpay_order_creation", { p_order_id: orderId });
    if (claimError || !claim) return json({ error: claimError?.message || "Payment is already starting" }, 409);
    if (claim.razorpay_order_id) {
      const { error: retryError } = await db.rpc("retry_razorpay_payment", { p_order_id: orderId });
      if (retryError) { await db.rpc("release_razorpay_order_creation", { p_order_id: orderId }); return json({ error: "Could not retry payment" }, 500); }
      return json({ keyId: Deno.env.get("RAZORPAY_KEY_ID"), razorpayOrderId: claim.razorpay_order_id, amount: claim.amount, currency: "INR", brandifyOrderId: orderId, creatorName: user.user_metadata?.full_name || "Brandify Creator", email: user.email || "" });
    }
    try {
      const receipt = `bf_${crypto.randomUUID().replaceAll("-", "").slice(0, 32)}`;
      const rpOrder = await razorpayRequest("orders", { amount: claim.amount, currency: "INR", receipt, notes: { brandify_order_id: orderId, creator_id: user.id } });
      const { error: attachError } = await db.rpc("attach_razorpay_order", { p_order_id: orderId, p_razorpay_order_id: rpOrder.id });
      if (attachError) { await db.rpc("release_razorpay_order_creation", { p_order_id: orderId }); return json({ error: "Could not start payment. Please retry." }, 500); }
      return json({ keyId: Deno.env.get("RAZORPAY_KEY_ID"), razorpayOrderId: rpOrder.id, amount: claim.amount, currency: "INR", brandifyOrderId: orderId, creatorName: user.user_metadata?.full_name || "Brandify Creator", email: user.email || "" });
    } catch (error) { await db.rpc("release_razorpay_order_creation", { p_order_id: orderId }); throw error; }
  } catch (error) { console.error("create-razorpay-order failed"); return json({ error: error instanceof Error ? error.message : "Could not start payment" }, 400); }
});
