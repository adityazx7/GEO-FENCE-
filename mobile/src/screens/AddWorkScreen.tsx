import React, { useState, useEffect } from 'react';
import {
    StyleSheet, Text, View, TextInput, TouchableOpacity,
    ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Alert
} from 'react-native';
import * as Location from 'expo-location';
import { useMutation } from 'convex/react';
import { useAuth } from '../context/AuthContext';

const SECTORS = [
    { key: 'hospital', label: 'Healthcare', emoji: '🏥' },
    { key: 'road', label: 'Roads', emoji: '🛣️' },
    { key: 'bridge', label: 'Bridge', emoji: '🌉' },
    { key: 'school', label: 'Education', emoji: '🎓' },
    { key: 'metro', label: 'Metro', emoji: '🚇' },
    { key: 'college', label: 'College', emoji: '🏛️' },
    { key: 'government_office', label: 'Govt Office', emoji: '🏢' },
    { key: 'other', label: 'Other', emoji: '📋' },
];

const STATUSES = [
    { key: 'completed', label: 'Completed', color: '#22c55e' },
    { key: 'in_progress', label: 'In Progress', color: '#f59e0b' },
];

export default function AddWorkScreen({ onDone }: { onDone: () => void }) {
    const { user } = useAuth();
    const createWork = useMutation('projects:createWork' as any);

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [areaImpact, setAreaImpact] = useState('');
    const [sector, setSector] = useState('road');
    const [status, setStatus] = useState('completed');
    const [budget, setBudget] = useState('');
    const [lat, setLat] = useState('');
    const [lng, setLng] = useState('');
    const [address, setAddress] = useState('');
    const [beforeImageUrls, setBeforeImageUrls] = useState('');
    const [afterImageUrls, setAfterImageUrls] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Auto-fill GPS coordinates
    useEffect(() => {
        (async () => {
            try {
                const { status: perm } = await Location.requestForegroundPermissionsAsync();
                if (perm === 'granted') {
                    const loc = await Location.getCurrentPositionAsync({});
                    setLat(loc.coords.latitude.toFixed(6));
                    setLng(loc.coords.longitude.toFixed(6));
                }
            } catch {}
        })();
    }, []);

    const handleSubmit = async () => {
        if (!title || !description || !budget || !lat || !lng || !address) {
            setError('Please fill all required fields.');
            return;
        }
        setError('');
        setLoading(true);
        try {
            const beforeImgs = beforeImageUrls.trim() ? beforeImageUrls.split(',').map(s => s.trim()).filter(Boolean) : [];
            const afterImgs = afterImageUrls.trim() ? afterImageUrls.split(',').map(s => s.trim()).filter(Boolean) : [];

            await (createWork as any)({
                name: title,
                description,
                type: sector,
                status,
                budget: parseFloat(budget),
                impact: areaImpact || description,
                areaImpact: areaImpact || undefined,
                location: {
                    lat: parseFloat(lat),
                    lng: parseFloat(lng),
                    address,
                },
                submittedBy: user?.email || 'unknown',
                beforeImages: beforeImgs.length > 0 ? beforeImgs : undefined,
                afterImages: afterImgs.length > 0 ? afterImgs : undefined,
            });

            Alert.alert('✅ Success', 'Work submitted successfully! Citizens nearby will see it.');
            // Reset form
            setTitle(''); setDescription(''); setAreaImpact(''); setBudget('');
            setBeforeImageUrls(''); setAfterImageUrls(''); setAddress('');
            onDone();
        } catch (e: any) {
            setError(e?.message || e?.data || 'Failed to submit.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView contentContainerStyle={{ paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
                <Text style={styles.pageTitle}>📋 Add New Work</Text>
                <Text style={styles.pageSub}>Submit completed or in-progress government work</Text>

                {error ? <Text style={styles.error}>{error}</Text> : null}

                {/* Title */}
                <Text style={styles.label}>Title *</Text>
                <TextInput style={styles.input} value={title} onChangeText={setTitle}
                    placeholder="e.g. Road Repair near XYZ Junction" placeholderTextColor="#4b5563" />

                {/* Description */}
                <Text style={styles.label}>Description *</Text>
                <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                    value={description} onChangeText={setDescription} multiline
                    placeholder="Detailed description of the work done" placeholderTextColor="#4b5563" />

                {/* Area Impact */}
                <Text style={styles.label}>How It Helps The Area</Text>
                <TextInput style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
                    value={areaImpact} onChangeText={setAreaImpact} multiline
                    placeholder="e.g. Reduces commute time, improves safety" placeholderTextColor="#4b5563" />

                {/* Sector */}
                <Text style={styles.label}>Government Sector *</Text>
                <View style={styles.chipRow}>
                    {SECTORS.map((s) => (
                        <TouchableOpacity key={s.key}
                            style={[styles.chip, sector === s.key && styles.chipActive]}
                            onPress={() => setSector(s.key)}>
                            <Text style={[styles.chipText, sector === s.key && { color: '#080d18' }]}>
                                {s.emoji} {s.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Status */}
                <Text style={styles.label}>Status *</Text>
                <View style={styles.chipRow}>
                    {STATUSES.map((s) => (
                        <TouchableOpacity key={s.key}
                            style={[styles.chip, status === s.key && { backgroundColor: s.color, borderColor: s.color }]}
                            onPress={() => setStatus(s.key)}>
                            <Text style={[styles.chipText, status === s.key && { color: '#080d18' }]}>
                                {s.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Budget */}
                <Text style={styles.label}>Budget Used (₹) *</Text>
                <TextInput style={styles.input} value={budget} onChangeText={setBudget}
                    placeholder="e.g. 5000000" placeholderTextColor="#4b5563" keyboardType="numeric" />

                {/* Location */}
                <View style={styles.divider} />
                <Text style={styles.sectionHead}>📍 Location</Text>

                <View style={styles.rowInputs}>
                    <View style={{ flex: 1, marginRight: 6 }}>
                        <Text style={styles.label}>Latitude *</Text>
                        <TextInput style={styles.input} value={lat} onChangeText={setLat}
                            placeholder="19.0176" placeholderTextColor="#4b5563" keyboardType="numeric" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 6 }}>
                        <Text style={styles.label}>Longitude *</Text>
                        <TextInput style={styles.input} value={lng} onChangeText={setLng}
                            placeholder="72.8562" placeholderTextColor="#4b5563" keyboardType="numeric" />
                    </View>
                </View>

                <Text style={styles.label}>Address / Location Name *</Text>
                <TextInput style={styles.input} value={address} onChangeText={setAddress}
                    placeholder="e.g. Near Dadar Station, Mumbai" placeholderTextColor="#4b5563" />

                {/* Images */}
                <View style={styles.divider} />
                <Text style={styles.sectionHead}>📷 Images</Text>
                <Text style={styles.hint}>Paste image URLs separated by commas. Multiple images allowed.</Text>

                <Text style={styles.label}>Before Images (URLs)</Text>
                <TextInput style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
                    value={beforeImageUrls} onChangeText={setBeforeImageUrls} multiline
                    placeholder="https://example.com/before1.jpg, https://..." placeholderTextColor="#4b5563" />

                <Text style={styles.label}>After Images (URLs)</Text>
                <TextInput style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
                    value={afterImageUrls} onChangeText={setAfterImageUrls} multiline
                    placeholder="https://example.com/after1.jpg, https://..." placeholderTextColor="#4b5563" />

                {/* Submit */}
                <TouchableOpacity style={styles.btn} onPress={handleSubmit} disabled={loading}>
                    {loading ? <ActivityIndicator color="#080d18" /> : <Text style={styles.btnText}>Submit Work</Text>}
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0a0f1e', paddingHorizontal: 16, paddingTop: 50 },
    pageTitle: { fontSize: 22, fontWeight: 'bold', color: '#f3f4f6', marginBottom: 4 },
    pageSub: { fontSize: 12, color: '#6b7280', marginBottom: 20 },
    label: { fontSize: 11, color: '#9ca3af', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 },
    input: { backgroundColor: '#1f2937', borderRadius: 12, padding: 14, color: '#f3f4f6', fontSize: 15, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
    btn: { backgroundColor: '#00d4ff', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 12 },
    btnText: { color: '#080d18', fontWeight: 'bold', fontSize: 16 },
    error: { color: '#ef4444', fontSize: 13, marginBottom: 16, backgroundColor: 'rgba(239,68,68,0.1)', padding: 12, borderRadius: 10 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 14 },
    chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#1f2937', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginRight: 8, marginBottom: 8 },
    chipActive: { backgroundColor: '#00d4ff', borderColor: '#00d4ff' },
    chipText: { fontSize: 11, color: '#9ca3af', fontWeight: '600' },
    divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginVertical: 20 },
    sectionHead: { fontSize: 16, fontWeight: 'bold', color: '#e5e7eb', marginBottom: 14 },
    rowInputs: { flexDirection: 'row' },
    hint: { fontSize: 11, color: '#374151', marginBottom: 12, fontStyle: 'italic' },
});
