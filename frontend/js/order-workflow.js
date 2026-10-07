(function () {
    "use strict";

    function read(key, fallback) {
        try {
            const value = JSON.parse(localStorage.getItem(key) || "null");
            return value == null ? fallback : value;
        } catch (error) { return fallback; }
    }
    function write(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
        window.dispatchEvent(new CustomEvent("brandify-storage-update", { detail: { key: key } }));
        return value;
    }
    function list(key) { const value = read(key, []); return Array.isArray(value) ? value : []; }
    function notify(recipientType, recipientId, type, title, message, relatedRequestId, relatedOrderId, dedupeKey) {
        const notifications = list("brandifyNotifications");
        if (dedupeKey && notifications.some(function (item) { return item && item.dedupeKey === dedupeKey; })) return notifications;
        const notification = {
            id: `notification-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
            recipientId: recipientId || "",
            recipientType: recipientType,
            type: type,
            title: title,
            message: message,
            relatedRequestId: relatedRequestId || "",
            relatedOrderId: relatedOrderId || "",
            read: false,
            createdAt: new Date().toISOString()
        };
        if (dedupeKey) notification.dedupeKey = dedupeKey;
        notifications.unshift(notification);
        write("brandifyNotifications", notifications);
        return notification;
    }
    function nextSequentialId(records, field, prefix, start) {
        let highest = start - 1;
        records.forEach(function (record) {
            const value = String(record[field] || "");
            const match = value.match(new RegExp(`^${prefix}-(\\d+)$`, "i"));
            if (match) highest = Math.max(highest, Number(match[1]));
        });
        let next = highest + 1;
        const width = prefix === "REQ" ? 3 : 4;
        let candidate = `${prefix}-${String(next).padStart(width, "0")}`;
        while (records.some(function (record) { return String(record[field] || "").toUpperCase() === candidate.toUpperCase(); })) {
            next += 1;
            candidate = `${prefix}-${String(next).padStart(width, "0")}`;
        }
        return candidate;
    }
    function nextRequestId() { return nextSequentialId(list("brandifyOrderRequests"), "requestId", "REQ", 1); }
    function generateOrderId() {
        const orders = list("brandifyOrders");
        let highest = 1000;
        orders.forEach(function (order) {
            const match = String(order.orderId || order.id || "").match(/^BF-(\d+)$/i);
            if (match) highest = Math.max(highest, Number(match[1]));
        });
        let candidate = `BF-${highest + 1}`;
        while (orders.some(function (order) { return String(order.orderId || order.id || "").toUpperCase() === candidate; })) {
            highest += 1;
            candidate = `BF-${highest + 1}`;
        }
        return candidate;
    }
    window.BrandifyOrderWorkflow = {
        read: read,
        write: write,
        list: list,
        notify: notify,
        nextRequestId: nextRequestId,
        generateOrderId: generateOrderId
    };
})();
