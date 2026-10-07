(function () {
    "use strict";
    const categories = ["Fashion", "Beauty", "Fitness", "Lifestyle", "Food & Beverage", "Accessories", "Home", "Health & Wellness", "Creator Merch"];
    function read(key, fallback) { try { const value = JSON.parse(localStorage.getItem(key) || "null"); return value == null ? fallback : value; } catch (error) { return fallback; } }
    function write(key, value) { localStorage.setItem(key, JSON.stringify(value)); return value; }
    function catalog() {
        let list = read("brandifyProductCatalog", null);
        if (Array.isArray(list)) return list;
        if (window.BrandifyCatalog) return window.BrandifyCatalog.getAll();
        return [];
    }
    function saveCatalog(list) { if (window.BrandifyCatalog) return window.BrandifyCatalog.save(list); return write("brandifyProductCatalog", list); }
    function creators() { return read("brandifyCreators", []); }
    function orders() { return read("brandifyOrders", []); }
    function status(product) { return product.status === "Archived" ? "Archived" : product.status === "Inactive" ? "Inactive" : product.stock != null && Number(product.stock) <= 0 ? "Out of Stock" : "Active"; }
    function money(value) { const n = Number(value); return Number.isFinite(n) ? `₹${n.toLocaleString("en-IN")}` : "—"; }
    function escape(value) { return String(value == null ? "" : value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
    function toast(message) { let el = document.querySelector(".admin-toast"); if (!el) { el = document.createElement("div"); el.className = "admin-toast"; el.setAttribute("role", "status"); document.body.append(el); } el.textContent = message; el.classList.add("show"); setTimeout(() => el.classList.remove("show"), 2600); }
    function creatorId() { return localStorage.getItem("brandifyCreatorId") || "creator-default"; }
    function syncCreator() {
        let account = read("brandifyAccount", null); if (!account || !account.email) return null;
        const id = localStorage.getItem("brandifyCreatorId") || ("creator-" + account.email.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
        localStorage.setItem("brandifyCreatorId", id);
        const list = creators(); const index = list.findIndex(x => x.id === id || String(x.email).toLowerCase() === String(account.email).toLowerCase());
        const old = index >= 0 ? list[index] : {};
        const record = Object.assign({}, old, { id, name: account.fullName || old.name || "Creator", phone: account.phone || old.phone || "", email: account.email, brandName: localStorage.getItem("brandifyBrandName") || old.brandName || "", createdAt: old.createdAt || new Date().toISOString(), status: old.status || "Active", products: read("brandifyMyProducts", []), orders: orders().filter(o => o.creatorId === id), payoutDetails: read("brandifyPayoutDetails", old.payoutDetails || null) });
        if (index >= 0) list[index] = record; else list.push(record);
        write("brandifyCreators", list); return record;
    }
    window.BrandifyAdminData = { categories, read, write, catalog, saveCatalog, creators, orders, status, money, escape, toast, creatorId, syncCreator };
})();
