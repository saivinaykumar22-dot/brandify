document.addEventListener("DOMContentLoaded", function () {
    "use strict";

    /* =====================================================
       ELEMENTS
       ===================================================== */

    const profileTrigger =
        document.getElementById("profileTrigger");

    const profileDropdown =
        document.getElementById("profileDropdown");

    const profileName =
        document.getElementById("profileName");

    const profileAvatar =
        document.getElementById("profileAvatar");

    const successMessage =
        document.getElementById("successMessage");

    const successTitle =
        document.getElementById("successTitle");

    const successDescription =
        document.getElementById("successDescription");

    const onboardingContent =
        document.getElementById("onboardingContent");

    const progressCount =
        document.getElementById("progressCount");

    const progressPercentage =
        document.getElementById("progressPercentage");

    const progressTrack =
        document.getElementById("progressTrack");

    const progressToggle =
        document.getElementById("progressToggle");

    const logoutButton =
        document.getElementById("logoutButton");

    const saveExitButton =
        document.getElementById("saveExitButton");


    /* =====================================================
       ACCOUNT VALIDATION
       ===================================================== */

    let savedAccount = null;

    try {
        savedAccount = JSON.parse(
            localStorage.getItem("brandifyAccount")
        );
    } catch (error) {
        savedAccount = null;
    }

    if (!savedAccount) {
        window.location.href = "signup.html";
        return;
    }


    /* =====================================================
       PROFILE
       ===================================================== */

    function getInitials(name) {
        const words = name.trim().split(/\s+/);

        if (words.length === 1) {
            return words[0]
                .slice(0, 2)
                .toUpperCase();
        }

        return (
            words[0][0] +
            words[words.length - 1][0]
        ).toUpperCase();
    }

    const creatorName =
        savedAccount.fullName || "Creator";

    if (profileName) {
        profileName.textContent = creatorName;
    }

    if (profileAvatar) {
        profileAvatar.textContent =
            getInitials(creatorName);
    }


    /* =====================================================
       PROFILE DROPDOWN
       ===================================================== */

    if (profileTrigger && profileDropdown) {
        profileTrigger.addEventListener(
            "click",
            function () {
                const isOpen =
                    profileDropdown.classList.toggle("open");

                profileTrigger.setAttribute(
                    "aria-expanded",
                    String(isOpen)
                );
            }
        );

        document.addEventListener(
            "click",
            function (event) {
                if (
                    !event.target.closest(
                        ".creator-profile"
                    )
                ) {
                    profileDropdown.classList.remove(
                        "open"
                    );

                    profileTrigger.setAttribute(
                        "aria-expanded",
                        "false"
                    );
                }
            }
        );
    }


    /* =====================================================
       PRODUCT CATALOG
       ===================================================== */

    const productCatalog = {

    "Fashion": [
        ["Hoodies", "fashion/01-hoodie.png"],
        ["T-Shirts", "fashion/02-t-shirt.png"],
        ["Jeans", "fashion/03-jeans.png"],
        ["Caps", "fashion/04-cap.png"]
    ],

    "Beauty": [
        ["Face Wash", "beauty/01-face-wash.png"],
        ["Moisturizer", "beauty/02-moisturizer.png"],
        ["Face Serum", "beauty/03-serum.png"],
        ["Lipstick", "beauty/04-lipstick.png"]
    ],

    "Fitness": [
        ["Protein Powder", "fitness/01-protein-powder.png"],
        ["Shaker Bottle", "fitness/02-shaker-bottle.png"],
        ["Yoga Mat", "fitness/03-yoga-mat.png"],
        ["Dumbbells", "fitness/04-dumbbells.png"]
    ],

    "Lifestyle": [
        ["Mugs", "lifestyle/01-mug.png"],
        ["Water Bottles", "lifestyle/02-water-bottle.png"],
        ["Notebooks", "lifestyle/03-notebook.png"],
        ["Pens", "lifestyle/04-pen.png"]
    ],

    "Food & Beverage": [
        ["Coffee", "food-beverage/01-coffee.png"],
        ["Granola", "food-beverage/02-granola.png"],
        ["Green Tea", "food-beverage/03-green-tea.png"],
        ["Juice", "food-beverage/04-juice.png"]
    ],

    "Accessories": [
        ["Sunglasses", "accessories/01-sunglasses.png"],
        ["Watches", "accessories/02-watch.png"],
        ["Wallets", "accessories/03-wallet.png"],
        ["Backpacks", "accessories/04-backpack.png"]
    ],

    "Home": [
        ["Candles", "home/01-candle.png"],
        ["Cushions", "home/02-cushion.png"],
        ["Diffusers", "home/03-diffuser.png"],
        ["Plants", "home/04-plant.png"]
    ],

    "Health & Wellness": [
        ["Vitamins", "health-wellness/01-vitamins.png"],
        ["Omega 3", "health-wellness/02-omega-3.png"],
        ["Collagen", "health-wellness/03-collagen.png"],
        ["Yoga Products", "health-wellness/04-yoga-mat.png"]
    ],

    "Creator Merch": [
        ["Creator Hoodies", "creator-merch/01-hoodie.png"],
        ["Creator T-Shirts", "creator-merch/02-t-shirt.png"],
        ["Creator Caps", "creator-merch/03-cap.png"],
        ["Creator Tote Bags", "creator-merch/04-tote-bag.png"]
    ]

};
    const categories = [
        ["Fashion", "fashion.png"],
        ["Beauty", "beauty.png"],
        ["Fitness", "fitness.png"],
        ["Lifestyle", "lifestyle.png"],
        ["Food & Beverage", "food-beverage.png"],
        ["Accessories", "accessories.png"],
        ["Home", "home.png"],
        ["Health & Wellness", "health-wellness.png"],
        ["Creator Merch", "creator-merch.png"]
    ];


    /* =====================================================
       ONBOARDING STEPS
       ===================================================== */

    const steps = [

        {
            number: 1,
            title: "Brand Name",
            subtitle: "Let's give your brand a name.",
            question: "What's your brand name?",
            description:
                "Choose a unique name for your brand. You can always change it later.",
            type: "text",
            name: "brandName",
            label: "Brand name",
            placeholder: "Enter brand name",
            example: "e.g. VYRA",
            storageKey: "brandifyBrandName",
            minLength: 2
        },

        {
            number: 2,
            title: "Choose Category",
            subtitle: "Select categories for your brand.",
            question:
                "What type of products do you want to sell?",
            description:
                "Choose up to 4 categories that best fit your brand.",
            type: "radio",
            name: "brandCategory",
            storageKey: "brandifyCategory",
            options: categories.map(function (item) {
                return item[0];
            })
        },

        {
            number: 3,
            title: "Choose Product",
            subtitle:
                "Select the products you want to sell.",
            question:
                "Which products do you want to offer?",
            description:
                "Choose one or more products from your selected categories.",
            type: "radio",
            name: "brandProduct",
            storageKey: "brandifyProduct",
            options: []
        },

        {
    number: 4,
    title: "Customize Product",
    subtitle: "Make your products uniquely yours.",
    question: "",
    description: "",
    type: "customize",
    name: "productCustomization",
    storageKey: "brandifyCustomization"
},

        {
    number: 5,
    title: "Set Price",
    subtitle: "Set your selling prices.",
    question: "",
    description: "",
    type: "pricing",
    name: "productPricing",
    storageKey: "brandifyProductPricing"
},

        {
    number: 6,
    title: "Brand Identity",
    subtitle: "Build a visual identity that represents your brand.",
    question: "",
    description: "",
    type: "brandIdentity",
    name: "brandIdentity",
    storageKey: "brandifyBrandIdentity"
},
        {
    number: 7,
    title: "Create Store",
    subtitle: "Bring your brand to life with your own store.",
    question: "",
    description: "",
    type: "storeSetup",
    name: "storeSetup",
    storageKey: "brandifyStoreSetup"
},

        {
    number: 8,
    title: "Payout Setup",
    subtitle: "Add your bank details.",
    question: "Where should we send your payments?",
    description: "Enter your basic bank details to receive your earnings.",
    type: "payout",
    name: "payoutDetails",
    storageKey: "brandifyPayoutDetails"
},

        {
            number: 9,
            title: "Launch Checklist",
            subtitle: "Everything is set up. Review your details below before launching your brand.",
            question: "Your setup is complete",
            description: "100%",
            type: "final",
            name: "launchChecklist",
            storageKey: "brandifyLaunchReady"
        }

    ];


    /* =====================================================
       CURRENT STEP
       ===================================================== */

    let currentStep =
        Number(
            localStorage.getItem(
                "brandifyOnboardingStep"
            )
        ) || 1;

    if (currentStep > 9) {
        currentStep = 9;
    }

    if (currentStep < 1) {
        currentStep = 1;
    }


    /* =====================================================
       STORAGE HELPERS
       ===================================================== */

    function getSavedValue(storageKey) {
        return localStorage.getItem(storageKey) || "";
    }


    function getSavedArray(storageKey) {
        const savedValue =
            getSavedValue(storageKey);

        if (!savedValue) {
            return [];
        }

        try {
            const parsedValue =
                JSON.parse(savedValue);

            if (Array.isArray(parsedValue)) {
                return parsedValue;
            }

            return [parsedValue];

        } catch (error) {
            return [savedValue];
        }
    }

    function escapeHTML(value) {
        return String(value == null ? "" : value).replace(/[&<>"']/g, function (character) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character];
        });
    }


    /* =====================================================
       PROGRESS
       ===================================================== */

    function updateProgress(stepNumber) {
        const totalSteps = steps.length;

        const percentage =
            Math.round(
                (stepNumber / totalSteps) * 100
            );

        if (progressCount) {
            progressCount.textContent =
                `${stepNumber} of ${totalSteps} completed`;
        }

        if (progressPercentage) {
            progressPercentage.textContent =
                `${percentage}%`;
        }

        const segments =
            document.querySelectorAll(
                ".progress-segment"
            );

        segments.forEach(function (segment, index) {
            segment.classList.toggle(
                "active",
                index < stepNumber
            );
        });

        if (progressTrack) {
            progressTrack.setAttribute(
                "aria-label",
                `${percentage} percent completed`
            );
        }
    }


    /* =====================================================
       SUCCESS MESSAGE
       ===================================================== */

    function showSuccess(title, description) {
        if (successTitle) {
            successTitle.textContent = title;
        }

        if (successDescription) {
            successDescription.textContent =
                description;
        }

        if (successMessage) {
            successMessage.classList.add("show");
        }
    }


    function hideSuccess() {
        if (successMessage) {
            successMessage.classList.remove("show");
        }
    }


    /* =====================================================
       TEXT AND NUMBER FIELD
       ===================================================== */

    function renderTextField(step) {
        const inputType =
            step.type === "number"
                ? "number"
                : "text";

        return `
            <div class="form-group">

                <label for="${step.name}">
                    ${step.label}
                </label>

                <input
                    type="${inputType}"
                    id="${step.name}"
                    name="${step.name}"
                    placeholder="${step.placeholder}"
                    value="${getSavedValue(step.storageKey)}"
                    ${
                        step.type === "number"
                            ? 'min="1"'
                            : 'maxlength="60"'
                    }
                    required
                >

                <span class="input-example">
                    ${step.example}
                </span>

                <span
                    class="form-error"
                    id="${step.name}Error"
                ></span>

            </div>
        `;
    }


    /* =====================================================
       CATEGORY OPTIONS
       ===================================================== */

    function renderCategoryOptions(step) {
        const savedCategories =
            getSavedArray(step.storageKey);

        return `
            <div class="category-grid onboarding-category-grid">

                ${categories.map(function (category) {
                    const name = category[0];
                    const image = category[1];

                    const isSelected =
                        savedCategories.includes(name);

                    return `
                        <label
                            class="category-card ${
                                isSelected
                                    ? "selected"
                                    : ""
                            }"
                        >

                            <input
                                type="checkbox"
                                name="${step.name}"
                                value="${name}"
                                ${
                                    isSelected
                                        ? "checked"
                                        : ""
                                }
                            >

                            <img
                                src="images/categories/${image}"
                                alt="${name}"
                            >

                            <span class="category-card-content">

                                <strong>${name}</strong>

                                <small>
                                    Select category
                                </small>

                                <span class="category-arrow">
                                    ↗
                                </span>

                            </span>

                        </label>
                    `;
                }).join("")}

            </div>

            <span
                class="form-error"
                id="${step.name}Error"
            ></span>
        `;
    }


    /* =====================================================
       PRODUCT OPTIONS
       ===================================================== */

    function renderProductOptions(step) {
        const selectedCategories =
            getSavedArray("brandifyCategory");

        const products = [];

        selectedCategories.forEach(function (category) {
            const categoryProducts =
                productCatalog[category] || [];

            categoryProducts.forEach(function (product) {
                const alreadyExists =
                    products.some(function (item) {
                        return item[0] === product[0];
                    });

                if (!alreadyExists) {
                    products.push(product);
                }
            });
        });

        const savedProducts =
            getSavedArray(step.storageKey);

        if (products.length === 0) {
            return `
                <div class="empty-product-message">
                    <p>
                        Please select a category first to view
                        available products.
                    </p>
                </div>

                <span
                    class="form-error"
                    id="${step.name}Error"
                ></span>
            `;
        }

        return `
            <div class="category-grid onboarding-product-grid">

                ${products.map(function (product) {
                    const name = product[0];
                    const image = product[1];

                    const isSelected =
                        savedProducts.includes(name);

                    return `
                        <label
                            class="category-card ${
                                isSelected
                                    ? "selected"
                                    : ""
                            }"
                        >

                            <input
                                type="checkbox"
                                name="${step.name}"
                                value="${name}"
                                ${
                                    isSelected
                                        ? "checked"
                                        : ""
                                }
                            >

                            <img
                                src="images/products/${image}"
                                alt="${name}"
                            >

                            <span class="category-card-content">

                                <strong>${name}</strong>

                                <small>
                                    Select product
                                </small>

                                <span class="category-arrow">
                                    ↗
                                </span>

                            </span>

                        </label>
                    `;
                }).join("")}

            </div>

            <span
                class="form-error"
                id="${step.name}Error"
            ></span>
        `;
    }
function getStorageArray(key) {

    const storedValue = localStorage.getItem(key);

    if (!storedValue) {
        return [];
    }

    try {

        const parsedValue = JSON.parse(storedValue);

        return Array.isArray(parsedValue)
            ? parsedValue
            : [parsedValue];

    } catch (error) {

        return [storedValue];

    }

}


function getSelectedProductsForStep4() {

    const selectedCategories =
        getStorageArray("brandifyCategory");

    const selectedProductNames =
        getStorageArray("brandifyProduct");

    const selectedProducts = [];

    selectedCategories.forEach(function (category) {

        const products =
            productCatalog[category] || [];

        products.forEach(function (product) {

            const productName = product[0];
            const productImage = product[1];

            if (
                selectedProductNames.includes(productName) &&
                !selectedProducts.some(function (item) {
                    return item.name === productName;
                })
            ) {

                selectedProducts.push({

                    name: productName,
                    image: productImage,
                    category: category

                });

            }

        });

    });

    return selectedProducts;

}

    /* =====================================================
       OTHER RADIO OPTIONS
       ===================================================== */

    function renderOtherRadioOptions(step) {
        const savedValue =
            getSavedValue(step.storageKey);

        return `
            <div class="category-grid onboarding-options">

                ${step.options.map(function (option) {
                    const checked =
                        savedValue === option
                            ? "checked"
                            : "";

                    return `
                        <label class="category-card">

                            <input
                                type="radio"
                                name="${step.name}"
                                value="${option}"
                                ${checked}
                            >

                            <span class="category-card-content">

                                <strong>${option}</strong>

                                <small>
                                    Select this option
                                </small>

                                <span class="category-arrow">
                                    ↗
                                </span>

                            </span>

                        </label>
                    `;
                }).join("")}

            </div>

            <span
                class="form-error"
                id="${step.name}Error"
            ></span>
        `;
    }
/* =====================================================
   GET SELECTED PRODUCTS FOR STEP 5
   ===================================================== */

function getSelectedProductsForPricing() {

    const selectedCategories =
        getSavedArray("brandifyCategory");

    const selectedProductNames =
        getSavedArray("brandifyProduct");

    const products = [];

    selectedCategories.forEach(function (category) {

        (productCatalog[category] || []).forEach(function ([name, image]) {

            if (
                selectedProductNames.includes(name) &&
                !products.some(function (product) {
                    return product.name === name;
                })
            ) {

                products.push({
                    name: name,
                    image: image,
                    category: category
                });

            }

        });

    });

    return products;

}

    /* =====================================================
       RADIO OPTIONS CONTROLLER
       ===================================================== */

    function renderRadioOptions(step) {
        if (step.number === 2) {
            return renderCategoryOptions(step);
        }

        if (step.number === 3) {
            return renderProductOptions(step);
        }

        return renderOtherRadioOptions(step);
    }
/* =====================================================
   STEP 6 - ADVANCED BRAND IDENTITY STUDIO
   ===================================================== */

function getSavedBrandIdentity() {
    const savedIdentity =
        localStorage.getItem("brandifyBrandIdentity");

    if (!savedIdentity) {
        return {
            primaryColor: "#6C5CE7",
            secondaryColor: "#111827",
            font: "Inter",
            style: "Minimal and Modern",
            logo: ""
        };
    }

    try {
        return JSON.parse(savedIdentity);
    } catch (error) {
        return {
            primaryColor: "#6C5CE7",
            secondaryColor: "#111827",
            font: "Inter",
            style: "Minimal and Modern",
            logo: ""
        };
    }
}


function renderBrandIdentityStep(step) {
    const brandName =
        getSavedValue("brandifyBrandName") || "Your Brand";

    const savedIdentity =
        getSavedBrandIdentity();

    return `
        <div class="brand-studio">

            <div class="brand-studio-intro">
                <span class="brand-studio-eyebrow">
                    BRAND STUDIO
                </span>

                <h2>
                    Create Your Brand Identity
                </h2>

                <p>
                    Design the visual style of your brand.
                    Customize your logo, colors and typography
                    and preview them instantly.
                </p>
            </div>


            <div class="brand-studio-layout">

                <!-- LEFT: BRAND CONTROLS -->

                <div class="brand-studio-controls">

                    <section class="brand-studio-panel">

                        <div class="brand-panel-heading">
                            <h3>Brand Logo</h3>
                            <span>Optional</span>
                        </div>

                        <label
                            for="brandLogoInput"
                            class="brand-logo-upload"
                        >

                            <div
                                class="brand-logo-upload-icon"
                                id="brandLogoIcon"
                            >
                                +
                            </div>

                            <div>
                                <strong>
                                    Upload your logo
                                </strong>

                                <small>
                                    PNG, JPG or SVG
                                </small>
                            </div>

                        </label>

                        <input
                            type="file"
                            id="brandLogoInput"
                            accept="image/png,image/jpeg,image/svg+xml"
                            hidden
                        >

                        <div
                            class="brand-logo-file-name"
                            id="brandLogoFileName"
                        >
                            No logo selected
                        </div>

                    </section>


                    <section class="brand-studio-panel">

                        <div class="brand-panel-heading">
                            <h3>Brand Colors</h3>
                            <span>Customize</span>
                        </div>

                        <div class="brand-color-fields">

                            <div class="brand-color-field">

                                <label for="brandPrimaryColor">
                                    Primary Color
                                </label>

                                <div class="brand-color-input">

                                    <input
                                        type="color"
                                        id="brandPrimaryColor"
                                        value="${savedIdentity.primaryColor}"
                                    >

                                    <span
                                        id="brandPrimaryColorValue"
                                    >
                                        ${savedIdentity.primaryColor}
                                    </span>

                                </div>

                            </div>


                            <div class="brand-color-field">

                                <label for="brandSecondaryColor">
                                    Secondary Color
                                </label>

                                <div class="brand-color-input">

                                    <input
                                        type="color"
                                        id="brandSecondaryColor"
                                        value="${savedIdentity.secondaryColor}"
                                    >

                                    <span
                                        id="brandSecondaryColorValue"
                                    >
                                        ${savedIdentity.secondaryColor}
                                    </span>

                                </div>

                            </div>

                        </div>

                    </section>


                    <section class="brand-studio-panel">

                        <div class="brand-panel-heading">
                            <h3>Typography</h3>
                            <span>Choose a font</span>
                        </div>

                        <label for="brandFont">
                            Brand Font
                        </label>

                       <select id="brandFont">

    <option
        value="Inter"
        ${savedIdentity.font === "Inter" ? "selected" : ""}
    >
        Inter — Clean & Professional
    </option>

    <option
        value="Poppins"
        ${savedIdentity.font === "Poppins" ? "selected" : ""}
    >
        Poppins — Modern & Friendly
    </option>

    <option
        value="Montserrat"
        ${savedIdentity.font === "Montserrat" ? "selected" : ""}
    >
        Montserrat — Bold & Premium
    </option>

    <option
        value="Playfair Display"
        ${savedIdentity.font === "Playfair Display" ? "selected" : ""}
    >
        Playfair Display — Luxury & Elegant
    </option>

    <option
        value="DM Sans"
        ${savedIdentity.font === "DM Sans" ? "selected" : ""}
    >
        DM Sans — Minimal & Modern
    </option>

    <option
        value="Lora"
        ${savedIdentity.font === "Lora" ? "selected" : ""}
    >
        Lora — Elegant & Editorial
    </option>

    <option
        value="Roboto"
        ${savedIdentity.font === "Roboto" ? "selected" : ""}
    >
        Roboto — Simple & Versatile
    </option>

    <option
        value="Nunito"
        ${savedIdentity.font === "Nunito" ? "selected" : ""}
    >
        Nunito — Soft & Friendly
    </option>

    <option
        value="Raleway"
        ${savedIdentity.font === "Raleway" ? "selected" : ""}
    >
        Raleway — Stylish & Refined
    </option>

    <option
        value="Oswald"
        ${savedIdentity.font === "Oswald" ? "selected" : ""}
    >
        Oswald — Strong & Bold
    </option>

    <option
        value="Space Grotesk"
        ${savedIdentity.font === "Space Grotesk" ? "selected" : ""}
    >
        Space Grotesk — Creative & Modern
    </option>

    <option
        value="Libre Baskerville"
        ${savedIdentity.font === "Libre Baskerville" ? "selected" : ""}
    >
        Libre Baskerville — Classic & Premium
    </option>

</select>

                    </section>


                    <section class="brand-studio-panel">

                        <div class="brand-panel-heading">
                            <h3>Brand Style</h3>
                            <span>Choose a direction</span>
                        </div>

                        <div class="brand-style-options">

                            ${[
                                "Minimal and Modern",
                                "Premium and Elegant",
                                "Bold and Creative",
                                "Natural and Organic"
                            ].map(function (style) {
                                return `
                                    <label class="brand-style-option">

                                        <input
                                            type="radio"
                                            name="brandIdentityStyle"
                                            value="${style}"
                                            ${savedIdentity.style === style ? "checked" : ""}
                                        >

                                        <span>
                                            ${style}
                                        </span>

                                    </label>
                                `;
                            }).join("")}

                        </div>

                    </section>

                </div>


                <!-- RIGHT: LIVE PREVIEW -->

                <div class="brand-studio-preview-panel">

                    <div class="brand-preview-heading">

                        <div>
                            <span>LIVE PREVIEW</span>
                            <h3>Your Brand Preview</h3>
                        </div>

                        <span class="brand-preview-status">
                            Live
                        </span>

                    </div>


                    <div
                        class="brand-live-preview"
                        id="brandLivePreview"
                        style="
                            --brand-primary: ${savedIdentity.primaryColor};
                            --brand-secondary: ${savedIdentity.secondaryColor};
                            --brand-font: '${savedIdentity.font}';
                        "
                    >

                        <div class="brand-preview-topbar">

                            <span
    class="brand-preview-mini-logo"
    id="brandPreviewLogo"
>
    ${brandName.charAt(0).toUpperCase()}
</span>

                            <span>
                                ${brandName}
                            </span>

                        </div>


                        <div class="brand-preview-content">

                            <span class="brand-preview-label">
                                YOUR BRAND. YOUR IDENTITY.
                            </span>

                            <h2 id="brandPreviewTitle">
                                ${brandName}
                            </h2>

                            <p>
                                Thoughtfully designed.
                                Uniquely yours.
                            </p>

                            <button
                                type="button"
                                id="brandPreviewButton"
                            >
                                Explore Collection
                            </button>

                        </div>


                        <div class="brand-preview-palette">

                            <span
                                style="
                                    background: ${savedIdentity.primaryColor};
                                "
                            ></span>

                            <span
                                style="
                                    background: ${savedIdentity.secondaryColor};
                                "
                            ></span>

                            <span></span>

                        </div>

                    </div>

                    <p class="brand-preview-note">
                        Your preview updates as you customize your identity.
                    </p>

                </div>

            </div>


            <span
                class="form-error"
                id="${step.name}Error"
            ></span>

        </div>
    `;
}
/* =====================================================
   STEP 7 - CREATE STORE
   ===================================================== */

function getSavedStoreSetup() {

    const savedStore =
        localStorage.getItem("brandifyStoreSetup");

    if (!savedStore) {

        return {
            storeName:
                getSavedValue("brandifyBrandName") || "",

            storeHandle: "",

            storeTheme: "Minimal",

            storeDescription:
                "Discover products made for your lifestyle."
        };

    }

    try {

        return JSON.parse(savedStore);

    } catch (error) {

        return {
            storeName:
                getSavedValue("brandifyBrandName") || "",

            storeHandle: "",

            storeTheme: "Minimal",

            storeDescription:
                "Discover products made for your lifestyle."
        };

    }

}


function getSavedBrandStudioData() {

    const savedIdentity =
        localStorage.getItem("brandifyBrandIdentity");

    if (!savedIdentity) {

        return {
            primaryColor: "#1F9D74",
            secondaryColor: "#142B27",
            font: "Inter"
        };

    }

    try {

        const parsedIdentity =
            JSON.parse(savedIdentity);

        return {

            primaryColor:
                parsedIdentity.primaryColor || "#1F9D74",

            secondaryColor:
                parsedIdentity.secondaryColor || "#142B27",

            font:
                parsedIdentity.font || "Inter"

        };

    } catch (error) {

        return {
            primaryColor: "#1F9D74",
            secondaryColor: "#142B27",
            font: "Inter"
        };

    }

}


function renderStoreSetupStep(step) {
    const selectedCategories =
        getStorageArray("brandifyCategory");

    const selectedProducts =
        getSelectedProductsForStep4();


    const savedStore =
        getSavedStoreSetup();

    const brandIdentity =
        getSavedBrandStudioData();

    const brandName =
        getSavedValue("brandifyBrandName") ||
        "Your Brand";

    const savedLogo =
        localStorage.getItem("brandifyBrandLogo") || "";

    const previewLogo =
        savedLogo
            ? `
                <img
                    src="${savedLogo}"
                    alt="Brand logo"
                >
            `
            : brandName.charAt(0).toUpperCase();


    return `

        <div class="step7-container">

            <div class="step7-heading">

                <span class="step7-eyebrow">
                    STORE CREATION
                </span>

                <h2>
                    Build Your Online Store
                </h2>

                <p>
                    Set up your store details and customize
                    the appearance of your online storefront.
                </p>

            </div>


            <div class="step7-layout">


                <!-- LEFT: STORE SETTINGS -->

                <div class="step7-settings">


                    <section class="step7-panel">

                        <div class="step7-panel-heading">

                            <div>
                                <span class="step7-panel-number">
                                    01
                                </span>

                                <h3>
                                    Store Information
                                </h3>
                            </div>

                            <span>
                                Required
                            </span>

                        </div>


                        <div class="step7-field">

                            <label for="storeName">
                                Store Name
                            </label>

                            <input
                                type="text"
                                id="storeName"
                                name="storeName"
                                value="${savedStore.storeName}"
                                placeholder="Enter your store name"
                                maxlength="60"
                                required
                            >

                            <small>
                                This name will appear on your storefront.
                            </small>

                        </div>


                        <div class="step7-field">

                            <label for="storeHandle">
                                Store URL
                            </label>

                            <div class="step7-url-input">

                                <span>
                                    brandify.store/
                                </span>

                                <input
                                    type="text"
                                    id="storeHandle"
                                    name="storeHandle"
                                    value="${savedStore.storeHandle}"
                                    placeholder="your-brand"
                                    maxlength="40"
                                >

                            </div>

                            <small>
                                Use lowercase letters, numbers and hyphens.
                            </small>

                        </div>


                        <div class="step7-field">

                            <label for="storeDescription">
                                Store Description
                            </label>

                            <textarea
                                id="storeDescription"
                                name="storeDescription"
                                rows="3"
                                maxlength="160"
                                placeholder="Describe your brand"
                            >${savedStore.storeDescription}</textarea>

                        </div>

                    </section>


                    <section class="step7-panel">

                        <div class="step7-panel-heading">

                            <div>
                                <span class="step7-panel-number">
                                    02
                                </span>

                                <h3>
                                    Store Theme
                                </h3>
                            </div>

                            <span>
                                Customize
                            </span>

                        </div>


                        <div class="step7-theme-grid">


                            <label class="step7-theme-card">

                                <input
                                    type="radio"
                                    name="storeTheme"
                                    value="Minimal"
                                    ${savedStore.storeTheme === "Minimal" ? "checked" : ""}
                                >

                                <span class="step7-theme-visual step7-theme-minimal">

                                    <span></span>
                                    <span></span>
                                    <span></span>

                                </span>

                                <strong>
                                    Minimal
                                </strong>

                                <small>
                                    Clean and simple
                                </small>

                            </label>


                            <label class="step7-theme-card">

                                <input
                                    type="radio"
                                    name="storeTheme"
                                    value="Premium"
                                    ${savedStore.storeTheme === "Premium" ? "checked" : ""}
                                >

                                <span class="step7-theme-visual step7-theme-premium">

                                    <span></span>
                                    <span></span>
                                    <span></span>

                                </span>

                                <strong>
                                    Premium
                                </strong>

                                <small>
                                    Elegant and refined
                                </small>

                            </label>


                            <label class="step7-theme-card">

                                <input
                                    type="radio"
                                    name="storeTheme"
                                    value="Bold"
                                    ${savedStore.storeTheme === "Bold" ? "checked" : ""}
                                >

                                <span class="step7-theme-visual step7-theme-bold">

                                    <span></span>
                                    <span></span>
                                    <span></span>

                                </span>

                                <strong>
                                    Bold
                                </strong>

                                <small>
                                    Strong and creative
                                </small>

                            </label>


                            <label class="step7-theme-card">

                                <input
                                    type="radio"
                                    name="storeTheme"
                                    value="Natural"
                                    ${savedStore.storeTheme === "Natural" ? "checked" : ""}
                                >

                                <span class="step7-theme-visual step7-theme-natural">

                                    <span></span>
                                    <span></span>
                                    <span></span>

                                </span>

                                <strong>
                                    Natural
                                </strong>

                                <small>
                                    Organic and calm
                                </small>

                            </label>


                        </div>

                    </section>


                    <div class="step7-brand-info">

                        <span>
                            ✓
                        </span>

                        <div>

                            <strong>
                                Your Step 6 brand identity
                            </strong>

                            <p>
                                Your logo, colors and typography
                                will be used in your store preview.
                            </p>

                        </div>

                    </div>


                </div>


                <!-- RIGHT: LIVE STORE PREVIEW -->

                <div class="step7-preview-panel">

                    <div class="step7-preview-heading">

                        <div>

                            <span>
                                LIVE PREVIEW
                            </span>

                            <h3>
                                Your Online Store
                            </h3>

                        </div>

                        <span class="step7-live-status">
                            Live
                        </span>

                    </div>


                    <div
                        class="step7-store-preview"
                        id="step7StorePreview"
                        style="
                            --store-primary: ${brandIdentity.primaryColor};
                            --store-secondary: ${brandIdentity.secondaryColor};
                            --store-font: '${brandIdentity.font}';
                        "
                    >


                        <header class="step7-store-header">

                            <div class="step7-store-logo">

                                <span
                                    id="step7PreviewLogo"
                                >
                                    ${previewLogo}
                                </span>

                            </div>


                            <strong id="step7PreviewBrandName">
                                ${savedStore.storeName || brandName}
                            </strong>


                            <div class="step7-store-nav">

                                <span>
                                    Home
                                </span>

                                <span>
                                    Shop
                                </span>

                                <span>
                                    About
                                </span>

                            </div>

                        </header>


                        <section class="step7-store-hero">

                            <span>
                                WELCOME TO OUR STORE
                            </span>

                            <h2 id="step7PreviewTitle">
                                ${savedStore.storeName || brandName}
                            </h2>

                            <p id="step7PreviewDescription">
                                ${savedStore.storeDescription || "Discover products made for your lifestyle."}
                            </p>

                            <button
                                type="button"
                                id="step7PreviewShopButton"
                            >
                                Explore Products
                            </button>

                        </section>


                        <section class="step7-store-products">

                            <div class="step7-preview-product">
                                <span></span>
                                <small>
                                    Featured Product
                                </small>
                            </div>

                            <div class="step7-preview-product">
                                <span></span>
                                <small>
                                    New Collection
                                </small>
                            </div>

                            <div class="step7-preview-product">
                                <span></span>
                                <small>
                                    Best Seller
                                </small>
                            </div>

                        </section>


                    </div>


                    <p class="step7-preview-note">
                        This is a visual preview of your future storefront.
                    </p>

                </div>


            </div>


            <span
                class="form-error"
                id="${step.name}Error"
            ></span>


        </div>

    `;

}

    /* =====================================================
       FINAL STEP
       ===================================================== */

    function renderFinalStep(step) {
        const brandName = getSavedValue("brandifyBrandName") || "Not added";
        const categories = getSavedArray("brandifyCategory");
        const products = getSavedArray("brandifyProduct");
        const customizations = getSavedArray("brandifyCustomization");
        const pricing = getSavedProductPricing();
        const priceSummary = Object.keys(pricing).map(function (name) {
            const price = pricing[name] && typeof pricing[name] === "object"
                ? pricing[name].sellingPrice
                : pricing[name];
            return price ? `${name}: ₹${price}` : "";
        }).filter(Boolean).join(", ") || "Selling prices saved";
        let identity = {};
        try { identity = JSON.parse(getSavedValue("brandifyBrandIdentity")) || {}; } catch (error) { identity = {}; }
        let payout = {};
        try { payout = JSON.parse(getSavedValue("brandifyPayoutDetails")) || {}; } catch (error) { payout = {}; }
        const account = String(payout.accountNumber || "").replace(/\s/g, "");
        const payoutSummary = `${payout.bankName ? `${payout.bankName} · ` : ""}${account ? `•••• ${account.slice(-4)}` : "Bank details added"}`;
        const identitySummary = [identity.style, identity.font, identity.primaryColor, identity.secondaryColor].filter(Boolean).join(" · ") || "Brand identity completed";
        const items = [
            ["Brand Details", `${brandName} · ${categories.join(", ") || "Category saved"}`],
            ["Product", products.join(", ") || "Product selected"],
            ["Product Customization", customizations.join(", ") || "Customization options saved"],
            ["Pricing", priceSummary],
            ["Brand Identity", identitySummary],
            ["Payout Setup", payoutSummary]
        ];

        return `<div class="launch-completion"><span>Your setup is complete</span><strong>100%</strong></div>
            <div class="launch-checklist">${items.map(function (item) {
                return `<article class="launch-checklist-item"><span class="launch-checkmark" aria-hidden="true">✓</span><div class="launch-checklist-copy"><h3>${escapeHTML(item[0])}</h3><p>${escapeHTML(item[1])}</p></div><span class="launch-status">Completed</span></article>`;
            }).join("")}</div>
            <button type="button" class="continue-button launch-button" id="launchBrandButton"><span>Launch My Brand →</span></button>
            <p class="launch-note">You can update these details later from your dashboard.</p>`;
    }


    /* =====================================================
       MOVE TO NEXT STEP
       ===================================================== */

    function moveToNextStep() {
        if (currentStep >= steps.length) {
            return;
        }

        currentStep++;

        localStorage.setItem(
            "brandifyOnboardingStep",
            String(currentStep)
        );

        window.history.replaceState(
            {},
            document.title,
            `${window.location.pathname}?step=${currentStep}`
        );

        renderStep(currentStep);
    }
function renderCustomizationStep(step) {

    const selectedProducts =
        getSelectedProductsForStep4();

    const savedOptions =
        getStorageArray(step.storageKey);


    const options = [

    {
        value: "Custom Label",
        title: "Custom Label",
        image: "customization/custom-label.png",
        description:
            "Add your brand name, logo and design on the product label.",
        tags: ["Logo", "Brand Name", "Custom Design"]
    },

    {
        value: "Custom Packaging",
        title: "Custom Packaging",
        image: "customization/custom-packaging.png",
        description:
            "Use branded boxes, pouches or packaging materials.",
        tags: ["Box Design", "Pouches", "Eco-friendly"]
    },

    {
        value: "Custom Product Design",
        title: "Custom Product Design",
        image: "customization/custom-product-design.png",
        description:
            "Customize the product's appearance, color, graphics or text.",
        tags: ["Colors", "Graphics", "Text / Logo"]
    },

    {
        value: "Label and Packaging",
        title: "Label + Packaging",
        image: "customization/label-packaging.png",
        description:
            "Combine custom labeling and branded packaging for a complete look.",
        tags: ["Full Branding", "Premium Look", "Stand Out"]
    }

];


    return `

        <div class="step4-container">

            <div class="step4-heading-row">

                <div class="step4-heading-content">


                    <h2>Customize Your Products</h2>

                    <p>
                        Make your products uniquely yours.
                        Choose how you want to customize your selected products.
                    </p>

                </div>


            </div>


            <section class="step4-section">

                <div class="step4-section-heading">

                    <h3>Your Selected Products</h3>

                    <div class="step4-product-actions">

                        <span>
                            ${selectedProducts.length} products selected
                        </span>

                        <button
                            type="button"
                            class="step4-modify-button"
                            id="step4ModifyProducts"
                        >
                            ✎ View / Modify
                        </button>

                    </div>

                </div>


                <div class="step4-selected-products">

                    ${
                        selectedProducts.length > 0

                            ? selectedProducts.map(function (product) {

                                return `

                                    <div class="step4-product-card">

                                        <div class="step4-product-image">

                                            <img
                                                src="images/products/${product.image}"
                                                alt="${product.name}"
                                            >

                                        </div>

                                        <div class="step4-product-details">

                                            <strong>
                                                ${product.name}
                                            </strong>

                                            <span>
                                                ${product.category}
                                            </span>

                                            <small>Selected</small>

                                        </div>

                                    </div>

                                `;

                            }).join("")

                            : `

                                <p class="step4-empty-message">
                                    No products selected.
                                </p>

                            `
                    }

                </div>

            </section>


            <section class="step4-section">

                <div class="step4-section-heading">

                    <div>

                        <h3>Customization Options</h3>

                        <p>
                            Choose one or more customization options for your products.
                        </p>

                    </div>

                </div>


                <div class="step4-options-grid">

                    ${
                        options.map(function (option) {

                            return `

                                <label class="step4-option-card">

                                    <input
                                        type="checkbox"
                                        name="${step.name}"
                                        value="${option.value}"
                                        ${savedOptions.includes(option.value) ? "checked" : ""}
                                    >

                                    <div class="step4-option-image">

    <img
        src="images/${option.image}"
        alt="${option.title}"
    >

</div>


                                    <div class="step4-option-content">

                                        <strong>
                                            ${option.title}
                                        </strong>

                                        <p>
                                            ${option.description}
                                        </p>

                                        <div class="step4-tags">

                                            ${
                                                option.tags.map(function (tag) {

                                                    return `<span>${tag}</span>`;

                                                }).join("")
                                            }

                                        </div>

                                    </div>

                                </label>

                            `;

                        }).join("")
                    }

                </div>

            </section>


            <div class="step4-bottom-note">

                <span>✓</span>

                <div>

                    <strong>You're almost there!</strong>

                    <p>
                        Once you've customized your products,
                        you can review everything and launch your brand.
                    </p>

                </div>

            </div>


            <span
                class="form-error"
                id="${step.name}Error"
            ></span>

        </div>

    `;

}
/* =====================================================
   STEP 5 - PRODUCT PRICING
   ===================================================== */

function getProductBaseCost(productName) {

    const baseCosts = {

        "Hoodies": 450,
        "Creator Hoodies": 450,

        "T-Shirts": 250,
        "Creator T-Shirts": 250,

        "Coffee Mug": 150,
        "Mugs": 150,
        "Creator Mugs": 150,

        "Candles": 200,

        "Cushions": 250,
        "Cushion Covers": 250,

        "Caps": 180,
        "Creator Caps": 180,

        "Face Serum": 220,
        "Moisturizer": 180,

        "Shaker Bottles": 180,
        "Shaker Bottle": 180,

        "Notebooks": 100,

        "Coffee": 180,
        "Tea": 150,

        "Sunglasses": 250,
        "Watches": 500,

        "Planters": 180

    };

    return baseCosts[productName] || 100;

}


function getSavedProductPricing() {

    const savedPricing =
        localStorage.getItem("brandifyProductPricing");

    if (!savedPricing) {
        return {};
    }

    try {

        return JSON.parse(savedPricing);

    } catch (error) {

        return {};

    }

}


function renderPricingStep(step) {

    const selectedProducts =
        getSelectedProductsForStep4();

    const savedPricing =
        getSavedProductPricing();


    return `

        <div class="step5-container">

            <div class="step5-heading">

                <span class="step5-eyebrow">
                    STEP 5 OF 10
                </span>

                <h2>Set Your Product Prices</h2>

                <p>
                    Set a selling price that works for your brand.
                    You can adjust each product individually.
                </p>

            </div>


            <div class="step5-section-header">

                <h3>Your Products</h3>

                <span>
                    ${selectedProducts.length} products selected
                </span>

            </div>


            <div class="step5-products-grid">

                ${
                    selectedProducts.length > 0

                        ? selectedProducts.map(function (product, index) {

                            const baseCost =
                                getProductBaseCost(product.name);

                            const savedPrice =
                                savedPricing[product.name]?.sellingPrice || baseCost;

                            const initialProfit =
                                savedPrice
                                    ? Number(savedPrice) - baseCost
                                    : 0;


                            return `

                                <div
                                    class="step5-price-card"
                                    data-product="${product.name}"
                                    data-base-cost="${baseCost}"
                                >

                                    <div class="step5-product-top">

                                        <div class="step5-product-image">

                                            <img
                                                src="images/products/${product.image}"
                                                alt="${product.name}"
                                            >

                                        </div>


                                        <div class="step5-product-info">

                                            <h4>
                                                ${product.name}
                                            </h4>

                                            <span>
                                                ${product.category}
                                            </span>

                                            <div class="step5-base-cost">

                                                Base cost:
                                                <strong>
                                                    ₹${baseCost}
                                                </strong>

                                            </div>

                                        </div>

                                    </div>


                                    <div class="step5-price-input-group">

                                        <label>
                                            Your Selling Price
                                        </label>

                                        <div class="step5-input-wrapper">

                                            <span>₹</span>

                                            <input
                                                type="number"
                                                class="step5-selling-price"
                                                data-product="${product.name}"
                                                value="${savedPrice}"
                                                min="${baseCost}"
                                                placeholder="Enter price"
                                            >

                                        </div>
<div
    class="step5-price-error"
    data-error-product="${product.name}"
></div>

                                    </div>


                                    <div class="step5-profit-row">

                                        <span>
                                            Estimated Profit
                                        </span>

                                        <strong
                                            class="step5-product-profit"
                                        >
                                            ₹${initialProfit}
                                        </strong>

                                    </div>


                                    <div class="step5-margin-row">

                                        <span>
                                            Profit Margin
                                        </span>

                                        <strong
                                            class="step5-product-margin"
                                        >
                                            0%
                                        </strong>

                                    </div>

                                </div>

                            `;

                        }).join("")

                        : `

                            <p class="step5-empty-message">
                                No products selected.
                                Please return to Step 3.
                            </p>

                        `
                }

            </div>


            <div class="step5-total-card">

                <div class="step5-total-icon">
                    🎉
                </div>


                <div class="step5-total-content">

                    <h3>
                        Great, you're building your brand!
                    </h3>

                    <p class="step5-encouragement">

                        Set your product prices to see
                        your estimated profit.

                    </p>


                    <div class="step5-total-summary">

                        <div>

                            <span>
                                Total Estimated Profit
                            </span>

                            <strong
                                id="step5TotalProfit"
                            >
                                ₹0
                            </strong>

                        </div>


                        <div>

                            <span>
                                Total Products
                            </span>

                            <strong>
                                ${selectedProducts.length}
                            </strong>

                        </div>

                    </div>

                </div>

            </div>


            <span
                class="form-error"
                id="${step.name}Error"
            ></span>

        </div>

    `;

}

    /* =====================================================
       RENDER CURRENT STEP
       ===================================================== */

    function renderStep(stepNumber) {
        const step =
            steps[stepNumber - 1];

        if (!step || !onboardingContent) {
            return;
        }

        hideSuccess();
        updateProgress(stepNumber);

        let stepContent = "";

        if (
            step.type === "text" ||
            step.type === "number"
        ) {
            stepContent =
                renderTextField(step);
        }


        if (step.type === "radio") {
            stepContent =
                renderRadioOptions(step);
        }
if (step.type === "customize") {

    stepContent =
        renderCustomizationStep(step);

}
if (step.type === "pricing") {

    stepContent =
        renderPricingStep(step);

}

if (step.type === "payout") {
    stepContent = renderPayoutSetup(step);
}

if (step.type === "storeSetup") {

    stepContent =
        renderStoreSetupStep(step);

}
if (step.type === "brandIdentity") {
    stepContent =
        renderBrandIdentityStep(step);
}

        if (step.type === "final") {
            stepContent =
                renderFinalStep(step);
        }

        if (step.type === "final" && localStorage.getItem("brandifyLaunchReady") === "true") {
            onboardingContent.innerHTML = `<div class="launch-success"><span class="launch-success-icon">✓</span><h2>Your Brand is Ready!</h2><p>Your Brandify setup is complete.</p><a class="continue-button launch-dashboard-button" href="dashboard.html"><span>Go to Dashboard →</span></a></div>`;
            return;
        }

        onboardingContent.innerHTML = `

            <div class="step-header">

                <span class="step-eyebrow">
                    ${step.type === "final" ? "FINAL REVIEW" : "CREATOR ONBOARDING"}
                </span>

                <h2>
                    ${step.type === "final" ? "Launch Your Brand" : `Step ${step.number} – ${step.title}`}
                </h2>

                <p>
                    ${step.subtitle}
                </p>

            </div>

            <form
                id="currentStepForm"
                class="onboarding-step-form"
                novalidate
            >

                <div class="question-content">

                    ${step.type === "final" ? `<h3>${step.question}</h3>` : `<h3>${step.question}</h3>`}

                    ${step.type === "final" ? `<p>${step.description}</p>` : `<p>${step.description}</p>`}

                </div>

                ${stepContent}

                <div class="onboarding-actions">

                    ${
                        stepNumber > 1
                            ? `
                                <button
                                    type="button"
                                    class="back-button"
                                    id="backButton"
                                >
                                    ← Back
                                </button>
                            `
                            : ""
                    }

                    ${step.type === "final" ? "" : `<button type="submit" class="continue-button">
                        <span>
                            ${
                                "Save & Next"
                            }
                        </span>
                        <span>
                            →
                        </span>
                    </button>`}

                </div>

                ${
                    stepNumber < steps.length &&
                    stepNumber !== 2 &&
                    stepNumber !== 3 && stepNumber !== 4
                        ? `
                            <button
                                type="button"
                                class="skip-button"
                                id="skipStepButton"
                            >
                                Skip for now
                            </button>
                        `
                        : ""
                }

            </form>

        `;

        const launchBrandButton = document.getElementById("launchBrandButton");
        if (launchBrandButton) {
            launchBrandButton.addEventListener("click", function () {
                localStorage.setItem("brandifyLaunchReady", "true");
                localStorage.setItem("brandifyOnboardingStep", "9");
                if (window.BrandifyCreatorData) window.BrandifyCreatorData.sync();
                onboardingContent.innerHTML = `<div class="launch-success"><span class="launch-success-icon">✓</span><h2>Your Brand is Ready!</h2><p>Your Brandify setup is complete.</p><a class="continue-button launch-dashboard-button" href="dashboard.html"><span>Go to Dashboard →</span></a></div>`;
            });
        }


        /* =================================================
           CARD SELECTION VISUAL UPDATE
           ================================================= */

        const cardInputs =
            onboardingContent.querySelectorAll(
                'input[type="checkbox"], input[type="radio"]'
            );

        cardInputs.forEach(function (input) {
            input.addEventListener(
                "change",
                function () {
                    const card =
                        input.closest(".category-card");

                    if (card) {
                        card.classList.toggle(
                            "selected",
                            input.checked
                        );
                    }

                    if (step.number === 2) {
                        const selectedCategories =
                            onboardingContent.querySelectorAll(
                                `input[name="${step.name}"]:checked`
                            );

                        if (selectedCategories.length > 4) {
                            input.checked = false;

                            if (card) {
                                card.classList.remove(
                                    "selected"
                                );
                            }

                            const error =
                                document.getElementById(
                                    `${step.name}Error`
                                );

                            if (error) {
                                error.textContent =
                                    "You can select a maximum of 4 categories.";
                            }
                        }
                    }
                }
            );
        });



        /* =================================================
           BACK BUTTON
           ================================================= */

        const currentStepForm =
            document.getElementById(
                "currentStepForm"
            );
if (step.type === "pricing") {
    initializePricingEvents();
}

if (step.type === "storeSetup") {
    initializeStoreSetupEvents();
}
if (step.type === "brandIdentity") {
    initializeBrandIdentityEvents();
}
        const backButton =
            document.getElementById(
                "backButton"
            );

        const skipStepButton =
            document.getElementById(
                "skipStepButton"
            );
const step4ModifyProducts =
    document.getElementById("step4ModifyProducts");


if (step4ModifyProducts) {

    step4ModifyProducts.addEventListener("click", function () {

        currentStep = 3;

        localStorage.setItem(
            "brandifyOnboardingStep",
            "3"
        );

        renderStep(3);

    });

}

        if (backButton) {
            backButton.addEventListener(
                "click",
                function () {
                    currentStep--;

                    localStorage.setItem(
                        "brandifyOnboardingStep",
                        String(currentStep)
                    );

                    renderStep(currentStep);
                }
            );
        }


        /* =================================================
           SKIP BUTTON
           ================================================= */

        if (skipStepButton) {
            skipStepButton.addEventListener(
                "click",
                function () {
                    localStorage.setItem(
                        `${step.storageKey}Skipped`,
                        "true"
                    );

                    moveToNextStep();
                }
            );
        }


        /* =================================================
           FORM SUBMISSION
           ================================================= */

        if (!currentStepForm) {
            return;
        }
if (step.type === "pricing") {

    currentStepForm.addEventListener(
        "keydown",
        function (event) {

            if (event.key === "Enter") {
                event.preventDefault();
                event.stopPropagation();
            }

        },
        true
    );

}

        currentStepForm.addEventListener(
            "submit",
            function (event) {
                event.preventDefault();

                const formError =
                    document.getElementById(
                        `${step.name}Error`
                    );

                if (formError) {
                    formError.textContent = "";
                }


                /* =========================================
                   FINAL STEP
                   ========================================= */
if (step.type === "customize") {

    const selectedCustomizations =
        Array.from(
            document.querySelectorAll(
                `input[name="${step.name}"]:checked`
            )
        ).map(function (input) {

            return input.value;

        });


    if (selectedCustomizations.length === 0) {

        const errorElement =
            document.getElementById(`${step.name}Error`);

        if (errorElement) {

            errorElement.textContent =
                "Please select at least one customization option.";

        }

        return;

    }


    localStorage.setItem(
        step.storageKey,
        JSON.stringify(selectedCustomizations)
    );

}

                if (step.type === "final") {
                    return;
                }

if (step.type === "pricing") {

    const pricingData = {};

    const priceInputs =
        document.querySelectorAll(".step5-selling-price");


    let hasInvalidPrice = false;


    priceInputs.forEach(function (input) {

        const productName =
            input.dataset.product;

        const sellingPrice =
            Number(input.value);

        const card =
            input.closest(".step5-price-card");

        const baseCost =
            Number(card.dataset.baseCost);


        if (
            !input.value ||
            sellingPrice <= baseCost
        ) {

            hasInvalidPrice = true;

        }


        pricingData[productName] =
            sellingPrice;

    });


    if (hasInvalidPrice) {

        if (formError) {

            formError.textContent =
                "Please enter a selling price higher than the base cost for every product.";

        }

        return;

    }


    localStorage.setItem(
        step.storageKey,
        JSON.stringify(pricingData)
    );

}
/* =========================================
   STEP 7: STORE SETUP
   ========================================= */

if (step.type === "storeSetup") {

    const storeNameInput =
        document.getElementById("storeName");

    const storeHandleInput =
        document.getElementById("storeHandle");

    const storeDescriptionInput =
        document.getElementById("storeDescription");

    const selectedTheme =
        document.querySelector(
            'input[name="storeTheme"]:checked'
        );


    const storeName =
        storeNameInput
            ? storeNameInput.value.trim()
            : "";

    const storeHandle =
        storeHandleInput
            ? storeHandleInput.value.trim()
            : "";

    const storeDescription =
        storeDescriptionInput
            ? storeDescriptionInput.value.trim()
            : "";


    if (!storeName) {

        if (formError) {

            formError.textContent =
                "Please enter your store name.";

        }

        if (storeNameInput) {

            storeNameInput.focus();

        }

        return;

    }


    if (!storeHandle) {

        if (formError) {

            formError.textContent =
                "Please enter your store URL handle.";

        }

        if (storeHandleInput) {

            storeHandleInput.focus();

        }

        return;

    }


    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(storeHandle)) {

        if (formError) {

            formError.textContent =
                "Use only lowercase letters, numbers and hyphens in your store URL.";

        }

        if (storeHandleInput) {

            storeHandleInput.focus();

        }

        return;

    }


    const storeData = {

        storeName: storeName,

        storeHandle: storeHandle,

        storeDescription:
            storeDescription ||
            "Discover products made for your lifestyle.",

        storeTheme:
            selectedTheme
                ? selectedTheme.value
                : "Minimal"

    };


    localStorage.setItem(
        step.storageKey,
        JSON.stringify(storeData)
    );

}
/* =========================================
   STEP 6: BRAND IDENTITY
   ========================================= */

if (step.type === "brandIdentity") {

    const primaryColorInput =
        document.getElementById("brandPrimaryColor");

    const secondaryColorInput =
        document.getElementById("brandSecondaryColor");

    const fontInput =
        document.getElementById("brandFont");

    const selectedStyle =
        document.querySelector(
            'input[name="brandIdentityStyle"]:checked'
        );


    const brandIdentityData = {

        primaryColor:
            primaryColorInput
                ? primaryColorInput.value
                : "#6C5CE7",

        secondaryColor:
            secondaryColorInput
                ? secondaryColorInput.value
                : "#111827",

        font:
            fontInput
                ? fontInput.value
                : "Inter",

        style:
            selectedStyle
                ? selectedStyle.value
                : "Minimal and Modern"

    };


    localStorage.setItem(
        "brandifyBrandIdentity",
        JSON.stringify(brandIdentityData)
    );

}

                /* =========================================
                   RADIO AND CHECKBOX STEPS
                   ========================================= */

                if (step.type === "radio") {
                    const selectedOptions =
                        Array.from(
                            document.querySelectorAll(
                                `input[name="${step.name}"]:checked`
                            )
                        ).map(function (input) {
                            return input.value;
                        });


                    if (selectedOptions.length === 0) {
                        if (formError) {
                            formError.textContent =
                                "Please select an option to continue.";
                        }

                        return;
                    }


                    /* STEP 2: MAXIMUM 4 CATEGORIES */

                    if (step.number === 2) {
                        if (selectedOptions.length > 4) {
                            if (formError) {
                                formError.textContent =
                                    "You can select a maximum of 4 categories.";
                            }

                            return;
                        }

                        localStorage.setItem(
                            step.storageKey,
                            JSON.stringify(
                                selectedOptions
                            )
                        );
                    }


                    /* STEP 3: UNLIMITED PRODUCTS */

                    else if (step.number === 3) {
                        localStorage.setItem(
                            step.storageKey,
                            JSON.stringify(
                                selectedOptions
                            )
                        );
                    }


                    /* OTHER RADIO STEPS */

                    else {
                        localStorage.setItem(
                            step.storageKey,
                            selectedOptions[0]
                        );
                    }
                }


                /* =========================================
                   TEXT AND NUMBER STEPS
                   ========================================= */

                if (
                    step.type === "text" ||
                    step.type === "number"
                ) {
                    const input =
                        document.getElementById(
                            step.name
                        );

                    if (!input) {
                        return;
                    }

                    const value =
                        input.value.trim();


                    if (!value) {
                        if (formError) {
                            formError.textContent =
                                "This field is required.";
                        }

                        input.focus();
                        return;
                    }


                    if (
                        step.minLength &&
                        value.length < step.minLength
                    ) {
                        if (formError) {
                            formError.textContent =
                                `Please enter at least ${step.minLength} characters.`;
                        }

                        input.focus();
                        return;
                    }


                    if (
                        step.type === "number" &&
                        Number(value) <= 0
                    ) {
                        if (formError) {
                            formError.textContent =
                                "Please enter a valid price.";
                        }

                        input.focus();
                        return;
                    }

                    localStorage.setItem(
                        step.storageKey,
                        value
                    );
                }


                localStorage.removeItem(
                    `${step.storageKey}Skipped`
                );

                moveToNextStep();
            }
        );
    }
/* =====================================================
   STEP 5 - LIVE PROFIT CALCULATION
   ===================================================== */

function updatePricingSummary() {

    let totalProfit = 0;


    const priceCards =
        document.querySelectorAll(".step5-price-card");


    priceCards.forEach(function (card) {

        const baseCost =
            Number(card.dataset.baseCost);

        const priceInput =
            card.querySelector(".step5-selling-price");

        const profitElement =
            card.querySelector(".step5-product-profit");

        const marginElement =
            card.querySelector(".step5-product-margin");


        const sellingPrice =
            Number(priceInput.value) || 0;

        const profit =
            sellingPrice - baseCost;

        const margin =
            sellingPrice > 0
                ? (profit / sellingPrice) * 100
                : 0;


        totalProfit += profit;


        profitElement.textContent =
            `₹${profit.toFixed(0)}`;

        marginElement.textContent =
            `${margin.toFixed(1)}%`;

    });


    const totalProfitElement =
        document.getElementById("step5TotalProfit");


    if (totalProfitElement) {

        totalProfitElement.textContent =
            `₹${totalProfit.toFixed(0)}`;

    }


    const encouragementElement =
        document.getElementById("step5Encouragement");


    if (encouragementElement) {

        if (totalProfit > 0) {

            encouragementElement.textContent =
                `Great! Your estimated profit is ₹${totalProfit.toFixed(0)}. You're one step closer to building your brand!`;

        } else {

            encouragementElement.textContent =
                "Set your product prices to see your estimated profit.";

        }

    }

}

/* =====================================================
   STEP 6 - BRAND IDENTITY EVENTS
   ===================================================== */

function initializeBrandIdentityEvents() {

    const primaryColorInput =
        document.getElementById("brandPrimaryColor");

    const secondaryColorInput =
        document.getElementById("brandSecondaryColor");

    const primaryColorValue =
        document.getElementById("brandPrimaryColorValue");

    const secondaryColorValue =
        document.getElementById("brandSecondaryColorValue");

    const fontInput =
        document.getElementById("brandFont");

    const preview =
        document.getElementById("brandLivePreview");

    const previewTitle =
        document.getElementById("brandPreviewTitle");

    const previewButton =
        document.getElementById("brandPreviewButton");

    const styleInputs =
        document.querySelectorAll(
            'input[name="brandIdentityStyle"]'
        );


    function updateBrandPreview() {

        if (!preview) {
            return;
        }

        const primaryColor =
            primaryColorInput.value;

        const secondaryColor =
            secondaryColorInput.value;

        const selectedFont =
            fontInput.value;

        preview.style.setProperty(
            "--brand-primary",
            primaryColor
        );

        preview.style.setProperty(
            "--brand-secondary",
            secondaryColor
        );

        preview.style.setProperty(
            "--brand-font",
            `'${selectedFont}'`
        );

        if (primaryColorValue) {
            primaryColorValue.textContent =
                primaryColor;
        }

        if (secondaryColorValue) {
            secondaryColorValue.textContent =
                secondaryColor;
        }

        if (previewTitle) {
            previewTitle.style.fontFamily =
                selectedFont;
        }

        if (previewButton) {
            previewButton.style.background =
                primaryColor;
        }

        preview.style.background =
            secondaryColor;
    }


    primaryColorInput.addEventListener(
        "input",
        updateBrandPreview
    );

    secondaryColorInput.addEventListener(
        "input",
        updateBrandPreview
    );

    fontInput.addEventListener(
        "change",
        updateBrandPreview
    );


    styleInputs.forEach(function (input) {

        input.addEventListener(
            "change",
            updateBrandPreview
        );

    });


    updateBrandPreview();


    const logoInput =
        document.getElementById("brandLogoInput");

    const logoFileName =
        document.getElementById("brandLogoFileName");

    const logoIcon =
        document.getElementById("brandLogoIcon");

    if (logoInput) {

        logoInput.addEventListener(
            "change",
            function () {

                const file =
                    logoInput.files[0];

                if (!file) {
                    return;
                }

                if (file.size > 2 * 1024 * 1024) {

                    logoFileName.textContent =
                        "Logo must be smaller than 2 MB.";

                    logoInput.value = "";

                    return;
                }

                const reader =
                    new FileReader();

                reader.onload = function (event) {

                    const logoData =
                        event.target.result;

                    localStorage.setItem(
                        "brandifyBrandLogo",
                        logoData
                    );

                    logoFileName.textContent =
                        file.name;

                    if (logoIcon) {

    logoIcon.innerHTML = `
        <img
            src="${logoData}"
            alt="Brand logo preview"
        >
    `;

}

const brandPreviewLogo =
    document.getElementById("brandPreviewLogo");

if (brandPreviewLogo) {

    brandPreviewLogo.innerHTML = `
        <img
            src="${logoData}"
            alt="Brand logo"
    >
    `;

}

                };

                reader.readAsDataURL(file);

            }
        );

    }

}

/* =====================================================
   STEP 7 - STORE PREVIEW EVENTS
   ===================================================== */

function initializeStoreSetupEvents() {

    const storeNameInput =
        document.getElementById("storeName");

    const storeHandleInput =
        document.getElementById("storeHandle");

    const storeDescriptionInput =
        document.getElementById("storeDescription");

    const previewBrandName =
        document.getElementById("step7PreviewBrandName");

    const previewTitle =
        document.getElementById("step7PreviewTitle");

    const previewDescription =
        document.getElementById("step7PreviewDescription");

    const preview =
        document.getElementById("step7StorePreview");

    const previewButton =
        document.getElementById("step7PreviewShopButton");

    const themeInputs =
        document.querySelectorAll(
            'input[name="storeTheme"]'
        );


    function updateStorePreview() {

        const storeName =
            storeNameInput.value.trim() ||
            getSavedValue("brandifyBrandName") ||
            "Your Brand";

        const description =
            storeDescriptionInput.value.trim() ||
            "Discover products made for your lifestyle.";


        if (previewBrandName) {

            previewBrandName.textContent =
                storeName;

        }


        if (previewTitle) {

            previewTitle.textContent =
                storeName;

        }


        if (previewDescription) {

            previewDescription.textContent =
                description;

        }


        if (previewButton) {

            previewButton.style.background =
                "var(--store-primary)";

        }


        if (preview) {

            preview.style.fontFamily =
                "var(--store-font), var(--font-body)";

        }

    }


    function updateThemePreview() {

        const selectedTheme =
            document.querySelector(
                'input[name="storeTheme"]:checked'
            );

        if (!selectedTheme || !preview) {

            return;

        }

        preview.dataset.theme =
            selectedTheme.value.toLowerCase();

    }


    if (storeNameInput) {

        storeNameInput.addEventListener(
            "input",
            updateStorePreview
        );

    }


    if (storeDescriptionInput) {

        storeDescriptionInput.addEventListener(
            "input",
            updateStorePreview
        );

    }


    if (storeHandleInput) {

        storeHandleInput.addEventListener(
            "input",
            function () {

                storeHandleInput.value =
                    storeHandleInput.value
                        .toLowerCase()
                        .replace(/[^a-z0-9-]/g, "-")
                        .replace(/-+/g, "-");

            }
        );

    }


    themeInputs.forEach(function (input) {

        input.addEventListener(
            "change",
            updateThemePreview
        );

    });


    updateStorePreview();
    updateThemePreview();

}
function initializePricingEvents() {

    const priceInputs =
        document.querySelectorAll(".step5-selling-price");

    priceInputs.forEach(function (input) {

        input.addEventListener("input", function () {

            const card =
                input.closest(".step5-price-card");

            if (!card) {
                return;
            }

            const baseCost =
                Number(card.dataset.baseCost);

            const errorElement =
                card.querySelector(".step5-price-error");

            const inputValue =
                input.value.trim();

            const sellingPrice =
                inputValue === ""
                    ? baseCost
                    : Number(inputValue);

            if (
                inputValue !== "" &&
                sellingPrice < baseCost
            ) {

                if (errorElement) {
                    errorElement.textContent =
                        `Selling price must be at least ₹${baseCost}.`;
                    errorElement.style.display = "block";
                }

            } else {

                if (errorElement) {
                    errorElement.textContent = "";
                    errorElement.style.display = "none";
                }

            }

            updatePricingSummary();

        });

    });

    updatePricingSummary();

}

    /* =====================================================
       PROGRESS COLLAPSE
       ===================================================== */

    let progressCollapsed = false;

    if (progressToggle && progressTrack) {
        progressToggle.addEventListener(
            "click",
            function () {
                progressCollapsed =
                    !progressCollapsed;

                progressTrack.style.display =
                    progressCollapsed
                        ? "none"
                        : "flex";

                progressToggle.textContent =
                    progressCollapsed
                        ? "⌄"
                        : "⌃";
            }
        );
    }


    /* =====================================================
       LOGOUT
       ===================================================== */

    if (logoutButton) {
        logoutButton.addEventListener(
            "click",
            function () {
                localStorage.removeItem(
                    "brandifyLoggedIn"
                );

                window.location.href =
                    "login.html";
            }
        );
    }
function renderPayoutSetup(step) {

    const savedData = getSavedValue(
        step.storageKey
    );

    let payoutData = {};

    if (savedData) {
        try {
            payoutData = JSON.parse(savedData);
        } catch (error) {
            payoutData = {};
        }
    }

    return `
        <div class="payout-form">

            <div class="form-group">
                <label for="accountHolderName">
                    Account Holder Name
                </label>

                <input
                    type="text"
                    id="accountHolderName"
                    name="accountHolderName"
                    placeholder="Enter account holder name"
                    value="${payoutData.accountHolderName || ""}"
                    autocomplete="name"
                >
            </div>


            <div class="form-group">
                <label for="bankName">
                    Bank Name
                </label>

                <input
                    type="text"
                    id="bankName"
                    name="bankName"
                    placeholder="Enter bank name"
                    value="${payoutData.bankName || ""}"
                >
            </div>


            <div class="form-group">
                <label for="accountNumber">
                    Account Number
                </label>

                <input
                    type="text"
                    id="accountNumber"
                    name="accountNumber"
                    placeholder="Enter account number"
                    value="${payoutData.accountNumber || ""}"
                    inputmode="numeric"
                >
            </div>


            <div class="form-group">
                <label for="ifscCode">
                    IFSC Code
                </label>

                <input
                    type="text"
                    id="ifscCode"
                    name="ifscCode"
                    placeholder="Enter IFSC code"
                    value="${payoutData.ifscCode || ""}"
                    maxlength="11"
                    style="text-transform: uppercase;"
                >
            </div>


            <p
                class="form-error"
                id="${step.name}Error"
            ></p>

        </div>
    `;
}

    /* =====================================================
       SAVE AND EXIT
       ===================================================== */

    if (saveExitButton) {
        saveExitButton.addEventListener(
            "click",
            function () {
                window.location.href =
                    "../index.html";
            }
        );
    }


    /* =====================================================
       START ONBOARDING
       ===================================================== */

    const queryParams =
        new URLSearchParams(
            window.location.search
        );

    const queryStep =
        Number(
            queryParams.get("step")
        );

    if (
        queryStep >= 1 &&
        queryStep <= 9
    ) {
        currentStep = queryStep;
    }

    renderStep(currentStep);

});
