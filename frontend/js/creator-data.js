(function () {
    "use strict";

    function read(key, fallback) {
        try {
            return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
        } catch (error) {
            return fallback;
        }
    }

    function sync() {
        const account = read("brandifyAccount", null);
        if (!account || !account.email) return null;

        const id = localStorage.getItem("brandifyCreatorId") ||
            ("creator-" + account.email.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
        localStorage.setItem("brandifyCreatorId", id);

        const creators = read("brandifyCreators", []);
        const index = creators.findIndex(function (creator) {
            return creator.id === id || String(creator.email).toLowerCase() === String(account.email).toLowerCase();
        });
        const previous = index >= 0 ? creators[index] : {};
        const row = Object.assign({}, previous, {
            id: id,
            name: account.fullName || previous.name || "Creator",
            phone: account.phone || previous.phone || "",
            email: account.email,
            brandName: localStorage.getItem("brandifyBrandName") || previous.brandName || "",
            createdAt: previous.createdAt || new Date().toISOString(),
            status: previous.status || "Active",
            products: read("brandifyMyProducts", []),
            payoutDetails: read("brandifyPayoutDetails", previous.payoutDetails || null)
        });

        if (index >= 0) creators[index] = row;
        else creators.push(row);
        localStorage.setItem("brandifyCreators", JSON.stringify(creators));
        return row;
    }

    window.BrandifyCreatorData = {
        sync: sync,
        id: function () { return localStorage.getItem("brandifyCreatorId") || ""; }
    };
})();
