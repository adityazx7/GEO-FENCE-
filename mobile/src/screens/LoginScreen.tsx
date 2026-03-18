import React, { useState } from 'react';
import {
    StyleSheet, Text, View, TextInput, TouchableOpacity,
    KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator
} from 'react-native';
import { useAction } from 'convex/react';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen({ onNavigate }: { onNavigate: (screen: string) => void }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login, setPendingEmail } = useAuth();
    const loginAction = useAction('auth:login' as any);

    const handleLogin = async () => {
        if (!email || !password) { setError('Please fill in all fields.'); return; }
        setError('');
        setLoading(true);
        try {
            const user = await (loginAction as any)({ email: email.trim().toLowerCase(), password });
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
                    <Text style={styles.logo}>CivicSentinel<Text style={{ color: '#00d4ff' }}>AI</Text></Text>
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
                        placeholderTextColor="#4b5563"
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />

                    <Text style={styles.label}>Password</Text>
                    <TextInput
                        style={styles.input}
                        value={password}
                        onChangeText={setPassword}
                        placeholder="Enter your password"
                        placeholderTextColor="#4b5563"
                        secureTextEntry
                    />

                    <TouchableOpacity style={styles.btn} onPress={handleLogin} disabled={loading}>
                        {loading ? <ActivityIndicator color="#080d18" /> : <Text style={styles.btnText}>Sign In</Text>}
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => onNavigate('register')} style={{ marginTop: 20 }}>
                        <Text style={styles.link}>Don't have an account? <Text style={{ color: '#00d4ff', fontWeight: '600' }}>Register</Text></Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0a0f1e' },
    scroll: { flexGrow: 1, justifyContent: 'center', padding: 20 },
    logoBox: { alignItems: 'center', marginBottom: 40 },
    logo: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
    tagline: { fontSize: 12, color: '#6b7280', marginTop: 4 },
    card: { backgroundColor: '#111827', borderRadius: 20, padding: 28, borderWidth: 1, borderColor: 'rgba(0,212,255,0.1)' },
    heading: { fontSize: 22, fontWeight: 'bold', color: '#f3f4f6', marginBottom: 4 },
    sub: { fontSize: 13, color: '#6b7280', marginBottom: 24 },
    label: { fontSize: 12, color: '#9ca3af', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 },
    input: { backgroundColor: '#1f2937', borderRadius: 12, padding: 14, color: '#f3f4f6', fontSize: 15, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
    btn: { backgroundColor: '#00d4ff', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
    btnText: { color: '#080d18', fontWeight: 'bold', fontSize: 16 },
    error: { color: '#ef4444', fontSize: 13, marginBottom: 16, backgroundColor: 'rgba(239,68,68,0.1)', padding: 12, borderRadius: 10 },
    link: { textAlign: 'center', color: '#9ca3af', fontSize: 14 },
});
