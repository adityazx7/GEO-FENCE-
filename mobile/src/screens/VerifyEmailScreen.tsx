import React, { useState } from 'react';
import {
    StyleSheet, Text, View, TextInput, TouchableOpacity,
    KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import { useMutation, useAction } from 'convex/react';
import { useAuth } from '../context/AuthContext';

export default function VerifyEmailScreen({ onNavigate }: { onNavigate: (screen: string) => void }) {
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [success, setSuccess] = useState(false);
    const { pendingEmail } = useAuth();
    const verifyEmail = useMutation('authHelpers:verifyEmail' as any);
    const resendCode = useAction('auth:resendCode' as any);

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
        setResending(true);
        setError('');
        try {
            await (resendCode as any)({ email: pendingEmail! });
        } catch (e: any) {
            setError(e?.message || e?.data || 'Failed to resend.');
        } finally {
            setResending(false);
        }
    };

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={styles.content}>
                <Text style={styles.emoji}>📧</Text>
                <Text style={styles.heading}>Verify Your Email</Text>
                <Text style={styles.sub}>
                    We sent a 6-digit code to{'\n'}
                    <Text style={{ color: '#00d4ff', fontWeight: '600' }}>{pendingEmail}</Text>
                </Text>

                {success ? (
                    <View style={styles.successBox}>
                        <Text style={styles.successText}>✅ Email verified! Redirecting to login...</Text>
                    </View>
                ) : (
                    <>
                        {error ? <Text style={styles.error}>{error}</Text> : null}

                        <TextInput
                            style={styles.codeInput}
                            value={code}
                            onChangeText={setCode}
                            placeholder="000000"
                            placeholderTextColor="#374151"
                            keyboardType="number-pad"
                            maxLength={6}
                            textAlign="center"
                        />

                        <TouchableOpacity style={styles.btn} onPress={handleVerify} disabled={loading}>
                            {loading ? <ActivityIndicator color="#080d18" /> : <Text style={styles.btnText}>Verify</Text>}
                        </TouchableOpacity>

                        <TouchableOpacity onPress={handleResend} disabled={resending} style={{ marginTop: 20 }}>
                            <Text style={styles.link}>
                                {resending ? 'Sending...' : "Didn't get the code? "}<Text style={{ color: '#00d4ff' }}>Resend</Text>
                            </Text>
                        </TouchableOpacity>

                        <Text style={styles.hint}>
                            💡 For demo: Check the Convex dashboard logs for the verification code.
                        </Text>
                    </>
                )}

                <TouchableOpacity onPress={() => onNavigate('login')} style={{ marginTop: 30 }}>
                    <Text style={styles.link}>← Back to Login</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0a0f1e' },
    content: { flex: 1, justifyContent: 'center', padding: 24, alignItems: 'center' },
    emoji: { fontSize: 48, marginBottom: 20 },
    heading: { fontSize: 24, fontWeight: 'bold', color: '#f3f4f6', marginBottom: 8 },
    sub: { fontSize: 14, color: '#9ca3af', textAlign: 'center', marginBottom: 30, lineHeight: 22 },
    codeInput: { backgroundColor: '#1f2937', borderRadius: 16, padding: 20, color: '#00d4ff', fontSize: 32, fontWeight: 'bold', width: '80%', marginBottom: 20, borderWidth: 2, borderColor: 'rgba(0,212,255,0.2)', letterSpacing: 12 },
    btn: { backgroundColor: '#00d4ff', borderRadius: 12, padding: 16, alignItems: 'center', width: '80%' },
    btnText: { color: '#080d18', fontWeight: 'bold', fontSize: 16 },
    error: { color: '#ef4444', fontSize: 13, marginBottom: 16, backgroundColor: 'rgba(239,68,68,0.1)', padding: 12, borderRadius: 10, width: '80%', textAlign: 'center' },
    link: { textAlign: 'center', color: '#9ca3af', fontSize: 14 },
    hint: { marginTop: 24, color: '#374151', fontSize: 12, textAlign: 'center', fontStyle: 'italic' },
    successBox: { backgroundColor: 'rgba(34,197,94,0.1)', padding: 20, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)', width: '80%' },
    successText: { color: '#22c55e', fontSize: 15, fontWeight: '600', textAlign: 'center' },
});
