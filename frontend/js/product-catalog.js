/* Shared catalog built only from the product images already in frontend/images/products. */
(function () {
    "use strict";

    const categoryRows = [
        ["Fashion", "fashion.png", [["Hoodies", "01-hoodie.png", 450], ["T-Shirts", "02-t-shirt.png", 250], ["Jeans", "03-jeans.png"], ["Caps", "04-cap.png", 180]]],
        ["Beauty", "beauty.png", [["Face Wash", "01-face-wash.png"], ["Moisturizer", "02-moisturizer.png", 180], ["Face Serum", "03-serum.png", 220], ["Lipstick", "04-lipstick.png"]]],
        ["Fitness", "fitness.png", [["Protein Powder", "01-protein-powder.png"], ["Shaker Bottle", "02-shaker-bottle.png", 180], ["Yoga Mat", "03-yoga-mat.png"], ["Dumbbells", "04-dumbbells.png"]]],
        ["Lifestyle", "lifestyle.png", [["Mugs", "01-mug.png", 150], ["Water Bottles", "02-water-bottle.png"], ["Notebooks", "03-notebook.png", 100], ["Pens", "04-pen.png"]]],
        ["Food & Beverage", "food-beverage.png", [["Coffee", "01-coffee.png", 180], ["Granola", "02-granola.png"], ["Green Tea", "03-green-tea.png"], ["Juice", "04-juice.png"]]],
        ["Accessories", "accessories.png", [["Sunglasses", "01-sunglasses.png", 250], ["Watches", "02-watch.png", 500], ["Wallets", "03-wallet.png"], ["Backpacks", "04-backpack.png"]]],
        ["Home", "home.png", [["Candles", "01-candle.png", 200], ["Cushions", "02-cushion.png", 250], ["Diffusers", "03-diffuser.png"], ["Plants", "04-plant.png"]]],
        ["Health & Wellness", "health-wellness.png", [["Vitamins", "01-vitamins.png"], ["Omega 3", "02-omega-3.png"], ["Collagen", "03-collagen.png"], ["Yoga Products", "04-yoga-mat.png"]]],
        ["Creator Merch", "creator-merch.png", [["Creator Hoodies", "01-hoodie.png", 450], ["Creator T-Shirts", "02-t-shirt.png", 250], ["Creator Caps", "03-cap.png", 180], ["Creator Tote Bags", "04-tote-bag.png"]]]
    ];

    function slug(value) {
        return value.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    }

    window.BRANDIFY_CATEGORIES = categoryRows.map(function (row) {
        return { name: row[0], image: `images/categories/${row[1]}` };
    });

    const seedProducts = categoryRows.reduce(function (all, row) {
        const category = row[0];
        const folder = slug(category).replace("food-and-beverage", "food-beverage").replace("health-and-wellness", "health-wellness");
        row[2].forEach(function (product) {
            all.push({
                id: `${slug(category)}-${slug(product[0])}`,
                name: product[0],
                category: category,
                image: `images/products/${folder}/${product[1]}`,
                categoryImage: `images/categories/${row[1]}`,
                basePrice: product[2] || null,
                customizationAvailable: true
            });
        });
        return all;
    }, []);

    function readCatalog() {
        try {
            const stored = JSON.parse(localStorage.getItem("brandifyProductCatalog") || "null");
            if (Array.isArray(stored)) return stored;
        } catch (error) { /* Restore the original catalog below if storage is malformed. */ }
        localStorage.setItem("brandifyProductCatalog", JSON.stringify(seedProducts));
        return seedProducts;
    }

    window.BrandifyCatalog = {
        getAll: readCatalog,
        getCreatorCatalog: function () {
            return readCatalog().filter(function (product) { return product.status !== "Archived" && product.status !== "Inactive"; });
        },
        save: function (products) {
            const safeProducts = Array.isArray(products) ? products : [];
            localStorage.setItem("brandifyProductCatalog", JSON.stringify(safeProducts));
            window.BRANDIFY_PRODUCTS = safeProducts;
            return safeProducts;
        }
    };
    window.BRANDIFY_PRODUCTS = readCatalog();
    window.addEventListener("storage", function (event) {
        if (event.key === "brandifyProductCatalog") window.BRANDIFY_PRODUCTS = readCatalog();
    });
})();
