/**
 * Proxy for convex/server to satisfy bundling requirements in React Native.
 * This file replaces the backend-only 'convex/server' module during bundling.
 */

export const anyApi = new Proxy({}, {
    get: function(target, moduleName) {
        if (typeof moduleName !== "string") return undefined;
        return new Proxy({}, {
            get: function(target, functionName) {
                if (typeof functionName !== "string") return undefined;
                // Return the primitive string path that Convex hooks accept natively!
                return moduleName + ":" + functionName;
            }
        });
    }
});

export const componentsGeneric = () => anyApi;

