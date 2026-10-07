document.addEventListener("DOMContentLoaded", function () {
    const D = window.BrandifyAdminData;
    const search = document.getElementById("productSearch");
    const category = document.getElementById("productCategory");
    const statusFilter = document.getElementById("productStatus");
    const root = document.getElementById("productsTable");

    D.categories.forEach(function (item) {
        category.insertAdjacentHTML("beforeend", `<option>${D.escape(item)}</option>`);
    });

    function saveStatus(id, status) {
        D.saveCatalog(D.catalog().map(function (product) {
            return product.id === id ? Object.assign({}, product, { status: status, updatedAt: new Date().toISOString() }) : product;
        }));
        D.toast(`Product set to ${status.toLowerCase()}`);
        render();
    }

    function confirmArchive(id, select) {
        const product = D.catalog().find(function (item) { return item.id === id; });
        const overlay = document.createElement("div");
        overlay.className = "admin-modal-backdrop";
        overlay.innerHTML = `<section class="admin-modal" role="dialog" aria-modal="true" aria-labelledby="archiveTitle"><h2 id="archiveTitle">Archive ${D.escape(product ? product.name : "product")}?</h2><p>This removes the product from creator catalogs. Existing creator product copies remain in their accounts.</p><div class="admin-form-actions"><button class="admin-button" type="button" data-cancel>Cancel</button><button class="admin-button danger" type="button" data-confirm>Archive product</button></div></section>`;
        document.body.append(overlay);
        overlay.querySelector("[data-cancel]").addEventListener("click", function () { overlay.remove(); render(); });
        overlay.addEventListener("click", function (event) { if (event.target === overlay) { overlay.remove(); render(); } });
        overlay.querySelector("[data-confirm]").addEventListener("click", function () { overlay.remove(); saveStatus(id, "Archived"); });
        if (select) select.focus();
    }

    function render() {
        const query = search.value.trim().toLowerCase();
        const products = D.catalog().filter(function (product) {
            return (!query || `${product.name} ${product.category}`.toLowerCase().includes(query)) &&
                (!category.value || product.category === category.value) &&
                (!statusFilter.value || D.status(product) === statusFilter.value);
        });
        document.getElementById("productCount").textContent = `${products.length} products`;
        root.innerHTML = products.length ? `<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Product</th><th>Category</th><th>Base price</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead><tbody>${products.map(function (product) {
            const selectedStatus = product.status === "Inactive" || product.status === "Archived" ? product.status : "Active";
            return `<tr><td><div class="admin-product-cell"><img src="${D.escape(product.image || "")}" alt=""><span>${D.escape(product.name)}</span></div></td><td>${D.escape(product.category)}</td><td>${D.money(product.basePrice)}</td><td>${product.stock == null ? "Not set" : Number(product.stock)}</td><td><span class="admin-badge ${D.status(product) === "Out of Stock" ? "warning" : D.status(product) === "Archived" ? "muted" : ""}">${D.status(product)}</span></td><td><div class="admin-product-actions"><a href="admin-product-form.html?id=${encodeURIComponent(product.id)}&view=1">View</a><a href="admin-product-form.html?id=${encodeURIComponent(product.id)}">Edit</a><select class="admin-select admin-status-select" aria-label="Change status for ${D.escape(product.name)}" data-status-id="${D.escape(product.id)}"><option value="Active" ${selectedStatus === "Active" ? "selected" : ""}>Active</option><option value="Inactive" ${selectedStatus === "Inactive" ? "selected" : ""}>Inactive</option><option value="Archived" ${selectedStatus === "Archived" ? "selected" : ""}>Archive</option></select></div></td></tr>`;
        }).join("")}</tbody></table></div>` : '<div class="admin-empty"><strong>No products found</strong>Try another search or add a product to the catalog.</div>';
        root.querySelectorAll("[data-status-id]").forEach(function (select) {
            select.addEventListener("change", function () {
                if (select.value === "Archived") { confirmArchive(select.dataset.statusId, select); return; }
                saveStatus(select.dataset.statusId, select.value);
            });
        });
    }

    [search, category, statusFilter].forEach(function (element) { element.addEventListener("input", render); });
    [category, statusFilter].forEach(function (element) { element.addEventListener("change", render); });
    render();
});
