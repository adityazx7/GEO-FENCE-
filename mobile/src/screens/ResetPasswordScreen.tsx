import React, { useState, useEffect } from 'react';
import {
    StyleSheet, Text, View, TextInput, TouchableOpacity,
    KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView
} from 'react-native';
import { useMutation, useAction } from 'convex/react';
import { api } from '@backend/_generated/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { ShieldCheck, ArrowLeft, CheckCircle2, Lock } from 'lucide-react-native';

export default function ResetPasswordScreen({ onNavigate }: { onNavigate: (screen: string) => void }) {
    const [code, setCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [resendTimer, setResendTimer] = useState(0);
    const [success, setSuccess] = useState(false);
    const { pendingEmail } = useAuth();
    const resetPassword = useAction(api.auth.resetPassword);
    const forgotPassword = useAction(api.auth.forgotPassword);
    const { colors, isDark } = useTheme();
    const styles = createStyles(colors, isDark);

    useEffect(() => {
        let interval: any;
        if (resendTimer > 0) {
            interval = setInterval(() => {
                setResendTimer((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [resendTimer]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const handleReset = async () => {
        if (code.length !== 6) { setError('Please enter the 6-digit code.'); return; }
        if (newPassword.length < 6) { setError('Password must be at least 6 characters.'); return; }
        if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return; }
        
        setError('');
        setLoading(true);
        try {
            await (resetPassword as any)({ 
                email: pendingEmail!, 
                code, 
                newPassword 
            });
            setSuccess(true);
            setTimeout(() => onNavigate('login'), 2000);
        } catch (e: any) {
            setError(e?.message || e?.data || 'Reset failed.');
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (resendTimer > 0) return;
        setResending(true);
        setError('');
        try {
            await (forgotPassword as any)({ email: pendingEmail! });
            setResendTimer(120);
        } catch (e: any) {
            setError(e?.message || e?.data || 'Failed to resend.');
            if (e?.message?.includes('wait')) {
                const match = e.message.match(/\d+/);
                if (match) setResendTimer(parseInt(match[0]));
            }
        } finally {
            setResending(false);
        }
    };

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                <View style={styles.content}>
                    <View style={styles.iconBox}>
                        <ShieldCheck color={colors.primary} size={48} />
                    </View>
                    <Text style={styles.heading}>Reset Password</Text>
                    <Text style={styles.sub}>
                        Enter the code sent to{'\n'}
                        <Text style={{ color: colors.primary, fontWeight: '700' }}>{pendingEmail}</Text>
                    </Text>

                    {success ? (
                        <View style={styles.successBox}>
                            <CheckCircle2 color={colors.success} size={24} style={{ marginRight: 8 }} />
                            <Text style={styles.successText}>Success! Your password is reset. Redirecting...</Text>
                        </View>
                    ) : (
                        <View style={{ width: '100%', alignItems: 'center' }}>
                            {error ? <Text style={styles.error}>{error}</Text> : null}

                            <Text style={styles.label}>Verification Code</Text>
                            <TextInput
                                style={styles.codeInput}
                                value={code}
                                onChangeText={setCode}
                                placeholder="000000"
                                placeholderTextColor={colors.textMuted}
                                keyboardType="number-pad"
                                maxLength={6}
                                textAlign="center"
                            />

                            <Text style={styles.label}>New Password</Text>
                            <TextInput
                                style={styles.input}
                                value={newPassword}
                                onChangeText={setNewPassword}
                                placeholder="Min 6 characters"
                                placeholderTextColor={colors.textMuted}
                                secureTextEntry
                            />

                            <Text style={styles.label}>Confirm New Password</Text>
                            <TextInput
                                style={[styles.input, { marginBottom: 24 }]}
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                placeholder="Repeat new password"
                                placeholderTextColor={colors.textMuted}
                                secureTextEntry
                            />

                            <TouchableOpacity style={styles.btn} onPress={handleReset} disabled={loading}>
                                {loading ? <ActivityIndicator color={isDark ? '#080d18' : colors.card} /> : <Text style={styles.btnText}>Reset Password</Text>}
                            </TouchableOpacity>

                            <TouchableOpacity onPress={handleResend} disabled={resending || resendTimer > 0} style={{ marginTop: 24 }}>
                                <Text style={[styles.link, (resendTimer > 0) && { color: colors.textMuted }]}>
                                    {resending ? 'Sending...' : 
                                     resendTimer > 0 ? `Resend in ${formatTime(resendTimer)}` : 
                                     "Didn't get the code? "}<Text style={{ color: resendTimer > 0 ? colors.textMuted : colors.primary, fontWeight: '700' }}>
                                        {resendTimer > 0 ? '' : 'Resend'}
                                     </Text>
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    <TouchableOpacity onPress={() => onNavigate('login')} style={styles.backBtn}>
                        <ArrowLeft color={colors.textMuted} size={16} style={{ marginRight: 6 }} />
                        <Text style={styles.link}>Back to Login</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { flexGrow: 1 },
    content: { flex: 1, justifyContent: 'center', padding: 24, paddingVertical: 60, alignItems: 'center' },
    iconBox: { width: 90, height: 90, borderRadius: 30, backgroundColor: colors.transparentPrimary, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
    heading: { fontSize: 26, fontWeight: 'bold', color: colors.text, marginBottom: 12 },
    sub: { fontSize: 15, color: colors.textMuted, textAlign: 'center', marginBottom: 36, lineHeight: 24 },
    label: { fontSize: 12, color: colors.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1, fontWeight: '600', width: '85%', textAlign: 'left' },
    input: { backgroundColor: colors.inputBg, borderRadius: 16, padding: 18, color: colors.text, fontSize: 16, width: '85%', marginBottom: 16, borderWidth: 1, borderColor: colors.transparentBorder },
    codeInput: { backgroundColor: colors.transparentPrimary, borderRadius: 16, padding: 18, color: colors.primary, fontSize: 24, fontWeight: 'bold', width: '85%', marginBottom: 24, borderWidth: 2, borderColor: colors.primary, letterSpacing: 8 },
    btn: { backgroundColor: colors.primary, borderRadius: 14, padding: 18, alignItems: 'center', width: '85%' },
    btnText: { color: isDark ? '#080d18' : colors.card, fontWeight: 'bold', fontSize: 16 },
    error: { color: colors.danger, fontSize: 13, marginBottom: 20, backgroundColor: 'rgba(239,68,68,0.1)', padding: 14, borderRadius: 12, width: '85%', textAlign: 'center', overflow: 'hidden' },
    link: { textAlign: 'center', color: colors.textMuted, fontSize: 15 },
    successBox: { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(34,197,94,0.1)', padding: 24, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)', width: '85%' },
    successText: { color: colors.success, fontSize: 15, fontWeight: '700', textAlign: 'center', lineHeight: 22 },
    backBtn: { marginTop: 40, flexDirection: 'row', alignItems: 'center' }
});
