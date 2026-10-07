(function () {
    "use strict";
    document.addEventListener("DOMContentLoaded", function () {
        if (!window.BrandifyAdminAuth) return;
        window.BrandifyAdminAuth.guard();
        const page = location.pathname.split("/").pop();
        const links = [
            ["admin-dashboard.html", "Dashboard", "⌂"],
            ["admin-products.html", "Products", "▦"],
            ["admin-inventory.html", "Inventory", "▤"],
            ["admin-creators.html", "Creators", "♙"],
            ["admin-orders.html", "Orders", "▤"],
            ["admin-payouts.html", "Payouts", "₹"],
            ["admin-settings.html", "Settings", "⚙"]
        ];
        const activePage = page === "admin-product-form.html" ? "admin-products.html" : page === "admin-order-details.html" ? "admin-orders.html" : page;
        const selected = links.find(function (item) { return item[0] === activePage; });
        const root = document.querySelector("[data-admin-shell]");
        if (!root) return;

        root.innerHTML = `<aside class="admin-sidebar" aria-label="Admin navigation">
            <a class="admin-brand" href="admin-dashboard.html" aria-label="Brandify admin home"><span class="admin-brand-mark" aria-hidden="true"><i></i></span><span class="admin-brand-word">Brandify<span>.</span></span></a>
            <div class="admin-workspace-picker"><span class="admin-workspace-avatar">SA</span><span><strong>Super Admin</strong><small>Admin workspace</small></span></div>
            <nav>${links.map(function (item) { return `<a class="${activePage === item[0] ? "active" : ""}" href="${item[0]}"><span class="admin-nav-icon" aria-hidden="true">${item[2]}</span>${item[1]}</a>`; }).join("")}</nav>
            <div class="admin-sidebar-bottom"><button type="button" class="admin-logout" id="adminLogout"><span aria-hidden="true">↪</span>Logout</button><div class="admin-sidebar-user"><span class="admin-avatar">SA</span><span>Super Admin<small>Administrator</small></span></div></div>
        </aside>
        <div class="admin-main"><header class="admin-topbar"><button class="admin-menu-toggle" id="adminMenuToggle" aria-label="Open menu">☰</button><div class="admin-topbar-page"><span>Workspace</span><i aria-hidden="true">/</i><strong>${selected ? selected[1] : "Admin"}</strong></div><div class="admin-topbar-actions"><div class="admin-notification-menu"><button type="button" class="admin-notification-trigger" id="adminNotificationButton" aria-label="Admin notifications" aria-expanded="false">🔔<span id="adminNotificationCount" hidden></span></button><div class="admin-notification-dropdown" id="adminNotificationDropdown" hidden></div></div><div class="admin-profile-menu"><button class="admin-profile-trigger" id="adminProfileTrigger" type="button" aria-haspopup="true" aria-expanded="false"><span class="admin-online-dot"></span><span>Super Admin</span><span class="admin-caret" aria-hidden="true"></span><b>SA</b></button><div class="admin-profile-dropdown" id="adminProfileDropdown" hidden><a href="admin-settings.html">Settings</a><button type="button" id="adminProfileLogout">Logout</button></div></div></div></header><main class="admin-content">${root.innerHTML}</main></div>`;
        root.removeAttribute("data-admin-shell");
        function confirmLogout() {
            const backdrop = document.createElement("div");
            backdrop.className = "admin-modal-backdrop";
            backdrop.innerHTML = `<section class="admin-modal" role="dialog" aria-modal="true" aria-labelledby="adminLogoutTitle" aria-describedby="adminLogoutMessage"><h2 id="adminLogoutTitle">Log out?</h2><p id="adminLogoutMessage">Are you sure you want to log out of the admin workspace?</p><div class="admin-form-actions"><button type="button" class="admin-button" data-cancel-logout>Cancel</button><button type="button" class="admin-button danger" data-confirm-logout>Log out</button></div></section>`;
            document.body.append(backdrop);
            const cancelButton = backdrop.querySelector("[data-cancel-logout]");
            function closeDialog() {
                backdrop.remove();
                document.removeEventListener("keydown", onDialogKeydown);
            }
            function onDialogKeydown(event) {
                if (event.key === "Escape") closeDialog();
            }
            cancelButton.addEventListener("click", closeDialog);
            backdrop.addEventListener("click", function (event) { if (event.target === backdrop) closeDialog(); });
            backdrop.querySelector("[data-confirm-logout]").addEventListener("click", window.BrandifyAdminAuth.logout);
            document.addEventListener("keydown", onDialogKeydown);
            cancelButton.focus();
        }

        document.getElementById("adminLogout").addEventListener("click", confirmLogout);
        document.getElementById("adminMenuToggle").addEventListener("click", function () { document.querySelector(".admin-sidebar").classList.toggle("open"); });
        const profileTrigger = document.getElementById("adminProfileTrigger");
        const profileDropdown = document.getElementById("adminProfileDropdown");
        profileTrigger.addEventListener("click", function () {
            const isOpen = !profileDropdown.hidden;
            profileDropdown.hidden = isOpen;
            profileTrigger.setAttribute("aria-expanded", String(!isOpen));
        });
        document.getElementById("adminProfileLogout").addEventListener("click", confirmLogout);
        const notificationButton = document.getElementById("adminNotificationButton");
        const notificationDropdown = document.getElementById("adminNotificationDropdown");
        function adminNotifications() {
            try { const items = JSON.parse(localStorage.getItem("brandifyNotifications") || "[]"); return Array.isArray(items) ? items.filter(function (item) { return item && item.recipientType === "admin"; }) : []; } catch (error) { return []; }
        }
        function renderAdminNotifications() {
            const items = adminNotifications();
            const unread = items.filter(function (item) { return !item.read; }).length;
            const badge = document.getElementById("adminNotificationCount");
            badge.hidden = unread === 0;
            badge.textContent = unread > 9 ? "9+" : String(unread);
            notificationDropdown.innerHTML = items.length ? `<div class="admin-notification-toolbar"><button type="button" data-mark-admin-notifications ${unread ? "" : "disabled"}>Mark all as read</button></div>${items.slice(0, 12).map(function (item) { return `<button type="button" class="admin-notification-item ${item.read ? "" : "unread"}" data-admin-notification="${String(item.id || "").replace(/[&<>"']/g, "")}" data-request="${encodeURIComponent(item.relatedRequestId || "")}" data-order="${encodeURIComponent(item.relatedOrderId || "")}"><strong>${String(item.title || "").replace(/[&<>"']/g, "")}</strong><span>${String(item.message || "").replace(/[&<>"']/g, "")}</span></button>`; }).join("")}` : '<p class="admin-notification-empty">No notifications yet.</p>';
            const markAll = notificationDropdown.querySelector("[data-mark-admin-notifications]");
            if (markAll) markAll.addEventListener("click", function () {
                let records = [];
                try { const stored = JSON.parse(localStorage.getItem("brandifyNotifications") || "[]"); records = Array.isArray(stored) ? stored : []; } catch (error) { records = []; }
                records.forEach(function (item) { if (item && item.recipientType === "admin") item.read = true; });
                localStorage.setItem("brandifyNotifications", JSON.stringify(records));
                renderAdminNotifications();
            });
            notificationDropdown.querySelectorAll("[data-admin-notification]").forEach(function (itemButton) { itemButton.addEventListener("click", function () {
                const records = adminNotifications();
                const target = records.find(function (item) { return item.id === itemButton.dataset.adminNotification; });
                if (target) target.read = true;
                try { localStorage.setItem("brandifyNotifications", JSON.stringify(records)); } catch (error) { }
                const requestId = decodeURIComponent(itemButton.dataset.request || "");
                const orderId = decodeURIComponent(itemButton.dataset.order || "");
                if (orderId) window.location.href = `admin-order-details.html?id=${encodeURIComponent(orderId)}`;
                else if (requestId) window.location.href = `admin-orders.html#${encodeURIComponent(requestId)}`;
                else renderAdminNotifications();
            }); });
        }
        notificationButton.addEventListener("click", function () { const open = !notificationDropdown.hidden; notificationDropdown.hidden = open; notificationButton.setAttribute("aria-expanded", String(!open)); });
        renderAdminNotifications();
        window.addEventListener("storage", function (event) { if (event.key === "brandifyNotifications") renderAdminNotifications(); });
        window.addEventListener("brandify-storage-update", renderAdminNotifications);
        document.addEventListener("click", function (event) {
            if (!event.target.closest(".admin-profile-menu")) {
                profileDropdown.hidden = true;
                profileTrigger.setAttribute("aria-expanded", "false");
            }
            if (!event.target.closest(".admin-notification-menu")) notificationDropdown.hidden = true;
        });
        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape") {
                profileDropdown.hidden = true;
                profileTrigger.setAttribute("aria-expanded", "false");
            }
        });
    });
})();
