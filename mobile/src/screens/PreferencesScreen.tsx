import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Switch, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@backend/_generated/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { ChevronLeft, Bell, MapPin, Filter, Globe, Save, User, ShieldCheck } from 'lucide-react-native';

interface PreferencesScreenProps {
    onBack: () => void;
}

export default function PreferencesScreen({ onBack }: PreferencesScreenProps) {
    const { user, login } = useAuth();
    const { colors, isDark } = useTheme();
    const styles = createStyles(colors, isDark);

    const updatePrefs = useMutation(api.users.updatePreferences);
    const syncUser = useMutation(api.users.syncUser); // Using this for profile info updates if needed, or we might need a dedicated one

    const [loading, setLoading] = useState(false);
    
    // State for Preferences
    const [frequency, setFrequency] = useState(user?.notificationFrequency || '1h');
    const [radius, setRadius] = useState(user?.notificationRadius || 500);
    const [selectedTypes, setSelectedTypes] = useState<string[]>(user?.notificationTypes || ["planned", "in_progress", "completed"]);
    
    // State for Profile Info
    const [name, setName] = useState(user?.name || '');
    const [language, setLanguage] = useState(user?.preferredLanguage || 'English');

    const frequencies = [
        { label: '1 Hour', value: '1h' },
        { label: '12 Hours', value: '12h' },
        { label: '1 Day', value: '1d' },
        { label: 'Always', value: 'always' },
    ];

    const radii = [100, 300, 500];

    const projectTypes = [
        { label: 'Planned', value: 'planned' },
        { label: 'In Progress', value: 'in_progress' },
        { label: 'Completed', value: 'completed' },
        { label: 'Delayed', value: 'delayed' },
    ];

    const toggleType = (type: string) => {
        if (selectedTypes.includes(type)) {
            setSelectedTypes(selectedTypes.filter(t => t !== type));
        } else {
            setSelectedTypes([...selectedTypes, type]);
        }
    };

    const handleSave = async () => {
        if (!user?._id) return;
        setLoading(true);
        try {
            // 1. Update Notification Preferences
            await updatePrefs({
                userId: user._id, 
                notificationFrequency: frequency as any,
                notificationRadius: radius,
                notificationTypes: selectedTypes,
                name: name,
                preferredLanguage: language,
            });

            // 2. Refresh Local Auth Context
            if (user) {
                const updatedUser = {
                    ...user,
                    name: name,
                    preferredLanguage: language,
                    notificationFrequency: frequency as any,
                    notificationRadius: radius,
                    notificationTypes: selectedTypes,
                };
                login(updatedUser);
            }
            
            Alert.alert('Success', 'Settings updated successfully!');
            onBack();
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to save settings. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backBtn}>
                    <ChevronLeft color={colors.text} size={24} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Settings & Privacy</Text>
                <TouchableOpacity onPress={handleSave} disabled={loading} style={styles.saveBtn}>
                    {loading ? <ActivityIndicator size="small" color={colors.primary} /> : <Save color={colors.primary} size={20} />}
                </TouchableOpacity>
            </View>

            <ScrollView 
                showsVerticalScrollIndicator={false} 
                contentContainerStyle={{ paddingBottom: 120 }}
                style={{ flex: 1 }}
            >
                
                {/* Profile Customization Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <User color={colors.primary} size={18} />
                        <Text style={styles.sectionTitle}>Profile Customization</Text>
                    </View>
                    
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Display Name</Text>
                        <TextInput 
                            style={styles.input} 
                            value={name} 
                            onChangeText={setName} 
                            placeholder="Enter your name"
                            placeholderTextColor={colors.textMuted}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Preferred Language</Text>
                        <TextInput 
                            style={styles.input} 
                            value={language} 
                            onChangeText={setLanguage} 
                            placeholder="e.g. Marathi, Hindi, English"
                            placeholderTextColor={colors.textMuted}
                        />
                    </View>
                </View>

                {/* Notifications Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Bell color={colors.primary} size={18} />
                        <Text style={styles.sectionTitle}>Notification Frequency</Text>
                    </View>
                    <Text style={styles.sectionDesc}>Choose how often you want to receive push alerts for nearby projects.</Text>
                    
                    <View style={styles.pillGrid}>
                        {frequencies.map((f) => (
                            <TouchableOpacity 
                                key={f.value}
                                style={[styles.pill, frequency === f.value && styles.pillActive]}
                                onPress={() => setFrequency(f.value as any)}
                            >
                                <Text style={[styles.pillText, frequency === f.value && styles.pillTextActive]}>{f.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Radius Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <MapPin color={colors.primary} size={18} />
                        <Text style={styles.sectionTitle}>Geofence Radius</Text>
                    </View>
                    <Text style={styles.sectionDesc}>Set the distance within which you'll be notified of infrastructure work.</Text>
                    
                    <View style={styles.radiusRow}>
                        {radii.map((r) => (
                            <TouchableOpacity 
                                key={r}
                                style={[styles.radiusBtn, radius === r && styles.radiusBtnActive]}
                                onPress={() => setRadius(r)}
                            >
                                <Text style={[styles.radiusText, radius === r && styles.radiusTextActive]}>{r}m</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Filters Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Filter color={colors.primary} size={18} />
                        <Text style={styles.sectionTitle}>Work Status Filters</Text>
                    </View>
                    <Text style={styles.sectionDesc}>Only notify me about projects with these status types.</Text>
                    
                    {projectTypes.map((type) => (
                        <View key={type.value} style={styles.filterRow}>
                            <Text style={styles.filterLabel}>{type.label}</Text>
                            <Switch 
                                trackColor={{ false: colors.inputBg, true: colors.primary + '30' }}
                                thumbColor={selectedTypes.includes(type.value) ? colors.primary : colors.textMuted}
                                onValueChange={() => toggleType(type.value)}
                                value={selectedTypes.includes(type.value)}
                            />
                        </View>
                    ))}
                </View>

                {/* Privacy Badge */}
                <View style={styles.privacyCard}>
                    <ShieldCheck color={colors.success} size={20} />
                    <Text style={styles.privacyText}>Your location data is processed locally and never shared with third parties.</Text>
                </View>

            </ScrollView>
        </View>
    );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 20 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 60, marginBottom: 20 },
    backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.transparentBorder },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text },
    saveBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.transparentBorder },
    
    section: { marginBottom: 24, backgroundColor: colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.transparentBorder },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: colors.text, marginLeft: 10 },
    sectionDesc: { fontSize: 12, color: colors.textMuted, marginBottom: 16, lineHeight: 18 },
    
    inputGroup: { marginBottom: 16 },
    label: { fontSize: 12, color: colors.textMuted, marginBottom: 8, fontWeight: '600', textTransform: 'uppercase' },
    input: { backgroundColor: colors.inputBg, borderRadius: 10, padding: 12, color: colors.text, borderWidth: 1, borderColor: colors.transparentBorder },
    
    pillGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    pill: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.transparentBorder },
    pillActive: { backgroundColor: colors.transparentPrimary, borderColor: colors.primary },
    pillText: { fontSize: 13, color: colors.textMuted, fontWeight: '500' },
    pillTextActive: { color: colors.primary, fontWeight: 'bold' },
    
    radiusRow: { flexDirection: 'row', gap: 12 },
    radiusBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: colors.inputBg, alignItems: 'center', borderWidth: 1, borderColor: colors.transparentBorder },
    radiusBtnActive: { backgroundColor: colors.transparentPrimary, borderColor: colors.primary },
    radiusText: { fontSize: 14, color: colors.textMuted, fontWeight: '600' },
    radiusTextActive: { color: colors.primary, fontWeight: 'bold' },
    
    filterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.transparentBorder },
    filterLabel: { fontSize: 14, color: colors.text },
    
    privacyCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.success + '10', padding: 16, borderRadius: 12, gap: 12, borderWidth: 1, borderColor: colors.success + '20' },
    privacyText: { flex: 1, fontSize: 11, color: colors.success, lineHeight: 16, fontWeight: '500' },
});
