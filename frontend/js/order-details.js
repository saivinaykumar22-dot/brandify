(function () {
    "use strict";
    const root = document.getElementById("orderDetails");
    const W = window.BrandifyOrderWorkflow;
    const orderId = new URLSearchParams(location.search).get("id");
    let cancelBusy = false;
    function read(key, fallback) { return W.read(key, fallback); }
    function esc(value) { return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]; }); }
    function address(value) { value = value || {}; return [value.addressLine1, value.addressLine2, value.city, value.state, value.country, value.pincode].filter(Boolean).map(esc).join(", ") || "—"; }
    function date(value) { if (!value) return "—"; const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? esc(value) : esc(parsed.toLocaleString()); }
    function ownerMatches(order, account, creatorId) {
        const creator = order.creator && typeof order.creator === "object" ? order.creator : {};
        return Boolean((creatorId && (order.creatorId || creator.id) === creatorId) || (account.email && String(order.creatorEmail || creator.email || "").toLowerCase() === String(account.email).toLowerCase()));
    }
    function timelineMarkup(order, history) {
        const milestones = ["Approved", "Processing", "Shipped", "Out for Delivery", "Delivered"];
        const status = String(order.status || "Processing");
        const cancelled = status === "Cancelled";
        const latest = history[history.length - 1];
        const currentIndex = milestones.indexOf(status);
        const rows = milestones.map(function (step, index) {
            const event = history.find(function (entry) { return entry.status === step; });
            const done = Boolean(event) || (!cancelled && currentIndex >= index);
            const active = !cancelled && step === status && ["Processing", "Shipped", "Out for Delivery"].includes(status);
            const shouldShow = done || index === 0 || index <= Math.max(1, currentIndex) || (!cancelled && index <= currentIndex + 1);
            if (!shouldShow) return "";
            return `<li class="order-timeline-step ${done ? "complete" : ""} ${active ? "current" : ""}"><span>${active ? "●" : done ? "✓" : "○"}</span><div><strong>${step}</strong><small>${esc(event && (event.timestamp || event.changedAt) || "")}</small></div></li>`;
        }).join("");
        if (!cancelled) return rows;
        const cancelEvent = history.slice().reverse().find(function (entry) { return entry.status === "Cancelled"; }) || {};
        const actor = order.cancelledBy === "creator" ? "Creator" : order.cancelledBy || cancelEvent.changedBy || "—";
        return `${rows}<li class="order-timeline-step complete current cancelled"><span>×</span><div><strong>Cancelled</strong><small>${esc(date(order.cancelledAt || cancelEvent.timestamp || cancelEvent.changedAt))} · Cancelled by ${esc(actor)}</small>${order.cancellationReason ? `<small>Reason: ${esc(order.cancellationReason)}${order.cancellationNotes ? ` — ${esc(order.cancellationNotes)}` : ""}</small>` : ""}</div></li>`;
    }
    function render() {
        const account = read("brandifyAccount", {}) || {};
        const creatorId = localStorage.getItem("brandifyCreatorId") || "";
        const orders = read("brandifyOrders", []);
        const order = (Array.isArray(orders) ? orders : []).find(function (item) { return String(item.orderId || item.id) === orderId && ownerMatches(item, account, creatorId); });
        if (!order) { root.innerHTML = `<div class="page-heading"><div><h1>Order not found</h1><p>This official order is not available in your Brandify account.</p></div></div><a class="dashboard-button" href="dashboard.html#orders">Back to Orders →</a>`; return; }
        const history = Array.isArray(order.statusHistory) ? order.statusHistory : [];
        const status = String(order.status || "Processing");
        const items = Array.isArray(order.items) ? order.items : [];
        const itemMarkup = items.length ? items.map(function (item) {
            const variants = Object.entries(item.selectedVariants || {}).map(function (entry) { return `${entry[0]}: ${entry[1]}`; }).join(" · ");
            const image = item.productImage || (item.productSnapshot && item.productSnapshot.image);
            return `<div class="order-snapshot-item">${image ? `<img src="${esc(image)}" alt="">` : `<span class="order-product-icon">▦</span>`}<div><strong>${esc(item.productName || (item.productSnapshot && item.productSnapshot.name) || "Product")}</strong><small>Quantity: ${Number(item.quantity) || 1}${variants ? ` · ${esc(variants)}` : ""}</small><small>Customization: ${esc((item.customization || []).join(", ") || "—")}</small></div><strong>${item.fulfillmentCost != null ? `₹${(Number(item.fulfillmentCost) * Number(item.quantity || 1)).toLocaleString("en-IN")}` : "—"}</strong></div>`;
        }).join("") : `<div class="detail-row"><span>Products</span><strong>${esc(order.productName || order.product || "—")}</strong></div>`;
        const customer = typeof order.customer === "object" ? order.customer : { name: order.customerName || order.customer, phone: order.customerPhone, email: order.customerEmail };
        const billing = order.billingAddress && (order.billingAddress.address || order.billingAddress);
        const statusHistory = history.map(function (entry) { return `<li><strong>${esc(entry.status)}${entry.changedBy ? ` · ${esc(entry.changedBy === "creator" ? "Creator" : entry.changedBy)}` : ""}</strong><span>${date(entry.timestamp || entry.changedAt)}${entry.reason ? ` · ${esc(entry.reason)}` : ""}</span></li>`; }).join("") || `<li><strong>${esc(status)}</strong><span>${date(order.updatedAt)}</span></li>`;
        const shipping = (order.courierName || order.trackingNumber || order.shippingDate) ? `<section class="panel"><div class="panel-heading"><h2>Shipping information</h2></div>${order.courierName ? `<div class="detail-row"><span>Delivery partner</span><strong>${esc(order.courierName)}</strong></div>` : ""}${order.trackingNumber ? `<div class="detail-row"><span>Tracking number</span><strong>${esc(order.trackingNumber)}</strong></div>` : ""}${order.shippingDate ? `<div class="detail-row"><span>Shipping date</span><strong>${date(order.shippingDate)}</strong></div>` : ""}</section>` : "";
        const cancellation = status === "Cancelled" ? `<section class="panel order-cancellation-summary"><div class="panel-heading"><h2>Cancellation details</h2></div><div class="detail-row"><span>Cancelled by</span><strong>${esc(order.cancelledBy === "creator" ? "Creator" : order.cancelledBy || "—")}</strong></div><div class="detail-row"><span>Reason</span><strong>${esc(order.cancellationReason || "—")}${order.cancellationNotes ? ` · ${esc(order.cancellationNotes)}` : ""}</strong></div><div class="detail-row"><span>Cancellation date</span><strong>${date(order.cancelledAt)}</strong></div></section>` : "";
        const cancelButton = status === "Processing" ? `<button type="button" class="dashboard-button danger" id="cancelOrder">Cancel Order</button>` : "";
        root.innerHTML = `<div class="page-heading"><div><span class="setup-eyebrow">OFFICIAL BRANDIFY ORDER</span><h1>${esc(order.orderId || order.id)}</h1><p>Created ${date(order.createdAt)}${order.updatedAt ? ` · Updated ${date(order.updatedAt)}` : ""}</p></div><div class="order-details-actions">${cancelButton}<span class="status-pill ${status.toLowerCase().replace(/\s+/g, "-")}">${esc(status)}</span></div></div><div class="order-detail-grid"><section class="panel"><div class="panel-heading"><h2>Order timeline</h2></div><ol class="order-timeline">${timelineMarkup(order, history)}</ol></section><section class="panel"><div class="panel-heading"><h2>Customer</h2></div><div class="detail-row"><span>Name</span><strong>${esc(customer.name || "—")}</strong></div><div class="detail-row"><span>Phone</span><strong>${esc(customer.phone || "—")}</strong></div><div class="detail-row"><span>Email</span><strong>${esc(customer.email || "—")}</strong></div><div class="detail-row"><span>Shipping address</span><strong>${address(order.shippingAddress)}</strong></div><div class="detail-row"><span>Billing address</span><strong>${order.billingAddress && order.billingAddress.sameAsShipping ? "Same as shipping" : address(billing)}</strong></div><div class="detail-row"><span>Customer payment</span><strong>${esc(order.customerPaymentStatus || "—")}</strong></div><div class="detail-row"><span>Creator notes</span><strong>${esc(order.creatorNotes || "—")}</strong></div></section><section class="panel order-detail-products"><div class="panel-heading"><h2>Products</h2></div>${itemMarkup}<div class="detail-row order-total"><span>Fulfillment total</span><strong>₹${Number(order.amount != null ? order.amount : order.total || 0).toLocaleString("en-IN")}</strong></div>${order.creatorRevenue != null ? `<div class="detail-row"><span>Creator selling total</span><strong>₹${Number(order.creatorRevenue).toLocaleString("en-IN")}</strong></div>` : ""}</section>${shipping}${cancellation}<section class="panel order-detail-history"><div class="panel-heading"><h2>Status history</h2></div><ol class="request-history">${statusHistory}</ol></section></div>`;
        const cancelTrigger = document.getElementById("cancelOrder");
        if (cancelTrigger) cancelTrigger.addEventListener("click", function () { openCancellationModal(order, cancelTrigger); });
    }
    function openCancellationModal(order, trigger) {
        const backdrop = document.createElement("div");
        backdrop.className = "modal-backdrop";
        backdrop.innerHTML = `<section class="dashboard-modal" role="dialog" aria-modal="true" aria-labelledby="cancelOrderTitle" aria-describedby="cancelOrderMessage"><div class="modal-heading"><h2 id="cancelOrderTitle">Cancel Order</h2><button type="button" class="modal-close" data-cancel-close aria-label="Close">×</button></div><p class="cancel-order-prompt" id="cancelOrderMessage">Are you sure you want to cancel this order?</p><form id="creatorCancellationForm" class="modal-form"><label>Cancellation Reason *<select class="form-control" name="reason" required><option value="">Select Reason</option><option>Customer requested cancellation</option><option>Customer payment issue</option><option>Incorrect order details</option><option>Product unavailable</option><option>Other</option></select></label><label id="additionalReasonField" hidden>Additional Reason *<textarea class="form-control" name="notes" rows="3" maxlength="500" placeholder="Please provide a reason"></textarea></label><p class="cancel-order-error" id="cancelOrderError" role="alert"></p><div class="modal-actions"><button type="button" class="dashboard-button secondary" data-cancel-keep>Keep Order</button><button type="submit" class="dashboard-button danger" id="confirmCancelOrder">Cancel Order</button></div></form></section>`;
        document.body.appendChild(backdrop);
        const form = backdrop.querySelector("#creatorCancellationForm");
        const reasonSelect = form.elements.reason;
        const notesField = form.elements.notes;
        const additional = backdrop.querySelector("#additionalReasonField");
        const submit = backdrop.querySelector("#confirmCancelOrder");
        const escapeModal = function (event) { if (event.key === "Escape" && document.body.contains(backdrop)) close(); };
        const close = function () { document.removeEventListener("keydown", escapeModal); backdrop.remove(); if (trigger && trigger.isConnected) trigger.focus(); };
        const closeButton = backdrop.querySelector("[data-cancel-close]");
        backdrop.querySelector("[data-cancel-keep]").addEventListener("click", close);
        closeButton.addEventListener("click", close);
        backdrop.addEventListener("click", function (event) { if (event.target === backdrop) close(); });
        document.addEventListener("keydown", escapeModal);
        reasonSelect.addEventListener("change", function () { const isOther = reasonSelect.value === "Other"; additional.hidden = !isOther; notesField.required = isOther; if (isOther) notesField.focus(); });
        form.addEventListener("submit", function (event) {
            event.preventDefault();
            if (cancelBusy || submit.disabled) return;
            const reason = reasonSelect.value;
            const notes = notesField.value.trim();
            if (!reason || (reason === "Other" && !notes)) { backdrop.querySelector("#cancelOrderError").textContent = "Select a reason and add details when choosing Other."; return; }
            cancelBusy = true;
            submit.disabled = true;
            submit.textContent = "Cancelling…";
            const orders = W.list("brandifyOrders");
            const index = orders.findIndex(function (item) { return String(item.orderId || item.id) === orderId; });
            const account = read("brandifyAccount", {}) || {};
            const creatorId = localStorage.getItem("brandifyCreatorId") || "";
            const latest = index >= 0 ? orders[index] : null;
            if (!latest || !ownerMatches(latest, account, creatorId) || latest.status !== "Processing") {
                cancelBusy = false;
                backdrop.querySelector("#cancelOrderError").textContent = "This order can no longer be cancelled from its current status.";
                submit.disabled = true;
                return;
            }
            const now = new Date().toISOString();
            const updated = Object.assign({}, latest, { status: "Cancelled", cancelledBy: "creator", cancelledAt: now, cancellationReason: reason, cancellationNotes: reason === "Other" ? notes : "", updatedAt: now, statusHistory: Array.isArray(latest.statusHistory) ? latest.statusHistory.slice() : [] });
            updated.statusHistory.push({ status: "Cancelled", changedBy: "creator", changedAt: now, timestamp: now, reason: reason, notes: reason === "Other" ? notes : "" });
            orders[index] = updated;
            W.write("brandifyOrders", orders);
            const customer = typeof updated.customer === "object" ? updated.customer : { name: updated.customerName || updated.customer };
            const displayOrderId = updated.orderId || updated.id;
            const detail = reason === "Other" ? `${reason}: ${notes}` : reason;
            const message = `Creator ${updated.creatorName || "Creator"}${updated.brandName ? ` (${updated.brandName})` : ""} cancelled Order ${displayOrderId}. Customer: ${customer.name || "Not provided"}. Reason: ${detail}. Date/time: ${now}.`;
            W.notify("admin", "admin", "CREATOR_ORDER_CANCELLED", `Creator cancelled Order ${displayOrderId}.`, message, updated.requestId || "", displayOrderId, `order:${displayOrderId}:cancelled`);
            W.notify("creator", updated.creatorId || creatorId, "ORDER_CANCELLED", `Order ${displayOrderId} cancelled`, `Order ${displayOrderId} has been cancelled.`, updated.requestId || "", displayOrderId, `order:${displayOrderId}:status:Cancelled`);
            cancelBusy = false;
            close();
            render();
            showToast("Order cancelled.");
        });
        reasonSelect.focus();
    }
    function showToast(message) {
        let toast = document.getElementById("orderDetailsToast");
        if (!toast) { toast = document.createElement("div"); toast.id = "orderDetailsToast"; toast.className = "toast"; toast.setAttribute("role", "status"); document.body.appendChild(toast); }
        toast.textContent = message;
        toast.classList.add("show");
        window.setTimeout(function () { toast.classList.remove("show"); }, 2600);
    }
    window.addEventListener("storage", function (event) { if (event.key === "brandifyOrders") render(); });
    window.addEventListener("brandify-storage-update", function (event) { if (!event.detail || event.detail.key === "brandifyOrders") render(); });
    render();
})();
