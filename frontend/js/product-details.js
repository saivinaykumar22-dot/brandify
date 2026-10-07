document.addEventListener("DOMContentLoaded", function () {
    "use strict";

    const root = document.getElementById("productDetails");
    if (!root) return;

    const params = new URLSearchParams(window.location.search);
    const productId = params.get("id");
    const fromDashboard = params.get("from") === "dashboard";
    const product = (window.BrandifyCatalog ? window.BrandifyCatalog.getAll() : (window.BRANDIFY_PRODUCTS || [])).find(function (item) { return item.id === productId; });

    function escapeHTML(value) {
        return String(value == null ? "" : value).replace(/[&<>"']/g, function (character) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character];
        });
    }
    function readArray(key) {
        try {
            const value = JSON.parse(localStorage.getItem(key) || "[]");
            return Array.isArray(value) ? value : (value ? [value] : []);
        } catch (error) { return []; }
    }
    function writeArray(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
    function humanize(key) {
        const labels = {
            netQuantity: "Net Quantity", skinType: "Skin Type", hairType: "Hair Type", keyIngredients: "Key Ingredients",
            servingSize: "Serving Size", shelfLife: "Shelf Life", printArea: "Print Area", designArea: "Design Area",
            gsm: "Weight / GSM", production: "Production", fulfillment: "Fulfillment", shipping: "Shipping",
            careInstructions: "Care Instructions", productType: "Product Type", roastBlend: "Roast / Blend"
        };
        if (labels[key]) return labels[key];
        return key.replace(/([A-Z])/g, " $1").replace(/^./, function (letter) { return letter.toUpperCase(); });
    }
    function displayValue(value) {
        if (Array.isArray(value)) return value.map(displayValue).filter(Boolean).join(" · ");
        if (value && typeof value === "object") return "";
        if (typeof value === "boolean" || value == null) return "";
        return String(value).trim();
    }
    function detailsMarkup(details) {
        if (!details || typeof details !== "object" || Array.isArray(details)) return "";
        const rows = Object.entries(details).map(function (entry) {
            const value = displayValue(entry[1]);
            return value ? `<div class="product-spec-row"><dt>${escapeHTML(humanize(entry[0]))}</dt><dd>${escapeHTML(value)}</dd></div>` : "";
        }).filter(Boolean).join("");
        return rows ? `<section class="product-detail-section"><h2>Product Details</h2><dl class="product-spec-list">${rows}</dl></section>` : "";
    }
    function customizationMarkup(customization) {
        if (!customization) return "";
        const options = Array.isArray(customization)
            ? customization.map(function (option) { return typeof option === "string" ? option : ""; })
            : typeof customization === "object"
                ? Object.entries(customization).filter(function (entry) { return entry[1] === true; }).map(function (entry) { return humanize(entry[0]); })
                : [];
        const unique = Array.from(new Set(options.filter(Boolean)));
        return unique.length ? `<section class="product-detail-section"><h2>Customization</h2><ul class="product-customization-list">${unique.map(function (option) { return `<li><span aria-hidden="true">✓</span>${escapeHTML(option)}</li>`; }).join("")}</ul></section>` : "";
    }
    function savedProductIds() { return readArray("brandifySavedProducts").filter(function (id) { return typeof id === "string"; }); }
    function catalogDestination() { return fromDashboard ? "dashboard.html#catalog" : "products.html"; }

    if (!product) {
        root.innerHTML = `<div class="product-not-found"><h1>Product not found</h1><p>Choose a product from the Brandify catalog to see its details.</p><a href="${catalogDestination()}">← Back to Product Catalog</a></div>`;
        return;
    }

    const suppliedImages = Array.isArray(product.images) && product.images.length ? product.images : (Array.isArray(product.gallery) ? product.gallery : []);
    const imageList = Array.from(new Set([].concat(suppliedImages, product.image || []).filter(function (image) { return typeof image === "string" && image; })));
    const images = imageList.length ? imageList : [];
    const addedProducts = readArray("brandifyMyProducts");
    const removedLegacyProducts = readArray("brandifyRemovedMyProducts");
    const isAdded = addedProducts.some(function (item) { return item && (item.masterProductId === product.id || item.id === product.id); }) ||
        (readArray("brandifyProduct").includes(product.name) && !removedLegacyProducts.includes(product.id));
    const isSaved = savedProductIds().includes(product.id);
    const priceValue = product.basePrice != null ? product.basePrice : product.price;
    const numericPrice = Number(priceValue);
    const formattedPrice = Number.isFinite(numericPrice) && numericPrice > 0
        ? `₹${numericPrice.toLocaleString("en-IN")}`
        : (typeof priceValue === "string" ? priceValue.trim() : "");
    const startingPrice = formattedPrice
        ? `<div class="product-detail-price"><span>Starting from</span><strong>${escapeHTML(formattedPrice)}</strong></div>${product.basePrice != null ? `<p class="product-detail-price-note">Base product cost. Set your own selling price in your dashboard.</p>` : ""}`
        : "";
    const productDescription = product.description ? `<p class="product-detail-description">${escapeHTML(product.description)}</p>` : "";
    const productionDetails = ["production", "fulfillment", "shipping"].reduce(function (all, key) {
        if (product[key]) all[key] = product[key];
        return all;
    }, {});
    const moreDetails = detailsMarkup(productionDetails);
    const customizable = customizationMarkup(product.customization);
    const breadcrumbStart = fromDashboard
        ? `<a href="dashboard.html">Dashboard</a><span>›</span><a href="dashboard.html#catalog">Product Catalog</a>`
        : `<a href="../index.html">Home</a><span>›</span><a href="products.html">Products</a>`;
    const primaryImages = images.length
        ? `<div class="product-detail-image-wrap"><img id="productMainImage" src="${escapeHTML(images[0])}" alt="${escapeHTML(product.name)}"></div>${images.length > 1 ? `<div class="product-image-thumbnails" aria-label="More product images">${images.map(function (image, index) { return `<button type="button" class="product-image-thumbnail ${index === 0 ? "active" : ""}" data-gallery-image="${index}" aria-label="Show product image ${index + 1}" aria-pressed="${index === 0}"><img src="${escapeHTML(image)}" alt=""></button>`; }).join("")}</div>` : ""}`
        : "";

    const unavailable = product.status === "Archived" || product.status === "Inactive" || Number(product.stock) <= 0;
    const masterStatus = Number(product.stock) <= 0 ? "Out of stock" : product.status === "Inactive" ? "Currently unavailable" : product.status === "Archived" ? "No longer available" : "";
    root.innerHTML = `<nav class="product-breadcrumb" aria-label="Breadcrumb">${breadcrumbStart}<span>›</span><span aria-current="page">${escapeHTML(product.name)}</span></nav><div class="product-details-layout ${images.length ? "" : "no-product-image"}">${images.length ? `<div class="product-detail-gallery">${primaryImages}</div>` : ""}<section class="product-detail-copy"><span class="product-detail-category">${product.categoryImage ? `<img src="${escapeHTML(product.categoryImage)}" alt="">` : ""}${escapeHTML(product.category || "")}</span><h1>${escapeHTML(product.name)}</h1>${masterStatus ? `<p class="product-detail-description">${masterStatus}</p>` : ""}${productDescription}${detailsMarkup(product.details)}${customizable}${moreDetails}${startingPrice}<div class="product-detail-actions"><button type="button" class="product-add-button" id="addToMyBrand" ${unavailable && !isAdded ? "disabled" : ""}>${isAdded ? "Already in My Products ✓" : unavailable ? masterStatus : "+ Add to My Brand"}</button><button type="button" class="product-save-button ${isSaved ? "saved" : ""}" id="saveProductButton" aria-pressed="${isSaved}">${isSaved ? "♥ Saved" : "♡ Save Product"}</button></div><div class="product-feedback" id="productFeedback" role="status" aria-live="polite" ${isAdded ? "" : "hidden"}><strong>${isAdded ? "Already in My Products ✓" : "Added to your brand ✓"}</strong><p>${escapeHTML(product.name)} is in your product list.</p><div class="product-feedback-actions"><a class="primary" href="dashboard.html#customize/${encodeURIComponent(product.id)}" id="customizeNow">Customize Now →</a><a href="${catalogDestination()}">Continue Exploring</a></div></div></section></div>`;
    const existingCreatorCopy = addedProducts.find(function (item) { return item && item.masterProductId === product.id; });
    const customizeNowLink = document.getElementById("customizeNow");
    if (existingCreatorCopy && customizeNowLink) customizeNowLink.href = `dashboard.html#customize/${encodeURIComponent(existingCreatorCopy.id)}`;

    root.querySelectorAll("[data-gallery-image]").forEach(function (button) {
        button.addEventListener("click", function () {
            const index = Number(button.dataset.galleryImage);
            const mainImage = document.getElementById("productMainImage");
            if (!images[index] || !mainImage) return;
            mainImage.src = images[index];
            root.querySelectorAll("[data-gallery-image]").forEach(function (thumbnail) {
                const active = thumbnail === button;
                thumbnail.classList.toggle("active", active);
                thumbnail.setAttribute("aria-pressed", String(active));
            });
        });
    });

    document.getElementById("saveProductButton").addEventListener("click", function (event) {
        const button = event.currentTarget;
        const ids = savedProductIds();
        const saved = ids.includes(product.id);
        writeArray("brandifySavedProducts", saved ? ids.filter(function (id) { return id !== product.id; }) : ids.concat(product.id));
        button.classList.toggle("saved", !saved);
        button.setAttribute("aria-pressed", String(!saved));
        button.textContent = saved ? "♡ Save Product" : "♥ Saved";
    });

    document.getElementById("addToMyBrand").addEventListener("click", function (event) {
        const button = event.currentTarget;
        const currentProducts = readArray("brandifyMyProducts");
        const index = currentProducts.findIndex(function (item) { return item && (item.masterProductId === product.id || item.id === product.id); });
        if (index < 0) {
            if (product.status === "Archived" || product.status === "Inactive" || Number(product.stock) <= 0) return;
            const creatorId = window.BrandifyCreatorData ? window.BrandifyCreatorData.id() : (localStorage.getItem("brandifyCreatorId") || "creator-default");
            const creatorProductId = `creator-product-${Date.now().toString(36)}`;
            currentProducts.push({ id: creatorProductId, masterProductId: product.id, creatorId: creatorId, name: product.name, image: product.image || images[0] || "", images: images, categoryImage: product.categoryImage || "", category: product.category, basePrice: product.basePrice || null, status: "Draft", source: "catalog" });
            writeArray("brandifyMyProducts", currentProducts);
            const customizeLink = document.getElementById("customizeNow");
            if (customizeLink) customizeLink.href = `dashboard.html#customize/${encodeURIComponent(creatorProductId)}`;
        }
        writeArray("brandifyRemovedMyProducts", readArray("brandifyRemovedMyProducts").filter(function (id) { return id !== product.id; }));
        document.getElementById("productFeedback").hidden = false;
        button.textContent = index >= 0 ? "Already in My Products ✓" : "Added to My Brand ✓";
    });
});
