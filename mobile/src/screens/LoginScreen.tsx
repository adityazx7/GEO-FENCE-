import React, { useState } from 'react';
import {
    StyleSheet, Text, View, TextInput, TouchableOpacity,
    KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator
} from 'react-native';
import { useAction } from 'convex/react';
import { api } from '@backend/_generated/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function LoginScreen({ onNavigate }: { onNavigate: (screen: string) => void }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login, setPendingEmail } = useAuth();
    const loginAction = useAction(api.auth.login);
    const { colors, isDark } = useTheme();
    const styles = createStyles(colors, isDark);

    const handleLogin = async () => {
        if (!email || !password) { setError('Please fill in all fields.'); return; }
        setError('');
        setLoading(true);
        try {
            // Add a 10 second timeout so the app doesn't hang infinitely if Convex is unreachable
            const loginPromise = (loginAction as any)({ email: email.trim().toLowerCase(), password });
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Connection timed out. Ensure your backend server is running.')), 10000)
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
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                <View style={styles.logoBox}>
                    <Text style={styles.logo}>JanSang <Text style={{ color: colors.primary }}>AI</Text></Text>
                    <Text style={styles.tagline}>Hyper-Local Governance Engine</Text>
                </View>

                <View style={styles.card}>
                    <Text style={styles.heading}>Welcome Back</Text>
                    <Text style={styles.sub}>Sign in to continue</Text>

                    {error ? <Text style={styles.error}>{error}</Text> : null}

                    <Text style={styles.label}>Email</Text>
                    <TextInput
                        style={styles.input}
                        value={email}
                        onChangeText={setEmail}
                        placeholder="you@example.com"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />

                    <TextInput
                        style={styles.input}
                        value={password}
                        onChangeText={setPassword}
                        placeholder="Enter your password"
                        placeholderTextColor={colors.textMuted}
                        secureTextEntry
                    />

                    <TouchableOpacity onPress={() => onNavigate('forgotPassword')} style={{ alignSelf: 'flex-end', marginBottom: 20 }}>
                        <Text style={[styles.link, { color: colors.primary, fontWeight: '600' }]}>Forgot Password?</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.btn} onPress={handleLogin} disabled={loading}>
                        {loading ? <ActivityIndicator color={isDark ? '#080d18' : colors.card} /> : <Text style={styles.btnText}>Sign In</Text>}
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => onNavigate('register')} style={{ marginTop: 24 }}>
                        <Text style={styles.link}>Don't have an account? <Text style={{ color: colors.primary, fontWeight: '700' }}>Register</Text></Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { flexGrow: 1, justifyContent: 'center', padding: 20 },
    logoBox: { alignItems: 'center', marginBottom: 40 },
    logo: { fontSize: 28, fontWeight: 'bold', color: colors.text },
    tagline: { fontSize: 13, color: colors.textMuted, marginTop: 4, letterSpacing: 0.5 },
    card: { backgroundColor: colors.card, borderRadius: 24, padding: 28, borderWidth: 1, borderColor: colors.transparentBorder, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
    heading: { fontSize: 24, fontWeight: 'bold', color: colors.text, marginBottom: 6 },
    sub: { fontSize: 14, color: colors.textMuted, marginBottom: 28 },
    label: { fontSize: 12, color: colors.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1, fontWeight: '600' },
    input: { backgroundColor: colors.inputBg, borderRadius: 14, padding: 16, color: colors.text, fontSize: 15, marginBottom: 20, borderWidth: 1, borderColor: colors.transparentBorder },
    btn: { backgroundColor: colors.primary, borderRadius: 14, padding: 18, alignItems: 'center', marginTop: 8 },
    btnText: { color: isDark ? '#080d18' : colors.card, fontWeight: 'bold', fontSize: 16 },
    error: { color: colors.danger, fontSize: 13, marginBottom: 20, backgroundColor: 'rgba(239,68,68,0.1)', padding: 14, borderRadius: 12, overflow: 'hidden' },
    link: { textAlign: 'center', color: colors.textMuted, fontSize: 14 },
});
