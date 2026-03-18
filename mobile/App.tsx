import React, { useState, Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { AuthProvider, useAuth } from './src/context/AuthContext';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import VerifyEmailScreen from './src/screens/VerifyEmailScreen';
import HomeScreen from './src/screens/HomeScreen';
import BudgetScreen from './src/screens/BudgetScreen';
import NewsScreen from './src/screens/NewsScreen';
import GovernmentWorkScreen from './src/screens/GovernmentWorkScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import AddWorkScreen from './src/screens/AddWorkScreen';
import BottomNav from './src/components/BottomNav';

// Convex connection
const CONVEX_URL = 'http://127.0.0.1:3210';
const convex = new ConvexReactClient(CONVEX_URL);

// Error boundary
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: string }> {
    constructor(props: { children: ReactNode }) {
        super(props);
        this.state = { hasError: false, error: '' };
    }
    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error: error.message };
    }
    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('App Error:', error, info);
    }
    render() {
        if (this.state.hasError) {
            return (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0f1e', padding: 20 }}>
                    <Text style={{ color: '#ef4444', fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>Something went wrong</Text>
                    <Text style={{ color: '#6b7280', fontSize: 13, textAlign: 'center' }}>{this.state.error}</Text>
                </View>
            );
        }
        return this.props.children;
    }
}

type AuthScreen = 'login' | 'register' | 'verify';
type AppTab = 'home' | 'budget' | 'news' | 'addWork' | 'profile';

function AppNavigator() {
    const { user, isLoading } = useAuth();
    const [authScreen, setAuthScreen] = useState<AuthScreen>('login');
    const [activeTab, setActiveTab] = useState<AppTab>('home');
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

    // Loading state
    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#00d4ff" />
                <Text style={styles.loadingText}>Loading CivicSentinel AI...</Text>
            </View>
        );
    }

    // ====== AUTH SCREENS ======
    if (!user) {
        if (authScreen === 'register') {
            return <RegisterScreen onNavigate={(s) => setAuthScreen(s as AuthScreen)} />;
        }
        if (authScreen === 'verify') {
            return <VerifyEmailScreen onNavigate={(s) => setAuthScreen(s as AuthScreen)} />;
        }
        return <LoginScreen onNavigate={(s) => setAuthScreen(s as AuthScreen)} />;
    }

    // ====== MAIN APP ======

    // If viewing a specific project detail
    if (selectedProjectId) {
        return (
            <GovernmentWorkScreen
                projectId={selectedProjectId}
                onBack={() => setSelectedProjectId(null)}
            />
        );
    }

    const renderTab = () => {
        switch (activeTab) {
            case 'home': return <HomeScreen />;
            case 'budget': return <BudgetScreen />;
            case 'news': return <NewsScreen onViewWork={(id) => setSelectedProjectId(id)} />;
            case 'addWork': return <AddWorkScreen onDone={() => setActiveTab('home')} />;
            case 'profile': return <ProfileScreen />;
            default: return <HomeScreen />;
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#0a0f1e' }}>
            {renderTab()}
            <BottomNav
                activeTab={activeTab}
                onTabChange={setActiveTab}
                userType={user.userType as 'citizen' | 'organization'}
            />
        </View>
    );
}

export default function App() {
    return (
        <ErrorBoundary>
            <ConvexProvider client={convex}>
                <AuthProvider>
                    <AppNavigator />
                </AuthProvider>
            </ConvexProvider>
        </ErrorBoundary>
    );
}

const styles = StyleSheet.create({
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0f1e' },
    loadingText: { color: '#6b7280', fontSize: 14, marginTop: 16 },
});
