import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-razorpay-signature", "Access-Control-Allow-Methods": "POST, OPTIONS" };
export function json(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }
export function serviceClient() { return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } }); }
export async function authenticatedUser(req: Request) {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) throw new Error("Authentication required");
  const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new Error("Invalid session");
  return data.user;
}
export async function hmacHex(secret: string, payload: string | Uint8Array) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const bytes = typeof payload === "string" ? new TextEncoder().encode(payload) : payload;
  return [...new Uint8Array(await crypto.subtle.sign("HMAC", key, bytes))].map(x => x.toString(16).padStart(2, "0")).join("");
}
export function constantTimeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0; for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i); return diff === 0;
}
export async function razorpayRequest(path: string, body?: unknown) {
  const id = Deno.env.get("RAZORPAY_KEY_ID"), secret = Deno.env.get("RAZORPAY_KEY_SECRET");
  if (!id || !secret) throw new Error("Razorpay secrets are not configured");
  const response = await fetch(`https://api.razorpay.com/v1/${path}`, { method: body ? "POST" : "GET", headers: { Authorization: `Basic ${btoa(`${id}:${secret}`)}`, ...(body ? { "Content-Type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
  if (!response.ok) throw new Error(`Razorpay request failed (${response.status})`);
  return await response.json();
}
export async function sendPaymentNotification(db: ReturnType<typeof serviceClient>, creatorId: string, orderId: string, status: "Paid" | "Failed", amount: number, eventKey: string) {
  const [{ data: admins }, { data: profile }] = await Promise.all([
    db.from("admin_users").select("user_id"), db.from("profiles").select("creator_key").eq("user_id", creatorId).single(),
  ]);
  const now = new Date().toISOString();
  const recipients = [{ owner_id: creatorId, recipientType: "creator", recipientId: profile?.creator_key || "" }, ...(admins || []).map((a: { user_id: string }) => ({ owner_id: a.user_id, recipientType: "admin", recipientId: "admin" }))];
  const safeKey = eventKey.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40);
  const rows = recipients.map((r, i) => ({ owner_id: r.owner_id, record_type: "notification", record_id: `pay-${orderId}-${safeKey}-${r.recipientType}-${i}`, data: { id: `pay-${orderId}-${safeKey}-${r.recipientType}-${i}`, recipientId: r.recipientId, recipientType: r.recipientType, type: `PAYMENT_${status.toUpperCase()}`, title: status === "Paid" ? `Payment received for ${orderId}` : `Payment failed for ${orderId}`, message: status === "Paid" ? `Your fulfillment payment of ₹${(amount / 100).toLocaleString("en-IN")} was verified.` : `Payment for ${orderId} failed. You can retry from Order Details.`, relatedOrderId: orderId, read: false, createdAt: now }, updated_at: now }));
  const { error } = await db.from("brandify_records").upsert(rows, { onConflict: "owner_id,record_type,record_id" });
  if (error) console.error("Payment notification write failed");
}
