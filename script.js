/* =========================================================
   BRANDIFY
   JAVASCRIPT
========================================================= */

const prefersReducedMotion =
    window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    ).matches;

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const navbar =
            document.querySelector(
                ".navbar"
            );

        const mobileMenuButton =
            document.getElementById(
                "mobileMenuButton"
            );

        const navLinks =
            document.getElementById(
                "navLinks"
            );

        const publicNavActions =
            document.getElementById("publicNavActions");

        const customerAccount =
            document.getElementById("customerAccount");

        const accountTrigger =
            document.getElementById("accountTrigger");

        const accountDropdown =
            document.getElementById("accountDropdown");

        function updateAccountHeader() {
            const isLoggedIn =
                localStorage.getItem("brandifyLoggedIn") === "true";

            if (publicNavActions) {
                publicNavActions.hidden = isLoggedIn;
            }

            if (customerAccount) {
                customerAccount.hidden = !isLoggedIn;
            }

            if (navbar) {
                navbar.classList.toggle("customer-logged-in", isLoggedIn);
            }

            if (isLoggedIn) {
                let account = null;

                try {
                    account = JSON.parse(
                        localStorage.getItem("brandifyAccount")
                    );
                } catch (error) {
                    account = null;
                }

                const fullName =
                    account && account.fullName
                        ? account.fullName.trim()
                        : "Creator";

                const nameParts = fullName.split(/\s+/).filter(Boolean);
                const avatar = nameParts.length > 1
                    ? nameParts[0][0] + nameParts[nameParts.length - 1][0]
                    : fullName.slice(0, 2);
                const accountAvatar = document.getElementById("accountAvatar");

                if (accountAvatar) {
                    accountAvatar.textContent = avatar.toUpperCase();
                }
            } else if (accountTrigger && accountDropdown) {
                accountDropdown.hidden = true;
                accountTrigger.setAttribute("aria-expanded", "false");
            }
        }

        updateAccountHeader();

        if (accountTrigger && accountDropdown) {
            accountTrigger.addEventListener("click", function () {
                const isOpen = accountDropdown.hidden;
                accountDropdown.hidden = !isOpen;
                accountTrigger.setAttribute("aria-expanded", String(isOpen));
            });

            document.addEventListener("click", function (event) {
                if (!event.target.closest(".customer-account")) {
                    accountDropdown.hidden = true;
                    accountTrigger.setAttribute("aria-expanded", "false");
                }
            });

            document.addEventListener("keydown", function (event) {
                if (event.key === "Escape") {
                    accountDropdown.hidden = true;
                    accountTrigger.setAttribute("aria-expanded", "false");
                }
            });
        }

        const homeLogoutButton =
            document.getElementById("homeLogoutButton");

        if (homeLogoutButton) {
            homeLogoutButton.addEventListener("click", function () {
                localStorage.removeItem("brandifyLoggedIn");
                updateAccountHeader();
            });
        }

        window.addEventListener("storage", function (event) {
            if (event.key === "brandifyLoggedIn" || event.key === "brandifyAccount") {
                updateAccountHeader();
            }
        });

        /* =================================================
           NAVBAR SCROLL EFFECT
        ================================================== */

        const handleScroll = () => {

            if (!navbar) {
                return;
            }

            if (window.scrollY > 20) {

                navbar.classList.add(
                    "scrolled"
                );

            } else {

                navbar.classList.remove(
                    "scrolled"
                );
            }
        };


        window.addEventListener(
            "scroll",
            handleScroll,
            {
                passive: true
            }
        );


        handleScroll();


        /* =================================================
           MOBILE MENU
        ================================================== */

        if (
            mobileMenuButton &&
            navbar
        ) {

            mobileMenuButton.addEventListener(
                "click",
                () => {

                    const isOpen =
                        navbar.classList.toggle(
                            "menu-open"
                        );


                    mobileMenuButton.setAttribute(
                        "aria-expanded",
                        String(isOpen)
                    );
                }
            );
        }


        /* =================================================
           CLOSE MOBILE MENU
        ================================================== */

        if (
            navLinks &&
            navbar
        ) {

            navLinks
                .querySelectorAll("a")
                .forEach(
                    (link) => {

                        link.addEventListener(
                            "click",
                            () => {

                                navbar.classList.remove(
                                    "menu-open"
                                );


                                if (
                                    mobileMenuButton
                                ) {

                                    mobileMenuButton.setAttribute(
                                        "aria-expanded",
                                        "false"
                                    );
                                }
                            }
                        );
                    }
                );
        }


        /* =================================================
           SMOOTH INTERNAL LINKS
        ================================================== */

        document
            .querySelectorAll(
                'a[href^="#"]'
            )
            .forEach(
                (link) => {

                    link.addEventListener(
                        "click",
                        (event) => {

                            const targetId =
                                link.getAttribute(
                                    "href"
                                );


                            if (
                                !targetId ||
                                targetId === "#"
                            ) {
                                return;
                            }


                            const target =
                                document.querySelector(
                                    targetId
                                );


                            if (!target) {
                                return;
                            }


                            event.preventDefault();


                            target.scrollIntoView(
                                {
                                    behavior:
                                        "smooth",

                                    block:
                                        "start"
                                }
                            );
                        }
                    );
                }
            );


        /* =================================================
           HERO REVEAL
        ================================================== */

        const revealElements = [

            document.querySelector(
                ".hero h1"
            ),

            document.querySelector(
                ".hero-description"
            ),

            document.querySelector(
                ".hero-actions"
            ),

            document.querySelector(
                ".hero-visual"
            )

        ].filter(Boolean);


        if (!prefersReducedMotion) {

            revealElements.forEach(
                (
                    element,
                    index
                ) => {

                    element.animate(
                        [
                            {
                                opacity: 0,

                                transform:
                                    "translateY(18px)"
                            },

                            {
                                opacity: 1,

                                transform:
                                    "translateY(0)"
                            }
                        ],
                        {
                            duration: 700,

                            delay:
                                100 +
                                index * 100,

                            easing:
                                "cubic-bezier(0.22, 1, 0.36, 1)",

                            fill: "both"
                        }
                    );
                }
            );
        }

    }
);


/* =========================================================
   INTERACTIVE BRAND PRODUCT EXPERIENCE
========================================================= */

const creatorBrand =
    document.getElementById(
        "creatorBrand"
    );

const organicField =
    document.getElementById(
        "organicField"
    );

const productStage =
    document.getElementById(
        "productStage"
    );

const interactiveProducts =
    document.querySelectorAll(
        ".product"
    );


/* =========================================================
   UPDATE BRAND NAME LIVE
========================================================= */

function updateCreatorBrand() {

    if (!creatorBrand) {
        return;
    }

    let brand =
        creatorBrand.value.trim();


    if (!brand) {
        brand = "YOUR BRAND";
    }


    document
        .querySelectorAll(
            ".dynamic-brand"
        )
        .forEach(
            (element) => {

                element.textContent =
                    brand.toUpperCase();

            }
        );
}


if (creatorBrand) {

    creatorBrand.addEventListener(
        "input",
        updateCreatorBrand
    );

    updateCreatorBrand();
}


/* =========================================================
   MOVE ORGANIC COLOR FIELD
========================================================= */

function moveOrganicField(product) {

    if (
        !organicField ||
        !productStage ||
        !product
    ) {
        return;
    }


    const stageRect =
        productStage.getBoundingClientRect();


    const productRect =
        product.getBoundingClientRect();


    const centerX =
        (
            productRect.left +
            productRect.width / 2 -
            stageRect.left
        );


    const centerY =
        (
            productRect.top +
            productRect.height / 2 -
            stageRect.top
        );


    organicField.style.left =
        `${centerX}px`;


    organicField.style.top =
        `${centerY}px`;


    organicField.classList.add(
        "active"
    );
}


/* =========================================================
   ACTIVATE PRODUCT
========================================================= */

function activateProduct(product) {

    interactiveProducts.forEach(
        (item) => {

            item.classList.remove(
                "active"
            );

        }
    );


    product.classList.add(
        "active"
    );


    moveOrganicField(product);
}


/* =========================================================
   DEACTIVATE PRODUCTS
========================================================= */

function deactivateProducts() {

    interactiveProducts.forEach(
        (product) => {

            product.classList.remove(
                "active"
            );

        }
    );


    if (organicField) {

        organicField.classList.remove(
            "active"
        );
    }
}


/* =========================================================
   PRODUCT HOVER
========================================================= */

interactiveProducts.forEach(
    (product) => {

        product.addEventListener(
            "mouseenter",
            () => {

                activateProduct(
                    product
                );

            }
        );


        product.addEventListener(
            "focus",
            () => {

                activateProduct(
                    product
                );

            }
        );

    }
);


/* =========================================================
   REMOVE HOVER
========================================================= */

if (productStage) {

    productStage.addEventListener(
        "mouseleave",
        () => {

            deactivateProducts();

        }
    );
}


/* =========================================================
   MOUSE DEPTH / 3D MOVEMENT
========================================================= */

const touchDevice =
    window.matchMedia(
        "(hover: none)"
    ).matches;


if (
    productStage &&
    !prefersReducedMotion &&
    !touchDevice
) {

    let targetX = 0;

    let targetY = 0;

    let currentX = 0;

    let currentY = 0;


    function animateProductStage() {

        currentX +=
            (
                targetX -
                currentX
            ) * 0.05;


        currentY +=
            (
                targetY -
                currentY
            ) * 0.05;


        productStage.style.transform =
            `rotateX(${currentY}deg) rotateY(${currentX}deg)`;


        requestAnimationFrame(
            animateProductStage
        );
    }


    productStage.addEventListener(
        "mousemove",
        (event) => {

            const rect =
                productStage.getBoundingClientRect();


            const x =
                (
                    event.clientX -
                    rect.left
                ) /
                rect.width;


            const y =
                (
                    event.clientY -
                    rect.top
                ) /
                rect.height;


            targetX =
                (
                    x - 0.5
                ) * 4;


            targetY =
                (
                    0.5 - y
                ) * 3;

        }
    );


    productStage.addEventListener(
        "mouseleave",
        () => {

            targetX = 0;

            targetY = 0;

        }
    );


    animateProductStage();
}
/* =========================================================
   HOW IT WORKS — INTERACTIVE JOURNEY
========================================================= */

(function () {

    const section =
        document.querySelector(".how-it-works-section");

    if (!section) {
        return;
    }


    const buttons =
        section.querySelectorAll(".hiw-step-nav");

    const contentSteps =
        section.querySelectorAll(".hiw-content-step");

    const visual =
        section.querySelector(".hiw-visual");

    const navLines =
        section.querySelectorAll(".hiw-nav-line");

    const heroBrandInput =
        document.getElementById("creatorBrand");

    const dynamicBrands =
        section.querySelectorAll(".hiw-dynamic-brand");


    /* =====================================================
       BRAND NAME
    ===================================================== */

    function updateBrand() {

        let brand = "";

        if (heroBrandInput) {
            brand = heroBrandInput.value.trim();
        }

        if (!brand) {
            brand = "YOUR BRAND";
        }

        dynamicBrands.forEach(function (element) {

            element.textContent =
                brand.toUpperCase();

        });

    }


    if (heroBrandInput) {

        heroBrandInput.addEventListener(
            "input",
            updateBrand
        );

    }

    updateBrand();


    /* =====================================================
       CHANGE STEP
    ===================================================== */

    function showStep(stepNumber) {

        /* ---------------------------------------------
           BUTTONS
        --------------------------------------------- */

        buttons.forEach(function (button) {

            const step =
                Number(button.dataset.step);

            if (step === stepNumber) {

                button.classList.add("active");

            } else {

                button.classList.remove("active");

            }

        });


        /* ---------------------------------------------
           CONTENT
        --------------------------------------------- */

        contentSteps.forEach(function (content) {

            const step =
                Number(content.dataset.contentStep);

            if (step === stepNumber) {

                content.classList.add("active");

            } else {

                content.classList.remove("active");

            }

        });


        /* ---------------------------------------------
           PROGRESS LINES
        --------------------------------------------- */

        navLines.forEach(function (line, index) {

            if (index < stepNumber - 1) {

                line.classList.add("completed");

            } else {

                line.classList.remove("completed");

            }

        });


        /* ---------------------------------------------
           VISUAL
        --------------------------------------------- */

        if (visual) {

            visual.setAttribute(
                "data-active-step",
                String(stepNumber)
            );

        }

    }


    /* =====================================================
       CLICK
    ===================================================== */

    buttons.forEach(function (button) {

        button.addEventListener(
            "click",
            function () {

                const step =
                    Number(button.dataset.step);

                showStep(step);

            }
        );

    });


    /* =====================================================
       HOVER
    ===================================================== */

    buttons.forEach(function (button) {

        button.addEventListener(
            "mouseenter",
            function () {

                const step =
                    Number(button.dataset.step);

                showStep(step);

            }
        );

    });


    /* =====================================================
       INITIAL STEP
    ===================================================== */

    showStep(1);


})();

/* =========================================================
   RESOURCES — REVEAL & COMING SOON DIALOG
========================================================= */

document.addEventListener("DOMContentLoaded", function () {
    const section = document.getElementById("resources");
    if (!section) return;

    const revealItems = Array.from(section.querySelectorAll("[data-resource-reveal]"));
    if (!prefersReducedMotion && "IntersectionObserver" in window) {
        section.classList.add("resource-motion-ready");
        const revealObserver = new IntersectionObserver(function (entries, observer) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                entry.target.classList.add("is-visible");
                observer.unobserve(entry.target);
            });
        }, { threshold: 0.12, rootMargin: "0px 0px -24px 0px" });
        revealItems.forEach(function (item) { revealObserver.observe(item); });
    }

    const dialog = section.querySelector(".resource-dialog");
    if (!dialog) return;
    const title = dialog.querySelector("#resourceDialogTitle");
    const message = dialog.querySelector("#resourceDialogMessage");
    const closeButtons = dialog.querySelectorAll(".resource-dialog-close, .resource-dialog-ok");
    let lastTrigger = null;
    section.querySelectorAll("[data-resource-coming-soon]").forEach(function (button) {
        button.addEventListener("click", function () {
            lastTrigger = button;
            title.textContent = button.dataset.resourceComingSoon || "Brandify Resources";
            message.textContent = `The ${title.textContent} resource is coming soon. We’re preparing practical guidance for your Brandify journey.`;
            dialog.showModal();
            dialog.querySelector(".resource-dialog-ok").focus();
        });
    });
    closeButtons.forEach(function (button) { button.addEventListener("click", function () { dialog.close(); }); });
    dialog.addEventListener("click", function (event) {
        const rect = dialog.getBoundingClientRect();
        const outside = event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
        if (outside) dialog.close();
    });
    dialog.addEventListener("close", function () { if (lastTrigger) lastTrigger.focus(); });
});

/* =========================================================
   FINAL CTA — SUBTLE SCROLL REVEAL
========================================================= */

document.addEventListener("DOMContentLoaded", function () {
    const finalCta = document.querySelector("[data-final-cta-reveal]");
    if (!finalCta || prefersReducedMotion || !("IntersectionObserver" in window)) return;

    finalCta.classList.add("final-cta-motion-ready");
    const revealObserver = new IntersectionObserver(function (entries, observer) {
        entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
        });
    }, { threshold: 0.12, rootMargin: "0px 0px -24px 0px" });

    revealObserver.observe(finalCta);
});

/* =========================================================
   PRICING — PROFIT CALCULATOR
========================================================= */

(() => {
    const volumeInput = document.getElementById("pricingVolume");
    const volumeValue = document.getElementById("volumeValue");
    const monthlyProfit = document.getElementById("monthlyProfit");

    if (!volumeInput || !volumeValue || !monthlyProfit) return;

    const profitPerSale = 18;

    const updatePricing = () => {
        const volume = Number(volumeInput.value);
        const percentage = ((volume - Number(volumeInput.min)) / (Number(volumeInput.max) - Number(volumeInput.min))) * 100;

        volumeValue.textContent = volume;
        monthlyProfit.textContent = `$${(volume * profitPerSale).toLocaleString("en-US")}`;
        volumeInput.style.background = `linear-gradient(to right, var(--green) 0%, var(--green) ${percentage}%, #dce5dc ${percentage}%, #dce5dc 100%)`;
    };

    volumeInput.addEventListener("input", updatePricing);
    updatePricing();
})();

/* =========================================================
   HOW IT WORKS — PRODUCT PICKER ANIMATION
========================================================= */

(function () {

    const section =
        document.querySelector(".how-it-works-section");

    if (!section) {
        return;
    }


    const visual =
        section.querySelector(".hiw-visual");

    const picker =
        section.querySelector(".hiw-product-picker");

    const track =
        section.querySelector(".hiw-product-track");

    const cards =
        section.querySelectorAll(".hiw-picker-card");

    const cursor =
        section.querySelector(".hiw-picker-cursor");


    if (
        !visual ||
        !picker ||
        !track ||
        !cards.length ||
        !cursor
    ) {
        return;
    }


    let currentProduct = 0;
    let animationTimer;


    /* =====================================================
       GET CARD POSITION
    ===================================================== */

    function moveCursorToCard(card) {

        const pickerRect =
            picker.getBoundingClientRect();

        const cardRect =
            card.getBoundingClientRect();


        const x =
            cardRect.left -
            pickerRect.left +
            cardRect.width * 0.72;


        const y =
            cardRect.top -
            pickerRect.top +
            cardRect.height * 0.48;


        cursor.style.left =
            x + "px";

        cursor.style.top =
            y + "px";

    }


    /* =====================================================
       SELECT PRODUCT
    ===================================================== */

    function selectProduct(card) {

        cards.forEach(function (item) {

            item.classList.remove(
                "selected"
            );

        });

        card.classList.add(
            "selected"
        );


        cursor.classList.remove(
            "clicking"
        );

        void cursor.offsetWidth;

        cursor.classList.add(
            "clicking"
        );

    }


    /* =====================================================
       MOVE TRACK
    ===================================================== */

    function positionTrack(index) {

        const card =
            cards[index];

        if (!card) {
            return;
        }


        const pickerWidth =
            picker.clientWidth;

        const cardWidth =
            card.offsetWidth;

        const gap = 16;


        let offset =
            index *
            (cardWidth + gap);


        offset -=
            (pickerWidth - cardWidth) * 0.42;


        if (offset < 0) {
            offset = 0;
        }


        track.style.transform =
            "translateX(-" +
            offset +
            "px)";

    }


    /* =====================================================
       PLAY ANIMATION
    ===================================================== */

    function playProductAnimation() {

        if (
            visual.getAttribute(
                "data-active-step"
            ) !== "1"
        ) {
            return;
        }


        clearTimeout(
            animationTimer
        );


        cards.forEach(function (card) {

            card.classList.remove(
                "selected"
            );

        });


        currentProduct = 0;


        /* -------------------------------------------------
           SHOW CURSOR
        ------------------------------------------------- */

        cursor.classList.add(
            "visible"
        );


        positionTrack(
            currentProduct
        );


        setTimeout(function () {

            moveCursorToCard(
                cards[currentProduct]
            );

        }, 500);


        /* -------------------------------------------------
           CLICK PRODUCT 01
        ------------------------------------------------- */

        animationTimer = setTimeout(
            function () {

                selectProduct(
                    cards[currentProduct]
                );

            },
            1650
        );


        /* -------------------------------------------------
           MOVE TO PRODUCT 02
        ------------------------------------------------- */

        animationTimer = setTimeout(
            function () {

                currentProduct = 1;

                positionTrack(
                    currentProduct
                );

                moveCursorToCard(
                    cards[currentProduct]
                );

            },
            3000
        );


        /* -------------------------------------------------
           CLICK PRODUCT 02
        ------------------------------------------------- */

        animationTimer = setTimeout(
            function () {

                selectProduct(
                    cards[currentProduct]
                );

            },
            4150
        );


        /* -------------------------------------------------
           MOVE TO PRODUCT 03
        ------------------------------------------------- */

        animationTimer = setTimeout(
            function () {

                currentProduct = 2;

                positionTrack(
                    currentProduct
                );

                moveCursorToCard(
                    cards[currentProduct]
                );

            },
            5500
        );


        /* -------------------------------------------------
           CLICK PRODUCT 03
        ------------------------------------------------- */

        animationTimer = setTimeout(
            function () {

                selectProduct(
                    cards[currentProduct]
                );

            },
            6650
        );


        /* -------------------------------------------------
           RESTART
        ------------------------------------------------- */

        animationTimer = setTimeout(
            function () {

                cards.forEach(
                    function (card) {

                        card.classList.remove(
                            "selected"
                        );

                    }
                );


                track.style.transform =
                    "translateX(0)";


                cursor.classList.remove(
                    "visible"
                );


                animationTimer =
                    setTimeout(
                        playProductAnimation,
                        500
                    );

            },
            8000
        );

    }


    /* =====================================================
       REAL USER CLICK
    ===================================================== */

    cards.forEach(function (card, index) {

        card.addEventListener(
            "click",
            function () {

                clearTimeout(
                    animationTimer
                );


                currentProduct =
                    index;


                positionTrack(
                    index
                );


                selectProduct(
                    card
                );

            }
        );

    });


    /* =====================================================
       WATCH STEP CHANGE
    ===================================================== */

    const observer =
        new MutationObserver(
            function () {

                const activeStep =
                    visual.getAttribute(
                        "data-active-step"
                    );


                if (
                    activeStep === "1"
                ) {

                    playProductAnimation();

                } else {

                    clearTimeout(
                        animationTimer
                    );


                    cursor.classList.remove(
                        "visible"
                    );


                    cards.forEach(
                        function (card) {

                            card.classList.remove(
                                "selected"
                            );

                        }
                    );

                }

            }
        );


    observer.observe(
        visual,
        {
            attributes: true,
            attributeFilter: [
                "data-active-step"
            ]
        }
    );


    /* =====================================================
       START
    ===================================================== */

    if (
        visual.getAttribute(
            "data-active-step"
        ) === "1"
    ) {

        playProductAnimation();

    }

})();
/* =========================================================
   FULFILLMENT FLOW — 4 SECOND JOURNEY
========================================================= */

(function () {

    const flow =
        document.getElementById("fulfillmentFlow");

    if (!flow) {
        return;
    }


    const steps =
        flow.querySelectorAll(
            ".fulfillment-step"
        );

    const connectors =
        flow.querySelectorAll(
            ".fulfillment-connector"
        );


    if (!steps.length) {
        return;
    }


    let currentStep = 1;

    let timer = null;


    /* =====================================================
       UPDATE FLOW
    ===================================================== */

    function updateFlow(stepNumber) {

        steps.forEach(function (step) {

            const stepValue =
                Number(
                    step.dataset.step
                );


            step.classList.remove(
                "active",
                "completed"
            );


            if (
                stepValue === stepNumber
            ) {

                step.classList.add(
                    "active"
                );

            }


            if (
                stepValue < stepNumber
            ) {

                step.classList.add(
                    "completed"
                );

            }

        });


        connectors.forEach(
            function (connector, index) {

                connector.classList.remove(
                    "completed"
                );


                /*
                 * Connector 0 = 01 → 02
                 * Connector 1 = 02 → 03
                 * Connector 2 = 03 → 04
                 * Connector 3 = 04 → 05
                 */

                if (
                    index < stepNumber - 1
                ) {

                    connector.classList.add(
                        "completed"
                    );

                }

            }
        );

    }


    /* =====================================================
       RUN JOURNEY
    ===================================================== */

    function runJourney() {

        clearTimeout(timer);


        currentStep = 1;

        updateFlow(
            currentStep
        );


        /*
         * 01 → 02
         */

        timer = setTimeout(
            function () {

                currentStep = 2;

                updateFlow(
                    currentStep
                );

            },
            1000
        );


        /*
         * 02 → 03
         */

        timer = setTimeout(
            function () {

                currentStep = 3;

                updateFlow(
                    currentStep
                );

            },
            2000
        );


        /*
         * 03 → 04
         */

        timer = setTimeout(
            function () {

                currentStep = 4;

                updateFlow(
                    currentStep
                );

            },
            3000
        );


        /*
         * 04 → 05
         */

        timer = setTimeout(
            function () {

                currentStep = 5;

                updateFlow(
                    currentStep
                );

            },
            4000
        );


        /*
         * COMPLETE 4 SECOND CYCLE
         */

        timer = setTimeout(
            function () {

                runJourney();

            },
            5000
        );

    }


    /* =====================================================
       START
    ===================================================== */

    runJourney();


})();
/* =========================================================
   COMPANY FLOW — INTERACTIVE SYNCHRONIZATION
========================================================= */

(function () {

    const visual = document.querySelector(".hiw-company-flow");

    if (!visual) return;

    const nodes = visual.querySelectorAll(".flow-node");

    const centerStep =
        document.getElementById("flowCenterStep");

    const centerTitle =
        document.getElementById("flowCenterTitle");

    const centerDescription =
        document.getElementById("flowCenterDescription");

    const centerStatus =
        document.getElementById("flowCenterStatus");


    const flowContent = {

        1: {
            title: "Product catalog",
            description:
                "Choose from products ready to become part of your brand.",
            status: "Ready to begin"
        },

        2: {
            title: "Brand customization",
            description:
                "Add your identity through labeling, packaging, and design.",
            status: "Make it yours"
        },

        3: {
            title: "Pricing",
            description:
                "Set your retail price and understand the cost structure.",
            status: "Build your margin"
        },

        4: {
            title: "Store launch",
            description:
                "Prepare your products and bring your branded store live.",
            status: "Ready to launch"
        },

        5: {
            title: "Customer orders",
            description:
                "Customer purchases enter the system and move to fulfillment.",
            status: "Order received"
        },

        6: {
            title: "Fulfillment",
            description:
                "Products are prepared, packaged, and shipped to your customer.",
            status: "We take it from here"
        }

    };


    function syncFlow(step) {

        const activeStep =
            Math.min(6, Math.max(1, Number(step) || 1));

        const content = flowContent[activeStep];

        visual.setAttribute(
            "data-active-step",
            String(activeStep)
        );


        nodes.forEach(function (node) {

            const nodeStep =
                Number(node.dataset.flowStep);

            node.classList.toggle(
                "active",
                nodeStep === activeStep
            );

            node.classList.toggle(
                "completed",
                nodeStep < activeStep
            );

            node.setAttribute(
                "aria-pressed",
                String(nodeStep === activeStep)
            );

        });


        if (centerStep) {
            centerStep.textContent =
                `0${activeStep} / 06`;
        }

        if (centerTitle) {
            centerTitle.textContent =
                content.title;
        }

        if (centerDescription) {
            centerDescription.textContent =
                content.description;
        }

        if (centerStatus) {
            centerStatus.textContent =
                content.status;
        }

    }


    nodes.forEach(function (node) {

        node.addEventListener("click", function () {

            const step =
                Number(node.dataset.flowStep);

            const matchingNav =
                document.querySelector(
                    `.hiw-step-nav[data-step="${step}"]`
                );

            if (matchingNav) {
                matchingNav.click();
            }

            syncFlow(step);

        });

    });


    const observer =
        new MutationObserver(function () {

            syncFlow(
                visual.getAttribute("data-active-step")
            );

        });


    observer.observe(visual, {
        attributes: true,
        attributeFilter: ["data-active-step"]
    });


    syncFlow(
        visual.getAttribute("data-active-step")
    );

})();
/* =====================================================
   FOR CREATORS — INTERACTIVE OVERVIEW
===================================================== */

(function () {

    const creatorSection =
        document.querySelector("#creators");

    if (!creatorSection) {
        return;
    }


    /* =====================================================
       CREATOR FOCUS CONTENT
    ===================================================== */

    const focusContent = {

        brand: {
            status: "BRAND BUILDING",
            label: "YOUR BRAND",
            title: "Shape your identity.",
            description:
                "Build a brand that reflects your vision and connects with your audience."
        },

        product: {
            status: "PRODUCT SELECTION",
            label: "YOUR PRODUCT",
            title: "Choose what fits your vision.",
            description:
                "Explore product opportunities and select products that align with your brand."
        },

        audience: {
            status: "AUDIENCE GROWTH",
            label: "YOUR AUDIENCE",
            title: "Focus on your customers.",
            description:
                "Spend your time building relationships, creating content, and growing your audience."
        },

        launch: {
            status: "PRODUCT LAUNCH",
            label: "YOUR LAUNCH",
            title: "Bring your product to market.",
            description:
                "Launch your branded product while Brandify supports the operational process."
        },

        fulfillment: {
            status: "FULFILLMENT",
            label: "BRANDIFY OPERATIONS",
            title: "We handle the backend.",
            description:
                "Orders move through preparation, packaging, fulfillment, and shipping."
        }

    };


    const focusButtons =
        creatorSection.querySelectorAll(
            "[data-creator-focus]"
        );

    const journeyButtons =
        creatorSection.querySelectorAll(
            "[data-creator-stage]"
        );

    const statusElement =
        document.getElementById(
            "creatorJourneyStatus"
        );

    const resultLabel =
        document.getElementById(
            "creatorResultLabel"
        );

    const resultTitle =
        document.getElementById(
            "creatorResultTitle"
        );

    const resultDescription =
        document.getElementById(
            "creatorResultDescription"
        );


    function updateCreatorOverview(stage) {

        const content =
            focusContent[stage];

        if (!content) {
            return;
        }

        if (statusElement) {
            statusElement.textContent =
                content.status;
        }

        if (resultLabel) {
            resultLabel.textContent =
                content.label;
        }

        if (resultTitle) {
            resultTitle.textContent =
                content.title;
        }

        if (resultDescription) {
            resultDescription.textContent =
                content.description;
        }

    }


    function setActiveFocus(stage) {

        focusButtons.forEach(function (button) {

            const isActive =
                button.dataset.creatorFocus === stage;

            button.classList.toggle(
                "active",
                isActive
            );

        });

    }


    function setActiveJourney(stage) {

        journeyButtons.forEach(function (button) {

            const isActive =
                button.dataset.creatorStage === stage;

            button.classList.toggle(
                "active",
                isActive
            );

        });

    }


    /* =====================================================
       FOCUS BUTTONS
    ===================================================== */

    focusButtons.forEach(function (button) {

        button.addEventListener(
            "click",
            function () {

                const stage =
                    button.dataset.creatorFocus;

                setActiveFocus(stage);
                setActiveJourney(stage);
                updateCreatorOverview(stage);

            }
        );

    });


    /* =====================================================
       JOURNEY BUTTONS
    ===================================================== */

    journeyButtons.forEach(function (button) {

        button.addEventListener(
            "click",
            function () {

                const stage =
                    button.dataset.creatorStage;

                setActiveJourney(stage);
                setActiveFocus(stage);
                updateCreatorOverview(stage);

            }
        );

    });


    /* =====================================================
       INITIAL STATE
    ===================================================== */

    updateCreatorOverview("brand");

})();
