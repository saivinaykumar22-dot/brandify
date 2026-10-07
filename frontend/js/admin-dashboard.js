document.addEventListener("DOMContentLoaded", function () {
    const D = window.BrandifyAdminData;
    const W = window.BrandifyOrderWorkflow;
    D.syncCreator();
    const products = D.catalog();
    const creators = D.creators();
    const orders = D.orders();
    const requests = W.list("brandifyOrderRequests");
    const pendingRequests = requests.filter(function (request) { return ["Awaiting Approval", "Resubmitted"].includes(request.status); });
    const active = products.filter(function (product) { return D.status(product) === "Active"; }).length;
    const out = products.filter(function (product) { return D.status(product) === "Out of Stock"; }).length;
    const pending = orders.filter(function (order) { return order.status === "Pending"; }).length;
    document.getElementById("adminStats").innerHTML = [["Total products", products.length, "Master catalog"], ["Active products", active, "Available to creators"], ["Out of stock", out, "Stock needs attention"], ["Creators", creators.length, "Registered accounts"], ["Pending requests", pendingRequests.length, "Awaiting review"], ["Total orders", orders.length, `${pending} pending orders`]].map(function (item) { return `<article class="admin-stat"><label>${item[0]}</label><strong>${item[1]}</strong><small>${item[2]}</small></article>`; }).join("");
    function orderTable(rows) {
        if (!rows.length) return '<div class="admin-empty"><strong>No official orders yet</strong>Orders appear here after a fulfillment request is approved.</div>';
        return `<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Order</th><th>Date</th><th>Creator</th><th>Customer</th><th>Amount</th><th>Status</th></tr></thead><tbody>${rows.slice(-5).reverse().map(function (order) { const id = order.orderId || order.id; const customer = typeof order.customer === "object" ? order.customer.name : order.customer; return `<tr><td><a href="admin-order-details.html?id=${encodeURIComponent(id || "")}">${D.escape(id || "Order")}</a></td><td>${D.escape(order.createdAt || order.date || "—")}</td><td>${D.escape(order.creatorName || order.creatorEmail || "—")}</td><td>${D.escape(order.customerName || customer || "—")}</td><td>${D.money(order.amount != null ? order.amount : order.total)}</td><td><span class="admin-badge">${D.escape(order.status || "Processing")}</span></td></tr>`; }).join("")}</tbody></table></div>`;
    }
    document.getElementById("recentOrders").innerHTML = orderTable(orders);
    document.getElementById("pendingRequests").innerHTML = pendingRequests.length ? `<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Request</th><th>Creator</th><th>Customer</th><th>Products</th><th>Status</th><th></th></tr></thead><tbody>${pendingRequests.slice(0, 5).map(function (request) { const itemSummary = (request.items || []).map(function (item) { return `${item.productName || "Product"} × ${Number(item.quantity) || 1}`; }).join(", ") || "No products"; return `<tr><td>${D.escape(request.requestId)}</td><td>${D.escape(request.creatorName || "Creator")}</td><td>${D.escape(request.customer && request.customer.name || "—")}</td><td>${D.escape(itemSummary)}</td><td><span class="admin-badge warning">${D.escape(request.status)}</span></td><td><a class="admin-button" href="admin-orders.html#${encodeURIComponent(request.requestId)}">Review</a></td></tr>`; }).join("")}</tbody></table></div>` : '<div class="admin-empty"><strong>No pending requests</strong>New creator requests will appear here.</div>';
    document.getElementById("catalogSummary").innerHTML = `<p>${products.length} products across ${new Set(products.map(function (product) { return product.category; })).size} catalog categories.</p><a class="admin-button primary admin-manage-products" href="admin-products.html">Manage products <span aria-hidden="true">→</span></a>`;
    window.addEventListener("storage", function (event) { if (["brandifyOrderRequests", "brandifyOrders"].includes(event.key)) window.location.reload(); });
});
