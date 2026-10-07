document.addEventListener("DOMContentLoaded", function () {
    "use strict";

    let products = window.BrandifyCatalog ? window.BrandifyCatalog.getCreatorCatalog() : (window.BRANDIFY_PRODUCTS || []);
    const categories = window.BRANDIFY_CATEGORIES || [];
    const grid = document.getElementById("catalogProducts");
    const categoryList = document.getElementById("catalogCategories");
    const search = document.getElementById("catalogSearch");
    const emptyState = document.getElementById("catalogEmpty");
    const count = document.getElementById("catalogCount");
    let selectedCategory = "All";
    let query = "";

    function escapeHTML(value) {
        return String(value == null ? "" : value).replace(/[&<>"']/g, function (character) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character];
        });
    }

    function categoryMarkup() {
        return `<button type="button" class="catalog-category-button catalog-category-all active" data-category="All" aria-pressed="true">All</button>` + categories.map(function (category) {
            return `<button type="button" class="catalog-category-button" data-category="${escapeHTML(category.name)}" aria-pressed="false"><img src="${escapeHTML(category.image)}" alt="" loading="lazy"><span>${escapeHTML(category.name)}</span></button>`;
        }).join("");
    }

    function getVisibleProducts() {
        const normalizedQuery = query.trim().toLowerCase();
        return products.filter(function (product) {
            const categoryMatches = selectedCategory === "All" || product.category === selectedCategory;
            const searchMatches = !normalizedQuery || `${product.name} ${product.category}`.toLowerCase().includes(normalizedQuery);
            return categoryMatches && searchMatches;
        });
    }

    function render() {
        const visibleProducts = getVisibleProducts();
        grid.innerHTML = visibleProducts.map(function (product) {
            const price = product.basePrice ? `<div class="catalog-product-price">Starting from <strong>₹${Number(product.basePrice).toLocaleString("en-IN")}</strong></div>` : "";
            const unavailable = Number(product.stock) <= 0;
            return `<article class="catalog-product-card"><a class="catalog-product-image" href="product-details.html?id=${encodeURIComponent(product.id)}" aria-label="View ${escapeHTML(product.name)}"><img src="${escapeHTML(product.image)}" alt="${escapeHTML(product.name)}" loading="lazy"></a><div class="catalog-product-info"><div class="catalog-product-category"><img src="${escapeHTML(product.categoryImage)}" alt="" loading="lazy">${escapeHTML(product.category)}</div><h2>${escapeHTML(product.name)}</h2>${unavailable ? `<span class="catalog-product-customization" aria-label="Out of stock">Out of stock</span>` : product.customizationAvailable ? `<span class="catalog-product-customization">Customization available</span>` : ""}${price}<a class="catalog-view-button" href="product-details.html?id=${encodeURIComponent(product.id)}">View Product <span aria-hidden="true">→</span></a></div></article>`;
        }).join("");
        emptyState.hidden = visibleProducts.length > 0;
        count.textContent = `${visibleProducts.length} ${visibleProducts.length === 1 ? "product" : "products"}`;
        categoryList.querySelectorAll("[data-category]").forEach(function (button) {
            const isActive = button.dataset.category === selectedCategory;
            button.classList.toggle("active", isActive);
            button.setAttribute("aria-pressed", String(isActive));
        });
    }

    categoryList.innerHTML = categoryMarkup();
    categoryList.addEventListener("click", function (event) {
        const button = event.target.closest("[data-category]");
        if (!button) return;
        selectedCategory = button.dataset.category;
        render();
    });
    search.addEventListener("input", function () {
        query = search.value;
        render();
    });
    window.addEventListener("storage", function (event) {
        if (event.key !== "brandifyProductCatalog") return;
        products = window.BrandifyCatalog ? window.BrandifyCatalog.getCreatorCatalog() : (window.BRANDIFY_PRODUCTS || []).filter(function (product) { return product.status !== "Archived" && product.status !== "Inactive"; });
        render();
    });
    render();
});
