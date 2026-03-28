import React, { useState } from 'react';
import {
    StyleSheet, Text, View, TextInput, TouchableOpacity,
    KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
    ViewStyle
} from 'react-native';
import { useAction } from 'convex/react';
import { api } from '@backend/_generated/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { Mail, Lock, Ghost, AtSign, ChevronRight } from 'lucide-react-native';
import GlassCard from '../components/GlassCard';
import NeonButton from '../components/NeonButton';

export default function LoginScreen({ onNavigate }: { onNavigate: (screen: string) => void }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login, setPendingEmail } = useAuth();
    const loginAction = useAction(api.auth.login);
    const { colors, isDark } = useTheme();

    const handleLogin = async () => {
        if (!email || !password) { setError('Please fill in all fields.'); return; }
        setError('');
        setLoading(true);
        try {
            const loginPromise = (loginAction as any)({ email: email.trim().toLowerCase(), password });
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Connection timed out.')), 10000)
            );
            
            const user = await Promise.race([loginPromise, timeoutPromise]);
            login(user as any);
        } catch (e: any) {
            const msg = e?.message || e?.data || String(e);
            if (msg.includes('EMAIL_NOT_VERIFIED')) {
                setPendingEmail(email.trim().toLowerCase());
                onNavigate('verify');
            } else {
                setError(msg || 'Login failed.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={isDark ? ['#080b14', '#0d1225', '#111833'] : ['#f8fafc', '#e2e8f0', '#cbd5e1']}
                style={StyleSheet.absoluteFill}
            />
            
            <KeyboardAvoidingView 
                style={{ flex: 1 }} 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView 
                    contentContainerStyle={styles.scroll} 
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.header}>
                        <View style={[styles.logoIcon, { backgroundColor: `${colors.primary}20` }]}>
                            <AtSign color={colors.primary} size={32} strokeWidth={2.5} />
                        </View>
                        <Text style={[styles.logoText, { color: colors.text }]}>
                            JanSang <Text style={{ color: colors.primary }}>AI</Text>
                        </Text>
                        <Text style={[styles.tagline, { color: colors.textMuted }]}>
                            Hyper-Local Governance Engine
                        </Text>
                    </View>

                    <GlassCard intensity={isDark ? 30 : 50} style={styles.card as ViewStyle}>
                        <Text style={[styles.heading, { color: colors.text }]}>Welcome Back</Text>
                        <Text style={[styles.sub, { color: colors.textMuted }]}>
                            Sign in to access your civic dashboard
                        </Text>

                        {error ? (
                            <View style={[styles.errorBox, { backgroundColor: `${colors.danger}15` }]}>
                                <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
                            </View>
                        ) : null}

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.textMuted }]}>Email Address</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg }]}>
                                <Mail color={colors.textMuted} size={20} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: colors.text }]}
                                    value={email}
                                    onChangeText={setEmail}
                                    placeholder="you@example.com"
                                    placeholderTextColor={colors.textMuted}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.textMuted }]}>Password</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg }]}>
                                <Lock color={colors.textMuted} size={20} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: colors.text }]}
                                    value={password}
                                    onChangeText={setPassword}
                                    placeholder="••••••••"
                                    placeholderTextColor={colors.textMuted}
                                    secureTextEntry
                                />
                            </View>
                        </View>

                        <TouchableOpacity 
                            onPress={() => onNavigate('forgotPassword')} 
                            style={styles.forgotBtn}
                        >
                            <Text style={[styles.forgotText, { color: colors.primary }]}>
                                Forgot Password?
                            </Text>
                        </TouchableOpacity>

                        <NeonButton
                            title="Sign In"
                            onPress={handleLogin}
                            variant="primary"
                            size="large"
                            icon={loading ? <ActivityIndicator color="#080b14" size="small" /> : <ChevronRight color="#080b14" size={20} />}
                        />

                        <TouchableOpacity 
                            onPress={() => onNavigate('register')} 
                            style={styles.footer}
                        >
                            <Text style={[styles.footerText, { color: colors.textMuted }]}>
                                New to JanSang? <Text style={{ color: colors.primary, fontWeight: '700' }}>Create Account</Text>
                            </Text>
                        </TouchableOpacity>
                    </GlassCard>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
    header: { alignItems: 'center', marginBottom: 32 },
    logoIcon: {
        width: 64,
        height: 64,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    logoText: { fontSize: 32, fontWeight: '900', letterSpacing: -1 },
    tagline: { fontSize: 13, fontWeight: '500', marginTop: 4, letterSpacing: 0.2 },
    card: { padding: 24 },
    heading: { fontSize: 24, fontWeight: '800', marginBottom: 8 },
    sub: { fontSize: 14, marginBottom: 24 },
    inputGroup: { marginBottom: 20 },
    label: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 1 },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 56,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    inputIcon: { marginRight: 12 },
    input: { flex: 1, fontSize: 16, fontWeight: '500' },
    forgotBtn: { alignSelf: 'flex-end', marginBottom: 24 },
    forgotText: { fontSize: 14, fontWeight: '700' },
    errorBox: {
        padding: 12,
        borderRadius: 12,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,75,92,0.2)',
    },
    errorText: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
    footer: { marginTop: 24, alignItems: 'center' },
    footerText: { fontSize: 14, fontWeight: '500' },
});
