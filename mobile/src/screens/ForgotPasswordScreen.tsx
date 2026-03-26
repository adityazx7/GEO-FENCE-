import React, { useState } from 'react';
import {
    StyleSheet, Text, View, TextInput, TouchableOpacity,
    KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView
} from 'react-native';
import { useAction } from 'convex/react';
import { api } from '@backend/_generated/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { KeyRound, ArrowLeft } from 'lucide-react-native';

export default function ForgotPasswordScreen({ onNavigate }: { onNavigate: (screen: string) => void }) {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { setPendingEmail } = useAuth();
    const forgotPassword = useAction(api.auth.forgotPassword);
    const { colors, isDark } = useTheme();
    const styles = createStyles(colors, isDark);

    const handleRequestReset = async () => {
        if (!email) { setError('Please enter your email address.'); return; }
        setError('');
        setLoading(true);
        try {
            await (forgotPassword as any)({ email: email.trim().toLowerCase() });
            setPendingEmail(email.trim().toLowerCase());
            onNavigate('resetPassword');
        } catch (e: any) {
            setError(e?.message || e?.data || 'Failed to request reset.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={styles.content}>
                <View style={styles.iconBox}>
                    <KeyRound color={colors.primary} size={48} />
                </View>
                <Text style={styles.heading}>Forgot Password?</Text>
                <Text style={styles.sub}>
                    No worries! Enter your email and we'll send you a 6-digit code to reset it.
                </Text>

                {error ? <Text style={styles.error}>{error}</Text> : null}

                <View style={{ width: '100%', alignItems: 'center' }}>
                    <Text style={styles.label}>Email Address</Text>
                    <TextInput
                        style={styles.input}
                        value={email}
                        onChangeText={setEmail}
                        placeholder="you@example.com"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />

                    <TouchableOpacity style={styles.btn} onPress={handleRequestReset} disabled={loading}>
                        {loading ? <ActivityIndicator color={isDark ? '#080d18' : colors.card} /> : <Text style={styles.btnText}>Send Reset Code</Text>}
                    </TouchableOpacity>
                </View>

                <TouchableOpacity onPress={() => onNavigate('login')} style={styles.backBtn}>
                    <ArrowLeft color={colors.textMuted} size={16} style={{ marginRight: 6 }} />
                    <Text style={styles.link}>Back to Login</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { flex: 1, justifyContent: 'center', padding: 24, alignItems: 'center' },
    iconBox: { width: 90, height: 90, borderRadius: 30, backgroundColor: colors.transparentPrimary, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
    heading: { fontSize: 26, fontWeight: 'bold', color: colors.text, marginBottom: 12 },
    sub: { fontSize: 15, color: colors.textMuted, textAlign: 'center', marginBottom: 36, lineHeight: 24, paddingHorizontal: 10 },
    label: { fontSize: 12, color: colors.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1, fontWeight: '600', width: '85%', textAlign: 'left' },
    input: { backgroundColor: colors.inputBg, borderRadius: 16, padding: 18, color: colors.text, fontSize: 16, width: '85%', marginBottom: 24, borderWidth: 1, borderColor: colors.transparentBorder },
    btn: { backgroundColor: colors.primary, borderRadius: 14, padding: 18, alignItems: 'center', width: '85%' },
    btnText: { color: isDark ? '#080d18' : colors.card, fontWeight: 'bold', fontSize: 16 },
    error: { color: colors.danger, fontSize: 13, marginBottom: 20, backgroundColor: 'rgba(239,68,68,0.1)', padding: 14, borderRadius: 12, width: '85%', textAlign: 'center', overflow: 'hidden' },
    link: { textAlign: 'center', color: colors.textMuted, fontSize: 15 },
    backBtn: { position: 'absolute', bottom: 40, flexDirection: 'row', alignItems: 'center' }
});
