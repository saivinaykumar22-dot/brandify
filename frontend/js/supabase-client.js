(function () {
    "use strict";

    const config = window.BRANDIFY_SUPABASE_CONFIG || {};
    const configured = Boolean(
        window.supabase &&
        config.url &&
        config.publishableKey &&
        !String(config.url).includes("YOUR_") &&
        !String(config.publishableKey).includes("YOUR_")
    );
    const client = configured
        ? window.supabase.createClient(config.url, config.publishableKey)
        : null;
    const recordTypes = {
        brandifyOrderRequests: "order_request",
        brandifyOrders: "order",
        brandifyNotifications: "notification"
    };
    let profileCache = [];
    let activeUser = null;
    let adminUser = false;
    let realtimeChannel = null;
    let syncTimer = 0;

    function writeLocal(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
        window.dispatchEvent(new CustomEvent("brandify-storage-update", { detail: { key: key } }));
    }

    function creatorKey(email) {
        return "creator-" + String(email || "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
    }

    async function getCurrentUser() {
        if (!client) return null;
        const sessionResult = await client.auth.getSession();
        if (sessionResult.error) throw sessionResult.error;
        if (!sessionResult.data.session) return null;
        const result = await client.auth.getUser();
        if (result.error) throw result.error;
        return result.data.user || null;
    }

    async function isAdmin(userId) {
        if (!client || !userId) return false;
        const result = await client.from("admin_users").select("user_id").eq("user_id", userId).maybeSingle();
        if (result.error) throw result.error;
        return Boolean(result.data);
    }

    function localCatalog() {
        try {
            const saved = JSON.parse(localStorage.getItem("brandifyProductCatalog") || "[]");
            return Array.isArray(saved) ? saved : [];
        } catch (error) {
            return [];
        }
    }

    async function persistCatalog(products) {
        if (!client) return;
        if (!adminUser) throw new Error("Only an admin can update the shared product catalog.");
        const rows = (Array.isArray(products) ? products : []).filter(function (product) {
            return product && product.id;
        }).map(function (product) {
            return { id: String(product.id), data: product, updated_at: product.updatedAt || new Date().toISOString() };
        });
        if (!rows.length) return;
        const result = await client.from("brandify_products").upsert(rows, { onConflict: "id" });
        if (result.error) throw result.error;
    }

    async function loadSharedCatalog() {
        if (!client) return;
        const result = await client.from("brandify_products").select("id,data,updated_at").order("id");
        if (result.error) {
            window.dispatchEvent(new CustomEvent("brandify-catalog-sync-error", { detail: { message: result.error.message || "Could not load the shared product catalog." } }));
            return;
        }
        const products = (result.data || []).map(function (row) {
            return row.data && typeof row.data === "object" ? Object.assign({}, row.data, { id: row.id }) : null;
        }).filter(Boolean);

        // On first setup, seed the shared catalog once from the existing Brandify catalog.
        if (!products.length && adminUser) {
            const existing = localCatalog();
            if (existing.length) {
                try {
                    await persistCatalog(existing);
                    if (window.BrandifyCatalog && window.BrandifyCatalog.replaceFromBackend) window.BrandifyCatalog.replaceFromBackend(existing);
                } catch (error) {
                    window.dispatchEvent(new CustomEvent("brandify-catalog-sync-error", { detail: { message: error.message || "Could not initialize the shared product catalog." } }));
                }
            }
            return;
        }

        if (products.length) {
            if (window.BrandifyCatalog && window.BrandifyCatalog.replaceFromBackend) window.BrandifyCatalog.replaceFromBackend(products);
            else {
                localStorage.setItem("brandifyProductCatalog", JSON.stringify(products));
                window.dispatchEvent(new CustomEvent("brandify-catalog-updated"));
            }
        }
    }

    async function loadWorkspace() {
        if (!client) return;
        const user = await getCurrentUser();
        activeUser = user;

        if (!user) {
            activeUser = null;
            adminUser = false;
            localStorage.removeItem("brandifyLoggedIn");
            localStorage.removeItem("brandifyAdminLoggedIn");
            await loadSharedCatalog();
            window.dispatchEvent(new CustomEvent("brandify-backend-ready", { detail: { user: null, isAdmin: false } }));
            return;
        }

        adminUser = await isAdmin(user.id);
        localStorage.setItem("brandifyLoggedIn", adminUser ? "false" : "true");
        localStorage.setItem("brandifyAdminLoggedIn", adminUser ? "true" : "false");

        const profileResult = await client.from("profiles").select("user_id,creator_key,full_name,phone,email,brand_name,status,created_at");
        if (profileResult.error) throw profileResult.error;
        profileCache = profileResult.data || [];

        const previousCreatorKey = localStorage.getItem("brandifyCreatorId");
        const currentProfile = profileCache.find(function (profile) { return profile.user_id === user.id; });
        const account = {
            fullName: currentProfile && currentProfile.full_name || user.user_metadata && user.user_metadata.full_name || "Creator",
            phone: currentProfile && currentProfile.phone || user.user_metadata && user.user_metadata.phone || "",
            email: user.email || ""
        };
        localStorage.setItem("brandifyCreatorStatus", currentProfile && currentProfile.status || "Active");
        localStorage.setItem("brandifyAccount", JSON.stringify(account));
        localStorage.setItem("brandifyCreatorId", currentProfile && currentProfile.creator_key || creatorKey(user.email));

        let recordsResult = await client.from("brandify_records").select("owner_id,record_type,record_id,data,created_at,updated_at");
        if (recordsResult.error) throw recordsResult.error;
        let rows = recordsResult.data || [];
        const oldCreatorKey = previousCreatorKey;
        if (!adminUser && currentProfile && oldCreatorKey === currentProfile.creator_key) {
            const migrationKeys = { brandifyOrderRequests: "order_request", brandifyOrders: "order", brandifyNotifications: "notification" };
            for (const key of Object.keys(migrationKeys)) {
                if (rows.some(function (row) { return row.record_type === migrationKeys[key]; })) continue;
                let saved = [];
                try { saved = JSON.parse(localStorage.getItem(key) || "[]"); } catch (error) { saved = []; }
                const owned = Array.isArray(saved) ? saved.filter(function (item) {
                    return item && (item.creatorId === oldCreatorKey || item.recipientId === oldCreatorKey);
                }) : [];
                if (owned.length) await persistRecords(key, owned);
            }
            recordsResult = await client.from("brandify_records").select("owner_id,record_type,record_id,data,created_at,updated_at");
            if (recordsResult.error) throw recordsResult.error;
            rows = recordsResult.data || [];
        }
        const byType = { order_request: [], order: [], notification: [] };
        rows.forEach(function (row) {
            if (byType[row.record_type]) byType[row.record_type].push(row.data);
        });
        writeLocal("brandifyOrderRequests", byType.order_request);
        writeLocal("brandifyOrders", byType.order);
        writeLocal("brandifyNotifications", byType.notification);

        await loadSharedCatalog();

        if (adminUser) {
            const creatorRows = profileCache.map(function (profile) {
                const saved = (function () {
                    try { return JSON.parse(localStorage.getItem("brandifyCreators") || "[]"); }
                    catch (error) { return []; }
                })().find(function (creator) { return creator.email && creator.email.toLowerCase() === profile.email.toLowerCase(); }) || {};
                return Object.assign({}, saved, {
                    id: profile.creator_key,
                    userId: profile.user_id,
                    name: profile.full_name || "Creator",
                    phone: profile.phone || "",
                    email: profile.email,
                    brandName: profile.brand_name || saved.brandName || "",
                    createdAt: profile.created_at,
                    status: profile.status || saved.status || "Active",
                    orders: byType.order.filter(function (order) { return order && order.creatorId === profile.creator_key; })
                });
            });
            writeLocal("brandifyCreators", creatorRows);
        }

        if (!realtimeChannel) {
            realtimeChannel = client.channel("brandify-shared-data")
                .on("postgres_changes", { event: "*", schema: "public", table: "brandify_records" }, function () {
                    window.clearTimeout(syncTimer);
                    syncTimer = window.setTimeout(function () { loadWorkspace().catch(reportError); }, 180);
                })
                .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, function () {
                    window.clearTimeout(syncTimer);
                    syncTimer = window.setTimeout(function () { loadWorkspace().catch(reportError); }, 180);
                })
                .on("postgres_changes", { event: "*", schema: "public", table: "brandify_products" }, function () {
                    window.clearTimeout(syncTimer);
                    syncTimer = window.setTimeout(function () { loadSharedCatalog().catch(reportError); }, 180);
                })
                .subscribe();
        }

        window.dispatchEvent(new CustomEvent("brandify-backend-ready", { detail: { user: user, isAdmin: adminUser } }));
    }

    async function persistRecords(key, records) {
        if (!client || !recordTypes[key] || !Array.isArray(records)) return;
        const user = await getCurrentUser();
        if (!user) throw new Error("Sign in before saving order data.");

        const type = recordTypes[key];
        const rows = records.map(function (record) {
            if (!record || typeof record !== "object") return null;
            const recordId = String(record.requestId || record.orderId || record.id || "");
            if (!recordId) return null;

            let ownerId = user.id;
            const ownerKey = record.creatorId || record.recipientId || "";
            if (adminUser && ownerKey) {
                const ownerProfile = profileCache.find(function (profile) { return profile.creator_key === ownerKey; });
                if (ownerProfile) ownerId = ownerProfile.user_id;
            }
            return {
                owner_id: ownerId,
                record_type: type,
                record_id: recordId,
                data: record,
                updated_at: new Date().toISOString()
            };
        }).filter(Boolean);

        if (!rows.length) return;
        const result = await client.from("brandify_records").upsert(rows, { onConflict: "owner_id,record_type,record_id" });
        if (result.error) throw result.error;
    }

    function reportError(error) {
        console.error("Brandify backend error:", error);
        window.dispatchEvent(new CustomEvent("brandify-backend-error", { detail: { message: error && error.message || "Could not sync Brandify data." } }));
    }

    const backend = {
        configured: configured,
        client: client,
        ready: configured ? loadWorkspace().catch(reportError) : Promise.resolve(),
        isConfigured: function () { return configured; },
        isAdmin: function () { return adminUser; },
        currentUser: getCurrentUser,
        signUp: async function (details) {
            if (!client) throw new Error("Supabase is not configured yet.");
            return client.auth.signUp({
                email: details.email,
                password: details.password,
                options: { data: { full_name: details.fullName, phone: details.phone || "" } }
            });
        },
        signIn: async function (email, password) {
            if (!client) throw new Error("Supabase is not configured yet.");
            const result = await client.auth.signInWithPassword({ email: email, password: password });
            if (!result.error) await loadWorkspace();
            return result;
        },
        signOut: async function () {
            if (!client) return;
            const result = await client.auth.signOut();
            if (result.error) throw result.error;
            activeUser = null;
            adminUser = false;
            localStorage.removeItem("brandifyLoggedIn");
            localStorage.removeItem("brandifyAdminLoggedIn");
        },
        updateProfile: async function (updates) {
            if (!client) return;
            const user = await getCurrentUser();
            if (!user) return;
            const allowed = { full_name: updates.fullName, phone: updates.phone, brand_name: updates.brandName };
            Object.keys(allowed).forEach(function (key) { if (allowed[key] == null) delete allowed[key]; });
            if (!Object.keys(allowed).length) return;
            const result = await client.from("profiles").update(allowed).eq("user_id", user.id);
            if (result.error) throw result.error;
        },
        updateCreatorStatus: async function (creatorKey, status) {
            if (!client || !adminUser) throw new Error("Only an admin can change creator status.");
            if (!["Active", "Inactive"].includes(status)) throw new Error("Choose a valid creator status.");
            const result = await client.from("profiles").update({ status: status }).eq("creator_key", creatorKey);
            if (result.error) throw result.error;
            profileCache = profileCache.map(function (profile) {
                return profile.creator_key === creatorKey ? Object.assign({}, profile, { status: status }) : profile;
            });
            const creators = (function () {
                try { const value = JSON.parse(localStorage.getItem("brandifyCreators") || "[]"); return Array.isArray(value) ? value : []; }
                catch (error) { return []; }
            })();
            writeLocal("brandifyCreators", creators.map(function (creator) {
                return creator.id === creatorKey ? Object.assign({}, creator, { status: status }) : creator;
            }));
        },
        persistRecords: persistRecords,
        persistCatalog: persistCatalog,
        refresh: function () { return loadWorkspace(); }
    };

    if (client) {
        client.auth.onAuthStateChange(function (event, session) {
            if (["SIGNED_IN", "SIGNED_OUT", "TOKEN_REFRESHED", "USER_UPDATED"].includes(event)) {
                window.setTimeout(function () { loadWorkspace().catch(reportError); }, 0);
            }
        });
    }

    window.BrandifyBackend = backend;
})();
