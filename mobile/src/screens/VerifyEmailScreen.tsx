import React, { useState } from 'react';
import {
    StyleSheet, Text, View, TextInput, TouchableOpacity,
    KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import { useMutation, useAction } from 'convex/react';
import { api } from '@backend/_generated/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Mail, CheckCircle2, ArrowLeft } from 'lucide-react-native';

export default function VerifyEmailScreen({ onNavigate }: { onNavigate: (screen: string) => void }) {
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [resendTimer, setResendTimer] = useState(0);
    const [success, setSuccess] = useState(false);
    const { pendingEmail } = useAuth();
    const verifyEmail = useMutation(api.authHelpers.verifyEmail);
    const resendCode = useAction(api.auth.resendCode);
    const { colors, isDark } = useTheme();
    const styles = createStyles(colors, isDark);

    // Countdown logic for Resend Button
    React.useEffect(() => {
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

    const handleVerify = async () => {
        if (code.length !== 6) { setError('Please enter the 6-digit code.'); return; }
        setError('');
        setLoading(true);
        try {
            await (verifyEmail as any)({ email: pendingEmail!, code });
            setSuccess(true);
            setTimeout(() => onNavigate('login'), 1500);
        } catch (e: any) {
            setError(e?.message || e?.data || 'Verification failed.');
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (resendTimer > 0) return;
        setResending(true);
        setError('');
        try {
            await (resendCode as any)({ email: pendingEmail! });
            setResendTimer(120); // 2 minute cooldown
        } catch (e: any) {
            setError(e?.message || e?.data || 'Failed to resend.');
            // If the error contains a remaining time, try to parse it
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
            <View style={styles.content}>
                <View style={styles.iconBox}>
                    <Mail color={colors.primary} size={48} />
                </View>
                <Text style={styles.heading}>Verify Your Email</Text>
                <Text style={styles.sub}>
                    We sent a 6-digit code to{'\n'}
                    <Text style={{ color: colors.primary, fontWeight: '700' }}>{pendingEmail}</Text>
                </Text>

                {success ? (
                    <View style={styles.successBox}>
                        <CheckCircle2 color={colors.success} size={24} style={{ marginRight: 8 }} />
                        <Text style={styles.successText}>Email verified! Redirecting to login...</Text>
                    </View>
                ) : (
                    <>
                        {error ? <Text style={styles.error}>{error}</Text> : null}

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

                        <TouchableOpacity style={styles.btn} onPress={handleVerify} disabled={loading}>
                            {loading ? <ActivityIndicator color={isDark ? '#080d18' : colors.card} /> : <Text style={styles.btnText}>Verify</Text>}
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

                        <Text style={styles.hint}>
                            💡 Check your Gmail inbox (including Spam) for the verification code.
                        </Text>
                    </>
                )}

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
    sub: { fontSize: 15, color: colors.textMuted, textAlign: 'center', marginBottom: 36, lineHeight: 24 },
    codeInput: { backgroundColor: colors.inputBg, borderRadius: 16, padding: 20, color: colors.primary, fontSize: 32, fontWeight: 'bold', width: '85%', marginBottom: 24, borderWidth: 2, borderColor: colors.transparentPrimary, letterSpacing: 14 },
    btn: { backgroundColor: colors.primary, borderRadius: 14, padding: 18, alignItems: 'center', width: '85%' },
    btnText: { color: isDark ? '#080d18' : colors.card, fontWeight: 'bold', fontSize: 16 },
    error: { color: colors.danger, fontSize: 13, marginBottom: 20, backgroundColor: 'rgba(239,68,68,0.1)', padding: 14, borderRadius: 12, width: '85%', textAlign: 'center', overflow: 'hidden' },
    link: { textAlign: 'center', color: colors.textMuted, fontSize: 15 },
    hint: { marginTop: 40, color: colors.textMuted, fontSize: 13, textAlign: 'center', fontStyle: 'italic', paddingHorizontal: 20 },
    successBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(34,197,94,0.1)', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)', width: '85%' },
    successText: { color: colors.success, fontSize: 15, fontWeight: '700', textAlign: 'center' },
    backBtn: { position: 'absolute', bottom: 40, flexDirection: 'row', alignItems: 'center' }
});
