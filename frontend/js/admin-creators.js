document.addEventListener("DOMContentLoaded", function () {
    "use strict";

    const data = window.BrandifyAdminData;
    if (!(window.BrandifyBackend && window.BrandifyBackend.isConfigured())) data.syncCreator();

    const root = document.getElementById("creatorsTable");
    const search = document.getElementById("creatorSearch");
    const modal = document.getElementById("creatorModal");

    function render() {
        const query = search.value.trim().toLowerCase();
        const creators = data.creators().filter(function (creator) {
            return `${creator.name} ${creator.email} ${creator.phone || ""} ${creator.brandName}`.toLowerCase().includes(query);
        });

        root.innerHTML = creators.length ? `<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Name</th><th>Brand</th><th>Email</th><th>Phone</th><th>Products</th><th>Orders</th><th>Created</th><th>Status</th><th></th></tr></thead><tbody>${creators.map(function (creator) {
            const status = creator.status || "Active";
            return `<tr><td>${data.escape(creator.name || "Creator")}</td><td>${data.escape(creator.brandName || "—")}</td><td>${data.escape(creator.email || "—")}</td><td>${data.escape(creator.phone || "—")}</td><td>${(creator.products || []).length}</td><td>${(creator.orders || []).length}</td><td>${data.escape((creator.createdAt || "").slice(0, 10) || "—")}</td><td><span class="admin-badge ${status === "Inactive" ? "muted" : ""}">${data.escape(status)}</span></td><td><div class="admin-small-actions"><button class="admin-button" type="button" data-view="${data.escape(creator.id)}">View</button><button class="admin-button" type="button" data-toggle="${data.escape(creator.id)}">${status === "Active" ? "Deactivate" : "Activate"}</button></div></td></tr>`;
        }).join("")}</tbody></table></div>` : '<div class="admin-empty"><strong>No creators yet</strong>New creator accounts will appear here after signup.</div>';
    }

    function viewCreator(id) {
        const creator = data.creators().find(function (item) { return item.id === id; });
        if (!creator) return;
        modal.innerHTML = `<div class="admin-modal-backdrop"><section class="admin-modal" role="dialog" aria-modal="true" aria-labelledby="creatorDetailsTitle"><h2 id="creatorDetailsTitle">${data.escape(creator.name || "Creator")}</h2><p>${data.escape(creator.brandName || "Brand not set")}<br>${data.escape(creator.email || "—")}<br>Phone: ${data.escape(creator.phone || "—")}</p><p>Products: ${(creator.products || []).length}<br>Orders: ${(creator.orders || []).length}<br>Joined: ${data.escape(creator.createdAt || "—")}<br>Status: ${data.escape(creator.status || "Active")}</p><button class="admin-button" type="button" data-close>Close</button></section></div>`;
        modal.querySelector("[data-close]").addEventListener("click", function () { modal.innerHTML = ""; });
        modal.querySelector(".admin-modal-backdrop").addEventListener("click", function (event) {
            if (event.target === event.currentTarget) modal.innerHTML = "";
        });
    }

    async function toggleCreator(button) {
        const id = button.dataset.toggle;
        const creator = data.creators().find(function (item) { return item.id === id; });
        if (!creator) return;
        const status = creator.status === "Active" ? "Inactive" : "Active";
        button.disabled = true;
        try {
            if (window.BrandifyBackend && window.BrandifyBackend.isConfigured()) {
                await window.BrandifyBackend.updateCreatorStatus(id, status);
            } else {
                data.write("brandifyCreators", data.creators().map(function (item) {
                    return item.id === id ? Object.assign({}, item, { status: status }) : item;
                }));
            }
            render();
            data.toast(`Creator ${status.toLowerCase()}.`);
        } catch (error) {
            button.disabled = false;
            data.toast(error.message || "Could not update creator status.");
        }
    }

    root.addEventListener("click", function (event) {
        const viewButton = event.target.closest("[data-view]");
        if (viewButton) {
            viewCreator(viewButton.dataset.view);
            return;
        }
        const toggleButton = event.target.closest("[data-toggle]");
        if (toggleButton) toggleCreator(toggleButton);
    });
    search.addEventListener("input", render);
    window.addEventListener("brandify-backend-ready", render);
    window.addEventListener("storage", function (event) {
        if (event.key === "brandifyCreators") render();
    });
    window.addEventListener("brandify-storage-update", render);
    render();
});
