import React, { useState, useEffect } from 'react';
import {
    StyleSheet, Text, View, TextInput, TouchableOpacity,
    ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Alert, Image, Modal
} from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { useMutation } from 'convex/react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Hospital, Map, GraduationCap, Train, Building2, Landmark, List, Navigation, MapPin, Camera, X, Plus } from 'lucide-react-native';

const SECTORS = [
    { key: 'hospital', label: 'Healthcare', Icon: Hospital },
    { key: 'road', label: 'Roads & Highways', Icon: Navigation },
    { key: 'bridge', label: 'Bridges & Flyovers', Icon: Map },
    { key: 'school', label: 'Education', Icon: GraduationCap },
    { key: 'metro', label: 'Metro & Transit', Icon: Train },
    { key: 'college', label: 'Higher Education', Icon: Building2 },
    { key: 'government_office', label: 'Govt Offices', Icon: Landmark },
    { key: 'other', label: 'Other', Icon: List },
];

const STATUSES = [
    { key: 'completed', label: 'Completed', color: '#22c55e' }, // We use absolute success colors here since it's an input selection
    { key: 'in_progress', label: 'In Progress', color: '#f59e0b' },
];

const BUDGET_UNITS = [
    { label: '₹', val: 1 },
    { label: 'K (Thousand)', val: 1000 },
    { label: 'L (Lakh)', val: 100000 },
    { label: 'Cr (Crore)', val: 10000000 },
];

export default function AddWorkScreen({ onDone }: { onDone: () => void }) {
    const { user } = useAuth();
    const { colors, isDark } = useTheme();
    const styles = createStyles(colors, isDark);
    
    const createWork = useMutation('projects:createWork' as any);
    const generateUploadUrl = useMutation('files:generateUploadUrl' as any);

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [areaImpact, setAreaImpact] = useState('');
    const [sector, setSector] = useState('road');
    const [status, setStatus] = useState('completed');
    const [budget, setBudget] = useState('');
    const [budgetUnit, setBudgetUnit] = useState(10000000); // Default to Crore as it is most common for gov work
    const [lat, setLat] = useState('');
    const [lng, setLng] = useState('');
    const [address, setAddress] = useState('');
    const [beforeImages, setBeforeImages] = useState<string[]>([]);
    const [afterImages, setAfterImages] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);
    const [beforeNotApplicable, setBeforeNotApplicable] = useState(false);

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

    const pickImage = async (type: 'before' | 'after') => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
        });

        if (!result.canceled && result.assets && result.assets[0].uri) {
            if (type === 'before') {
                setBeforeImages([...beforeImages, result.assets[0].uri]);
            } else {
                setAfterImages([...afterImages, result.assets[0].uri]);
            }
        }
    };

    const uploadImage = async (imageUri: string) => {
        const postUrl = await generateUploadUrl();
        const response = await fetch(imageUri);
        const blob = await response.blob();
        const result = await fetch(postUrl, {
            method: 'POST',
            headers: { 'Content-Type': blob.type },
            body: blob,
        });
        const { storageId } = await result.json();
        return storageId;
    };

    const handleSubmit = async () => {
        if (!title || !description || !budget || !lat || !lng || !address) {
            setError('Please fill all required fields.');
            return;
        }
        setError('');
        setLoading(true);
        try {
            const beforeStorageIds = beforeNotApplicable ? [] : await Promise.all(beforeImages.map(uri => uploadImage(uri)));
            const afterStorageIds = await Promise.all(afterImages.map(uri => uploadImage(uri)));

            await (createWork as any)({
                name: title,
                description,
                type: sector,
                status,
                budget: parseFloat(budget) * budgetUnit,
                impact: areaImpact || description,
                areaImpact: areaImpact || undefined,
                location: {
                    lat: parseFloat(lat),
                    lng: parseFloat(lng),
                    address,
                },
                authorName: user?.orgName || user?.name || 'Anonymous',
                authorId: user?._id as any,
                likes: 0,
                dislikes: 0,
                beforeImages: beforeStorageIds.length > 0 ? beforeStorageIds : undefined,
                afterImages: afterStorageIds.length > 0 ? afterStorageIds : undefined,
            });

            Alert.alert('✅ Success', 'Work submitted successfully! Citizens nearby will see it.');
            setTitle(''); setDescription(''); setAreaImpact(''); setBudget(''); setBudgetUnit(1);
            setBeforeImages([]); setAfterImages([]); setAddress('');
            onDone();
        } catch (e: any) {
            setError(e?.message || e?.data || 'Failed to submit.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView contentContainerStyle={{ paddingBottom: 120 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <Text style={styles.pageTitle}>Add New Initiative</Text>
                <Text style={styles.pageSub}>Submit completed or in-progress government work</Text>

                {error ? <Text style={styles.error}>{error}</Text> : null}

                {/* Title */}
                <Text style={styles.label}>Title *</Text>
                <TextInput style={styles.input} value={title} onChangeText={setTitle}
                    placeholder="e.g. Road Repair near XYZ Junction" placeholderTextColor={colors.textMuted} />

                {/* Description */}
                <Text style={styles.label}>Description *</Text>
                <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                    value={description} onChangeText={setDescription} multiline
                    placeholder="Detailed description of the work done" placeholderTextColor={colors.textMuted} />

                {/* Area Impact */}
                <Text style={styles.label}>How It Helps The Area</Text>
                <TextInput style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
                    value={areaImpact} onChangeText={setAreaImpact} multiline
                    placeholder="e.g. Reduces commute time, improves safety" placeholderTextColor={colors.textMuted} />

                {/* Sector */}
                <Text style={styles.label}>Government Sector *</Text>
                <View style={styles.chipRow}>
                    {SECTORS.map((s) => {
                        const { Icon } = s;
                        const active = sector === s.key;
                        return (
                            <TouchableOpacity key={s.key}
                                style={[styles.chip, active && styles.chipActive]}
                                onPress={() => setSector(s.key)}>
                                <Icon color={active ? (isDark ? '#0a0f1e' : colors.card) : colors.textMuted} size={14} style={{ marginRight: 6 }} />
                                <Text style={[styles.chipText, active && { color: isDark ? '#0a0f1e' : colors.card }]}>
                                    {s.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Status */}
                <Text style={styles.label}>Status *</Text>
                <View style={styles.chipRow}>
                    {STATUSES.map((s) => (
                        <TouchableOpacity key={s.key}
                            style={[styles.chip, status === s.key && { backgroundColor: s.color, borderColor: s.color }]}
                            onPress={() => setStatus(s.key)}>
                            <Text style={[styles.chipText, status === s.key && { color: '#ffffff' }]}>
                                {s.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Budget */}
                <Text style={styles.label}>Budget Amount *</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
                    <TextInput style={[styles.input, { flex: 1, marginBottom: 0, marginRight: 10 }]} value={budget} onChangeText={setBudget}
                        placeholder="e.g. 5.5" placeholderTextColor={colors.textMuted} keyboardType="numeric" />
                    
                    <View style={{ flexDirection: 'row' }}>
                        {BUDGET_UNITS.map((u) => (
                            <TouchableOpacity key={u.label} 
                                style={[styles.unitChip, budgetUnit === u.val && styles.unitChipActive]}
                                onPress={() => setBudgetUnit(u.val)}>
                                <Text style={[styles.unitChipText, budgetUnit === u.val && { color: isDark ? '#080d18' : colors.card }]}>
                                    {u.label.split(' ')[0]}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Location */}
                <View style={styles.divider} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <MapPin color={colors.text} size={18} />
                        <Text style={styles.sectionHead}> Location</Text>
                    </View>
                    <TouchableOpacity style={styles.pickMapBtn} onPress={() => setIsMapPickerOpen(true)}>
                        <Text style={styles.pickMapBtnText}>Pick on Map</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.rowInputs}>
                    <View style={{ flex: 1, marginRight: 6 }}>
                        <Text style={styles.label}>Latitude *</Text>
                        <TextInput style={styles.input} value={lat} onChangeText={setLat}
                            placeholder="19.0176" placeholderTextColor={colors.textMuted} keyboardType="numeric" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 6 }}>
                        <Text style={styles.label}>Longitude *</Text>
                        <TextInput style={styles.input} value={lng} onChangeText={setLng}
                            placeholder="72.8562" placeholderTextColor={colors.textMuted} keyboardType="numeric" />
                    </View>
                </View>

                <Text style={styles.label}>Address / Location Name *</Text>
                <TextInput style={styles.input} value={address} onChangeText={setAddress}
                    placeholder="e.g. Near Dadar Station, Mumbai" placeholderTextColor={colors.textMuted} />

                {/* Images */}
                <View style={styles.divider} />
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Camera color={colors.text} size={18} />
                        <Text style={styles.sectionHead}> Upload Project Photos</Text>
                    </View>
                    <TouchableOpacity 
                        style={[styles.naBtn, beforeNotApplicable && styles.naBtnActive]} 
                        onPress={() => {
                            setBeforeNotApplicable(!beforeNotApplicable);
                            if (!beforeNotApplicable) setBeforeImages([]);
                        }}
                    >
                        <Text style={[styles.naBtnText, beforeNotApplicable && { color: isDark ? '#0a0f1e' : '#fff' }]}>
                            {beforeNotApplicable ? 'Before: N/A' : 'New Initiative?'}
                        </Text>
                    </TouchableOpacity>
                </View>
                
                {!beforeNotApplicable && (
                    <>
                        <Text style={styles.label}>Before Images</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                            {beforeImages.map((uri, idx) => (
                                <View key={idx} style={{ position: 'relative', marginRight: 10 }}>
                                    <Image source={{ uri }} style={{ width: 80, height: 80, borderRadius: 10 }} />
                                    <TouchableOpacity style={styles.removePicBtn} onPress={() => setBeforeImages(beforeImages.filter((_, i) => i !== idx))}>
                                        <X color="#ffffff" size={12} />
                                    </TouchableOpacity>
                                </View>
                            ))}
                            <TouchableOpacity style={styles.addPicBtn} onPress={() => pickImage('before')}>
                                <Plus color={colors.primary} size={24} />
                            </TouchableOpacity>
                        </ScrollView>
                    </>
                )}

                <Text style={styles.label}>{beforeNotApplicable ? 'Project Images' : 'After Images'}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                    {afterImages.map((uri, idx) => (
                        <View key={idx} style={{ position: 'relative', marginRight: 10 }}>
                            <Image source={{ uri }} style={{ width: 80, height: 80, borderRadius: 10 }} />
                            <TouchableOpacity style={styles.removePicBtn} onPress={() => setAfterImages(afterImages.filter((_, i) => i !== idx))}>
                                <X color="#ffffff" size={12} />
                            </TouchableOpacity>
                        </View>
                    ))}
                    <TouchableOpacity style={styles.addPicBtn} onPress={() => pickImage('after')}>
                        <Plus color={colors.primary} size={24} />
                    </TouchableOpacity>
                </ScrollView>
                
                {/* Submit */}
                <TouchableOpacity style={styles.btn} onPress={handleSubmit} disabled={loading}>
                    {loading ? <ActivityIndicator color={isDark ? '#080d18' : colors.card} /> : <Text style={styles.btnText}>Submit Work</Text>}
                </TouchableOpacity>
            </ScrollView>

            <Modal visible={isMapPickerOpen} animationType="slide">
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Select Location</Text>
                        <TouchableOpacity style={styles.closeModalBtn} onPress={() => setIsMapPickerOpen(false)}>
                            <Text style={{ color: colors.textMuted }}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                    
                    {Platform.OS === 'web' ? (
                        <iframe
                            style={{ flex: 1, width: '100%', border: 'none' }}
                            srcDoc={`
                                <!DOCTYPE html>
                                <html>
                                <head>
                                    <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" />
                                    <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
                                    <style>
                                        body, html, #map { margin: 0; padding: 0; height: 100%; height: 100vh; background: ${colors.background}; }
                                        .leaflet-container { background: ${colors.background}; }
                                    </style>
                                </head>
                                <body>
                                    <div id="map"></div>
                                    <script>
                                        const map = L.map('map').setView([${lat || 19.0176}, ${lng || 72.8562}], 15);
                                        const mapUrl = '${isDark ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"}';
                                        
                                        L.tileLayer(mapUrl, {
                                            attribution: '&copy; OpenStreetMap'
                                        }).addTo(map);

                                        let marker = L.marker([${lat || 19.0176}, ${lng || 72.8562}], { draggable: true }).addTo(map);

                                        map.on('click', function(e) {
                                            const { lat, lng } = e.latlng;
                                            marker.setLatLng([lat, lng]);
                                            window.parent.postMessage({ type: 'locationSelected', lat, lng }, '*');
                                        });

                                        marker.on('dragend', function(e) {
                                            const { lat, lng } = marker.getLatLng();
                                            window.parent.postMessage({ type: 'locationSelected', lat, lng }, '*');
                                        });
                                    </script>
                                </body>
                                </html>
                            `}
                            onLoad={() => {
                                window.onmessage = (e) => {
                                    if (e.data.type === 'locationSelected') {
                                        setLat(e.data.lat.toFixed(6));
                                        setLng(e.data.lng.toFixed(6));
                                    }
                                };
                            }}
                        />
                    ) : (
                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                            <Text style={{ color: colors.text }}>Map Picker only available on Web for now.</Text>
                        </View>
                    )}

                    <TouchableOpacity style={styles.saveLocBtn} onPress={() => setIsMapPickerOpen(false)}>
                        <Text style={styles.saveLocBtnText}>Set This Location</Text>
                    </TouchableOpacity>
                </View>
            </Modal>
        </KeyboardAvoidingView>
    );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 16, paddingTop: 50 },
    pageTitle: { fontSize: 22, fontWeight: 'bold', color: colors.text, marginBottom: 4 },
    pageSub: { fontSize: 13, color: colors.textMuted, marginBottom: 20 },
    label: { fontSize: 11, color: colors.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 },
    input: { backgroundColor: colors.inputBg, borderRadius: 12, padding: 14, color: colors.text, fontSize: 15, marginBottom: 14, borderWidth: 1, borderColor: colors.transparentBorder },
    btn: { backgroundColor: colors.primary, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 12 },
    btnText: { color: isDark ? '#080d18' : '#ffffff', fontWeight: 'bold', fontSize: 16 },
    error: { color: colors.danger, fontSize: 13, marginBottom: 16, backgroundColor: 'rgba(239,68,68,0.1)', padding: 12, borderRadius: 10 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 14 },
    chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.transparentBorder, marginRight: 8, marginBottom: 8 },
    chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipText: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
    unitChip: { paddingHorizontal: 10, paddingVertical: 12, borderRadius: 8, backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.transparentBorder, marginLeft: 4 },
    unitChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    unitChipText: { fontSize: 12, color: colors.textMuted, fontWeight: 'bold' },
    divider: { height: 1, backgroundColor: colors.transparentBorder, marginVertical: 20 },
    sectionHead: { fontSize: 16, fontWeight: 'bold', color: colors.text },
    rowInputs: { flexDirection: 'row' },
    addPicBtn: { width: 80, height: 80, borderRadius: 10, borderWidth: 1, borderColor: colors.primary, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.transparentPrimary },
    removePicBtn: { position: 'absolute', top: -5, right: -5, backgroundColor: colors.danger, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
    
    pickMapBtn: { backgroundColor: colors.transparentPrimary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: colors.primary },
    pickMapBtnText: { color: colors.primary, fontSize: 12, fontWeight: 'bold' },
    modalContainer: { flex: 1, backgroundColor: colors.card },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, paddingTop: 60, backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: colors.transparentBorder },
    modalTitle: { fontSize: 18, color: colors.text, fontWeight: 'bold' },
    closeModalBtn: { padding: 4 },
    saveLocBtn: { backgroundColor: colors.primary, padding: 20, alignItems: 'center' },
    saveLocBtnText: { color: isDark ? '#0a0f1e' : '#ffffff', fontWeight: 'bold', fontSize: 16 },

    naBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: colors.primary },
    naBtnActive: { backgroundColor: colors.primary },
    naBtnText: { fontSize: 10, fontWeight: 'bold', color: colors.primary },
});
