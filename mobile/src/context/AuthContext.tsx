import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@backend/_generated/api';

interface User {
    _id: string;
    name: string;
    email: string;
    userType: 'citizen' | 'organization';
    role: string;
    state?: string;
    city?: string;
    age?: number;
    avatar?: string;
    orgName?: string;
    orgType?: string;
    preferredLanguage?: string;
    motherTongue?: string;
    notificationFrequency?: '1d' | '12h' | '1h' | 'always';
    notificationRadius?: number;
    notificationTypes?: string[];
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (userData: User) => void;
    logout: () => void;
    pendingEmail: string | null;
    setPendingEmail: (email: string | null) => void;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    isLoading: false,
    login: () => {},
    logout: () => {},
    pendingEmail: null,
    setPendingEmail: () => {},
});

/**
 * Inner component that has access to Convex hooks.
 * It subscribes live to the DB record for the logged-in user's email,
 * so any preference change (radius, language, etc.) saved to Convex
 * is immediately reflected in `user` everywhere in the app — and
 * persists across logout/login because the data lives in the DB.
 */
function AuthProviderInner({ children, setCtx }: { children: ReactNode; setCtx: (v: AuthContextType) => void }) {
    const [baseUser, setBaseUser] = useState<User | null>(null);
    const [pendingEmail, setPendingEmail] = useState<string | null>(null);

    // Live Convex subscription — re-fetches whenever the DB record changes
    const liveUser = useQuery(
        api.users.getUserByEmail,
        baseUser?.email ? { email: baseUser.email } : 'skip'
    ) as User | null | undefined;

    // Merge: live DB data wins over cached local state
    const user: User | null = liveUser !== undefined ? (liveUser ?? null) : baseUser;

    const login = (userData: User) => setBaseUser(userData);
    const logout = () => setBaseUser(null);

    useEffect(() => {
        setCtx({ user, isLoading: false, login, logout, pendingEmail, setPendingEmail });
    }, [user, pendingEmail]);

    return <>{children}</>;
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [ctx, setCtx] = useState<AuthContextType>({
        user: null,
        isLoading: false,
        login: () => {},
        logout: () => {},
        pendingEmail: null,
        setPendingEmail: () => {},
    });

    return (
        <AuthContext.Provider value={ctx}>
            <AuthProviderInner setCtx={setCtx}>
                {children}
            </AuthProviderInner>
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
