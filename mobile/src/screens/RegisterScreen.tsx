import React, { useState } from 'react';
import {
    StyleSheet, Text, View, TextInput, TouchableOpacity,
    ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { useAction } from 'convex/react';
import { useAuth } from '../context/AuthContext';

const INDIAN_STATES = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
    "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
    "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
    "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
    "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
    "Uttar Pradesh", "Uttarakhand", "West Bengal",
    "Delhi", "Jammu & Kashmir", "Ladakh", "Puducherry", "Chandigarh"
];

type UserType = 'citizen' | 'organization' | null;

export default function RegisterScreen({ onNavigate }: { onNavigate: (screen: string) => void }) {
    const [step, setStep] = useState<1 | 2>(1);
    const [userType, setUserType] = useState<UserType>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showStates, setShowStates] = useState(false);
    const { setPendingEmail } = useAuth();
    const registerAction = useAction('auth:register' as any);

    // Shared fields
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [state, setState] = useState('');
    const [city, setCity] = useState('');

    // Citizen fields
    const [name, setName] = useState('');
    const [age, setAge] = useState('');
    const [aadhaar, setAadhaar] = useState('');

    // Org fields
    const [orgName, setOrgName] = useState('');
    const [orgType, setOrgType] = useState<'ngo' | 'government' | 'private' | 'trust' | 'other'>('ngo');
    const [orgRegNum, setOrgRegNum] = useState('');
    const [orgContact, setOrgContact] = useState('');
    const [orgWebsite, setOrgWebsite] = useState('');
    const [orgDesc, setOrgDesc] = useState('');

    const handleRegister = async () => {
        if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
        if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
        if (!email || !state) { setError('Please fill all required fields.'); return; }
        if (userType === 'citizen' && (!name || !age)) { setError('Name and Age are required.'); return; }
        if (userType === 'organization' && (!orgName || !orgRegNum || !orgContact)) { setError('Org Name, Registration Number, and Contact Person are required.'); return; }

        setError('');
        setLoading(true);
        try {
            await (registerAction as any)({
                name: userType === 'citizen' ? name : orgContact,
                email: email.trim().toLowerCase(),
                password,
                userType: userType!,
                state,
                city: city || undefined,
                age: userType === 'citizen' ? parseInt(age) : undefined,
                aadhaar: aadhaar || undefined,
                orgName: orgName || undefined,
                orgType: userType === 'organization' ? orgType : undefined,
                orgRegistrationNumber: orgRegNum || undefined,
                orgContactPerson: orgContact || undefined,
                orgWebsite: orgWebsite || undefined,
                orgDescription: orgDesc || undefined,
            });
            setPendingEmail(email.trim().toLowerCase());
            onNavigate('verify');
        } catch (e: any) {
            setError(e?.message || e?.data || 'Registration failed.');
        } finally {
            setLoading(false);
        }
    };

    if (step === 1) {
        return (
            <View style={styles.container}>
                <View style={styles.logoBox}>
                    <Text style={styles.logo}>CivicSentinel<Text style={{ color: '#00d4ff' }}>AI</Text></Text>
                    <Text style={styles.tagline}>Create Your Account</Text>
                </View>
                <Text style={styles.prompt}>I am a...</Text>
                <TouchableOpacity
                    style={styles.roleCard}
                    onPress={() => { setUserType('citizen'); setStep(2); }}
                >
                    <Text style={styles.roleEmoji}>🧑‍💼</Text>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.roleTitle}>Citizen</Text>
                        <Text style={styles.roleSub}>Track governance initiatives near you</Text>
                    </View>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.roleCard}
                    onPress={() => { setUserType('organization'); setStep(2); }}
                >
                    <Text style={styles.roleEmoji}>🏛️</Text>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.roleTitle}>Organization</Text>
                        <Text style={styles.roleSub}>NGO, Govt Body, or Private Entity</Text>
                    </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => onNavigate('login')} style={{ marginTop: 30 }}>
                    <Text style={styles.link}>Already have an account? <Text style={{ color: '#00d4ff', fontWeight: '600' }}>Sign In</Text></Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
                <TouchableOpacity onPress={() => setStep(1)} style={{ marginBottom: 20 }}>
                    <Text style={{ color: '#00d4ff', fontSize: 14 }}>← Back to role selection</Text>
                </TouchableOpacity>

                <Text style={styles.heading}>
                    {userType === 'citizen' ? '🧑‍💼 Citizen Registration' : '🏛️ Organization Registration'}
                </Text>

                {error ? <Text style={styles.error}>{error}</Text> : null}

                {userType === 'citizen' && (
                    <>
                        <Text style={styles.label}>Full Name *</Text>
                        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Your full name" placeholderTextColor="#4b5563" />

                        <Text style={styles.label}>Age *</Text>
                        <TextInput style={styles.input} value={age} onChangeText={setAge} placeholder="Your age" placeholderTextColor="#4b5563" keyboardType="numeric" />

                        <Text style={styles.label}>Aadhaar Number (Optional)</Text>
                        <TextInput style={styles.input} value={aadhaar} onChangeText={setAadhaar} placeholder="12-digit Aadhaar" placeholderTextColor="#4b5563" keyboardType="numeric" maxLength={12} />
                    </>
                )}

                {userType === 'organization' && (
                    <>
                        <Text style={styles.label}>Organization Name *</Text>
                        <TextInput style={styles.input} value={orgName} onChangeText={setOrgName} placeholder="e.g. Green Earth Foundation" placeholderTextColor="#4b5563" />

                        <Text style={styles.label}>Organization Type *</Text>
                        <View style={styles.chipRow}>
                            {(['ngo', 'government', 'private', 'trust', 'other'] as const).map((t) => (
                                <TouchableOpacity key={t} style={[styles.chip, orgType === t && styles.chipActive]} onPress={() => setOrgType(t)}>
                                    <Text style={[styles.chipText, orgType === t && { color: '#080d18' }]}>{t.toUpperCase()}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.label}>Registration Number *</Text>
                        <TextInput style={styles.input} value={orgRegNum} onChangeText={setOrgRegNum} placeholder="Govt registration ID" placeholderTextColor="#4b5563" />

                        <Text style={styles.label}>Contact Person Name *</Text>
                        <TextInput style={styles.input} value={orgContact} onChangeText={setOrgContact} placeholder="Authorized contact" placeholderTextColor="#4b5563" />

                        <Text style={styles.label}>Website (Optional)</Text>
                        <TextInput style={styles.input} value={orgWebsite} onChangeText={setOrgWebsite} placeholder="https://..." placeholderTextColor="#4b5563" keyboardType="url" />

                        <Text style={styles.label}>Description (Optional)</Text>
                        <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} value={orgDesc} onChangeText={setOrgDesc} placeholder="What does your organization do?" placeholderTextColor="#4b5563" multiline />
                    </>
                )}

                <View style={styles.divider} />

                <Text style={styles.label}>Email *</Text>
                <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor="#4b5563" keyboardType="email-address" autoCapitalize="none" />

                <Text style={styles.label}>State *</Text>
                <TouchableOpacity style={styles.input} onPress={() => setShowStates(!showStates)}>
                    <Text style={{ color: state ? '#f3f4f6' : '#4b5563', fontSize: 15 }}>{state || 'Select your state'}</Text>
                </TouchableOpacity>
                {showStates && (
                    <View style={styles.stateList}>
                        <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                            {INDIAN_STATES.map((s) => (
                                <TouchableOpacity key={s} style={styles.stateItem} onPress={() => { setState(s); setShowStates(false); }}>
                                    <Text style={{ color: '#e5e7eb', fontSize: 14 }}>{s}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}

                <Text style={styles.label}>{userType === 'organization' ? 'City (Optional)' : 'City *'}</Text>
                <TextInput style={styles.input} value={city} onChangeText={setCity} placeholder="Your city" placeholderTextColor="#4b5563" />

                <Text style={styles.label}>Password *</Text>
                <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Min 6 characters" placeholderTextColor="#4b5563" secureTextEntry />

                <Text style={styles.label}>Confirm Password *</Text>
                <TextInput style={styles.input} value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Confirm password" placeholderTextColor="#4b5563" secureTextEntry />

                <TouchableOpacity style={styles.btn} onPress={handleRegister} disabled={loading}>
                    {loading ? <ActivityIndicator color="#080d18" /> : <Text style={styles.btnText}>Create Account</Text>}
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0a0f1e', padding: 20, paddingTop: 60 },
    logoBox: { alignItems: 'center', marginBottom: 40 },
    logo: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
    tagline: { fontSize: 13, color: '#6b7280', marginTop: 4 },
    prompt: { fontSize: 18, color: '#e5e7eb', fontWeight: '600', marginBottom: 20, textAlign: 'center' },
    roleCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111827', borderRadius: 16, padding: 20, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
    roleEmoji: { fontSize: 32, marginRight: 16 },
    roleTitle: { fontSize: 17, fontWeight: 'bold', color: '#f3f4f6' },
    roleSub: { fontSize: 12, color: '#6b7280', marginTop: 2 },
    heading: { fontSize: 20, fontWeight: 'bold', color: '#f3f4f6', marginBottom: 20 },
    label: { fontSize: 11, color: '#9ca3af', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 },
    input: { backgroundColor: '#1f2937', borderRadius: 12, padding: 14, color: '#f3f4f6', fontSize: 15, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
    btn: { backgroundColor: '#00d4ff', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 12 },
    btnText: { color: '#080d18', fontWeight: 'bold', fontSize: 16 },
    error: { color: '#ef4444', fontSize: 13, marginBottom: 16, backgroundColor: 'rgba(239,68,68,0.1)', padding: 12, borderRadius: 10 },
    link: { textAlign: 'center', color: '#9ca3af', fontSize: 14 },
    divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginVertical: 20 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 14 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#1f2937', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginRight: 8, marginBottom: 8 },
    chipActive: { backgroundColor: '#00d4ff', borderColor: '#00d4ff' },
    chipText: { fontSize: 11, color: '#9ca3af', fontWeight: '600' },
    stateList: { backgroundColor: '#1f2937', borderRadius: 12, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(0,212,255,0.2)' },
    stateItem: { padding: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
});
