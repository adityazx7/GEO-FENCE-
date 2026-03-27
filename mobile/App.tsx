import React, { useState, Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { registerRootComponent } from 'expo';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import VerifyEmailScreen from './src/screens/VerifyEmailScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import ResetPasswordScreen from './src/screens/ResetPasswordScreen';
import HomeScreen from './src/screens/HomeScreen';
import BudgetScreen from './src/screens/BudgetScreen';
import NewsScreen from './src/screens/NewsScreen';
import GovernmentWorkScreen from './src/screens/GovernmentWorkScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import AddWorkScreen from './src/screens/AddWorkScreen';
import ReportIssueScreen from './src/screens/ReportIssueScreen';
import BottomNav from './src/components/BottomNav';

// Convex connection
const CONVEX_URL = process.env.EXPO_PUBLIC_CONVEX_URL || 'https://befitting-chipmunk-858.convex.cloud';
let convex: ConvexReactClient;
try {
    convex = new ConvexReactClient(CONVEX_URL);
} catch (e) {
    console.error('[App] ConvexReactClient init failed:', e);
    convex = null as any;
}

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

type AuthScreen = 'login' | 'register' | 'verify' | 'forgotPassword' | 'resetPassword';
type AppTab = 'home' | 'budget' | 'initiatives' | 'addWork' | 'reportIssue' | 'profile';

function AppNavigator() {
    const { user, isLoading } = useAuth();
    const { colors, isDark } = useTheme();
    const [authScreen, setAuthScreen] = useState<AuthScreen>('login');
    const [activeTab, setActiveTab] = useState<AppTab>('home');
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

    // Loading state
    if (isLoading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading JanSang AI...</Text>
            </View>
        );
    }

    // ====== AUTH SCREENS ======
    if (!user) {
        if (authScreen === 'register') {
            return <RegisterScreen onNavigate={(s: string) => setAuthScreen(s as AuthScreen)} />;
        }
        if (authScreen === 'verify') {
            return <VerifyEmailScreen onNavigate={(s: string) => setAuthScreen(s as AuthScreen)} />;
        }
        if (authScreen === 'forgotPassword') {
            return <ForgotPasswordScreen onNavigate={(s: string) => setAuthScreen(s as AuthScreen)} />;
        }
        if (authScreen === 'resetPassword') {
            return <ResetPasswordScreen onNavigate={(s: string) => setAuthScreen(s as AuthScreen)} />;
        }
        return <LoginScreen onNavigate={(s: string) => setAuthScreen(s as AuthScreen)} />;
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
            case 'home': return <HomeScreen onViewWork={(id: string) => setSelectedProjectId(id)} />;
            case 'budget': return <BudgetScreen onViewProject={(id: string) => setSelectedProjectId(id)} />;
            case 'initiatives': return <NewsScreen onViewWork={(id: string) => setSelectedProjectId(id)} />;
            case 'addWork': return <AddWorkScreen onDone={() => setActiveTab('home')} />;
            case 'reportIssue': return <ReportIssueScreen onDone={() => setActiveTab('home')} />;
            case 'profile': return <ProfileScreen />;
            default: return <HomeScreen onViewWork={(id: string) => setSelectedProjectId(id)} />;
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            {renderTab()}
            <BottomNav
                activeTab={activeTab}
                onTabChange={setActiveTab}
                userType={user.userType as 'citizen' | 'organization'}
            />
        </View>
    );
}

function App() {
    if (!convex) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0f1e' }}>
                <Text style={{ color: '#ef4444', fontSize: 16 }}>Backend connection failed</Text>
                <Text style={{ color: '#6b7280', fontSize: 13, marginTop: 8 }}>Check EXPO_PUBLIC_CONVEX_URL</Text>
            </View>
        );
    }

    return (
        <ErrorBoundary>
            <ThemeProvider>
                <ConvexProvider client={convex}>
                    <AuthProvider>
                        <SafeAreaProvider>
                            <AppNavigator />
                        </SafeAreaProvider>
                    </AuthProvider>
                </ConvexProvider>
            </ThemeProvider>
        </ErrorBoundary>
    );
}

// Register the root component for all platforms including web
// Removed duplicate `registerRootComponent(App)` as it is handled by AppEntry.js
export default App;

const styles = StyleSheet.create({
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0f1e' },
    loadingText: { color: '#6b7280', fontSize: 14, marginTop: 16 },
});
