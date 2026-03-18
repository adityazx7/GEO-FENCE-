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
            <div style={{
                height: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#0a0f1e',
                color: '#ffffff',
                fontFamily: 'sans-serif',
                padding: '20px',
                textAlign: 'center'
            }}>
                <h1 style={{ color: '#ff6b6b' }}>Missing Environment Variables</h1>
                <p style={{ color: '#9ca3af', maxWidth: '500px' }}>
                    The <code>NEXT_PUBLIC_CONVEX_URL</code> is not defined. 
                    Please set up your <code>.env.local</code> file using the provided template.
                </p>
                <div style={{
                    marginTop: '20px',
                    padding: '15px',
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    borderRadius: '8px',
                    fontSize: '14px',
                }}>
                    <strong>Step:</strong> Run <code>npx convex dev</code> to initialize your backend and generate the URL.
                </div>
            </div>
        );
    }

    return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
