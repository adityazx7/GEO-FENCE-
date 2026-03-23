import React, { createContext, useContext, useState, ReactNode } from 'react';

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

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [pendingEmail, setPendingEmail] = useState<string | null>(null);

    const login = (userData: User) => setUser(userData);
    const logout = () => setUser(null);

    return (
        <AuthContext.Provider value={{ user, isLoading: false, login, logout, pendingEmail, setPendingEmail }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
