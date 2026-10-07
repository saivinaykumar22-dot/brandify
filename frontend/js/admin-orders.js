document.addEventListener("DOMContentLoaded", function () {
    "use strict";
    const D = window.BrandifyAdminData;
    const W = window.BrandifyOrderWorkflow;
    const requestRoot = document.getElementById("requestReview");
    const count = document.getElementById("requestCount");
    const orderRoot = document.getElementById("ordersTable");
    const search = document.getElementById("orderSearch");
    const filter = document.getElementById("orderStatusFilter");
    let selectedRequestId = decodeURIComponent(location.hash.slice(1));
    let reasonAction = "";

    function requests() { return W.list("brandifyOrderRequests"); }
    function esc(value) { return D.escape(value == null ? "" : value); }
    function formatAddress(address) {
        address = address || {};
        return [address.addressLine1, address.addressLine2, address.city, address.state, address.pincode, address.country].filter(Boolean).map(esc).join(", ") || "—";
    }
    function requestProducts(request) {
        return (request.items || []).map(function (item) { return `${item.productName || "Product"} × ${Number(item.quantity) || 1}`; }).join(", ") || "No products";
    }
    function changeRequest(requestId, status, reason) {
        const data = requests();
        const index = data.findIndex(function (item) { return item.requestId === requestId; });
        if (index < 0) return;
        const request = data[index];
        if (!["Awaiting Approval", "Resubmitted"].includes(request.status) || !["Needs Changes", "Rejected"].includes(status)) { D.toast("This request has already been updated."); render(); return; }
        const now = new Date().toISOString();
        request.status = status;
        request.changeReason = reason || "";
        request.updatedAt = now;
        request.statusHistory = Array.isArray(request.statusHistory) ? request.statusHistory : [];
        request.statusHistory.push({ status: status, timestamp: now, changedAt: now, changedBy: "admin", reason: reason || "" });
        W.write("brandifyOrderRequests", data);
        const rejected = status === "Rejected";
        W.notify("creator", request.creatorId, rejected ? "REQUEST_REJECTED" : "REQUEST_NEEDS_CHANGES", rejected ? `Request ${requestId} rejected` : `Request ${requestId} needs changes`, rejected ? `Your fulfillment request was rejected: ${reason}` : `Please update your fulfillment request: ${reason}`, request.requestId, "", `request:${requestId}:${status}:${now}`);
        selectedRequestId = "";
        reasonAction = "";
        render();
        D.toast(rejected ? "Request rejected." : "Change request sent to creator.");
    }
    function requestTable(list) {
        if (!list.length) return '<div class="admin-empty"><strong>No pending requests</strong>New creator fulfillment requests will appear here for review.</div>';
        return `<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Request</th><th>Creator</th><th>Customer</th><th>Products</th><th>Status</th><th>Updated</th><th></th></tr></thead><tbody>${list.map(function (request) { return `<tr><td><strong>${esc(request.requestId)}</strong></td><td>${esc(request.creatorName || request.brandName || "Creator")}</td><td>${esc(request.customer && request.customer.name || "—")}</td><td>${esc(requestProducts(request))}</td><td><span class="admin-badge">${esc(request.status)}</span></td><td>${esc(request.updatedAt || request.createdAt || "—")}</td><td><button type="button" class="admin-button" data-review-request="${esc(request.requestId)}">Review</button></td></tr>`; }).join("")}</tbody></table></div>`;
    }
    function reviewPanel(request) {
        const approvedOrder = D.orders().find(function (order) { return order.requestId === request.requestId; });
        if (approvedOrder || request.status === "Approved") return `<section class="request-review-detail"><h3>Already approved</h3><p>This request has already generated official order <strong>${esc(request.orderId || approvedOrder && (approvedOrder.orderId || approvedOrder.id))}</strong>.</p></section>`;
        const items = (request.items || []).map(function (item) { const variants = Object.entries(item.selectedVariants || {}).map(function (entry) { return `${entry[0]}: ${entry[1]}`; }).join(" · ") || "No variants"; const custom = (item.customization || []).join(", ") || "—"; return `<div class="request-product-detail"><strong>${esc(item.productName)} × ${Number(item.quantity) || 1}</strong><span>${esc(variants)} · ${esc(custom)}</span><small>Fulfillment cost: ${item.fulfillmentCost != null ? D.money(Number(item.fulfillmentCost) * Number(item.quantity || 1)) : "Not recorded"}</small></div>`; }).join("");
        const history = (request.statusHistory || []).map(function (entry) { return `<li><strong>${esc(entry.status)}</strong><span>${esc(entry.timestamp || "")}${entry.reason ? ` · ${esc(entry.reason)}` : ""}</span></li>`; }).join("");
        const canReview = ["Awaiting Approval", "Resubmitted"].includes(request.status);
        const reasonForm = reasonAction ? `<form id="requestReasonForm" class="request-reason-form"><label for="requestReason">${reasonAction === "Rejected" ? "Reason for rejection" : "What needs to change?"}</label><textarea id="requestReason" class="admin-input" rows="3" required maxlength="500"></textarea><p class="admin-form-error" id="requestReasonError" role="alert"></p><div class="admin-form-actions"><button type="button" class="admin-button" data-cancel-reason>Cancel</button><button type="submit" class="admin-button primary">${reasonAction === "Rejected" ? "Reject request" : "Send change request"}</button></div></form>` : "";
        return `<section class="request-review-detail"><div class="request-review-heading"><div><h3>${esc(request.requestId)} · ${esc(request.status)}</h3><p>${esc(request.brandName || "Brand not set")} · ${esc(request.creatorName || "Creator")}</p></div><button type="button" class="admin-button" data-close-review>Close</button></div><div class="request-review-grid"><div><h4>Customer</h4><p>${esc(request.customer && request.customer.name || "—")}</p><p>${esc(request.customer && request.customer.phone || "—")}</p><p>${esc(request.customer && request.customer.email || "—")}</p></div><div><h4>Shipping address</h4><p>${formatAddress(request.shippingAddress)}</p><h4>Billing address</h4><p>${request.billingAddress && request.billingAddress.sameAsShipping ? "Same as shipping" : formatAddress(request.billingAddress && request.billingAddress.address)}</p></div></div><div class="request-review-products"><h4>Products and customization</h4>${items || "No products recorded"}</div><div class="request-review-grid"><div><h4>Customer payment reference</h4><p>${esc(request.customerPaymentStatus || "—")}</p></div><div><h4>Creator notes</h4><p>${esc(request.creatorNotes || "—")}</p></div></div>${request.changeReason ? `<p class="request-admin-note"><strong>Previous feedback:</strong> ${esc(request.changeReason)}</p>` : ""}<div class="request-review-products"><h4>Request history</h4><ol class="request-history">${history}</ol></div>${reasonForm}${canReview ? `<div class="admin-form-actions"><button type="button" class="admin-button" data-request-action="Needs Changes">Request Changes</button><button type="button" class="admin-button danger" data-request-action="Rejected">Reject</button><button type="button" class="admin-button primary" data-approve-request="${esc(request.requestId)}">Approve &amp; Start Processing</button></div>` : `<p class="admin-muted">This request is ${esc(request.status)} and is no longer awaiting review.</p>`}</section>`;
    }
    function approve(requestId, button) {
        if (button.disabled) return;
        button.disabled = true;
        function approvalError(message) { button.disabled = false; D.toast(message); }
        const allRequests = requests();
        const index = allRequests.findIndex(function (item) { return item.requestId === requestId; });
        if (index < 0) { approvalError("Request not found."); render(); return; }
        const request = allRequests[index];
        const allOrders = D.orders();
        const existing = allOrders.find(function (order) { return order.requestId === requestId; });
        if (existing) {
            request.status = "Approved";
            request.orderId = existing.orderId || existing.id;
            W.write("brandifyOrderRequests", allRequests);
            D.toast(`Already approved as ${request.orderId}.`);
            render();
            return;
        }
        if (request.status === "Approved") { approvalError("This request is already marked approved, but its official order record is missing. No duplicate order was created."); render(); return; }
        if (!["Awaiting Approval", "Resubmitted"].includes(request.status)) { approvalError("This request is not ready for approval."); render(); return; }
        const shipping = request.shippingAddress || {};
        if (!request.customer || !request.customer.name || !/^\+?[0-9 ()-]{7,20}$/.test(String(request.customer.phone || "")) || !shipping.addressLine1 || !shipping.city || !shipping.state || !shipping.country || !shipping.pincode || !(request.items || []).length) { approvalError("This request is missing required information."); render(); return; }
        const products = D.catalog();
        const quantities = new Map();
        for (const item of request.items) {
            if (!Number.isInteger(Number(item.quantity)) || Number(item.quantity) < 1) { approvalError(`${item.productName || "A selected product"} has an invalid quantity.`); return; }
            const productId = item.masterProductId || item.productId;
            const product = products.find(function (entry) { return entry.id === productId; });
            if (!product || ["archived", "inactive", "out of stock"].includes(String(product.status || "").toLowerCase()) || ["Archived", "Inactive", "Out of Stock"].includes(D.status(product)) || (product.stock != null && Number(product.stock) <= 0)) { approvalError(`${item.productName || "A selected product"} is no longer available.`); return; }
            const variants = product.variants || {};
            if ((item.selectedVariants && item.selectedVariants.size && !(variants.sizes || []).includes(item.selectedVariants.size)) || (item.selectedVariants && item.selectedVariants.color && !(variants.colors || []).includes(item.selectedVariants.color))) { approvalError(`${item.productName || "A selected product"} no longer has the requested variant.`); return; }
            quantities.set(productId, (quantities.get(productId) || 0) + Number(item.quantity || 0));
        }
        for (const [productId, quantity] of quantities.entries()) {
            const product = products.find(function (entry) { return entry.id === productId; });
            if (product.stock != null && Number(product.stock) < quantity) { approvalError(`${product.name} has insufficient stock for this request.`); return; }
        }
        const now = new Date().toISOString();
        const orderId = W.generateOrderId();
        const items = request.items.map(function (item) {
            const master = products.find(function (entry) { return entry.id === (item.masterProductId || item.productId); }) || {};
            const creatorProduct = (request.creatorId === (localStorage.getItem("brandifyCreatorId") || "") ? W.list("brandifyMyProducts") : []).find(function (entry) { return entry.id === item.productId; }) || {};
            const unitCost = item.fulfillmentCost != null ? Number(item.fulfillmentCost) : Number(master.basePrice || 0);
            return Object.assign({}, item, { productName: item.productName || master.name || "Product", productImage: item.productImage || master.image || "", category: item.category || master.category || "", fulfillmentCost: unitCost, sellingPrice: item.sellingPrice != null ? item.sellingPrice : creatorProduct.sellingPrice || null, productSnapshot: { id: master.id || item.masterProductId || item.productId, name: item.productName || master.name || "Product", image: item.productImage || master.image || "", category: item.category || master.category || "", basePrice: unitCost } });
        });
        const totalQuantity = items.reduce(function (sum, item) { return sum + Number(item.quantity || 0); }, 0);
        const amount = items.reduce(function (sum, item) { return sum + Number(item.fulfillmentCost || 0) * Number(item.quantity || 0); }, 0);
        const creatorRevenue = items.reduce(function (sum, item) { return sum + Number(item.sellingPrice || 0) * Number(item.quantity || 0); }, 0);
        const nextOrder = { id: orderId, orderId: orderId, requestId: requestId, creatorId: request.creatorId, creatorName: request.creatorName, creatorEmail: request.creatorEmail || "", brandName: request.brandName || "", customer: request.customer, customerName: request.customer.name, customerPhone: request.customer.phone, customerEmail: request.customer.email || "", shippingAddress: request.shippingAddress, billingAddress: request.billingAddress, items: items, productName: items.map(function (item) { return `${item.productName} × ${item.quantity}`; }).join(", "), product: items.map(function (item) { return `${item.productName} × ${item.quantity}`; }).join(", "), quantity: totalQuantity, amount: amount, total: amount, creatorRevenue: creatorRevenue, customerPaymentStatus: request.customerPaymentStatus, creatorNotes: request.creatorNotes, orderSource: "manual", salesChannel: "Manual", status: "Processing", statusHistory: [{ status: "Approved", timestamp: now, changedAt: now, changedBy: "admin" }, { status: "Processing", timestamp: now, changedAt: now, changedBy: "admin" }], approvedAt: now, approvedBy: "admin", createdAt: now, updatedAt: now };
        for (const [productId, quantity] of quantities.entries()) {
            const product = products.find(function (entry) { return entry.id === productId; });
            if (product.stock != null) product.stock = Math.max(0, Number(product.stock) - quantity);
        }
        if (products.length) D.saveCatalog(products);
        allOrders.push(nextOrder);
        W.write("brandifyOrders", allOrders);
        request.status = "Approved";
        request.orderId = orderId;
        request.approvedAt = now;
        request.approvedBy = "admin";
        request.updatedAt = now;
        request.statusHistory = Array.isArray(request.statusHistory) ? request.statusHistory : [];
        request.statusHistory.push({ status: "Approved", timestamp: now, changedAt: now, changedBy: "admin", orderId: orderId });
        allRequests[index] = request;
        W.write("brandifyOrderRequests", allRequests);
        W.notify("creator", request.creatorId, "ORDER_PROCESSING", `Order ${orderId} is being processed`, `Order ${orderId} is now being processed.`, request.requestId, orderId, `order:${orderId}:status:Processing`);
        selectedRequestId = "";
        render();
        D.toast(`Order ${orderId} created successfully.`);
    }
    function render() {
        const pending = requests().filter(function (request) { return ["Awaiting Approval", "Resubmitted"].includes(request.status); }).sort(function (a, b) { return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt); });
        count.textContent = String(pending.length);
        requestRoot.innerHTML = requestTable(pending);
        const selected = selectedRequestId && requests().find(function (request) { return request.requestId === selectedRequestId; });
        if (selected) requestRoot.insertAdjacentHTML("beforeend", reviewPanel(selected));
        const q = search.value.trim().toLowerCase();
        const orders = D.orders().filter(function (order) {
            const customer = typeof order.customer === "object" ? order.customer.name : order.customer;
            const text = `${order.orderId || order.id} ${order.creatorName || order.creatorEmail} ${order.customerName || customer} ${order.productName || order.product}`.toLowerCase();
            return (!q || text.includes(q)) && (!filter.value || (order.status || "Processing") === filter.value);
        });
        orderRoot.innerHTML = orders.length ? `<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Order</th><th>Date</th><th>Creator</th><th>Customer</th><th>Product</th><th>Qty</th><th>Amount</th><th>Status</th></tr></thead><tbody>${orders.map(function (order) { const id = order.orderId || order.id; const customer = typeof order.customer === "object" ? order.customer.name : order.customer; return `<tr><td><a href="admin-order-details.html?id=${encodeURIComponent(id || "")}">${esc(id || "—")}</a></td><td>${esc(order.createdAt || order.date || "—")}</td><td>${esc(order.creatorName || order.creatorEmail || "—")}</td><td>${esc(order.customerName || customer || "—")}</td><td>${esc(order.productName || order.product || "—")}</td><td>${Number(order.quantity || 1)}</td><td>${D.money(order.amount != null ? order.amount : order.total)}</td><td><span class="admin-badge">${esc(order.status || "Processing")}</span></td></tr>`; }).join("")}</tbody></table></div>` : '<div class="admin-empty"><strong>No official orders yet</strong>Approved requests will be listed here as Brandify orders.</div>';
        requestRoot.querySelectorAll("[data-review-request]").forEach(function (button) { button.addEventListener("click", function () { selectedRequestId = button.dataset.reviewRequest; reasonAction = ""; history.replaceState(null, "", `#${encodeURIComponent(selectedRequestId)}`); render(); }); });
        const closeReview = requestRoot.querySelector("[data-close-review]");
        if (closeReview) closeReview.addEventListener("click", function () { selectedRequestId = ""; reasonAction = ""; history.replaceState(null, "", location.pathname); render(); });
        requestRoot.querySelectorAll("[data-request-action]").forEach(function (button) { button.addEventListener("click", function () { reasonAction = button.dataset.requestAction; render(); }); });
        const cancelReason = requestRoot.querySelector("[data-cancel-reason]");
        if (cancelReason) cancelReason.addEventListener("click", function () { reasonAction = ""; render(); });
        const reasonForm = requestRoot.querySelector("#requestReasonForm");
        if (reasonForm) reasonForm.addEventListener("submit", function (event) { event.preventDefault(); const reason = reasonForm.querySelector("#requestReason").value.trim(); if (!reason) { reasonForm.querySelector("#requestReasonError").textContent = "Enter a reason to continue."; return; } changeRequest(selectedRequestId, reasonAction, reason); });
        const approveButton = requestRoot.querySelector("[data-approve-request]");
        if (approveButton) approveButton.addEventListener("click", function () { approve(approveButton.dataset.approveRequest, approveButton); });
    }
    search.addEventListener("input", render);
    filter.addEventListener("change", render);
    window.addEventListener("storage", function (event) { if (["brandifyOrderRequests", "brandifyOrders", "brandifyNotifications"].includes(event.key)) render(); });
    window.addEventListener("brandify-storage-update", function () { render(); });
    render();
});
