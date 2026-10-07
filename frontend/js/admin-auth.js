(function () {
    "use strict";
    const defaultCredentials = { email: "admin@brandify.com", password: "Brandify@Admin123" };

    function credentials() {
        try {
            return JSON.parse(localStorage.getItem("brandifyAdminCredentials") || "null") || defaultCredentials;
        } catch (error) {
            return defaultCredentials;
        }
    }

    function login(email, password) {
        const expected = credentials();
        const valid = String(email || "").trim().toLowerCase() === String(expected.email || "").trim().toLowerCase() &&
            String(password || "") === String(expected.password || "");
        if (valid) localStorage.setItem("brandifyAdminLoggedIn", "true");
        return valid;
    }

    function guard() {
        if (localStorage.getItem("brandifyAdminLoggedIn") !== "true") window.location.replace("login.html");
    }

    function logout() {
        localStorage.removeItem("brandifyAdminLoggedIn");
        window.location.href = "login.html";
    }

    window.BrandifyAdminAuth = { credentials: credentials, login: login, guard: guard, logout: logout };
})();
