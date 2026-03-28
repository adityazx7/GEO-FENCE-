import React, { useState } from 'react';
import {
    StyleSheet, Text, View, TextInput, TouchableOpacity,
    ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform,
    ViewStyle
} from 'react-native';
import { useAction } from 'convex/react';
import { api } from '@backend/_generated/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { User, Building, ArrowLeft, AtSign, MapPin, Globe, Languages, Phone, FileText, ChevronRight, Check, Lock as LockIcon } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import GlassCard from '../components/GlassCard';
import NeonButton from '../components/NeonButton';

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

    const renderHeader = () => (
        <View style={styles.header}>
            {!step && <View style={[styles.logoIcon, { backgroundColor: `${colors.primary}20` }]}>
                <AtSign color={colors.primary} size={32} />
            </View>}
            <Text style={[styles.logoText, { color: colors.text }]}>
                JanSang <Text style={{ color: colors.primary }}>AI</Text>
            </Text>
            <Text style={[styles.tagline, { color: colors.textMuted }]}>
                Create your digital presence
            </Text>
        </View>
    );

    if (step === 1) {
        return (
            <View style={styles.container}>
                <LinearGradient
                    colors={isDark ? ['#080b14', '#0d1225', '#111833'] : ['#f8fafc', '#e2e8f0', '#cbd5e1']}
                    style={StyleSheet.absoluteFill}
                />
                <View style={styles.centerBox}>
                    {renderHeader()}
                    
                    <Text style={[styles.prompt, { color: colors.text }]}>How will you participate?</Text>
                    
                    <TouchableOpacity
                        style={styles.roleCard}
                        onPress={() => { setUserType('citizen'); setStep(2); }}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={[`${colors.primary}10`, `${colors.primary}05`]}
                            style={StyleSheet.absoluteFill}
                        />
                        <View style={[styles.iconBox, { backgroundColor: `${colors.primary}20` }]}>
                            <User color={colors.primary} size={32} />
                        </View>
                        <View style={{ flex: 1, marginLeft: 16 }}>
                            <Text style={[styles.roleTitle, { color: colors.text }]}>Citizen</Text>
                            <Text style={[styles.roleSub, { color: colors.textMuted }]}>Track governance & report issues</Text>
                        </View>
                        <ChevronRight color={colors.primary} size={20} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.roleCard}
                        onPress={() => { setUserType('organization'); setStep(2); }}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={[`${colors.accent}10`, `${colors.accent}05`]}
                            style={StyleSheet.absoluteFill}
                        />
                        <View style={[styles.iconBox, { backgroundColor: `${colors.accent}20` }]}>
                            <Building color={colors.accent} size={32} />
                        </View>
                        <View style={{ flex: 1, marginLeft: 16 }}>
                            <Text style={[styles.roleTitle, { color: colors.text }]}>Organization</Text>
                            <Text style={[styles.roleSub, { color: colors.textMuted }]}>NGO, Govt Body, or Entity</Text>
                        </View>
                        <ChevronRight color={colors.accent} size={20} />
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => onNavigate('login')} style={styles.footer}>
                        <Text style={[styles.footerText, { color: colors.textMuted }]}>
                            Already have an account? <Text style={{ color: colors.primary, fontWeight: '700' }}>Sign In</Text>
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

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
                    <TouchableOpacity onPress={() => setStep(1)} style={styles.backBtn}>
                        <ArrowLeft color={colors.primary} size={18} />
                        <Text style={[styles.backText, { color: colors.primary }]}>Change Role</Text>
                    </TouchableOpacity>

                    <GlassCard intensity={isDark ? 30 : 50} style={styles.card as ViewStyle}>
                        <View style={styles.formHeader}>
                            <View style={[styles.roleIndicator, { backgroundColor: userType === 'citizen' ? `${colors.primary}20` : `${colors.accent}20` }]}>
                                {userType === 'citizen' ? <User color={colors.primary} size={20} /> : <Building color={colors.accent} size={20} />}
                            </View>
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={[styles.heading, { color: colors.text }]}>
                                    {userType === 'citizen' ? 'Citizen Account' : 'Org Account'}
                                </Text>
                                <Text style={[styles.sub, { color: colors.textMuted }]}>Fill in your details below</Text>
                            </View>
                        </View>

                        {error ? (
                            <View style={[styles.errorBox, { backgroundColor: `${colors.danger}15` }]}>
                                <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
                            </View>
                        ) : null}

                        {userType === 'citizen' && (
                            <>
                                <InputGroup label="Full Name *" icon={<User color={colors.textMuted} size={20} />} colors={colors}>
                                    <TextInput style={[styles.input, { color: colors.text }]} value={name} onChangeText={setName} placeholder="Your full name" placeholderTextColor={colors.textMuted} />
                                </InputGroup>

                                <View style={{ flexDirection: 'row', gap: 16 }}>
                                    <View style={{ flex: 1 }}>
                                        <InputGroup label="Age *" icon={<FileText color={colors.textMuted} size={20} />} colors={colors}>
                                            <TextInput style={[styles.input, { color: colors.text }]} value={age} onChangeText={setAge} placeholder="Age" placeholderTextColor={colors.textMuted} keyboardType="numeric" />
                                        </InputGroup>
                                    </View>
                                    <View style={{ flex: 2 }}>
                                        <InputGroup label="Aadhaar ID" icon={<Check color={colors.textMuted} size={20} />} colors={colors}>
                                            <TextInput style={[styles.input, { color: colors.text }]} value={aadhaar} onChangeText={setAadhaar} placeholder="12 digits" placeholderTextColor={colors.textMuted} keyboardType="numeric" maxLength={12} />
                                        </InputGroup>
                                    </View>
                                </View>
                            </>
                        )}

                        {userType === 'organization' && (
                            <>
                                <InputGroup label="Organization Name *" icon={<Building color={colors.textMuted} size={20} />} colors={colors}>
                                    <TextInput style={[styles.input, { color: colors.text }]} value={orgName} onChangeText={setOrgName} placeholder="e.g. NGO Name" placeholderTextColor={colors.textMuted} />
                                </InputGroup>

                                <Text style={[styles.label, { color: colors.textMuted }]}>Organization Type *</Text>
                                <View style={styles.chipRow}>
                                    {(['ngo', 'government', 'private', 'trust', 'other'] as const).map((t) => (
                                        <TouchableOpacity 
                                            key={t} 
                                            style={[
                                                styles.chip, 
                                                { backgroundColor: colors.inputBg },
                                                orgType === t && { backgroundColor: colors.accent, borderColor: colors.accent }
                                            ]} 
                                            onPress={() => setOrgType(t)}
                                        >
                                            <Text style={[styles.chipText, { color: orgType === t ? '#fff' : colors.textMuted }]}>{t.toUpperCase()}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                <InputGroup label="Registration ID *" icon={<FileText color={colors.textMuted} size={20} />} colors={colors}>
                                    <TextInput style={[styles.input, { color: colors.text }]} value={orgRegNum} onChangeText={setOrgRegNum} placeholder="Govt ID No." placeholderTextColor={colors.textMuted} />
                                </InputGroup>

                                <InputGroup label="Contact Person *" icon={<User color={colors.textMuted} size={20} />} colors={colors}>
                                    <TextInput style={[styles.input, { color: colors.text }]} value={orgContact} onChangeText={setOrgContact} placeholder="Authorized name" placeholderTextColor={colors.textMuted} />
                                </InputGroup>
                            </>
                        )}

                        <View style={styles.divider} />

                        <InputGroup label="Email Address *" icon={<AtSign color={colors.textMuted} size={20} />} colors={colors}>
                            <TextInput style={[styles.input, { color: colors.text }]} value={email} onChangeText={setEmail} placeholder="you@domain.com" placeholderTextColor={colors.textMuted} keyboardType="email-address" autoCapitalize="none" />
                        </InputGroup>

                        <View style={{ flexDirection: 'row', gap: 16 }}>
                            <View style={{ flex: 1 }}>
                                <InputGroup label="State *" icon={<MapPin color={colors.textMuted} size={20} />} colors={colors}>
                                    <TouchableOpacity style={styles.inputStyleOnly} onPress={() => setShowStates(!showStates)}>
                                        <Text style={{ color: state ? colors.text : colors.textMuted }}>{state || 'Select'}</Text>
                                    </TouchableOpacity>
                                </InputGroup>
                            </View>
                            <View style={{ flex: 1 }}>
                                <InputGroup label="City" icon={<Globe color={colors.textMuted} size={20} />} colors={colors}>
                                    <TextInput style={[styles.input, { color: colors.text }]} value={city} onChangeText={setCity} placeholder="City" placeholderTextColor={colors.textMuted} />
                                </InputGroup>
                            </View>
                        </View>

                        {showStates && (
                            <GlassCard intensity={80} style={styles.stateList as ViewStyle}>
                                <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                                    {INDIAN_STATES.map((s) => (
                                        <TouchableOpacity key={s} style={styles.stateItem} onPress={() => { setState(s); setShowStates(false); }}>
                                            <Text style={{ color: colors.text }}>{s}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </GlassCard>
                        )}

                        <InputGroup label="Password *" icon={<LockIcon color={colors.textMuted} size={20} />} colors={colors}>
                            <TextInput style={[styles.input, { color: colors.text }]} value={password} onChangeText={setPassword} placeholder="Min 6 characters" placeholderTextColor={colors.textMuted} secureTextEntry />
                        </InputGroup>

                        <InputGroup label="Confirm Password *" icon={<LockIcon color={colors.textMuted} size={20} />} colors={colors}>
                            <TextInput style={[styles.input, { color: colors.text }]} value={confirmPassword} onChangeText={setConfirmPassword} placeholder="••••••••" placeholderTextColor={colors.textMuted} secureTextEntry />
                        </InputGroup>

                        <NeonButton
                            title="Create Account"
                            onPress={handleRegister}
                            variant={userType === 'organization' ? 'accent' : 'primary'}
                            size="large"
                            style={{ marginTop: 12 }}
                            icon={loading ? <ActivityIndicator color="#fff" /> : <ChevronRight color="#fff" size={20} />}
                        />
                    </GlassCard>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

function InputGroup({ label, icon, children, colors }: any) {
    return (
        <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
            <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg }]}>
                {icon && <View style={styles.inputIcon}>{icon}</View>}
                {children}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    centerBox: { flex: 1, justifyContent: 'center', padding: 24 },
    scroll: { flexGrow: 1, padding: 24, paddingTop: 60 },
    header: { alignItems: 'center', marginBottom: 40 },
    logoIcon: { width: 64, height: 64, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    logoText: { fontSize: 32, fontWeight: '900', letterSpacing: -1 },
    tagline: { fontSize: 13, fontWeight: '500', marginTop: 4, letterSpacing: 0.2 },
    prompt: { fontSize: 20, fontWeight: '800', marginBottom: 24, textAlign: 'center' },
    roleCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 24,
        padding: 24,
        marginBottom: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    iconBox: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    roleTitle: { fontSize: 18, fontWeight: '800', marginBottom: 4 },
    roleSub: { fontSize: 13, fontWeight: '500' },
    backBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, paddingVertical: 8 },
    backText: { fontSize: 15, fontWeight: '700', marginLeft: 8 },
    card: { padding: 24 },
    formHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
    roleIndicator: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    heading: { fontSize: 20, fontWeight: '800' },
    sub: { fontSize: 13, marginTop: 2 },
    inputGroup: { marginBottom: 16 },
    label: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.8 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, paddingHorizontal: 16, height: 52, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    inputIcon: { marginRight: 12 },
    input: { flex: 1, fontSize: 15, fontWeight: '500' },
    inputStyleOnly: { flex: 1, justifyContent: 'center' },
    errorBox: { padding: 12, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,75,92,0.2)' },
    errorText: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
    divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 20 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    chipText: { fontSize: 11, fontWeight: '700' },
    stateList: { position: 'absolute', top: 120, left: 24, right: 24, zIndex: 100, padding: 8 },
    stateItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    footer: { marginTop: 32, alignItems: 'center' },
    footerText: { fontSize: 14, fontWeight: '500' },
});
