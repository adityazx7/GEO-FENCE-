import React, { useState } from 'react';
import {
    StyleSheet, Text, View, TextInput, TouchableOpacity,
    ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { useAction } from 'convex/react';
import { api } from '@backend/_generated/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { User, Building, ArrowLeft } from 'lucide-react-native';

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
    const registerAction = useAction(api.auth.register);
    const { colors, isDark } = useTheme();
    const styles = createStyles(colors, isDark);

    // Shared fields
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [state, setState] = useState('');
    const [city, setCity] = useState('');
    const [motherTongue, setMotherTongue] = useState('');
    const [preferredLanguage, setPreferredLanguage] = useState('');

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
                motherTongue: motherTongue || undefined,
                preferredLanguage: preferredLanguage || undefined,
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
                    <Text style={styles.logo}>CivicSentinel<Text style={{ color: colors.primary }}>AI</Text></Text>
                    <Text style={styles.tagline}>Create Your Account</Text>
                </View>
                <Text style={styles.prompt}>I am a...</Text>
                <TouchableOpacity
                    style={styles.roleCard}
                    onPress={() => { setUserType('citizen'); setStep(2); }}
                    activeOpacity={0.7}
                >
                    <View style={styles.iconBox}>
                        <User color={colors.primary} size={32} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 16 }}>
                        <Text style={styles.roleTitle}>Citizen</Text>
                        <Text style={styles.roleSub}>Track governance initiatives near you</Text>
                    </View>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.roleCard}
                    onPress={() => { setUserType('organization'); setStep(2); }}
                    activeOpacity={0.7}
                >
                    <View style={styles.iconBox}>
                        <Building color={colors.primary} size={32} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 16 }}>
                        <Text style={styles.roleTitle}>Organization</Text>
                        <Text style={styles.roleSub}>NGO, Govt Body, or Private Entity</Text>
                    </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => onNavigate('login')} style={{ marginTop: 30 }}>
                    <Text style={styles.link}>Already have an account? <Text style={{ color: colors.primary, fontWeight: '700' }}>Sign In</Text></Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView style={styles.containerKeyboard} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView contentContainerStyle={{ paddingBottom: 60 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <TouchableOpacity onPress={() => setStep(1)} style={styles.backBtn}>
                    <ArrowLeft color={colors.primary} size={16} />
                    <Text style={styles.backText}>Back to role selection</Text>
                </TouchableOpacity>

                <View style={styles.headingRow}>
                    {userType === 'citizen' ? <User color={colors.text} size={24} /> : <Building color={colors.text} size={24} />}
                    <Text style={styles.heading}>
                        {userType === 'citizen' ? ' Citizen Registration' : ' Organization Registration'}
                    </Text>
                </View>

                {error ? <Text style={styles.error}>{error}</Text> : null}

                {userType === 'citizen' && (
                    <>
                        <Text style={styles.label}>Full Name *</Text>
                        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Your full name" placeholderTextColor={colors.textMuted} />

                        <Text style={styles.label}>Age *</Text>
                        <TextInput style={styles.input} value={age} onChangeText={setAge} placeholder="Your age" placeholderTextColor={colors.textMuted} keyboardType="numeric" />

                        <Text style={styles.label}>Aadhaar Number (Optional)</Text>
                        <TextInput style={styles.input} value={aadhaar} onChangeText={setAadhaar} placeholder="12-digit Aadhaar" placeholderTextColor={colors.textMuted} keyboardType="numeric" maxLength={12} />
                    </>
                )}

                {userType === 'organization' && (
                    <>
                        <Text style={styles.label}>Organization Name *</Text>
                        <TextInput style={styles.input} value={orgName} onChangeText={setOrgName} placeholder="e.g. Green Earth Foundation" placeholderTextColor={colors.textMuted} />

                        <Text style={styles.label}>Organization Type *</Text>
                        <View style={styles.chipRow}>
                            {(['ngo', 'government', 'private', 'trust', 'other'] as const).map((t) => (
                                <TouchableOpacity key={t} style={[styles.chip, orgType === t && styles.chipActive]} onPress={() => setOrgType(t)}>
                                    <Text style={[styles.chipText, orgType === t && { color: isDark ? '#080d18' : colors.card }]}>{t.toUpperCase()}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.label}>Registration Number *</Text>
                        <TextInput style={styles.input} value={orgRegNum} onChangeText={setOrgRegNum} placeholder="Govt registration ID" placeholderTextColor={colors.textMuted} />

                        <Text style={styles.label}>Contact Person Name *</Text>
                        <TextInput style={styles.input} value={orgContact} onChangeText={setOrgContact} placeholder="Authorized contact" placeholderTextColor={colors.textMuted} />

                        <Text style={styles.label}>Website (Optional)</Text>
                        <TextInput style={styles.input} value={orgWebsite} onChangeText={setOrgWebsite} placeholder="https://..." placeholderTextColor={colors.textMuted} keyboardType="url" autoCapitalize="none" />

                        <Text style={styles.label}>Description (Optional)</Text>
                        <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} value={orgDesc} onChangeText={setOrgDesc} placeholder="What does your organization do?" placeholderTextColor={colors.textMuted} multiline />
                    </>
                )}

                <View style={styles.divider} />

                <Text style={styles.label}>Email *</Text>
                <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor={colors.textMuted} keyboardType="email-address" autoCapitalize="none" />

                <Text style={styles.label}>State *</Text>
                <TouchableOpacity style={styles.input} onPress={() => setShowStates(!showStates)} activeOpacity={0.8}>
                    <Text style={{ color: state ? colors.text : colors.textMuted, fontSize: 15 }}>{state || 'Select your state'}</Text>
                </TouchableOpacity>
                {showStates && (
                    <View style={styles.stateList}>
                        <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                            {INDIAN_STATES.map((s) => (
                                <TouchableOpacity key={s} style={styles.stateItem} onPress={() => { setState(s); setShowStates(false); }}>
                                    <Text style={{ color: colors.text, fontSize: 14 }}>{s}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}

                <Text style={styles.label}>{userType === 'organization' ? 'City (Optional)' : 'City *'}</Text>
                <TextInput style={styles.input} value={city} onChangeText={setCity} placeholder="Your city" placeholderTextColor={colors.textMuted} />

                <Text style={styles.label}>Mother Tongue (Optional)</Text>
                <TextInput style={styles.input} value={motherTongue} onChangeText={setMotherTongue} placeholder="e.g. Marathi" placeholderTextColor={colors.textMuted} />

                <Text style={styles.label}>Preferred Notification Language (Optional)</Text>
                <TextInput style={styles.input} value={preferredLanguage} onChangeText={setPreferredLanguage} placeholder="e.g. Hindi, English" placeholderTextColor={colors.textMuted} />

                <Text style={styles.label}>Password *</Text>
                <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Min 6 characters" placeholderTextColor={colors.textMuted} secureTextEntry />

                <Text style={styles.label}>Confirm Password *</Text>
                <TextInput style={styles.input} value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Confirm password" placeholderTextColor={colors.textMuted} secureTextEntry />

                <TouchableOpacity style={styles.btn} onPress={handleRegister} disabled={loading}>
                    {loading ? <ActivityIndicator color={isDark ? '#080d18' : colors.card} /> : <Text style={styles.btnText}>Create Account</Text>}
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, padding: 20, justifyContent: 'center' },
    containerKeyboard: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 20, paddingTop: 60 },
    logoBox: { alignItems: 'center', marginBottom: 50 },
    logo: { fontSize: 28, fontWeight: 'bold', color: colors.text },
    tagline: { fontSize: 13, color: colors.textMuted, marginTop: 4, letterSpacing: 0.5 },
    prompt: { fontSize: 18, color: colors.text, fontWeight: '700', marginBottom: 20, textAlign: 'center' },
    roleCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: colors.transparentBorder, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
    iconBox: { width: 60, height: 60, borderRadius: 16, backgroundColor: colors.transparentPrimary, alignItems: 'center', justifyContent: 'center' },
    roleTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 4 },
    roleSub: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },
    headingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, marginTop: 8 },
    heading: { fontSize: 22, fontWeight: 'bold', color: colors.text, marginLeft: 8 },
    backBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, padding: 8, alignSelf: 'flex-start' },
    backText: { color: colors.primary, fontSize: 14, fontWeight: '600', marginLeft: 6 },
    label: { fontSize: 12, color: colors.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1, fontWeight: '600' },
    input: { backgroundColor: colors.inputBg, borderRadius: 14, padding: 16, color: colors.text, fontSize: 15, marginBottom: 16, borderWidth: 1, borderColor: colors.transparentBorder },
    btn: { backgroundColor: colors.primary, borderRadius: 14, padding: 18, alignItems: 'center', marginTop: 12 },
    btnText: { color: isDark ? '#080d18' : colors.card, fontWeight: 'bold', fontSize: 16 },
    error: { color: colors.danger, fontSize: 13, marginBottom: 16, backgroundColor: 'rgba(239,68,68,0.1)', padding: 14, borderRadius: 12, overflow: 'hidden' },
    link: { textAlign: 'center', color: colors.textMuted, fontSize: 14 },
    divider: { height: 1, backgroundColor: colors.transparentBorder, marginVertical: 24 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 14 },
    chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24, backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.transparentBorder, marginRight: 8, marginBottom: 8 },
    chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipText: { fontSize: 12, color: colors.textMuted, fontWeight: '700' },
    stateList: { backgroundColor: colors.card, borderRadius: 14, marginBottom: 16, borderWidth: 1, borderColor: colors.transparentPrimary, overflow: 'hidden' },
    stateItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: colors.transparentBorder },
});
