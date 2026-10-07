document.addEventListener("DOMContentLoaded", function () {
    "use strict";

    const content = document.getElementById("dashboardContent");
    if (window.BrandifyCreatorData) window.BrandifyCreatorData.sync();
    const nav = document.getElementById("dashboardNavigation");
    const sidebar = document.getElementById("dashboardSidebar");
    const overlay = document.getElementById("dashboardOverlay");
    const titles = { dashboard: "Dashboard", catalog: "Product Catalog", products: "My Products", orders: "Orders", customers: "Customers", analytics: "Analytics", brand: "My Brand", store: "Store", channels: "Sales Channels", payouts: "Payouts", settings: "Settings", help: "Help & Support", customize: "Customize Product", pricing: "Set Price", review: "Review Product" };
    let currentView = "dashboard";
    let activeOrderFilter = "All";
    let productQuery = "";
    let productFilter = "All Products";
    let customerQuery = "";
    let orderSearchQuery = "";
    let dashboardCatalogCategory = "All";
    let dashboardCatalogQuery = "";
    let currentProductId = "";
    let currentRequestId = "";
    let openedRequestNotification = "";
    let editingProductMode = false;
    let storeEditMode = false;
    let payoutEditMode = false;
    let orderRequestMode = false;
    let editingRequestId = "";
    let toastTimer;

    function read(key, fallback) {
        try {
            const value = localStorage.getItem(key);
            return value == null ? fallback : JSON.parse(value);
        } catch (error) { return fallback; }
    }
    function savedText(key, fallback) { return localStorage.getItem(key) || fallback; }
    function arrayValue(key) {
        const value = read(key, []);
        return Array.isArray(value) ? value : (value ? [value] : []);
    }
    function escapeHTML(value) {
        return String(value == null ? "" : value).replace(/[&<>"']/g, function (character) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character];
        });
    }
    function money(value) {
        const number = Number(value);
        return Number.isFinite(number) ? `₹${number.toLocaleString("en-IN")}` : "—";
    }
    function getAccount() { return read("brandifyAccount", {}); }
    function getBrand() { return savedText("brandifyBrandName", "Your Brand"); }
    function getCreator() {
        const account = getAccount();
        return account && account.fullName ? account.fullName : "Creator";
    }
    localStorage.removeItem("brandifyDashboardDemoData");
    function creatorOrderRecords() {
        const records = read("brandifyOrders", []);
        const account = getAccount() || {};
        const creatorId = localStorage.getItem("brandifyCreatorId") || "";
        return (Array.isArray(records) ? records : []).filter(function (record) {
            const owner = record.creator && typeof record.creator === "object" ? record.creator : {};
            const ownerId = record.creatorId || owner.id || "";
            const ownerEmail = record.creatorEmail || owner.email || "";
            return (creatorId && ownerId === creatorId) || (ownerEmail && account.email && ownerEmail.toLowerCase() === account.email.toLowerCase());
        }).map(function (record) {
            const customer = record.customer && typeof record.customer === "object" ? record.customer : {};
            const product = record.product && typeof record.product === "object" ? record.product : {};
            const amount = record.creatorRevenue != null ? record.creatorRevenue : (record.amount != null ? record.amount : record.totalAmount != null ? record.totalAmount : record.total);
            const date = record.createdAt || record.date || record.timestamp || "";
            const itemSummary = Array.isArray(record.items) ? record.items.map(function (item) { return `${item.productName || item.name || "Product"} × ${Number(item.quantity) || 1}`; }).join(", ") : "";
            return {
                id: String(record.id || record.orderId || ""),
                customer: record.customerName || (typeof record.customer === "string" ? record.customer : customer.name) || record.customerEmail || customer.email || "Not provided",
                customerEmail: record.customerEmail || customer.email || "",
                product: record.productName || itemSummary || (typeof record.product === "string" ? record.product : product.name) || "Not provided",
                amount: amount == null ? NaN : Number(amount),
                quantity: Math.max(1, Number(record.quantity || record.qty || 1)),
                status: record.status || "Not set",
                paymentStatus: record.customerPaymentStatus || "",
                date: date,
                source: record
            };
        });
    }
    function creatorRequests() {
        const creatorId = localStorage.getItem("brandifyCreatorId") || "";
        return (window.BrandifyOrderWorkflow ? window.BrandifyOrderWorkflow.list("brandifyOrderRequests") : read("brandifyOrderRequests", [])).filter(function (request) { return request && request.creatorId === creatorId; });
    }
    function creatorNotifications() {
        const id = localStorage.getItem("brandifyCreatorId") || "";
        return (window.BrandifyOrderWorkflow ? window.BrandifyOrderWorkflow.list("brandifyNotifications") : read("brandifyNotifications", [])).filter(function (item) { return item && item.recipientType === "creator" && item.recipientId === id; });
    }
    function requestableProducts() {
        const creatorId = localStorage.getItem("brandifyCreatorId") || "";
        const masterProducts = window.BrandifyCatalog ? window.BrandifyCatalog.getAll() : (window.BRANDIFY_PRODUCTS || []);
        const products = getMyProducts().filter(function (product) {
            if (product.creatorId && product.creatorId !== creatorId) return false;
            if (!["Ready", "Published"].includes(String(product.status || "").toLowerCase().replace(/^./, function (letter) { return letter.toUpperCase(); }))) return false;
            if (!Number(product.sellingPrice) || !Array.isArray(product.customization) || !product.customization.length) return false;
            const master = masterProducts.find(function (item) { return item.id === product.masterProductId || item.id === product.id; });
            if (master && (["archived", "inactive", "out of stock"].includes(String(master.status || "").toLowerCase()) || (master.stock != null && Number(master.stock) <= 0))) return false;
            return true;
        });
        const editing = editingRequestId && creatorRequests().find(function (request) { return request.requestId === editingRequestId; });
        (editing && editing.items || []).forEach(function (item) {
            if (products.some(function (product) { return product.id === item.productId; })) return;
            products.push({ id: item.productId, masterProductId: item.masterProductId, name: item.productName, image: item.productImage, category: item.category, basePrice: item.fulfillmentCost, sellingPrice: item.sellingPrice, customization: item.customization || [], variants: item.variants || {}, status: "Saved request product" });
        });
        return products;
    }
    function addressMarkup(address) {
        if (!address) return "—";
        return [address.addressLine1, address.addressLine2, address.city, address.state, address.pincode, address.country].filter(Boolean).map(escapeHTML).join(", ") || "—";
    }
    function isCompletedOrder(order) {
        return ["paid", "delivered", "complete", "completed"].includes(String(order.status || "").toLowerCase());
    }
    function isRevenueOrder(order) { return String(order.status || "").toLowerCase() !== "cancelled" && (order.paymentStatus === "Paid to Creator" || isCompletedOrder(order)); }
    function actualRevenue(orders) {
        return orders.filter(isRevenueOrder).reduce(function (total, order) { return total + (Number.isFinite(order.amount) ? order.amount : 0); }, 0);
    }
    function customerRecords(orders) {
        const customers = new Map();
        orders.forEach(function (order) {
            if (order.customer === "Not provided") return;
            const key = (order.customerEmail || order.customer).toLowerCase();
            const customer = customers.get(key) || { name: order.customer, email: order.customerEmail, orders: 0, spent: 0, lastOrder: "—" };
            customer.orders += 1;
            if (isRevenueOrder(order) && Number.isFinite(order.amount)) customer.spent += order.amount;
            if (order.date) customer.lastOrder = formatOrderDate(order.date);
            customers.set(key, customer);
        });
        return Array.from(customers.values());
    }
    function formatOrderDate(value) {
        if (!value) return "—";
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString();
    }
    function salesTrend(orders, period) {
        const datedOrders = orders.map(function (order) { return { order: order, date: new Date(order.date) }; }).filter(function (item) { return !Number.isNaN(item.date.getTime()) && isRevenueOrder(item.order) && Number.isFinite(item.order.amount); });
        if (!datedOrders.length) return null;
        const now = new Date();
        let buckets = [];
        if (period === "7 Days") {
            buckets = Array.from({ length: 7 }, function (_, index) { const date = new Date(now); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() - (6 - index)); return { label: date.toLocaleDateString(undefined, { weekday: "short" }), start: date, end: new Date(date.getTime() + 86400000) }; });
        } else if (period === "30 Days") {
            buckets = Array.from({ length: 6 }, function (_, index) { const start = new Date(now); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - (29 - index * 5)); const end = new Date(start); end.setDate(end.getDate() + 5); return { label: `${start.getDate()}/${start.getMonth() + 1}`, start: start, end: end }; });
        } else {
            const count = period === "3 Months" ? 3 : 12;
            buckets = Array.from({ length: count }, function (_, index) { const start = new Date(now.getFullYear(), now.getMonth() - (count - 1 - index), 1); const end = new Date(start.getFullYear(), start.getMonth() + 1, 1); return { label: start.toLocaleDateString(undefined, { month: "short" }), start: start, end: end }; });
        }
        return { labels: buckets.map(function (bucket) { return bucket.label; }), values: buckets.map(function (bucket) { return datedOrders.reduce(function (sum, item) { return item.date >= bucket.start && item.date < bucket.end ? sum + item.order.amount : sum; }, 0); }) };
    }
    function initials(name) {
        const words = String(name || "Creator").trim().split(/\s+/);
        return (words.length > 1 ? words[0][0] + words[words.length - 1][0] : words[0].slice(0, 2)).toUpperCase();
    }
    function showToast(message) {
        const toast = document.getElementById("dashboardToast");
        toast.textContent = message;
        toast.classList.add("show");
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { toast.classList.remove("show"); }, 2600);
    }
    function setHeader() {
        const creator = getCreator();
        const brand = getBrand();
        document.getElementById("pageTitle").textContent = editingProductMode && currentView === "customize" ? "Edit Product" : (titles[currentView] || "Dashboard");
        document.getElementById("topbarBrandName").textContent = brand;
        document.getElementById("sidebarBrandName").textContent = brand;
        document.getElementById("sidebarBrandMark").textContent = initials(brand).slice(0, 1);
        document.getElementById("sidebarUserName").textContent = creator;
        ["sidebarAvatar", "topbarAvatar"].forEach(function (id) { document.getElementById(id).textContent = initials(creator); });
        const notificationButton = document.getElementById("notificationButton");
        if (notificationButton) {
            const unread = creatorNotifications().filter(function (item) { return !item.read; }).length;
            notificationButton.setAttribute("aria-label", unread ? `${unread} unread notifications` : "Notifications");
            notificationButton.innerHTML = `<span>🔔</span>${unread ? `<b class="notification-count">${unread > 9 ? "9+" : unread}</b>` : ""}`;
        }
        document.querySelectorAll(".dashboard-nav-link[data-view]").forEach(function (button) {
            button.classList.toggle("active", button.dataset.view === currentView);
        });
    }
    function navigate(view, productId) {
        if (!titles[view]) return;
        if (view !== "customize") editingProductMode = false;
        currentView = view;
        if (productId) currentProductId = productId;
        if (view !== "orders") currentRequestId = "";
        setHeader();
        render();
        closeMobileMenu();
        const hash = `#${view}${currentProductId && ["customize", "pricing", "review"].includes(view) ? `/${encodeURIComponent(currentProductId)}` : ""}`;
        if (location.hash !== hash) history.replaceState(null, "", hash);
        content.focus({ preventScroll: true });
        window.scrollTo({ top: 0, behavior: "smooth" });
    }
    function closeMobileMenu() {
        sidebar.classList.remove("open");
        overlay.classList.remove("show");
        document.getElementById("mobileMenuButton").setAttribute("aria-expanded", "false");
    }
    function heading(title, subtitle, action) {
        return `<div class="page-heading"><div><h1>${title}</h1><p>${subtitle}</p></div>${action ? `<div class="heading-actions">${action}</div>` : ""}</div>`;
    }
    function panel(title, body, action, extraClass) {
        return `<section class="panel ${extraClass || ""}"><div class="panel-heading"><h2>${title}</h2>${action || ""}</div>${body}</section>`;
    }
    const productAssets = {
        "hoodies": "fashion/01-hoodie.png", "t-shirts": "fashion/02-t-shirt.png", "t-shirt": "fashion/02-t-shirt.png", "jeans": "fashion/03-jeans.png", "caps": "fashion/04-cap.png", "cap": "fashion/04-cap.png",
        "face wash": "beauty/01-face-wash.png", "moisturizer": "beauty/02-moisturizer.png", "face serum": "beauty/03-serum.png", "lipstick": "beauty/04-lipstick.png",
        "protein powder": "fitness/01-protein-powder.png", "shaker bottle": "fitness/02-shaker-bottle.png", "yoga mat": "fitness/03-yoga-mat.png", "dumbbells": "fitness/04-dumbbells.png",
        "mugs": "lifestyle/01-mug.png", "water bottles": "lifestyle/02-water-bottle.png", "notebooks": "lifestyle/03-notebook.png", "pens": "lifestyle/04-pen.png",
        "coffee": "food-beverage/01-coffee.png", "granola": "food-beverage/02-granola.png", "green tea": "food-beverage/03-green-tea.png", "juice": "food-beverage/04-juice.png",
        "sunglasses": "accessories/01-sunglasses.png", "watches": "accessories/02-watch.png", "wallets": "accessories/03-wallet.png", "backpacks": "accessories/04-backpack.png",
        "candles": "home/01-candle.png", "cushions": "home/02-cushion.png", "diffusers": "home/03-diffuser.png", "plants": "home/04-plant.png",
        "vitamins": "health-wellness/01-vitamins.png", "omega 3": "health-wellness/02-omega-3.png", "collagen": "health-wellness/03-collagen.png", "yoga products": "health-wellness/04-yoga-mat.png",
        "creator hoodies": "creator-merch/01-hoodie.png", "creator t-shirts": "creator-merch/02-t-shirt.png", "creator caps": "creator-merch/03-cap.png", "creator tote bags": "creator-merch/04-tote-bag.png"
    };
    const categoryFolder = { Fashion: "fashion", Beauty: "beauty", Fitness: "fitness", Lifestyle: "lifestyle", "Food & Beverage": "food-beverage", Accessories: "accessories", Home: "home", "Health & Wellness": "health-wellness", "Creator Merch": "creator-merch" };
    function productRows() {
        const category = arrayValue("brandifyCategory")[0] || "";
        const overrides = read("brandifyDashboardProductOverrides", {}) || {};
        const baseProducts = arrayValue("brandifyProduct").map(function (name) {
            const prices = read("brandifyProductPricing", {});
            const savedPrice = prices && prices[name] != null ? prices[name] : "";
            const price = savedPrice && typeof savedPrice === "object" ? savedPrice.sellingPrice : savedPrice;
            const image = productAssets[String(name).toLowerCase()];
            return Object.assign({ name: name, price: price || "", status: "Active", image: image ? `images/products/${image}` : "", source: "onboarding" }, overrides[name] || {});
        });
        const myBrandProducts = read("brandifyMyProducts", []);
        const addedProducts = (Array.isArray(myBrandProducts) ? myBrandProducts : []).filter(function (product) {
            return product && !baseProducts.some(function (selected) { return selected.name === product.name; });
        }).map(function (product) {
            return { id: product.id, name: product.name, category: product.category, image: product.image, price: product.basePrice || "", status: product.status || "Draft", source: "my-brand" };
        });
        const extras = read("brandifyDashboardProducts", []);
        const list = baseProducts.concat(addedProducts, Array.isArray(extras) ? extras : []);
        return list.map(function (product, index) {
            const p = Object.assign({ name: "Product", price: "", status: "Active", source: "onboarding" }, product);
            if (!p.image && categoryFolder[category]) {
                const fileByProduct = productAssets[String(p.name).toLowerCase()];
                if (fileByProduct) p.image = `images/products/${fileByProduct}`;
            }
            p.id = p.id || `onboarding-${index}`;
            return p;
        });
    }
    function getMyProducts() {
        const saved = read("brandifyMyProducts", []);
        const savedProducts = Array.isArray(saved) ? saved.slice() : [];
        const savedIds = new Set(savedProducts.map(function (item) { return item.id; }));
        const savedNames = new Set(savedProducts.map(function (item) { return item.name; }));
        const removedIds = new Set(arrayValue("brandifyRemovedMyProducts"));
        const categories = arrayValue("brandifyCategory");
        const selectedNames = arrayValue("brandifyProduct");
        const pricing = read("brandifyProductPricing", {}) || {};
        const legacyCustomization = arrayValue("brandifyCustomization");

        selectedNames.forEach(function (name) {
            const product = (window.BRANDIFY_PRODUCTS || []).find(function (item) {
                return item.name === name && categories.includes(item.category);
            }) || (window.BRANDIFY_PRODUCTS || []).find(function (item) { return item.name === name; });
            if (!product || savedIds.has(product.id) || savedNames.has(product.name) || removedIds.has(product.id)) return;
            const legacyPrice = pricing[name] && typeof pricing[name] === "object" ? pricing[name].sellingPrice : pricing[name];
            savedProducts.push({
                id: product.id,
                name: product.name,
                image: product.image,
                category: product.category,
                basePrice: product.basePrice,
                customization: legacyCustomization,
                sellingPrice: Number(legacyPrice) || null,
                status: legacyCustomization.length && Number(legacyPrice) ? "Ready" : "Draft",
                source: "onboarding"
            });
        });
        return savedProducts;
    }
    function saveMyProduct(product) {
        const products = read("brandifyMyProducts", []);
        const list = Array.isArray(products) ? products : [];
        const index = list.findIndex(function (item) { return item.id === product.id; });
        if (index < 0) list.push(product);
        else list[index] = Object.assign({}, list[index], product);
        localStorage.setItem("brandifyMyProducts", JSON.stringify(list));
    }
    function setupState() {
        const brandName = savedText("brandifyBrandName", "").trim();
        const category = arrayValue("brandifyCategory");
        const myProducts = getMyProducts();
        const identity = read("brandifyBrandIdentity", {}) || {};
        const payout = read("brandifyPayoutDetails", {}) || {};
        const store = read("brandifyStoreSetup", {}) || {};
        const hasBrand = localStorage.getItem("brandifyLaunchReady") === "true" && Boolean(brandName) && category.length > 0;
        const hasProduct = myProducts.length > 0;
        const hasCustomization = myProducts.some(function (product) { return Array.isArray(product.customization) && product.customization.length > 0; });
        const hasPrice = myProducts.some(function (product) { return Number(product.sellingPrice) > 0; });
        const hasIdentity = Boolean(identity && (identity.primaryColor || identity.secondaryColor || identity.font || identity.style));
        const hasChannels = Boolean(store && store.storeName && store.storeHandle);
        const hasPayout = Boolean(payout && payout.accountHolderName && payout.bankName && payout.accountNumber && payout.ifscCode);
        const tasks = [
            { id: "brand", title: "Brand Details", complete: hasBrand, detail: hasBrand ? `${brandName} · ${category.join(", ")}` : "Add your brand name and category.", view: "brand", action: "Review" },
            { id: "product", title: "Select Your Product", complete: hasProduct, detail: hasProduct ? `${myProducts.length} product${myProducts.length === 1 ? "" : "s"} in My Products` : "Choose a product from the catalog for your brand.", view: "catalog", action: "Choose Product" },
            { id: "customize", title: "Customize Product", complete: hasCustomization, detail: !hasProduct ? "Complete Select Your Product first." : hasCustomization ? "Customization options saved." : "Choose the custom options for your product.", view: "customize", action: "Customize", disabled: !hasProduct },
            { id: "pricing", title: "Set Your Price", complete: hasPrice, detail: !hasProduct ? "Complete Select Your Product first." : hasPrice ? "A selling price is set." : "Set a selling price for your product.", view: "pricing", action: "Set Price", disabled: !hasProduct },
            { id: "identity", title: "Brand Identity", complete: hasIdentity, detail: hasIdentity ? "Your brand colors and style are saved." : "Choose colors, typography, and a brand style.", view: "brand", action: "Set Identity" },
            { id: "channels", title: "Sales Channels", complete: hasChannels, detail: hasChannels ? "Your Brandify storefront is configured." : "Set up your Brandify storefront to prepare a sales channel.", view: "store", action: "Set Up Store" },
            { id: "payout", title: "Payout Setup", complete: hasPayout, detail: hasPayout ? `Payout account added · •••• ${String(payout.accountNumber).slice(-4)}` : "Add payout details to receive earnings.", view: "payouts", action: "Add Payout Details" }
        ];
        const completed = tasks.filter(function (task) { return task.complete; }).length;
        return { tasks: tasks, completed: completed, total: tasks.length, percentage: Math.round((completed / tasks.length) * 100), complete: tasks.every(function (task) { return task.complete; }), myProducts: myProducts };
    }
    function svgChart(values, labels) {
        const width = 660, height = 220, left = 30, right = 10, top = 12, bottom = 27;
        const max = Math.max.apply(null, values.concat([1])) * 1.15;
        const points = values.map(function (value, index) {
            const x = left + index * ((width - left - right) / Math.max(values.length - 1, 1));
            const y = top + (height - top - bottom) * (1 - value / max);
            return [x, y];
        });
        const line = points.map(function (point, index) { return `${index ? "L" : "M"}${point[0]},${point[1]}`; }).join(" ");
        const area = `${line} L${points[points.length - 1][0]},${height - bottom} L${points[0][0]},${height - bottom} Z`;
        const grid = [0, 1, 2, 3].map(function (index) {
            const y = top + index * ((height - top - bottom) / 3);
            return `<line class="chart-grid-line" x1="${left}" y1="${y}" x2="${width - right}" y2="${y}"/>`;
        }).join("");
        const labelMarkup = labels.map(function (label, index) {
            const point = points[index];
            return `<text class="chart-label" x="${point[0]}" y="${height - 5}" text-anchor="middle">${escapeHTML(label)}</text>`;
        }).join("");
        return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Sales trend from recorded orders"><defs><linearGradient id="salesGradient" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#42a87d" stop-opacity=".22"/><stop offset="100%" stop-color="#42a87d" stop-opacity="0"/></linearGradient></defs>${grid}<path class="chart-area" d="${area}"/><path class="chart-line" d="${line}"/>${points.map(function (point) { return `<circle class="chart-point" cx="${point[0]}" cy="${point[1]}" r="4"/>`; }).join("")}${labelMarkup}</svg>`;
    }
    function orderRows(orders, compact) {
        return orders.map(function (order) {
            const orderLabel = order.id ? `#${escapeHTML(order.id)}` : "Order";
            if (compact) return `<button type="button" class="order-row creator-order-link" data-open-order="${escapeHTML(order.id)}"><span class="order-primary"><span class="order-product-icon">▦</span><span><strong>${orderLabel} · ${escapeHTML(order.product)}</strong><small>${escapeHTML(order.customer)}</small></span></span><span class="order-meta"><strong>${money(order.amount)}</strong><span class="status-pill ${String(order.status).toLowerCase()}">${escapeHTML(order.status)}</span></span></button>`;
            return `<tr data-order-id="${escapeHTML(order.id)}"><td><strong>${orderLabel}</strong></td><td>${escapeHTML(order.customer)}</td><td>${escapeHTML(order.product)}</td><td>${money(order.amount)}</td><td><span class="status-pill ${String(order.status).toLowerCase()}">${escapeHTML(order.status)}</span></td><td>${escapeHTML(formatOrderDate(order.date))}</td></tr>`;
        }).join("");
    }
    function welcomeBanner() {
        if (localStorage.getItem("brandifyLaunchReady") !== "true" || localStorage.getItem("brandifyDashboardWelcomeShown") === "true") return "";
        localStorage.setItem("brandifyDashboardWelcomeShown", "true");
        return `<div class="welcome-banner"><div><strong>Welcome to your Brandify dashboard 🎉</strong><p>Your brand is ready. Start managing your products, orders and sales from here.</p></div><button type="button" data-dismiss-welcome aria-label="Dismiss welcome">×</button></div>`;
    }
    function setupDashboardView(state) {
        const accountName = getCreator();
        const greeting = accountName === "Creator" ? "Welcome back 👋" : `Welcome back, ${escapeHTML(accountName)} 👋`;
        const progress = `<section class="setup-progress-panel"><div class="setup-progress-heading"><div><span class="setup-eyebrow">YOUR BRAND SETUP</span><h2>Complete your setup</h2><p>Finish the remaining steps to get your brand ready to sell.</p></div><strong>${state.completed} of ${state.total} steps completed</strong></div><div class="setup-progress-track" role="progressbar" aria-label="Setup progress" aria-valuemin="0" aria-valuemax="${state.total}" aria-valuenow="${state.completed}"><span style="width:${state.percentage}%"></span></div><small>${state.percentage}% complete</small></section>`;
        const firstPending = state.tasks.find(function (task) { return !task.complete; });
        const continueAction = firstPending
            ? `<button class="dashboard-button" data-continue-setup="${firstPending.view}" ${firstPending.disabled ? "disabled" : ""}>Continue Setup <span class="button-arrow">→</span></button>`
            : "";
        const checklist = state.tasks.map(function (task) {
            const status = task.complete ? `<span class="setup-task-status complete">Completed</span>` : `<span class="setup-task-status">Pending</span>`;
            const action = !task.complete
                ? `<button class="text-action setup-task-action" data-setup-view="${task.view}" data-setup-task="${task.id}" ${task.disabled ? "disabled" : ""}>${task.action} →</button>`
                : "";
            return `<article class="setup-task ${task.complete ? "is-complete" : "is-pending"}"><span class="setup-task-check" aria-hidden="true">${task.complete ? "✓" : "○"}</span><div class="setup-task-copy"><div class="setup-task-title-row"><h3>${escapeHTML(task.title)}</h3>${status}</div><p>${escapeHTML(task.detail)}</p>${action}</div></article>`;
        }).join("");
        return `${heading(greeting, "Build and prepare your brand from one place.", continueAction)}${progress}<section class="setup-checklist-panel"><div class="setup-checklist-heading"><div><h2>Setup checklist</h2><p>These steps use the information saved to your Brandify account.</p></div><button class="panel-link" data-view="catalog">Browse Product Catalog →</button></div><div class="setup-task-list">${checklist}</div></section><div class="quick-actions"><button class="quick-action" data-view="catalog"><span class="quick-action-icon">⌕</span><span><strong>Product Catalog</strong><small>Browse products for your brand</small></span></button><button class="quick-action" data-view="products"><span class="quick-action-icon">▦</span><span><strong>My Products</strong><small>${state.myProducts.length} selected</small></span></button></div>`;
    }
    function dashboardView() {
        const state = setupState();
        if (!state.complete) return setupDashboardView(state);
        const name = getCreator() !== "Creator" ? `Good morning, ${escapeHTML(getCreator())} 👋` : "Welcome to Brandify 👋";
        const products = getMyProducts();
        const orders = creatorOrderRecords();
        const customers = customerRecords(orders);
        const sales = salesTrend(orders, "7 Days");
        const revenue = actualRevenue(orders);
        const pendingRequests = creatorRequests().filter(function (request) { return ["Awaiting Approval", "Resubmitted"].includes(request.status); }).length;
        const fulfillmentStats = [
            ["Pending Requests", pendingRequests],
            ["Active Orders", orders.filter(function (order) { return order.status === "Processing"; }).length],
            ["Orders Shipped", orders.filter(function (order) { return order.status === "Shipped"; }).length],
            ["Out for Delivery", orders.filter(function (order) { return order.status === "Out for Delivery"; }).length],
            ["Orders Delivered", orders.filter(function (order) { return order.status === "Delivered"; }).length],
            ["Cancelled Orders", orders.filter(function (order) { return order.status === "Cancelled"; }).length]
        ].map(function (item) { return `<div class="fulfillment-stat"><span>${item[0]}</span><strong>${item[1]}</strong></div>`; }).join("");
        const metricCards = [
            ["Revenue", money(revenue), "From completed orders", "₹"],
            ["Orders", orders.length, "Recorded orders", "▤"],
            ["Products", products.length, "In My Products", "▦"],
            ["Customers", customers.length, "From recorded orders", "♙"]
        ].map(function (item) { return `<article class="metric-card"><div class="metric-top"><span>${item[0]}</span><span class="metric-icon">${item[3]}</span></div><div class="metric-value">${item[1]}</div><div class="metric-bottom"><span>${item[2]}</span></div></article>`; }).join("");
        const salesBody = sales
            ? `<div class="chart-wrap" id="salesChart">${svgChart(sales.values, sales.labels)}</div>`
            : emptyState("No sales data yet", "Sales trends will appear when completed orders with dates are recorded.", "₹");
        const salesAction = sales ? `<select class="filter-select" id="salesPeriod" aria-label="Sales period"><option>7 Days</option><option>30 Days</option><option>3 Months</option><option>1 Year</option></select>` : "";
        const recentOrders = orders.length ? `<div class="orders-list">${orderRows(orders.slice(0, 4), true)}</div>` : emptyState("No orders yet", "Recorded customer orders will appear here.", "▤");
        return `${welcomeBanner()}<div class="brand-ready-banner"><span>✓</span><div><strong>Your brand is ready to sell 🎉</strong><p>Your products and setup are ready to go.</p></div></div>${heading(name, "Here's what's happening with your brand.")}<section class="panel fulfillment-summary"><div class="panel-heading"><h2>Order Fulfillment</h2><button class="panel-link" data-view="orders">View Orders →</button></div><div class="fulfillment-stat-grid">${fulfillmentStats}</div></section>
            <div class="metric-grid">${metricCards}</div>
            <div class="dashboard-grid">${panel("Sales Overview", salesBody, salesAction)}
            ${panel("Recent Orders", recentOrders, `<button class="panel-link" data-view="orders">View All →</button>`)}</div>
            <div class="quick-actions"><button class="quick-action" data-view="products"><span class="quick-action-icon">▦</span><span><strong>Manage products</strong><small>Update your catalog</small></span></button><button class="quick-action" data-view="orders"><span class="quick-action-icon">▤</span><span><strong>View orders</strong><small>Track recent activity</small></span></button><button class="quick-action" data-view="brand"><span class="quick-action-icon">✳</span><span><strong>Manage your brand</strong><small>Review brand details</small></span></button></div>`;
    }
    function productImage(product) {
        return product.image ? `<img src="${escapeHTML(product.image)}" alt="${escapeHTML(product.name)}" onerror="this.style.display='none';this.nextElementSibling.hidden=false"><span class="product-art-placeholder" hidden>▦</span>` : `<span class="product-art-placeholder">▦</span>`;
    }
    function catalogView() {
        const all = window.BrandifyCatalog ? window.BrandifyCatalog.getCreatorCatalog() : (window.BRANDIFY_PRODUCTS || []).filter(function (product) { return product.status !== "Archived" && product.status !== "Inactive"; });
        const categories = ["All"].concat((window.BRANDIFY_CATEGORIES || []).map(function (category) { return category.name; }));
        const filtered = all.filter(function (product) {
            return (dashboardCatalogCategory === "All" || product.category === dashboardCatalogCategory) && `${product.name} ${product.category}`.toLowerCase().includes(dashboardCatalogQuery.toLowerCase());
        });
        const filters = categories.map(function (category) { return `<button type="button" class="dashboard-category-chip ${dashboardCatalogCategory === category ? "active" : ""}" data-catalog-category="${escapeHTML(category)}">${escapeHTML(category)}</button>`; }).join("");
        const cards = filtered.map(function (product) { const outOfStock = Number(product.stock) <= 0; return `<article class="product-card"><div class="product-art">${productImage(product)}</div><div class="product-card-body"><div class="product-card-heading"><h3>${escapeHTML(product.name)}</h3></div><p class="dashboard-product-category">${escapeHTML(product.category)}</p>${outOfStock ? `<p class="dashboard-product-category">Out of stock</p>` : ""}${product.basePrice ? `<p>Starting from ${money(product.basePrice)}</p>` : ""}<div class="product-card-actions"><a class="dashboard-button small" href="product-details.html?id=${encodeURIComponent(product.id)}&from=dashboard">View Product →</a></div></div></article>`; }).join("");
        return `${heading("Product Catalog", "Explore products you can customize for your brand.")}<div class="toolbar"><input class="search-input" id="catalogSearch" type="search" value="${escapeHTML(dashboardCatalogQuery)}" placeholder="Search products" aria-label="Search product catalog"></div><div class="dashboard-category-list">${filters}</div>${cards ? `<div class="product-grid">${cards}</div>` : emptyState("No products found", "Try another product name or category.", "⌕")}`;
    }
    function productsView() {
        const allProducts = getMyProducts();
        const products = allProducts.filter(function (product) { return `${product.name} ${product.category || ""}`.toLowerCase().includes(productQuery.toLowerCase()) && (productFilter === "All Products" || String(product.status || "Draft").toLowerCase() === productFilter.toLowerCase()); });
        const cards = products.map(function (product) {
            const rawStatus = String(product.status || "Draft");
            const status = rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1).toLowerCase();
            const productUrl = `product-details.html?id=${encodeURIComponent(product.masterProductId || product.id)}&from=dashboard`;
            return `<article class="product-card my-product-card" data-product-url="${escapeHTML(productUrl)}" tabindex="0" role="link" aria-label="View ${escapeHTML(product.name)}"><div class="product-art">${productImage(product)}<div class="my-product-menu-wrap"><button type="button" class="my-product-menu-toggle" data-product-menu-toggle aria-label="Manage ${escapeHTML(product.name)}" aria-expanded="false">⋯</button><div class="my-product-menu" role="menu"><button type="button" role="menuitem" data-my-product-edit="${escapeHTML(product.id)}"><span aria-hidden="true">✎</span>Edit Product</button><button type="button" role="menuitem" class="delete-menu-item" data-my-product-delete="${escapeHTML(product.id)}"><span aria-hidden="true">▤</span>Delete Product</button></div></div></div><div class="product-card-body"><div class="product-card-heading"><h3>${escapeHTML(product.name)}</h3><span class="status-pill ${escapeHTML(status.toLowerCase())}">${escapeHTML(status)}</span></div><p class="dashboard-product-category">${escapeHTML(product.category || "Product")}</p><p>${product.sellingPrice ? money(product.sellingPrice) : "Price not set"}</p></div></article>`;
        }).join("");
        const empty = allProducts.length
            ? emptyState("No matching products", "Try a different search or status filter.", "⌕")
            : `<div class="empty-state"><div><span class="empty-state-icon">▦</span><h3>No products yet</h3><p>Start building your product catalog by choosing a product from the Product Catalog.</p><button type="button" class="dashboard-button empty-add-button" data-view="catalog">Explore Products →</button></div></div>`;
        return `${heading("My Products", "Manage products you have added to your brand.", `<button class="dashboard-button" data-view="catalog">Browse Catalog →</button>`)}<div class="toolbar"><input class="search-input" id="productSearch" value="${escapeHTML(productQuery)}" type="search" placeholder="Search products" aria-label="Search products"><select class="filter-select" id="productFilter" aria-label="Filter products"><option ${productFilter === "All Products" ? "selected" : ""}>All Products</option><option ${productFilter === "Draft" ? "selected" : ""}>Draft</option><option ${productFilter === "Ready" ? "selected" : ""}>Ready</option><option ${productFilter === "Published" ? "selected" : ""}>Published</option><option ${productFilter === "Paused" ? "selected" : ""}>Paused</option><option ${productFilter === "Archived" ? "selected" : ""}>Archived</option></select></div>${cards ? `<div class="product-grid my-products-grid">${cards}</div>` : empty}`;
    }
    function selectedProduct() { return getMyProducts().find(function (product) { return product.id === currentProductId; }) || getMyProducts()[0] || null; }
    function closeProductMenus() {
        content.querySelectorAll(".my-product-menu.open").forEach(function (menu) {
            menu.classList.remove("open");
            menu.style.left = "";
            menu.style.top = "";
        });
        content.querySelectorAll("[data-product-menu-toggle][aria-expanded='true']").forEach(function (button) { button.setAttribute("aria-expanded", "false"); });
    }
    function customizeView() {
        const product = selectedProduct();
        if (!product) return `${heading(editingProductMode ? "Edit Product" : "Customize Product", "Choose customization options for your product.")}${emptyState("Select a product first", "Browse the catalog and add a product to My Products.", "▦")}`;
        const options = ["Custom Label", "Custom Packaging", "Custom Product Design", "Label and Packaging"];
        const chosen = Array.isArray(product.customization) ? product.customization : [];
        const editFields = editingProductMode ? `<label class="workflow-field-label" for="editSellingPrice">Selling price (₹)</label><input class="form-control" id="editSellingPrice" name="sellingPrice" type="number" min="1" step="1" value="${escapeHTML(product.sellingPrice || "")}" placeholder="Set your selling price">` : "";
        return `${heading(editingProductMode ? "Edit Product" : "Customize Product", editingProductMode ? `Update ${escapeHTML(product.name)} for your brand.` : `Choose options for ${escapeHTML(product.name)}.`)}<section class="panel"><form id="customizationForm" class="workflow-form">${editFields}<div><h2 class="customization-form-title">Product Customization</h2><div class="customization-choice-list">${options.map(function (option) { return `<label class="customization-choice"><input type="checkbox" name="customization" value="${escapeHTML(option)}" ${chosen.includes(option) ? "checked" : ""}><span>${escapeHTML(option)}</span></label>`; }).join("")}</div></div><div class="workflow-actions">${editingProductMode ? `<button type="button" class="dashboard-button secondary" id="cancelProductEdit">Cancel</button><button type="submit" class="dashboard-button secondary" id="saveProductChanges">Save Changes</button><button type="submit" class="dashboard-button" id="continueProductEdit">Save &amp; Continue to Pricing →</button>` : `<button type="submit" class="dashboard-button" id="saveCustomization">Save Customization →</button>`}</div></form></section>`;
    }
    function pricingView() {
        const product = selectedProduct();
        if (!product) return `${heading("Set Price", "Choose the selling price for your product.")}${emptyState("Select a product first", "Browse the catalog and add a product to My Products.", "▦")}`;
        return `${heading("Set Price", `Set a selling price for ${escapeHTML(product.name)}.`)}<section class="panel workflow-form"><p>Product base price: <strong>${money(product.basePrice)}</strong></p><label for="sellingPriceInput">Your selling price (₹)</label><input class="form-control" id="sellingPriceInput" type="number" min="1" step="1" value="${product.sellingPrice || ""}" placeholder="Enter selling price"><div class="workflow-actions"><button class="dashboard-button" id="saveProductPrice">Save Price →</button></div></section>`;
    }
    function reviewView() {
        const product = selectedProduct();
        if (!product) return `${heading("Review Product", "Review before publishing.")}${emptyState("Select a product first", "Browse the catalog and add a product to My Products.", "▦")}`;
        const custom = Array.isArray(product.customization) ? product.customization.join(", ") : "Not set";
        return `${heading("Review Product", "Check your product setup before publishing.")}<div class="detail-grid"><section class="detail-card"><h2>PRODUCT</h2>${detailRow("Name", product.name)}${detailRow("Category", product.category)}${detailRow("Base Price", money(product.basePrice))}${detailRow("Selling Price", product.sellingPrice ? money(product.sellingPrice) : "Not set")}</section><section class="detail-card"><h2>CUSTOMIZATION</h2>${detailRow("Selected Options", custom)}</section></div><div class="workflow-actions"><button class="dashboard-button" id="publishProduct" ${!product.sellingPrice || !product.customization || !product.customization.length ? "disabled" : ""}>Publish Product →</button></div>`;
    }
    function ordersView() {
        if (orderRequestMode) return createRequestView();
        const query = orderSearchQuery.trim().toLowerCase();
        const requests = creatorRequests().filter(function (request) { const customer = request.customer || {}; const products = (request.items || []).map(function (item) { return item.productName || ""; }).join(" "); return !query || `${request.requestId || ""} ${request.orderId || ""} ${customer.name || ""} ${customer.phone || ""} ${products} ${request.status || ""}`.toLowerCase().includes(query); }).sort(function (a, b) { return new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0); });
        const filters = ["All", "Pending", "Processing", "Shipped", "Out for Delivery", "Delivered", "Cancelled", "Paid"];
        let orders = creatorOrderRecords().sort(function (a, b) { return new Date(b.date || 0) - new Date(a.date || 0); });
        if (activeOrderFilter !== "All") orders = orders.filter(function (order) { return order.status.toLowerCase() === activeOrderFilter.toLowerCase(); });
        orders = orders.filter(function (order) { const sourceCustomer = order.source && typeof order.source.customer === "object" ? order.source.customer : {}; return `${order.id} ${order.customer} ${sourceCustomer.phone || order.source && order.source.customerPhone || ""} ${order.product} ${order.status}`.toLowerCase().includes(query); });
        const requestRows = requests.length ? `<div class="dashboard-table-wrap"><table class="dashboard-table"><thead><tr><th>Request</th><th>Customer</th><th>Products</th><th>Status</th><th>Updated</th><th></th></tr></thead><tbody>${requests.map(function (request) { const products = (request.items || []).map(function (item) { return `${item.productName} × ${item.quantity}`; }).join(", ") || "No products"; return `<tr><td><strong>${escapeHTML(request.requestId)}</strong></td><td>${escapeHTML(request.customer && request.customer.name)}</td><td>${escapeHTML(products)}</td><td><span class="status-pill ${String(request.status).toLowerCase().replace(/\s+/g, "-")}">${escapeHTML(request.status)}</span>${request.status !== "Approved" && request.changeReason ? `<small class="request-reason">${escapeHTML(request.changeReason)}</small>` : ""}</td><td>${escapeHTML(formatOrderDate(request.updatedAt || request.createdAt))}</td><td>${["Draft", "Needs Changes"].includes(request.status) ? `<button class="dashboard-button secondary small" data-edit-request="${escapeHTML(request.requestId)}">${request.status === "Draft" ? "Continue" : "Edit Request"}</button>` : `<button class="dashboard-button secondary small" data-view-request="${escapeHTML(request.requestId)}">View</button>`}</td></tr>`; }).join("")}</tbody></table></div>` : emptyState("No fulfillment requests", "Create a request when your customer places an order outside Brandify.", "▤");
        return `${heading("Orders", "Submit fulfillment requests and track your official Brandify orders.", `<button class="dashboard-button" data-create-request>+ Create Order</button>`)}<section class="panel"><div class="panel-heading"><h2>Fulfillment Requests</h2><span class="status-pill">${requests.length} request${requests.length === 1 ? "" : "s"}</span></div>${requestRows}</section><section class="panel"><div class="panel-heading"><h2>Official Orders</h2></div><div class="toolbar"><input class="search-input" id="orderSearch" type="search" value="${escapeHTML(orderSearchQuery)}" placeholder="Search orders" aria-label="Search orders"></div><div class="toolbar">${filters.map(function (filter) { return `<button class="dashboard-button small ${filter === activeOrderFilter ? "" : "secondary"}" data-order-filter="${filter}">${filter}</button>`; }).join("")}</div>${orders.length ? `<div class="dashboard-table-wrap"><table class="dashboard-table"><thead><tr><th>Order</th><th>Customer</th><th>Product</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead><tbody>${orderRows(orders, false)}</tbody></table></div>` : emptyState("No official orders yet", "Approved fulfillment requests will appear here with their Brandify order IDs.", "▤")}</section>`;
    }
    function requestProductDetails(product) {
        const catalog = window.BrandifyCatalog ? window.BrandifyCatalog.getAll() : (window.BRANDIFY_PRODUCTS || []);
        return catalog.find(function (item) { return item.id === product.masterProductId || item.id === product.id; }) || product;
    }
    function orderItemMarkup(product, index, selectedItem) {
        selectedItem = selectedItem || {};
        const options = requestableProducts();
        const selected = options.find(function (item) { return item.id === (selectedItem.productId || product); }) || options.find(function (item) { return item.id === product; }) || options[0];
        const master = selected ? requestProductDetails(selected) : {};
        const variants = master.variants || {};
        const variantMarkup = ["sizes", "colors"].map(function (key) {
            const values = Array.isArray(variants[key]) ? variants[key] : [];
            if (!values.length) return "";
            const field = key === "sizes" ? "size" : "color";
            return `<label>${key === "sizes" ? "Size" : "Color"}<select class="form-control" data-request-variant="${field}" ${values.length ? "required" : ""}><option value="">Select ${key === "sizes" ? "size" : "color"}</option>${values.map(function (value) { return `<option ${selectedItem.selectedVariants && selectedItem.selectedVariants[field] === value ? "selected" : ""}>${escapeHTML(value)}</option>`; }).join("")}</select></label>`;
        }).join("");
        const customization = Array.isArray(selected && selected.customization) ? selected.customization.join(", ") : "No customization saved";
        return `<article class="request-item-row" data-request-item><div class="request-item-heading"><strong>Product ${index + 1}</strong>${index ? `<button class="text-action" type="button" data-remove-request-item>Remove</button>` : ""}</div><label>My Product<select class="form-control" data-request-product required><option value="">Select a ready product</option>${options.map(function (item) { return `<option value="${escapeHTML(item.id)}" ${selected && item.id === selected.id ? "selected" : ""}>${escapeHTML(item.name)}</option>`; }).join("")}</select></label><div class="request-variant-grid">${variantMarkup}</div><label>Quantity<input class="form-control" data-request-quantity type="number" min="1" step="1" value="${escapeHTML(selectedItem.quantity || 1)}" required></label><p class="request-item-customization"><strong>Saved customization:</strong> ${escapeHTML(customization)}</p>${selected && selected.basePrice != null ? `<p class="request-item-customization"><strong>Fulfillment cost:</strong> ${money(selected.basePrice)} per unit</p>` : ""}<span class="form-error" data-item-error role="alert"></span></article>`;
    }
    function existingRequest(requestId) { return creatorRequests().find(function (request) { return request.requestId === requestId; }) || null; }
    function createRequestView() {
        const request = editingRequestId ? existingRequest(editingRequestId) : null;
        const customer = request && request.customer || {};
        const shipping = request && request.shippingAddress || {};
        const billing = request && request.billingAddress || {};
        const sameAddress = billing.sameAsShipping !== false;
        const billAddress = billing.address || {};
        const fields = function (prefix, values) { return `<div class="request-address-grid"><label>Address line 1 *<input class="form-control" name="${prefix}AddressLine1" value="${escapeHTML(values.addressLine1 || "")}" required></label><label>Address line 2<input class="form-control" name="${prefix}AddressLine2" value="${escapeHTML(values.addressLine2 || "")}"></label><label>City *<input class="form-control" name="${prefix}City" value="${escapeHTML(values.city || "")}" required></label><label>State *<input class="form-control" name="${prefix}State" value="${escapeHTML(values.state || "")}" required></label><label>Country *<input class="form-control" name="${prefix}Country" value="${escapeHTML(values.country || "India")}" required></label><label>Pincode *<input class="form-control" name="${prefix}Pincode" value="${escapeHTML(values.pincode || "")}" inputmode="numeric" required></label></div>`; };
        const productItems = request && Array.isArray(request.items) && request.items.length ? request.items : [{}];
        const productMarkup = productItems.map(function (item, index) { return orderItemMarkup(item.productId, index, item); }).join("");
        const productsUnavailable = !requestableProducts().length;
        return `${heading(request ? "Edit Fulfillment Request" : "Create Fulfillment Request", "Request Brandify to fulfill an order your customer placed elsewhere.", `<button class="dashboard-button secondary" type="button" data-cancel-request>← Back to Orders</button>`)}${productsUnavailable ? emptyState("No ready products available", "Add a product to My Products, save its customization and price, then continue here to request fulfillment.", "▦") : `<form id="fulfillmentRequestForm" class="request-form" novalidate><div class="request-form-columns"><div class="request-form-main"><section class="panel workflow-form"><h2>Customer</h2><label>Customer name *<input class="form-control" name="customerName" value="${escapeHTML(customer.name || "")}" required></label><label>Phone number *<input class="form-control" name="customerPhone" type="tel" value="${escapeHTML(customer.phone || "")}" required></label><label>Email<input class="form-control" name="customerEmail" type="email" value="${escapeHTML(customer.email || "")}"></label></section><section class="panel workflow-form"><h2>Shipping address</h2>${fields("ship", shipping)}<label class="request-checkbox"><input type="checkbox" name="sameBilling" ${sameAddress ? "checked" : ""}> Billing address same as shipping address</label><div id="billingAddressFields" ${sameAddress ? "hidden" : ""}><h3>Billing address</h3>${fields("bill", billAddress)}</div></section><section class="panel workflow-form"><div class="panel-heading"><h2>Products</h2><button type="button" class="dashboard-button secondary small" id="addRequestItem">+ Add product</button></div><div id="requestItems">${productMarkup}</div><span class="form-error" id="requestItemsError" role="alert"></span></section><section class="panel workflow-form"><h2>Order details</h2><label>Customer payment status<select class="form-control" name="paymentStatus"><option ${!request || request.customerPaymentStatus === "Paid to Creator" ? "selected" : ""}>Paid to Creator</option><option ${request && request.customerPaymentStatus === "Pending" ? "selected" : ""}>Pending</option><option ${request && request.customerPaymentStatus === "Not Applicable" ? "selected" : ""}>Not Applicable</option></select></label><label>Order notes<textarea class="form-control" name="creatorNotes" rows="3">${escapeHTML(request && request.creatorNotes || "")}</textarea></label></section></div><aside class="panel request-summary"><h2>Request Summary</h2><div id="requestSummaryContent"></div><p class="form-error" id="requestFormError" role="alert"></p><div class="workflow-actions"><button type="button" class="dashboard-button secondary" id="saveRequestDraft">Save as Draft</button><button type="submit" class="dashboard-button" id="submitRequest">${request ? "Resubmit Request" : "Submit Request"} →</button></div><p class="request-payment-note">Customer payment is handled outside Brandify. No payment will be collected here.</p></aside></div></form>`}`;
    }
    function captureRequestForm() {
        const form = document.getElementById("fulfillmentRequestForm");
        if (!form) return null;
        const values = new FormData(form);
        const sameBilling = form.elements.sameBilling.checked;
        const address = function (prefix) { return { addressLine1: String(values.get(`${prefix}AddressLine1`) || "").trim(), addressLine2: String(values.get(`${prefix}AddressLine2`) || "").trim(), city: String(values.get(`${prefix}City`) || "").trim(), state: String(values.get(`${prefix}State`) || "").trim(), country: String(values.get(`${prefix}Country`) || "").trim(), pincode: String(values.get(`${prefix}Pincode`) || "").trim() }; };
        const items = Array.from(document.querySelectorAll("#requestItems [data-request-item]")).map(function (row) {
            const product = requestableProducts().find(function (item) { return item.id === row.querySelector("[data-request-product]").value; });
            if (!product) return null;
            const master = requestProductDetails(product);
            const selectedVariants = {};
            row.querySelectorAll("[data-request-variant]").forEach(function (input) { if (input.value) selectedVariants[input.dataset.requestVariant] = input.value; });
            return { productId: product.id, masterProductId: product.masterProductId || product.id, productName: product.name, productImage: product.image || master.image || "", category: product.category || master.category || "", quantity: Number(row.querySelector("[data-request-quantity]").value), selectedVariants: selectedVariants, customization: Array.isArray(product.customization) ? product.customization.slice() : [], fulfillmentCost: Number(product.basePrice != null ? product.basePrice : master.basePrice) || null, sellingPrice: Number(product.sellingPrice) || null, variants: master.variants || {} };
        }).filter(Boolean);
        return { customer: { name: String(values.get("customerName") || "").trim(), phone: String(values.get("customerPhone") || "").trim(), email: String(values.get("customerEmail") || "").trim() }, shippingAddress: address("ship"), billingAddress: sameBilling ? { sameAsShipping: true } : { sameAsShipping: false, address: address("bill") }, items: items, customerPaymentStatus: String(values.get("paymentStatus") || "Paid to Creator"), creatorNotes: String(values.get("creatorNotes") || "").trim() };
    }
    function updateRequestSummary() {
        const summary = document.getElementById("requestSummaryContent");
        if (!summary) return;
        const data = captureRequestForm();
        if (!data) return;
        const productText = data.items.length ? data.items.map(function (item) { const cost = item.fulfillmentCost == null ? "" : ` · ${money(item.fulfillmentCost * item.quantity)} fulfillment`; return `<li>${escapeHTML(item.productName)} × ${item.quantity}${Object.keys(item.selectedVariants).length ? ` · ${escapeHTML(Object.entries(item.selectedVariants).map(function (entry) { return `${entry[0]}: ${entry[1]}`; }).join(", "))}` : ""}${cost}<small>${escapeHTML(item.customization.join(", ") || "No saved customization")}</small></li>`; }).join("") : "<li>No products selected</li>";
        const knownCosts = data.items.filter(function (item) { return item.fulfillmentCost != null; });
        const fulfillmentTotal = knownCosts.length ? money(knownCosts.reduce(function (total, item) { return total + item.fulfillmentCost * item.quantity; }, 0)) : "Not recorded";
        summary.innerHTML = `<dl class="request-summary-list"><div><dt>Customer</dt><dd>${escapeHTML(data.customer.name || "Not entered")}<small>${escapeHTML(data.customer.phone || "Phone not entered")}${data.customer.email ? ` · ${escapeHTML(data.customer.email)}` : ""}</small></dd></div><div><dt>Products</dt><dd><ul>${productText}</ul></dd></div><div><dt>Fulfillment cost</dt><dd>${fulfillmentTotal}</dd></div><div><dt>Shipping address</dt><dd>${addressMarkup(data.shippingAddress)}</dd></div>${data.billingAddress.sameAsShipping ? "" : `<div><dt>Billing address</dt><dd>${addressMarkup(data.billingAddress.address)}</dd></div>`}<div><dt>Payment reference</dt><dd>${escapeHTML(data.customerPaymentStatus)}</dd></div><div><dt>Creator notes</dt><dd>${escapeHTML(data.creatorNotes || "None")}</dd></div></dl>`;
    }
    function saveFulfillmentRequest(status) {
        const data = captureRequestForm();
        if (!data) return;
        const workflow = window.BrandifyOrderWorkflow;
        const requests = workflow.list("brandifyOrderRequests");
        const existing = existingRequest(editingRequestId);
        const requestId = existing ? existing.requestId : workflow.nextRequestId();
        const now = new Date().toISOString();
        const history = existing && Array.isArray(existing.statusHistory) ? existing.statusHistory.slice() : [];
        if (!history.length || history[history.length - 1].status !== status) history.push({ status: status, timestamp: now, changedBy: "creator" });
        const account = getAccount() || {};
        const request = Object.assign({}, existing || {}, data, { requestId: requestId, creatorId: localStorage.getItem("brandifyCreatorId") || "", creatorName: getCreator(), creatorEmail: account.email || "", brandName: getBrand(), status: status, statusHistory: history, createdAt: existing && existing.createdAt || now, updatedAt: now });
        const index = requests.findIndex(function (item) { return item.requestId === requestId; });
        if (index >= 0) requests[index] = request; else requests.push(request);
        workflow.write("brandifyOrderRequests", requests);
        if (["Awaiting Approval", "Resubmitted"].includes(status)) {
            workflow.notify("admin", "admin", existing && existing.status === "Needs Changes" ? "REQUEST_RESUBMITTED" : "REQUEST_SUBMITTED", existing && existing.status === "Needs Changes" ? `Fulfillment request ${requestId} has been resubmitted.` : `New fulfillment request from ${request.creatorName}.`, `Request ${requestId} is ready for admin review.`, requestId, "");
            workflow.notify("creator", request.creatorId, existing && existing.status === "Needs Changes" ? "REQUEST_RESUBMITTED" : "REQUEST_SUBMITTED", existing && existing.status === "Needs Changes" ? `Request ${requestId} resubmitted` : `Request ${requestId} submitted`, "Your fulfillment request is awaiting admin review.", requestId, "");
        }
        orderRequestMode = false; editingRequestId = ""; render();
        showToast(status === "Draft" || status === "Needs Changes" ? "Draft saved." : status === "Resubmitted" ? "Request resubmitted successfully." : "Fulfillment request submitted successfully.");
    }
    function validateFulfillmentRequest() {
        const form = document.getElementById("fulfillmentRequestForm");
        const error = document.getElementById("requestFormError");
        const data = captureRequestForm();
        let message = "";
        document.querySelectorAll("[data-item-error]").forEach(function (item) { item.textContent = ""; });
        document.querySelectorAll("[aria-invalid='true']").forEach(function (item) { item.removeAttribute("aria-invalid"); });
        if (!data.items.length) message = "Select at least one product from My Products.";
        const rows = Array.from(document.querySelectorAll("#requestItems [data-request-item]"));
        rows.forEach(function (row) {
            const select = row.querySelector("[data-request-product]");
            const quantity = row.querySelector("[data-request-quantity]");
            const product = requestableProducts().find(function (item) { return item.id === select.value; });
            const master = product ? requestProductDetails(product) : {};
            const requiredVariants = master.variants || {};
            let rowError = "";
            if (!product) rowError = "Select a product.";
            else if (!Number.isInteger(Number(quantity.value)) || Number(quantity.value) < 1) rowError = "Enter a quantity of at least 1.";
            else if ((requiredVariants.sizes || []).length && !row.querySelector('[data-request-variant="size"]').value) rowError = "Select a size.";
            else if ((requiredVariants.colors || []).length && !row.querySelector('[data-request-variant="color"]').value) rowError = "Select a color.";
            if (rowError) { row.querySelector("[data-item-error]").textContent = rowError; if (!message) message = rowError; }
        });
        if (!data.customer.name) message = message || "Enter the customer's name.";
        if (!/^\+?[0-9 ()-]{7,20}$/.test(data.customer.phone)) message = message || "Enter a valid customer phone number.";
        if (!data.shippingAddress.addressLine1 || !data.shippingAddress.city || !data.shippingAddress.state || !data.shippingAddress.country || !data.shippingAddress.pincode) message = message || "Complete the required shipping address fields.";
        if (!form.elements.sameBilling.checked) {
            const bill = data.billingAddress.address;
            if (!bill.addressLine1 || !bill.city || !bill.state || !bill.country || !bill.pincode) message = message || "Complete the required billing address fields.";
        }
        if (data.customer.email && !form.elements.customerEmail.validity.valid) message = message || "Enter a valid customer email address.";
        error.textContent = message;
        if (message) {
            const invalid = form.querySelector(":invalid");
            if (invalid) { invalid.setAttribute("aria-invalid", "true"); invalid.focus(); }
            return false;
        }
        return true;
    }
    function customersView() {
        const customers = customerRecords(creatorOrderRecords()).filter(function (customer) { return `${customer.name} ${customer.email}`.toLowerCase().includes(customerQuery.toLowerCase()); });
        return `${heading("Customers", "Customers are listed from your recorded orders.")}<div class="toolbar"><input class="search-input" id="customerSearch" type="search" value="${escapeHTML(customerQuery)}" placeholder="Search customers..." aria-label="Search customers"></div>${customers.length ? `<div class="dashboard-table-wrap"><table class="dashboard-table"><thead><tr><th>Customer</th><th>Orders</th><th>Total Spent</th><th>Last Order</th></tr></thead><tbody>${customers.map(function (customer) { return `<tr><td>${escapeHTML(customer.name)}</td><td>${customer.orders}</td><td>${money(customer.spent)}</td><td>${escapeHTML(customer.lastOrder)}</td></tr>`; }).join("")}</tbody></table></div>` : emptyState("No recorded customers", "Customer details will appear here when they are included with saved orders.", "♙")}`;
    }
    function emptyState(title, description, icon) { return `<div class="empty-state"><div><span class="empty-state-icon">${icon || "✳"}</span><h3>${title}</h3><p>${description}</p></div></div>`; }
    function analyticsView() {
        const orders = creatorOrderRecords();
        const revenueOrders = orders.filter(isRevenueOrder);
        const revenue = actualRevenue(orders);
        const productTotals = new Map();
        revenueOrders.forEach(function (order) { if (order.product !== "Not provided") productTotals.set(order.product, (productTotals.get(order.product) || 0) + (Number.isFinite(order.amount) ? order.amount : 0)); });
        const topProducts = Array.from(productTotals.entries()).sort(function (a, b) { return b[1] - a[1]; });
        const trend = salesTrend(orders, "30 Days");
        const trendContent = trend ? `<div class="chart-wrap">${svgChart(trend.values, trend.labels)}</div>` : emptyState("No sales data yet", "A sales trend will appear when completed orders with dates are recorded.", "▥");
        const productsContent = topProducts.length ? topProducts.slice(0, 4).map(function (item, index) { return `<div class="order-row"><div class="order-primary"><span class="order-product-icon">${index + 1}</span><div><strong>${escapeHTML(item[0])}</strong><small>Completed order sales</small></div></div><div class="order-meta"><strong>${money(item[1])}</strong></div></div>`; }).join("") : emptyState("No product sales yet", "Product performance will appear after completed orders are recorded.");
        return `${heading("Analytics", "A simple snapshot of your brand's recorded performance.")}<div class="metric-grid"><article class="metric-card"><div class="metric-top"><span>Revenue</span><span class="metric-icon">₹</span></div><div class="metric-value">${money(revenue)}</div><div class="metric-bottom"><span>From paid orders</span></div></article><article class="metric-card"><div class="metric-top"><span>Orders</span><span class="metric-icon">▤</span></div><div class="metric-value">${orders.length}</div><div class="metric-bottom"><span>Recorded orders</span></div></article><article class="metric-card"><div class="metric-top"><span>Average Order Value</span><span class="metric-icon">↗</span></div><div class="metric-value">${money(revenueOrders.length ? revenue / revenueOrders.length : 0)}</div><div class="metric-bottom"><span>Paid orders</span></div></article><article class="metric-card"><div class="metric-top"><span>Top Product</span><span class="metric-icon">▦</span></div><div class="metric-value analytics-top-product-value">${escapeHTML(topProducts.length ? topProducts[0][0] : "No sales yet")}</div><div class="metric-bottom"><span>From paid orders</span></div></article></div><div class="dashboard-grid">${panel("Revenue Trend", trendContent)}${panel("Top Products", productsContent)}</div>`;
    }
    function brandView() {
        const categories = arrayValue("brandifyCategory");
        const products = arrayValue("brandifyProduct");
        const customizations = arrayValue("brandifyCustomization");
        const pricing = read("brandifyProductPricing", {}) || {};
        const identity = read("brandifyBrandIdentity", {}) || {};
        const logo = savedText("brandifyBrandLogo", "") || identity.logo || identity.logoData || "";
        const colors = [identity.primaryColor, identity.secondaryColor].filter(function (color) { return /^#[0-9a-f]{3,8}$/i.test(String(color || "")); });
        const priceSummary = products.map(function (product) { const savedPrice = pricing[product]; const value = savedPrice && typeof savedPrice === "object" ? savedPrice.sellingPrice : savedPrice; return value ? `${product}: ${money(value)}` : ""; }).filter(Boolean).join(" · ") || "Price not set";
        return `${heading("My Brand", "Your brand details and identity from onboarding.", `<button class="dashboard-button secondary" data-edit-brand>Edit Brand <span class="button-arrow">→</span></button>`)}<div class="detail-grid"><section class="detail-card"><h2>BRAND DETAILS</h2>${detailRow("Brand Name", getBrand())}${detailRow("Brand Category", categories.join(", ") || "Category not selected")}</section><section class="detail-card"><h2>BRAND IDENTITY</h2>${logo ? `<div class="detail-row"><span>Logo</span><strong><img class="brand-logo-preview" src="${escapeHTML(logo)}" alt="Brand logo"></strong></div>` : detailRow("Logo", "No logo added")}${detailRow("Brand Colors", colors.length ? `<span class="color-swatches">${colors.map(function (color) { return `<i class="color-swatch" style="background:${color}" title="${color}"></i>`; }).join("")}</span>` : "Default palette", true)}${detailRow("Style", identity.style || "Not specified")}${detailRow("Font", identity.font || "Not specified")}</section><section class="detail-card"><h2>PRODUCT</h2>${detailRow("Selected Products", products.join(", ") || "No product selected")}</section><section class="detail-card"><h2>CUSTOMIZATION</h2>${detailRow("Selected Options", customizations.join(", ") || "No customization selected")}</section><section class="detail-card"><h2>PRICING</h2>${detailRow("Selling Price", priceSummary)}</section><section class="detail-card"><h2>LAUNCH STATUS</h2>${detailRow("Brand Status", savedText("brandifyLaunchReady", "false") === "true" ? "Ready to launch" : "Setup in progress")}</section></div>`;
    }
    function detailRow(label, value, allowMarkup) { return `<div class="detail-row"><span>${escapeHTML(label)}</span><strong>${allowMarkup ? value : escapeHTML(value)}</strong></div>`; }
    function storeView() {
        const store = read("brandifyStoreSetup", {}) || {};
        if (!store.storeName || !store.storeHandle || storeEditMode) return `${heading("Store", "Set up your Brandify storefront.")}<form class="panel workflow-form" id="storeSetupForm"><label for="storeNameInput">Store name</label><input class="form-control" id="storeNameInput" name="storeName" required value="${escapeHTML(store.storeName || getBrand())}"><label for="storeHandleInput">Store URL handle</label><input class="form-control" id="storeHandleInput" name="storeHandle" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value="${escapeHTML(store.storeHandle || "")}" placeholder="your-brand"><label for="storeDescriptionInput">Store description</label><textarea class="form-control" id="storeDescriptionInput" name="storeDescription" rows="3">${escapeHTML(store.storeDescription || "")}</textarea><label for="storeThemeInput">Store theme</label><select class="form-control" id="storeThemeInput" name="storeTheme"><option ${store.storeTheme === "Minimal" ? "selected" : ""}>Minimal</option><option ${store.storeTheme === "Bold" ? "selected" : ""}>Bold</option><option ${store.storeTheme === "Editorial" ? "selected" : ""}>Editorial</option></select><p class="form-error" id="storeFormError" role="alert"></p><div class="workflow-actions"><button class="dashboard-button" type="submit">Save Store Setup →</button></div></form>`;
        return `${heading("Store", "Your Brandify storefront details.", `<button class="dashboard-button secondary" data-edit-store>Edit Store Details</button>`)}<section class="store-preview"><div class="panel-heading"><div><h2>${escapeHTML(store.storeName)}</h2><p>${escapeHTML(store.storeDescription || "Your Brandify storefront.")}</p></div><span class="status-pill">Setup complete</span></div><div class="store-url">↗ ${escapeHTML(store.storeHandle)}.brandify.com</div><div class="heading-actions"><button class="dashboard-button" data-store-action="View Store">View Store →</button></div></section>`;
    }
    function channelsView() {
        const hasStore = Boolean((read("brandifyStoreSetup", {}) || {}).storeHandle);
        const channels = [["Brandify Store", hasStore ? "Connected" : "Not Connected", "▣"], ["Shopify", "Not Connected", "S"], ["WooCommerce", "Not Connected", "W"], ["Amazon", "Not Connected", "a"], ["Instagram", "Not Connected", "◎"]];
        return `${heading("Sales Channels", "Manage the places where customers can find your brand.")}<div class="channel-list">${channels.map(function (channel) { const connected = channel[1] === "Connected"; return `<div class="channel-row"><div class="channel-name"><span class="channel-logo">${channel[2]}</span>${channel[0]}</div><span class="${connected ? "channel-connected" : "channel-off"}">${connected ? "✓ Connected" : "○ Not Connected"}</span></div>`; }).join("")}</div>`;
    }
    function payoutsView() {
        const payout = read("brandifyPayoutDetails", {}) || {};
        const digits = String(payout.accountNumber || "").replace(/\s/g, "");
        const account = digits ? `•••• ${digits.slice(-4)}` : "No payout account added";
        if (!payout.accountNumber || !payout.bankName || payoutEditMode) return `${heading("Payouts", "Add payout details to receive earnings.")}<form class="panel workflow-form" id="payoutSetupForm"><label for="payoutHolderInput">Account holder name</label><input class="form-control" id="payoutHolderInput" name="accountHolderName" required value="${escapeHTML(payout.accountHolderName || "")}"><label for="payoutBankInput">Bank name</label><input class="form-control" id="payoutBankInput" name="bankName" required value="${escapeHTML(payout.bankName || "")}"><label for="payoutAccountInput">Account number</label><input class="form-control" id="payoutAccountInput" name="accountNumber" inputmode="numeric" required value="" placeholder="Leave blank to keep the saved number"><label for="payoutIfscInput">IFSC code</label><input class="form-control" id="payoutIfscInput" name="ifscCode" maxlength="11" required value="${escapeHTML(payout.ifscCode || "")}"><p class="form-error" id="payoutFormError" role="alert"></p><div class="workflow-actions"><button class="dashboard-button" type="submit">Save Payout Details →</button></div></form>`;
        return `${heading("Payouts", "View your payout account details and recorded payout activity.", `<button class="dashboard-button secondary" data-edit-payout>Edit Payout Details</button>`)}<section class="panel"><div class="panel-heading"><h2>Payout Account</h2><span class="status-pill">Added</span></div><div class="payout-account"><div class="payout-bank"><span class="bank-mark">₹</span><div><strong>${escapeHTML(payout.bankName)}</strong><small>${escapeHTML(payout.accountHolderName || getCreator())} · ${escapeHTML(account)}</small></div></div></div></section>${panel("Payout Activity", emptyState("No payout activity yet", "Payout records will appear here when available."))}`;
    }
    function identityView() {
        const identity = read("brandifyBrandIdentity", {}) || {};
        return `${heading("Brand Identity", "Set the colors and style that represent your brand.")}<form class="panel workflow-form" id="brandIdentityForm"><label for="identityPrimary">Primary color</label><input class="form-control" id="identityPrimary" name="primaryColor" type="color" value="${/^#[0-9a-f]{6}$/i.test(identity.primaryColor || "") ? identity.primaryColor : "#1f9d74"}"><label for="identitySecondary">Secondary color</label><input class="form-control" id="identitySecondary" name="secondaryColor" type="color" value="${/^#[0-9a-f]{6}$/i.test(identity.secondaryColor || "") ? identity.secondaryColor : "#f3f7f4"}"><label for="identityFont">Font</label><select class="form-control" id="identityFont" name="font">${["Inter", "DM Sans", "Poppins", "Roboto"].map(function (font) { return `<option ${identity.font === font ? "selected" : ""}>${font}</option>`; }).join("")}</select><label for="identityStyle">Brand style</label><select class="form-control" id="identityStyle" name="style">${["Minimal and Modern", "Bold and Vibrant", "Elegant and Premium", "Natural and Organic"].map(function (style) { return `<option ${identity.style === style ? "selected" : ""}>${style}</option>`; }).join("")}</select><div class="workflow-actions"><button class="dashboard-button" type="submit">Save Brand Identity →</button></div></form>`;
    }
    function settingsView() {
        const name = getCreator();
        const account = getAccount();
        const rows = [["Account", `${name} · ${(account && account.email) || "Email not available"}`, "profile"], ["Notifications", "Manage dashboard notifications", "notifications"], ["Password", "Password is managed by your account", "password"], ["Billing", "Billing information", "billing"], ["Payouts", "Manage payout details", "payouts"]];
        return `${heading("Settings", "Manage your account and preferences.")}<div class="settings-list">${rows.map(function (row) { return `<div class="setting-row"><div><strong>${row[0]}</strong><p>${escapeHTML(row[1])}</p></div>${row[2] === "notifications" ? `<button class="switch ${localStorage.getItem("brandifyDashboardNotifications") !== "false" ? "on" : ""}" data-notification-switch aria-label="Toggle notifications"></button>` : `<button class="dashboard-button secondary small" data-settings-action="${row[2]}">Manage</button>`}</div>`; }).join("")}<div class="setting-row"><div><strong>Logout</strong><p>Sign out while keeping your brand information saved.</p></div><button class="dashboard-button secondary small" id="settingsLogout">Logout</button></div></div>`;
    }
    function helpView() { return `${heading("Help & Support", "Find a hand with your Brandify workspace.")}<div class="detail-grid"><section class="detail-card"><h2>GETTING STARTED</h2><p class="detail-help-copy">Your brand details are saved in this browser. Use the dashboard navigation to manage your catalog, review recorded orders, and see your payout setup.</p></section><section class="detail-card"><h2>NEED HELP?</h2><p class="detail-help-copy">Contact support at <a href="mailto:support@brandify.com">support@brandify.com</a>.</p></section></div>`; }
    function render() {
        setHeader();
        const views = { dashboard: dashboardView, catalog: catalogView, products: productsView, customize: customizeView, pricing: pricingView, review: reviewView, orders: ordersView, customers: customersView, analytics: analyticsView, brand: brandView, identity: identityView, store: storeView, channels: channelsView, payouts: payoutsView, settings: settingsView, help: helpView };
        content.innerHTML = (views[currentView] || dashboardView)();
        bindViewEvents();
        if (currentView === "orders" && currentRequestId && currentRequestId !== openedRequestNotification) {
            const request = existingRequest(currentRequestId);
            if (request) { openedRequestNotification = currentRequestId; openRequestModal(request); }
        }
    }
    function bindViewEvents() {
        const createRequestButton = content.querySelector("[data-create-request]");
        if (createRequestButton) createRequestButton.addEventListener("click", function () { orderRequestMode = true; editingRequestId = ""; render(); });
        const cancelRequestButton = content.querySelector("[data-cancel-request]");
        if (cancelRequestButton) cancelRequestButton.addEventListener("click", function () { orderRequestMode = false; editingRequestId = ""; render(); });
        content.querySelectorAll("[data-edit-request]").forEach(function (button) { button.addEventListener("click", function () { editingRequestId = button.dataset.editRequest; orderRequestMode = true; render(); }); });
        content.querySelectorAll("[data-view-request]").forEach(function (button) { button.addEventListener("click", function () { const request = existingRequest(button.dataset.viewRequest); if (request) openRequestModal(request); }); });
        const requestForm = document.getElementById("fulfillmentRequestForm");
        if (requestForm) {
            const updateBillingFields = function () {
                const fields = document.getElementById("billingAddressFields");
                const same = requestForm.elements.sameBilling.checked;
                fields.hidden = same;
                fields.querySelectorAll("input").forEach(function (input) { input.required = !same && input.name !== "billAddressLine2"; });
                updateRequestSummary();
            };
            const bindItem = function (row) {
                const productSelect = row.querySelector("[data-request-product]");
                productSelect.addEventListener("change", function () {
                    const allRows = Array.from(document.querySelectorAll("#requestItems [data-request-item]"));
                    const snapshot = allRows.map(function (itemRow) {
                        const selects = {};
                        itemRow.querySelectorAll("[data-request-variant]").forEach(function (input) { selects[input.dataset.requestVariant] = input.value; });
                        return { productId: itemRow.querySelector("[data-request-product]").value, quantity: itemRow.querySelector("[data-request-quantity]").value, selectedVariants: selects };
                    });
                    snapshot[allRows.indexOf(row)].productId = productSelect.value;
                    document.getElementById("requestItems").innerHTML = snapshot.map(function (item, index) { return orderItemMarkup(item.productId, index, item); }).join("");
                    document.querySelectorAll("#requestItems [data-request-item]").forEach(bindItem);
                    updateRequestSummary();
                });
                row.querySelectorAll("input, select").forEach(function (input) { input.addEventListener("input", updateRequestSummary); input.addEventListener("change", updateRequestSummary); });
                const remove = row.querySelector("[data-remove-request-item]");
                if (remove) remove.addEventListener("click", function () { row.remove(); document.querySelectorAll("#requestItems [data-request-item]").forEach(function (item, index) { const title = item.querySelector(".request-item-heading strong"); title.textContent = `Product ${index + 1}`; item.querySelector("[data-remove-request-item]")?.toggleAttribute("hidden", index === 0); }); updateRequestSummary(); });
            };
            document.querySelectorAll("#requestItems [data-request-item]").forEach(bindItem);
            requestForm.elements.sameBilling.addEventListener("change", updateBillingFields);
            updateBillingFields();
            requestForm.addEventListener("input", updateRequestSummary);
            requestForm.addEventListener("change", updateRequestSummary);
            const addItemButton = document.getElementById("addRequestItem");
            if (addItemButton) addItemButton.addEventListener("click", function () {
                const container = document.getElementById("requestItems");
                const index = container.querySelectorAll("[data-request-item]").length;
                container.insertAdjacentHTML("beforeend", orderItemMarkup("", index, {}));
                bindItem(container.lastElementChild);
                updateRequestSummary();
            });
            const draftButton = document.getElementById("saveRequestDraft");
            draftButton.addEventListener("click", function () {
                if (draftButton.disabled) return;
                draftButton.disabled = true;
                const savedStatus = existingRequest(editingRequestId);
                saveFulfillmentRequest(savedStatus && savedStatus.status === "Needs Changes" ? "Needs Changes" : "Draft");
            });
            requestForm.addEventListener("submit", function (event) {
                event.preventDefault();
                const submitButton = document.getElementById("submitRequest");
                if (submitButton.disabled || !validateFulfillmentRequest()) return;
                submitButton.disabled = true;
                saveFulfillmentRequest(existingRequest(editingRequestId) && existingRequest(editingRequestId).status === "Needs Changes" ? "Resubmitted" : "Awaiting Approval");
            });
            updateRequestSummary();
        }
        content.querySelectorAll("[data-view]").forEach(function (button) { button.addEventListener("click", function () { navigate(button.dataset.view); }); });
        content.querySelectorAll("[data-continue-setup], [data-setup-view]").forEach(function (button) {
            button.addEventListener("click", function () {
                const view = button.dataset.continueSetup || button.dataset.setupView;
                if (button.dataset.setupTask === "identity") navigate("identity");
                else if (["customize", "pricing"].includes(view)) navigate(view, getMyProducts()[0] && getMyProducts()[0].id);
                else navigate(view);
            });
        });
        content.querySelectorAll("[data-catalog-category]").forEach(function (button) { button.addEventListener("click", function () { dashboardCatalogCategory = button.dataset.catalogCategory; render(); }); });
        const catalogSearch = document.getElementById("catalogSearch");
        if (catalogSearch) catalogSearch.addEventListener("input", function () { dashboardCatalogQuery = catalogSearch.value; const cursor = catalogSearch.selectionStart; render(); const next = document.getElementById("catalogSearch"); next.focus(); next.setSelectionRange(cursor, cursor); });
        content.querySelectorAll("[data-customize-product]").forEach(function (button) { button.addEventListener("click", function () { navigate("customize", button.dataset.customizeProduct); }); });
        content.querySelectorAll("[data-price-product]").forEach(function (button) { button.addEventListener("click", function () { navigate("pricing", button.dataset.priceProduct); }); });
        content.querySelectorAll("[data-review-product]").forEach(function (button) { button.addEventListener("click", function () { navigate("review", button.dataset.reviewProduct); }); });
        content.querySelectorAll("[data-product-menu-toggle]").forEach(function (button) {
            button.addEventListener("click", function (event) {
                event.preventDefault(); event.stopPropagation();
                const menu = button.parentElement.querySelector(".my-product-menu");
                const shouldOpen = !menu.classList.contains("open");
                closeProductMenus();
                if (shouldOpen) {
                    menu.classList.add("open");
                    button.setAttribute("aria-expanded", "true");
                    const buttonRect = button.getBoundingClientRect();
                    const menuRect = menu.getBoundingClientRect();
                    const left = Math.max(8, Math.min(buttonRect.right - menuRect.width, window.innerWidth - menuRect.width - 8));
                    const below = buttonRect.bottom + 6;
                    const top = below + menuRect.height <= window.innerHeight - 8 ? below : Math.max(8, buttonRect.top - menuRect.height - 6);
                    menu.style.left = `${left}px`;
                    menu.style.top = `${top}px`;
                }
            });
        });
        content.querySelectorAll(".my-product-card[data-product-url]").forEach(function (card) {
            card.addEventListener("click", function (event) {
                if (event.target.closest("a, button, .my-product-menu")) return;
                window.location.href = card.dataset.productUrl;
            });
            card.addEventListener("keydown", function (event) {
                if ((event.key === "Enter" || event.key === " ") && !event.target.closest("button, a")) { event.preventDefault(); window.location.href = card.dataset.productUrl; }
            });
        });
        content.querySelectorAll("[data-my-product-edit]").forEach(function (button) {
            button.addEventListener("click", function (event) {
                event.preventDefault(); event.stopPropagation();
                editingProductMode = true;
                navigate("customize", button.dataset.myProductEdit);
            });
        });
        content.querySelectorAll("[data-my-product-delete]").forEach(function (button) {
            button.addEventListener("click", function (event) {
                event.preventDefault(); event.stopPropagation();
                const product = getMyProducts().find(function (item) { return item.id === button.dataset.myProductDelete; });
                if (!product) return;
                closeProductMenus();
                const body = `<p class="delete-confirm-copy">${escapeHTML(product.name)} will be removed from your My Products list. This action cannot be undone.</p><div class="modal-actions"><button type="button" class="dashboard-button secondary" data-delete-cancel>Cancel</button><button type="button" class="dashboard-button danger" data-delete-confirm>Delete Product</button></div>`;
                openModal("Delete this product?", body, function (backdrop, close) {
                    backdrop.querySelector("[data-delete-cancel]").addEventListener("click", close);
                    backdrop.querySelector("[data-delete-confirm]").addEventListener("click", function () {
                        const current = read("brandifyMyProducts", []);
                        const savedProducts = Array.isArray(current) ? current : [];
                        localStorage.setItem("brandifyMyProducts", JSON.stringify(savedProducts.filter(function (item) { return !item || item.id !== product.id; })));
                        const removed = arrayValue("brandifyRemovedMyProducts");
                        if (!removed.includes(product.id)) removed.push(product.id);
                        localStorage.setItem("brandifyRemovedMyProducts", JSON.stringify(removed));
                        editingProductMode = false;
                        close();
                        navigate("products");
                        showToast("Product deleted successfully ✓");
                    });
                });
            });
        });
        const customizationForm = document.getElementById("customizationForm");
        if (customizationForm) customizationForm.addEventListener("submit", function (event) {
            event.preventDefault();
            const product = selectedProduct(); if (!product) return;
            const formData = new FormData(customizationForm);
            const customization = Array.from(content.querySelectorAll('input[name="customization"]:checked')).map(function (input) { return input.value; });
            if (editingProductMode) {
                const continueToPricing = event.submitter && event.submitter.id === "continueProductEdit";
                const rawPrice = String(formData.get("sellingPrice") || "").trim();
                const sellingPrice = rawPrice ? Number(rawPrice) : null;
                if (rawPrice && (!Number.isFinite(sellingPrice) || sellingPrice <= 0)) { document.getElementById("editSellingPrice").focus(); showToast("Enter a valid selling price."); return; }
                saveMyProduct(Object.assign({}, product, { customization: customization, sellingPrice: sellingPrice }));
                editingProductMode = false;
                navigate(continueToPricing ? "pricing" : "products", continueToPricing ? product.id : undefined);
                showToast("Product updated successfully ✓");
                return;
            }
            saveMyProduct(Object.assign({}, product, { customization: customization, status: product.sellingPrice ? "Ready" : "Draft" }));
            showToast("Customization saved."); navigate("pricing", product.id);
        });
        const cancelProductEdit = document.getElementById("cancelProductEdit");
        if (cancelProductEdit) cancelProductEdit.addEventListener("click", function () { editingProductMode = false; navigate("products"); });
        const savePrice = document.getElementById("saveProductPrice");
        if (savePrice) savePrice.addEventListener("click", function () {
            const product = selectedProduct(); const priceInput = document.getElementById("sellingPriceInput");
            const price = Number(priceInput && priceInput.value);
            if (!product || !Number.isFinite(price) || price <= 0) { showToast("Enter a valid selling price."); if (priceInput) priceInput.focus(); return; }
            saveMyProduct(Object.assign({}, product, { sellingPrice: price, status: product.customization && product.customization.length ? "Ready" : "Draft" }));
            showToast("Selling price saved."); navigate("review", product.id);
        });
        const publishProduct = document.getElementById("publishProduct");
        if (publishProduct) publishProduct.addEventListener("click", function () {
            const product = selectedProduct(); if (!product || !product.sellingPrice || !product.customization || !product.customization.length) return;
            saveMyProduct(Object.assign({}, product, { status: "Published" }));
            showToast("Product published to your brand."); navigate("products");
        });
        const identityForm = document.getElementById("brandIdentityForm");
        if (identityForm) identityForm.addEventListener("submit", function (event) {
            event.preventDefault(); const values = new FormData(identityForm);
            const prior = read("brandifyBrandIdentity", {}) || {};
            localStorage.setItem("brandifyBrandIdentity", JSON.stringify(Object.assign({}, prior, { primaryColor: values.get("primaryColor"), secondaryColor: values.get("secondaryColor"), font: values.get("font"), style: values.get("style") })));
            showToast("Brand identity saved."); navigate("dashboard");
        });
        const storeForm = document.getElementById("storeSetupForm");
        if (storeForm) storeForm.addEventListener("submit", function (event) {
            event.preventDefault(); const values = new FormData(storeForm);
            const storeHandle = String(values.get("storeHandle") || "").trim().toLowerCase();
            if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(storeHandle)) { document.getElementById("storeFormError").textContent = "Use lowercase letters, numbers, and hyphens for your store URL."; return; }
            localStorage.setItem("brandifyStoreSetup", JSON.stringify({ storeName: String(values.get("storeName")).trim(), storeHandle: storeHandle, storeDescription: String(values.get("storeDescription") || "").trim(), storeTheme: values.get("storeTheme") }));
            storeEditMode = false; showToast("Store setup saved."); navigate("dashboard");
        });
        const payoutForm = document.getElementById("payoutSetupForm");
        if (payoutForm) payoutForm.addEventListener("submit", function (event) {
            event.preventDefault(); const values = new FormData(payoutForm);
            const payout = { accountHolderName: String(values.get("accountHolderName")).trim(), bankName: String(values.get("bankName")).trim(), accountNumber: String(values.get("accountNumber") || (read("brandifyPayoutDetails", {}) || {}).accountNumber || "").replace(/\s/g, ""), ifscCode: String(values.get("ifscCode")).trim().toUpperCase() };
            if (!payout.accountHolderName || !payout.bankName || !payout.accountNumber || !payout.ifscCode) { document.getElementById("payoutFormError").textContent = "Complete each payout field to save your details."; return; }
            localStorage.setItem("brandifyPayoutDetails", JSON.stringify(payout));
            payoutEditMode = false; showToast("Payout details saved."); navigate("dashboard");
        });
        const editStore = content.querySelector("[data-edit-store]");
        if (editStore) editStore.addEventListener("click", function () { storeEditMode = true; render(); });
        const dismiss = content.querySelector("[data-dismiss-welcome]");
        if (dismiss) dismiss.addEventListener("click", function () { localStorage.setItem("brandifyDashboardWelcomeShown", "true"); render(); });
        const period = document.getElementById("salesPeriod");
        if (period) period.addEventListener("change", function () {
            const chart = document.getElementById("salesChart");
            const trend = salesTrend(creatorOrderRecords(), period.value);
            if (chart) chart.innerHTML = trend ? svgChart(trend.values, trend.labels) : emptyState("No sales data for this period", "Completed orders with dates will appear here.", "▥");
        });
        const pSearch = document.getElementById("productSearch");
        if (pSearch) pSearch.addEventListener("input", function () { productQuery = pSearch.value; const cursor = pSearch.selectionStart; render(); const next = document.getElementById("productSearch"); next.focus(); next.setSelectionRange(cursor, cursor); });
        const pFilter = document.getElementById("productFilter");
        if (pFilter) pFilter.addEventListener("change", function () { productFilter = pFilter.value; render(); });
        const oSearch = document.getElementById("orderSearch");
        if (oSearch) oSearch.addEventListener("input", function () { orderSearchQuery = oSearch.value; const cursor = oSearch.selectionStart; render(); const next = document.getElementById("orderSearch"); next.focus(); next.setSelectionRange(cursor, cursor); });
        content.querySelectorAll("[data-order-filter]").forEach(function (button) { button.addEventListener("click", function () { activeOrderFilter = button.dataset.orderFilter; render(); }); });
        const cSearch = document.getElementById("customerSearch");
        if (cSearch) cSearch.addEventListener("input", function () { customerQuery = cSearch.value; const cursor = cSearch.selectionStart; render(); const next = document.getElementById("customerSearch"); next.focus(); next.setSelectionRange(cursor, cursor); });
        content.querySelectorAll("tr[data-order-id]").forEach(function (row) { row.addEventListener("click", function () { const order = creatorOrderRecords().find(function (item) { return item.id === row.dataset.orderId; }); if (order) openOrderModal(order); }); });
        content.querySelectorAll("[data-open-order]").forEach(function (button) { button.addEventListener("click", function () { const id = button.dataset.openOrder; if (id) window.location.href = `order-details.html?id=${encodeURIComponent(id)}`; }); });
        const editBrand = content.querySelector("[data-edit-brand]");
        if (editBrand) editBrand.addEventListener("click", function () { navigate("identity"); });
        const editPayout = content.querySelector("[data-edit-payout]");
        if (editPayout) editPayout.addEventListener("click", function () { payoutEditMode = true; render(); });
        content.querySelectorAll("[data-store-action]").forEach(function (button) { button.addEventListener("click", function () { showToast(`${button.dataset.storeAction} will be available when your storefront is published.`); }); });
        content.querySelectorAll("[data-settings-action]").forEach(function (button) { button.addEventListener("click", function () { if (button.dataset.settingsAction === "payouts") navigate("payouts"); else showToast(`${button.textContent.trim()} settings are ready to connect.`); }); });
        const switchButton = content.querySelector("[data-notification-switch]");
        if (switchButton) switchButton.addEventListener("click", function () { const enabled = localStorage.getItem("brandifyDashboardNotifications") === "false"; localStorage.setItem("brandifyDashboardNotifications", String(enabled)); switchButton.classList.toggle("on", enabled); showToast(`Notifications ${enabled ? "enabled" : "paused"}.`); });
        const logout = document.getElementById("settingsLogout");
        if (logout) logout.addEventListener("click", doLogout);
    }
    function openModal(title, body, onReady) {
        const backdrop = document.createElement("div");
        backdrop.className = "modal-backdrop";
        backdrop.innerHTML = `<section class="dashboard-modal" role="dialog" aria-modal="true" aria-label="${escapeHTML(title)}"><div class="modal-heading"><h2>${escapeHTML(title)}</h2><button class="modal-close" type="button" aria-label="Close">×</button></div>${body}</section>`;
        document.body.appendChild(backdrop);
        function close() {
            backdrop.remove();
            document.removeEventListener("keydown", onKeydown);
        }
        function onKeydown(event) { if (event.key === "Escape" && document.body.contains(backdrop)) close(); }
        document.addEventListener("keydown", onKeydown);
        backdrop.querySelector(".modal-close").addEventListener("click", close);
        backdrop.addEventListener("click", function (event) { if (event.target === backdrop) close(); });
        if (onReady) onReady(backdrop, close);
        const first = backdrop.querySelector("input,button");
        if (first) first.focus();
    }
    function openProductModal(product) {
        const editing = Boolean(product);
        const body = `<form class="modal-form" id="productForm"><label>Product name<input class="form-control" name="name" required maxlength="60" value="${escapeHTML(product ? product.name : "")}" placeholder="e.g. Everyday T-Shirt"></label><label>Selling price (₹)<input class="form-control" name="price" type="number" min="1" step="1" value="${escapeHTML(product ? product.price : "")}" placeholder="999"></label><label>Status<select class="form-control" name="status"><option ${!product || product.status === "Active" ? "selected" : ""}>Active</option><option ${product && product.status === "Draft" ? "selected" : ""}>Draft</option></select></label><div class="modal-actions"><button class="dashboard-button secondary" type="button" data-cancel>Cancel</button><button class="dashboard-button" type="submit">${editing ? "Save Changes" : "Add Product"}</button></div></form>`;
        openModal(editing ? "Edit Product" : "Add Product", body, function (backdrop, close) {
            backdrop.querySelector("[data-cancel]").addEventListener("click", close);
            backdrop.querySelector("#productForm").addEventListener("submit", function (event) {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                const value = { name: String(form.get("name")).trim(), price: Number(form.get("price")) || "", status: String(form.get("status")), source: product ? product.source : "dashboard", id: product ? product.id : `product-${Date.now()}`, category: product ? product.category : "", basePrice: product && product.source === "my-brand" ? product.price : null };
                if (product && product.source === "my-brand") {
                    const myProducts = read("brandifyMyProducts", []);
                    const index = myProducts.findIndex(function (item) { return item.id === product.id; });
                    if (index >= 0) {
                        myProducts[index] = Object.assign({}, myProducts[index], value, { basePrice: myProducts[index].basePrice });
                        localStorage.setItem("brandifyMyProducts", JSON.stringify(myProducts));
                    }
                } else if (product && product.source === "onboarding") {
                    const overrides = read("brandifyDashboardProductOverrides", {});
                    overrides[product.name] = value;
                    localStorage.setItem("brandifyDashboardProductOverrides", JSON.stringify(overrides));
                } else if (product) updateExtraProduct(product.id, value);
                else { const items = read("brandifyDashboardProducts", []); items.push(value); localStorage.setItem("brandifyDashboardProducts", JSON.stringify(items)); }
                close();
                showToast(editing ? "Product updated." : "Product added.");
                render();
            });
        });
    }
    function updateExtraProduct(id, update) {
        const items = read("brandifyDashboardProducts", []);
        const index = items.findIndex(function (item) { return item.id === id; });
        if (index >= 0) items[index] = Object.assign({}, items[index], update);
        localStorage.setItem("brandifyDashboardProducts", JSON.stringify(items));
    }
    function openProductView(product) {
        const body = `<div class="detail-row"><span>Product</span><strong>${escapeHTML(product.name)}</strong></div><div class="detail-row"><span>Selling Price</span><strong>${product.price ? money(product.price) : "Price not set"}</strong></div><div class="detail-row"><span>Status</span><strong>${escapeHTML(product.status)}</strong></div><div class="modal-actions"><button type="button" class="dashboard-button secondary" data-view-close>Close</button><button type="button" class="dashboard-button" data-view-edit>Edit Product</button></div>`;
        openModal("Product Details", body, function (backdrop, close) {
            backdrop.querySelector("[data-view-close]").addEventListener("click", close);
            backdrop.querySelector("[data-view-edit]").addEventListener("click", function () { close(); openProductModal(product); });
        });
    }
    function openOrderModal(order) {
        const body = `<div class="detail-row"><span>Order</span><strong>${order.id ? `#${escapeHTML(order.id)}` : "Order"}</strong></div><div class="detail-row"><span>Customer</span><strong>${escapeHTML(order.customer)}</strong></div><div class="detail-row"><span>Product</span><strong>${escapeHTML(order.product)}</strong></div><div class="detail-row"><span>Amount</span><strong>${money(order.amount)}</strong></div><div class="detail-row"><span>Status</span><strong>${escapeHTML(order.status)}</strong></div><div class="detail-row"><span>Date</span><strong>${escapeHTML(formatOrderDate(order.date))}</strong></div><div class="modal-actions"><button type="button" class="dashboard-button secondary" data-modal-done>Close</button>${order.id ? `<a class="dashboard-button" href="order-details.html?id=${encodeURIComponent(order.id)}">View Details →</a>` : ""}</div>`;
        openModal(`Order #${order.id}`, body, function (backdrop, close) { backdrop.querySelector("[data-modal-done]").addEventListener("click", close); });
    }
    function openRequestModal(request) {
        const itemRows = (request.items || []).map(function (item) { return `<div class="detail-row"><span>${escapeHTML(item.productName)} × ${Number(item.quantity) || 1}</span><strong>${escapeHTML(Object.entries(item.selectedVariants || {}).map(function (entry) { return `${entry[0]}: ${entry[1]}`; }).join(" · ") || "No variants")}</strong></div><small class="request-detail-customization">Customization: ${escapeHTML((item.customization || []).join(", ") || "—")}</small>`; }).join("");
        const history = (request.statusHistory || []).map(function (entry) { return `<li><strong>${escapeHTML(entry.status)}</strong><span>${escapeHTML(formatOrderDate(entry.timestamp))}${entry.reason ? ` · ${escapeHTML(entry.reason)}` : ""}</span></li>`; }).join("");
        const body = `<div class="detail-grid"><section class="detail-card"><h2>REQUEST</h2>${detailRow("Request ID", request.requestId)}${detailRow("Status", request.status)}${detailRow("Brand", request.brandName || "—")}${detailRow("Creator", request.creatorName || "—")}${detailRow("Customer", request.customer && request.customer.name || "—")}${detailRow("Phone", request.customer && request.customer.phone || "—")}${detailRow("Email", request.customer && request.customer.email || "—")}</section><section class="detail-card"><h2>SHIPPING</h2><p>${addressMarkup(request.shippingAddress)}</p>${detailRow("Customer payment", request.customerPaymentStatus || "—")}${detailRow("Creator notes", request.creatorNotes || "—")}</section></div><section class="detail-card"><h2>PRODUCTS</h2>${itemRows || "No products"}</section>${request.status !== "Approved" && request.changeReason ? `<p class="request-reason"><strong>Admin feedback:</strong> ${escapeHTML(request.changeReason)}</p>` : ""}<section class="detail-card"><h2>REQUEST HISTORY</h2><ol class="request-history">${history}</ol></section><div class="modal-actions"><button type="button" class="dashboard-button" data-modal-done>Done</button></div>`;
        openModal(`Fulfillment request ${request.requestId}`, body, function (backdrop, close) { backdrop.querySelector("[data-modal-done]").addEventListener("click", close); });
    }
    function openNotificationCenter() {
        const notifications = creatorNotifications();
        const list = notifications.length ? notifications.slice(0, 20).map(function (item) { return `<button type="button" class="notification-row ${item.read ? "" : "unread"}" data-open-notification="${escapeHTML(item.id)}"><strong>${escapeHTML(item.title)}</strong><span>${escapeHTML(item.message)}</span><small>${escapeHTML(formatOrderDate(item.createdAt))}</small></button>`; }).join("") : emptyState("No notifications yet", "Updates about requests and orders will appear here.", "♧");
        const hasUnread = notifications.some(function (item) { return !item.read; });
        openModal("Notifications", `<div class="notification-center-toolbar"><span>Latest account updates</span><button type="button" class="panel-link" data-mark-all-notifications ${hasUnread ? "" : "disabled"}>Mark all as read</button></div><div class="notification-list">${list}</div>`, function (backdrop, close) {
            backdrop.querySelector("[data-mark-all-notifications]").addEventListener("click", function (event) {
                if (event.currentTarget.disabled) return;
                const creatorId = localStorage.getItem("brandifyCreatorId") || "";
                const items = window.BrandifyOrderWorkflow.list("brandifyNotifications");
                items.forEach(function (item) { if (item.recipientType === "creator" && item.recipientId === creatorId) item.read = true; });
                window.BrandifyOrderWorkflow.write("brandifyNotifications", items);
                close(); setHeader(); showToast("All notifications marked as read."); openNotificationCenter();
            });
            backdrop.querySelectorAll("[data-open-notification]").forEach(function (button) { button.addEventListener("click", function () {
                const items = window.BrandifyOrderWorkflow.list("brandifyNotifications");
                const selected = items.find(function (item) { return item.id === button.dataset.openNotification; });
                if (selected) selected.read = true;
                window.BrandifyOrderWorkflow.write("brandifyNotifications", items);
                close(); setHeader();
                if (selected && selected.relatedOrderId) window.location.href = `order-details.html?id=${encodeURIComponent(selected.relatedOrderId)}`;
                else if (selected && selected.relatedRequestId) window.location.href = `dashboard.html#orders/${encodeURIComponent(selected.relatedRequestId)}`;
            }); });
        });
    }
    function doLogout() {
        openModal("Log out?", `<p>Are you sure you want to log out of your creator account?</p><div class="modal-actions"><button type="button" class="dashboard-button secondary" data-cancel-logout>Cancel</button><button type="button" class="dashboard-button" data-confirm-logout>Log out</button></div>`, function (backdrop, close) {
            backdrop.querySelector("[data-cancel-logout]").addEventListener("click", close);
            backdrop.querySelector("[data-confirm-logout]").addEventListener("click", function () {
                localStorage.removeItem("brandifyLoggedIn");
                window.location.href = "login.html";
            });
        });
    }

    nav.addEventListener("click", function (event) {
        const button = event.target.closest("[data-view]");
        if (button) navigate(button.dataset.view);
    });
    const creatorAccountTrigger = document.getElementById("creatorAccountTrigger");
    const creatorAccountDropdown = document.getElementById("creatorAccountDropdown");
    creatorAccountTrigger.addEventListener("click", function () {
        const open = !creatorAccountDropdown.hidden;
        creatorAccountDropdown.hidden = open;
        creatorAccountTrigger.setAttribute("aria-expanded", String(!open));
    });
    creatorAccountDropdown.querySelectorAll("[data-account-view]").forEach(function (button) {
        button.addEventListener("click", function () {
            creatorAccountDropdown.hidden = true;
            creatorAccountTrigger.setAttribute("aria-expanded", "false");
            navigate(button.dataset.accountView);
        });
    });
    document.getElementById("creatorAccountLogout").addEventListener("click", function () {
        creatorAccountDropdown.hidden = true;
        creatorAccountTrigger.setAttribute("aria-expanded", "false");
        doLogout();
    });
    document.addEventListener("click", function (event) {
        if (!event.target.closest(".creator-account-menu")) {
            creatorAccountDropdown.hidden = true;
            creatorAccountTrigger.setAttribute("aria-expanded", "false");
        }
    });
    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
            creatorAccountDropdown.hidden = true;
            creatorAccountTrigger.setAttribute("aria-expanded", "false");
        }
    });
    document.getElementById("sidebarUserMenu").addEventListener("click", function () { navigate("settings"); });
    document.getElementById("notificationButton").addEventListener("click", openNotificationCenter);
    window.addEventListener("storage", function (event) {
        if (["brandifyOrders", "brandifyOrderRequests", "brandifyNotifications", "brandifyMyProducts", "brandifyProductCatalog"].includes(event.key)) render();
    });
    document.getElementById("mobileMenuButton").addEventListener("click", function () {
        const open = sidebar.classList.toggle("open");
        overlay.classList.toggle("show", open);
        document.getElementById("mobileMenuButton").setAttribute("aria-expanded", String(open));
    });
    overlay.addEventListener("click", closeMobileMenu);
    document.addEventListener("click", function (event) {
        if (!event.target.closest(".my-product-menu-wrap")) closeProductMenus();
    });
    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") closeProductMenus();
    });
    window.addEventListener("scroll", closeProductMenus, true);
    window.addEventListener("resize", closeProductMenus);
    window.addEventListener("storage", function (event) {
        if (event.key === "brandifyProductCatalog" && currentView === "catalog") render();
    });
    function readRoute() {
        const parts = location.hash.slice(1).split("/");
        return { view: parts[0], productId: parts[0] === "orders" ? "" : (parts[1] ? decodeURIComponent(parts[1]) : ""), requestId: parts[0] === "orders" && parts[1] ? decodeURIComponent(parts[1]) : "" };
    }
    window.addEventListener("hashchange", function () {
        const route = readRoute();
        if (titles[route.view] && (route.view !== currentView || route.productId !== currentProductId || route.requestId !== currentRequestId)) {
            if (route.view !== "customize") editingProductMode = false;
            currentView = route.view;
            currentProductId = route.productId;
            currentRequestId = route.requestId;
            render();
        }
    });

    const initialRoute = readRoute();
    if (titles[initialRoute.view]) { currentView = initialRoute.view; currentProductId = initialRoute.productId; currentRequestId = initialRoute.requestId; }
    render();
});
