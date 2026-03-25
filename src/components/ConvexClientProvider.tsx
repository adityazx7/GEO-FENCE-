"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode, useMemo } from "react";

export default function ConvexClientProvider({
    children,
}: {
    children: ReactNode;
}) {
    const url = process.env.NEXT_PUBLIC_CONVEX_URL;

    const convex = useMemo(() => {
        if (!url) return null;
        return new ConvexReactClient(url);
    }, [url]);

    if (!url || !convex) {
        return (
            <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0f1e', color: 'white' }}>
                <p>Configuring Backend... (Check NEXT_PUBLIC_CONVEX_URL)</p>
            </div>
        );
    }

    return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
