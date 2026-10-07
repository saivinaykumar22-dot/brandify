document.addEventListener("DOMContentLoaded", function () {
    "use strict";
    const D = window.BrandifyAdminData;
    const W = window.BrandifyOrderWorkflow;
    const id = new URLSearchParams(location.search).get("id");
    const root = document.getElementById("orderDetails");
    function esc(value) { return D.escape(value == null ? "" : value); }
    function address(value) { value = value || {}; return [value.addressLine1, value.addressLine2, value.city, value.state, value.pincode, value.country].filter(Boolean).map(esc).join(", ") || "—"; }
    function findOrder() { return W.list("brandifyOrders").find(function (item) { return String(item.orderId || item.id) === id; }); }
    function render() {
        const order = findOrder();
        if (!order) { root.innerHTML = '<section class="admin-panel admin-empty"><strong>Order not found</strong>This order is not present in localStorage.</section>'; return; }
        const status = String(order.status || "Processing");
        const nextStatus = { Processing: "Shipped", Shipped: "Out for Delivery", "Out for Delivery": "Delivered" }[status] || "";
        const customer = typeof order.customer === "object" ? order.customer : { name: order.customerName || order.customer, phone: order.customerPhone, email: order.customerEmail };
        const items = Array.isArray(order.items) ? order.items.map(function (item) {
            const variants = Object.entries(item.selectedVariants || {}).map(function (entry) { return `${entry[0]}: ${entry[1]}`; }).join(" · ") || "No variants";
            return `<div class="admin-order-item"><strong>${esc(item.productName)} × ${Number(item.quantity) || 1}</strong><span>${esc(variants)}</span><small>Customization: ${esc((item.customization || []).join(", ") || "—")} · Fulfillment cost: ${item.fulfillmentCost == null ? "—" : D.money(Number(item.fulfillmentCost) * Number(item.quantity || 1))}</small></div>`;
        }).join("") : `<p>${esc(order.productName || order.product || "—")}</p>`;
        const history = (order.statusHistory || []).map(function (entry) { return `<li><strong>${esc(entry.status)}${entry.changedBy ? ` · ${esc(entry.changedBy)}` : ""}</strong><span>${esc(entry.timestamp || entry.changedAt || "")}${entry.reason ? ` · ${esc(entry.reason)}` : ""}</span></li>`; }).join("") || `<li><strong>${esc(status)}</strong></li>`;
        const statusActions = nextStatus ? `<div class="order-status-management"><h3>Update order status</h3><p class="admin-muted">Current status: ${esc(status)}</p><button type="button" class="admin-button primary" id="advanceOrderStatus">Mark as ${esc(nextStatus)}</button></div>` : `<p class="order-status-terminal">${status === "Delivered" ? "Delivered · No further status updates are available." : status === "Cancelled" ? `Cancelled${order.cancelledBy ? ` by ${esc(order.cancelledBy === "creator" ? "Creator" : order.cancelledBy)}` : ""}.${order.cancellationReason ? ` Reason: ${esc(order.cancellationReason)}` : ""}` : "No further status updates are available for this order."}</p>`;
        root.innerHTML = `<section class="admin-panel"><div class="admin-order-heading"><div><span class="admin-muted">OFFICIAL BRANDIFY ORDER</span><h2>${esc(order.orderId || order.id)}</h2></div><span class="admin-badge">${esc(status)}</span></div><div class="admin-form-grid"><p><strong>Creator</strong><br>${esc(order.creatorName || order.creatorEmail || "—")}${order.brandName ? `<br>${esc(order.brandName)}` : ""}</p><p><strong>Customer</strong><br>${esc(customer.name || "—")}<br>${esc(customer.phone || "—")}<br>${esc(customer.email || "—")}</p><p><strong>Shipping address</strong><br>${address(order.shippingAddress)}</p><p><strong>Billing address</strong><br>${order.billingAddress && order.billingAddress.sameAsShipping ? "Same as shipping" : address(order.billingAddress && order.billingAddress.address || order.billingAddress)}</p><p><strong>Customer payment reference</strong><br>${esc(order.customerPaymentStatus || "—")}</p><p><strong>Creator notes</strong><br>${esc(order.creatorNotes || "—")}</p><p><strong>Fulfillment total</strong><br>${D.money(order.amount != null ? order.amount : order.total)}</p><p><strong>Request</strong><br>${esc(order.requestId || "—")}</p></div><div class="admin-order-items"><h3>Product snapshot</h3>${items}</div>${order.status === "Cancelled" ? `<div class="admin-order-items"><h3>Cancellation</h3><p><strong>Cancelled by:</strong> ${esc(order.cancelledBy === "creator" ? "Creator" : order.cancelledBy || "—")}</p><p><strong>Reason:</strong> ${esc(order.cancellationReason || "—")}${order.cancellationNotes ? ` · ${esc(order.cancellationNotes)}` : ""}</p><p><strong>Date:</strong> ${esc(order.cancelledAt || "—")}</p></div>` : ""}<div class="admin-order-items"><h3>Shipment information</h3>${order.courierName || order.trackingNumber || order.shippingDate ? `<p><strong>Delivery partner:</strong> ${esc(order.courierName || "—")} &nbsp; <strong>Tracking number:</strong> ${esc(order.trackingNumber || "—")} &nbsp; <strong>Shipping date:</strong> ${esc(order.shippingDate || "—")}</p>` : `<p class="admin-muted">No shipment information has been added.</p>`}</div><div class="admin-order-items"><h3>Order status history</h3><ol class="request-history">${history}</ol></div>${statusActions}</section>`;
        const advanceButton = document.getElementById("advanceOrderStatus");
        if (advanceButton) advanceButton.addEventListener("click", function () { openStatusModal(status, nextStatus, advanceButton); });
    }
    function openStatusModal(currentStatus, nextStatus, trigger) {
        const backdrop = document.createElement("div");
        backdrop.className = "admin-modal-backdrop";
        const shippingForm = currentStatus === "Processing" ? `<label class="admin-field">Courier / delivery partner<input name="courierName" maxlength="100" placeholder="Enter delivery partner"></label><label class="admin-field">Tracking number<input name="trackingNumber" maxlength="100" placeholder="Enter tracking number"></label><label class="admin-field">Shipping date<input name="shippingDate" type="date"></label>` : "";
        backdrop.innerHTML = `<section class="admin-modal order-status-modal" role="dialog" aria-modal="true" aria-labelledby="statusModalTitle"><h2 id="statusModalTitle">Mark as ${esc(nextStatus)}?</h2><p>${currentStatus === "Processing" ? "Add the shipment information below. You can leave a field blank if it is not available." : `Confirm that ${id} should move from ${esc(currentStatus)} to ${esc(nextStatus)}.`}</p><form id="statusConfirmForm" class="order-status-modal-form">${shippingForm}<div class="admin-form-actions"><button type="button" class="admin-button" data-close-status>Keep current status</button><button type="submit" class="admin-button primary" data-confirm-status>Confirm update</button></div></form></section>`;
        document.body.appendChild(backdrop);
        const form = backdrop.querySelector("#statusConfirmForm");
        const confirmButton = backdrop.querySelector("[data-confirm-status]");
        const escapeModal = function (event) { if (event.key === "Escape" && document.body.contains(backdrop)) close(); };
        const close = function () { document.removeEventListener("keydown", escapeModal); backdrop.remove(); if (trigger && trigger.isConnected) trigger.focus(); };
        backdrop.querySelector("[data-close-status]").addEventListener("click", close);
        backdrop.addEventListener("click", function (event) { if (event.target === backdrop) close(); });
        document.addEventListener("keydown", escapeModal);
        form.addEventListener("submit", function (event) {
            event.preventDefault();
            if (confirmButton.disabled) return;
            confirmButton.disabled = true;
            const orders = W.list("brandifyOrders");
            const index = orders.findIndex(function (item) { return String(item.orderId || item.id) === id; });
            if (index < 0 || orders[index].status !== currentStatus) { close(); D.toast("This order has changed. Refresh and try again."); return; }
            const allowedNext = { Processing: "Shipped", Shipped: "Out for Delivery", "Out for Delivery": "Delivered" };
            if (allowedNext[orders[index].status || "Processing"] !== nextStatus) { close(); return; }
            const now = new Date().toISOString();
            const updated = Object.assign({}, orders[index], { status: nextStatus, updatedAt: now, statusHistory: Array.isArray(orders[index].statusHistory) ? orders[index].statusHistory.slice() : [] });
            let courierName = updated.courierName || "";
            let trackingNumber = updated.trackingNumber || "";
            let shippingDate = updated.shippingDate || "";
            if (currentStatus === "Processing") {
                courierName = form.elements.courierName.value.trim();
                trackingNumber = form.elements.trackingNumber.value.trim();
                shippingDate = form.elements.shippingDate.value;
                Object.assign(updated, { courierName: courierName, trackingNumber: trackingNumber, shippingDate: shippingDate });
            }
            updated.statusHistory.push({ status: nextStatus, timestamp: now, changedAt: now, changedBy: "admin", courierName: courierName, trackingNumber: trackingNumber, shippingDate: shippingDate });
            orders[index] = updated;
            W.write("brandifyOrders", orders);
            const orderId = updated.orderId || updated.id;
            const title = nextStatus === "Shipped" ? `Order ${orderId} shipped` : nextStatus === "Out for Delivery" ? `Order ${orderId} is out for delivery` : `Order ${orderId} delivered`;
            const message = nextStatus === "Shipped" ? `Order ${orderId} has been shipped.` : nextStatus === "Out for Delivery" ? `Order ${orderId} is out for delivery.` : `Your order ${orderId} has been delivered.`;
            if (updated.creatorId) W.notify("creator", updated.creatorId, `ORDER_${nextStatus.toUpperCase().replace(/\s+/g, "_")}`, title, message, updated.requestId || "", orderId, `order:${orderId}:status:${nextStatus}`);
            if (nextStatus === "Shipped" && updated.creatorId && (trackingNumber || courierName || shippingDate)) W.notify("creator", updated.creatorId, "TRACKING_ADDED", `Tracking information for ${orderId}`, `Tracking information has been added for Order ${orderId}.`, updated.requestId || "", orderId, `order:${orderId}:tracking-added`);
            close();
            D.toast("Order updated successfully.");
            render();
        });
        const firstInput = form.querySelector("input");
        if (firstInput) firstInput.focus();
        else confirmButton.focus();
    }
    window.addEventListener("storage", function (event) { if (event.key === "brandifyOrders") render(); });
    window.addEventListener("brandify-storage-update", function (event) { if (!event.detail || event.detail.key === "brandifyOrders") render(); });
    render();
});
