(function () {
    "use strict";
    const defaultCredentials = { email: "brandify169@gmail.com", password: "Brandify@Admin123" };

    function credentials() {
        try {
            return JSON.parse(localStorage.getItem("brandifyAdminCredentials") || "null") || defaultCredentials;
        } catch (error) {
            return defaultCredentials;
        }
    }

    function login(email, password) {
        if (window.BrandifyBackend && window.BrandifyBackend.isConfigured()) return false;
        const expected = credentials();
        const valid = String(email || "").trim().toLowerCase() === String(expected.email || "").trim().toLowerCase() &&
            String(password || "") === String(expected.password || "");
        if (valid) localStorage.setItem("brandifyAdminLoggedIn", "true");
        return valid;
    }

    async function guard() {
        if (window.BrandifyBackend && window.BrandifyBackend.isConfigured()) {
            try {
                await window.BrandifyBackend.refresh();
                const user = await window.BrandifyBackend.currentUser();
                const authorized = Boolean(user && window.BrandifyBackend.isAdmin());
                if (!authorized) window.location.replace("login.html");
                return authorized;
            } catch (error) {
                console.error("Could not verify the Brandify admin session:", error);
                window.location.replace("login.html");
                return false;
            }
        }
        if (localStorage.getItem("brandifyAdminLoggedIn") !== "true") window.location.replace("login.html");
        return localStorage.getItem("brandifyAdminLoggedIn") === "true";
    }

    function logout() {
        localStorage.removeItem("brandifyAdminLoggedIn");
        const navigate = function () { window.location.href = "login.html"; };
        if (window.BrandifyBackend && window.BrandifyBackend.isConfigured()) window.BrandifyBackend.signOut().then(navigate).catch(navigate);
        else navigate();
    }

    window.BrandifyAdminAuth = { credentials: credentials, login: login, guard: guard, logout: logout };
})();
