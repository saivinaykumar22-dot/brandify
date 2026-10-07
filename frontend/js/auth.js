
/* =========================================================
   BRANDIFY AUTHENTICATION
   FRONTEND ONLY - LOCAL STORAGE
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {

    "use strict";


    /* =====================================================
       PASSWORD EYE CONTROL
       ===================================================== */

    const passwordToggles =
        document.querySelectorAll(".password-toggle");

    passwordToggles.forEach(function (button) {

        const targetId = button.dataset.target;
        const target = document.getElementById(targetId);
        const eyeIcon = button.querySelector(".eye-icon");

        if (!target || !eyeIcon) return;

        function updateEyeVisibility() {

            if (target.value.length > 0) {
                button.classList.add("visible");
            } else {
                button.classList.remove("visible");
                target.type = "password";
                eyeIcon.classList.remove("crossed");
                button.setAttribute("aria-label", "Show password");
                button.setAttribute("aria-pressed", "false");
            }

        }

        target.addEventListener("input", updateEyeVisibility);

        target.addEventListener("focus", updateEyeVisibility);

        target.addEventListener("blur", function () {

            setTimeout(function () {

                if (document.activeElement !== button) {
                    button.classList.remove("visible");
                }

            }, 100);

        });

        button.addEventListener("mousedown", function (event) {
            event.preventDefault();
        });

        button.addEventListener("click", function () {

            if (target.type === "password") {

                target.type = "text";
                eyeIcon.classList.add("crossed");
                button.setAttribute("aria-label", "Hide password");
                button.setAttribute("aria-pressed", "true");

            } else {

                target.type = "password";
                eyeIcon.classList.remove("crossed");
                button.setAttribute("aria-label", "Show password");
                button.setAttribute("aria-pressed", "false");

            }

            button.classList.add("visible");
            target.focus();

        });

    });


    /* =====================================================
       HELPERS
       ===================================================== */

    function showFieldError(element, message) {

        if (element) {
            element.textContent = message || "";
        }

    }

    function clearFieldError(element) {

        if (element) {
            element.textContent = "";
        }

    }

    function setButtonLoading(button, loading) {

        if (!button) return;

        button.disabled = loading;
        button.classList.toggle("loading", loading);

    }

    function getAccount() {

        try {

            return JSON.parse(
                localStorage.getItem("brandifyAccount")
            );

        } catch (error) {

            return null;

        }

    }


    /* =====================================================
       SIGNUP
       ===================================================== */

    const signupForm =
        document.getElementById("signupForm");

    if (signupForm) {

        signupForm.addEventListener("submit", function (event) {

            event.preventDefault();

            const fullName =
                document.getElementById("fullName").value.trim();

            const phone =
                document.getElementById("phone").value.trim();

            const email =
                document.getElementById("email").value.trim();

            const password =
                document.getElementById("password").value;

            const confirmPassword =
                document.getElementById("confirmPassword").value;

            const fullNameError =
                document.getElementById("fullNameError");

            const emailError =
                document.getElementById("emailError");

            const phoneError =
                document.getElementById("phoneError");

            const passwordError =
                document.getElementById("passwordError");

            const confirmPasswordError =
                document.getElementById("confirmPasswordError");

            clearFieldError(fullNameError);
            clearFieldError(phoneError);
            clearFieldError(emailError);
            clearFieldError(passwordError);
            clearFieldError(confirmPasswordError);

            let hasError = false;

            if (fullName.length < 2) {

                showFieldError(
                    fullNameError,
                    "Please enter your full name."
                );

                hasError = true;

            }

            const phonePattern =
                /^\+?[\d\s().-]+$/;

            const phoneDigits =
                phone.replace(/\D/g, "");

            if (!phone) {

                showFieldError(
                    phoneError,
                    "Please enter your phone number."
                );

                hasError = true;

            } else if (!phonePattern.test(phone) || phoneDigits.length < 7 || phoneDigits.length > 15) {

                showFieldError(
                    phoneError,
                    "Please enter a valid phone number."
                );

                hasError = true;

            }

            const emailPattern =
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            if (!emailPattern.test(email)) {

                showFieldError(
                    emailError,
                    "Please enter a valid email address."
                );

                hasError = true;

            }

            if (password.length < 8) {

                showFieldError(
                    passwordError,
                    "Password must be at least 8 characters."
                );

                hasError = true;

            } else if (!/[A-Za-z]/.test(password)) {

                showFieldError(
                    passwordError,
                    "Password must contain at least one letter."
                );

                hasError = true;

            } else if (!/[0-9]/.test(password)) {

                showFieldError(
                    passwordError,
                    "Password must contain at least one number."
                );

                hasError = true;

            }

            if (password !== confirmPassword) {

                showFieldError(
                    confirmPasswordError,
                    "Passwords do not match."
                );

                hasError = true;

            }

            if (hasError) return;

            const existingAccount = getAccount();

            if (
                existingAccount &&
                existingAccount.email.toLowerCase() ===
                email.toLowerCase()
            ) {

                alert("An account with this email already exists.");
                return;

            }

            const account = {

                fullName: fullName,
                phone: phone,
                email: email,
                password: password

            };

            localStorage.setItem(
                "brandifyAccount",
                JSON.stringify(account)
            );

            if (window.BrandifyCreatorData) window.BrandifyCreatorData.sync();

            localStorage.setItem(
                "brandifyLoggedIn",
                "true"
            );

            if (window.BrandifyCreatorData) window.BrandifyCreatorData.sync();

            window.location.href =
                "onboarding.html?created=1";

        });

    }


    /* =====================================================
       LOGIN
       ===================================================== */

    const loginForm =
        document.getElementById("loginForm");

    if (loginForm) {

        const emailInput = document.getElementById("email");
        const passwordInput = document.getElementById("password");
        const passwordError = document.getElementById("passwordError");
        const loginMessage = document.getElementById("loginMessage");
        const loginButton = document.getElementById("loginButton");

        function setLoginFieldError(input, errorElement, message) {
            if (errorElement) errorElement.textContent = message || "";
            if (input) {
                input.setAttribute("aria-invalid", message ? "true" : "false");
                const wrapper = input.closest(".input-wrapper");
                if (wrapper) wrapper.classList.toggle("input-error", Boolean(message));
            }
        }

        function clearLoginErrors() {
            setLoginFieldError(emailInput, document.getElementById("emailError"), "");
            setLoginFieldError(passwordInput, passwordError, "");
            if (loginMessage) loginMessage.textContent = "";
        }

        function redirectCreatorBySetup() {
            window.location.replace(
                localStorage.getItem("brandifyLaunchReady") === "true"
                    ? "dashboard.html"
                    : "onboarding.html"
            );
        }

        const existingAccount = getAccount();
        if (
            localStorage.getItem("brandifyLoggedIn") === "true" &&
            existingAccount &&
            typeof existingAccount.email === "string" &&
            existingAccount.email.trim()
        ) {
            redirectCreatorBySetup();
            return;
        }

        if (emailInput) {
            emailInput.addEventListener("input", function () {
                setLoginFieldError(emailInput, document.getElementById("emailError"), "");
                if (loginMessage) loginMessage.textContent = "";
            });
        }

        if (passwordInput) {
            passwordInput.addEventListener("input", function () {
                setLoginFieldError(passwordInput, passwordError, "");
                if (loginMessage) loginMessage.textContent = "";
            });
        }

        loginForm.addEventListener("submit", function (event) {

            event.preventDefault();

            if (loginButton && loginButton.disabled) return;

            const email = emailInput.value.trim();

            const password = passwordInput.value;

            clearLoginErrors();

            const emailPattern =
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            let hasError = false;

            if (!email) {
                setLoginFieldError(emailInput, document.getElementById("emailError"), "Please enter your email address.");
                hasError = true;
            } else if (!emailPattern.test(email)) {
                setLoginFieldError(emailInput, document.getElementById("emailError"), "Please enter a valid email address.");
                hasError = true;
            }

            if (!password) {
                setLoginFieldError(passwordInput, passwordError, "Please enter your password.");
                hasError = true;
            }

            if (hasError) return;

            if (window.BrandifyAdminAuth && window.BrandifyAdminAuth.login(email, password)) {

                window.location.href = "admin-dashboard.html";
                return;

            }

            const account = getAccount();

            if (
                !account ||
                typeof account.email !== "string" ||
                account.email.trim().toLowerCase() !== email.toLowerCase() ||
                account.password !== password
            ) {
                if (loginMessage) loginMessage.textContent = "Incorrect email or password.";
                return;

            }

            localStorage.setItem(
                "brandifyLoggedIn",
                "true"
            );

            if (window.BrandifyCreatorData) window.BrandifyCreatorData.sync();

            setButtonLoading(loginButton, true);
            const buttonText = loginButton && loginButton.querySelector(".button-text");
            if (buttonText) buttonText.textContent = "Signing In...";

            window.setTimeout(redirectCreatorBySetup, 250);

        });

    }


    /* =====================================================
       FORGOT PASSWORD
       ===================================================== */

    const forgotPasswordForm =
        document.getElementById("forgotPasswordForm");

    if (forgotPasswordForm) {

        forgotPasswordForm.addEventListener("submit", function (event) {

            event.preventDefault();

            const email =
                document.getElementById("email").value.trim();

            const emailError =
                document.getElementById("emailError");

            clearFieldError(emailError);

            const emailPattern =
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            if (!emailPattern.test(email)) {

                showFieldError(
                    emailError,
                    "Please enter a valid email address."
                );

                return;

            }

            const account = getAccount();

            if (
                account &&
                account.email.toLowerCase() ===
                email.toLowerCase()
            ) {

                alert(
                    "Password reset is not available in this frontend-only demo."
                );

            } else {

                alert(
                    "Account not found. Please create an account first."
                );

            }

        });

    }


    /* =====================================================
       LOGOUT HELPER
       ===================================================== */

    window.logoutUser = function () {

        localStorage.removeItem("brandifyLoggedIn");

        window.location.href = "login.html";

    };


    /* =====================================================
       CURRENT USER HELPER
       ===================================================== */

    window.getCurrentUser = function () {

        return getAccount();

    };

});
