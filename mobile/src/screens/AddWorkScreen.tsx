import React, { useState, useEffect } from 'react';
import {
    StyleSheet, Text, View, TextInput, TouchableOpacity,
    ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Alert, Image, Modal
} from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
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
    const generateUploadUrl = useMutation('files:generateUploadUrl' as any);

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [areaImpact, setAreaImpact] = useState('');
    const [sector, setSector] = useState('road');
    const [status, setStatus] = useState('completed');
    const [budget, setBudget] = useState('');
    const [lat, setLat] = useState('');
    const [lng, setLng] = useState('');
    const [address, setAddress] = useState('');
    const [beforeImages, setBeforeImages] = useState<string[]>([]);
    const [afterImages, setAfterImages] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);

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
            // Upload all images and collect their storage IDs
            const beforeStorageIds = await Promise.all(beforeImages.map(uri => uploadImage(uri)));
            const afterStorageIds = await Promise.all(afterImages.map(uri => uploadImage(uri)));

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
                beforeImages: beforeStorageIds.length > 0 ? beforeStorageIds : undefined,
                afterImages: afterStorageIds.length > 0 ? afterStorageIds : undefined,
            });

            Alert.alert('✅ Success', 'Work submitted successfully! Citizens nearby will see it.');
            // Reset form
            setTitle(''); setDescription(''); setAreaImpact(''); setBudget('');
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
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <Text style={styles.sectionHead}>📍 Location</Text>
                    <TouchableOpacity style={styles.pickMapBtn} onPress={() => setIsMapPickerOpen(true)}>
                        <Text style={styles.pickMapBtnText}>🗺️ Pick on Map</Text>
                    </TouchableOpacity>
                </View>

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
                <Text style={styles.sectionHead}>📷 Upload Project Photos</Text>
                
                <Text style={styles.label}>Before Images</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                    {beforeImages.map((uri, idx) => (
                        <View key={idx} style={{ position: 'relative', marginRight: 10 }}>
                            <Image source={{ uri }} style={{ width: 80, height: 80, borderRadius: 10 }} />
                            <TouchableOpacity style={styles.removePicBtn} onPress={() => setBeforeImages(beforeImages.filter((_, i) => i !== idx))}>
                                <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>✕</Text>
                            </TouchableOpacity>
                        </View>
                    ))}
                    <TouchableOpacity style={styles.addPicBtn} onPress={() => pickImage('before')}>
                        <Text style={{ color: '#00d4ff', fontSize: 24, fontWeight: 'bold' }}>+</Text>
                    </TouchableOpacity>
                </ScrollView>

                <Text style={styles.label}>After Images</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                    {afterImages.map((uri, idx) => (
                        <View key={idx} style={{ position: 'relative', marginRight: 10 }}>
                            <Image source={{ uri }} style={{ width: 80, height: 80, borderRadius: 10 }} />
                            <TouchableOpacity style={styles.removePicBtn} onPress={() => setAfterImages(afterImages.filter((_, i) => i !== idx))}>
                                <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>✕</Text>
                            </TouchableOpacity>
                        </View>
                    ))}
                    <TouchableOpacity style={styles.addPicBtn} onPress={() => pickImage('after')}>
                        <Text style={{ color: '#00d4ff', fontSize: 24, fontWeight: 'bold' }}>+</Text>
                    </TouchableOpacity>
                </ScrollView>
                {/* Submit */}
                <TouchableOpacity style={styles.btn} onPress={handleSubmit} disabled={loading}>
                    {loading ? <ActivityIndicator color="#080d18" /> : <Text style={styles.btnText}>Submit Work</Text>}
                </TouchableOpacity>
            </ScrollView>

            <Modal visible={isMapPickerOpen} animationType="slide">
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Select Location</Text>
                        <TouchableOpacity style={styles.closeModalBtn} onPress={() => setIsMapPickerOpen(false)}>
                            <Text style={{ color: 'white' }}>Cancel</Text>
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
                                        body, html, #map { margin: 0; padding: 0; height: 100%; height: 100vh; background: #0a0f1e; }
                                        .leaflet-container { background: #0a0f1e; }
                                    </style>
                                </head>
                                <body>
                                    <div id="map"></div>
                                    <script>
                                        const map = L.map('map').setView([${lat || 19.0176}, ${lng || 72.8562}], 15);
                                        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
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

                                        // Pulse for current location
                                        if (${lat && lng}) {
                                             L.circle([${lat}, ${lng}], {
                                                color: '#00d4ff',
                                                fillColor: '#00d4ff',
                                                fillOpacity: 0.2,
                                                radius: 100
                                            }).addTo(map);
                                        }
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
                            <Text style={{ color: 'white' }}>Map Picker only available on Web for now.</Text>
                        </View>
                    )}

                    <TouchableOpacity style={styles.saveLocBtn} onPress={() => setIsMapPickerOpen(false)}>
                        <Text style={styles.btnText}>Set This Location</Text>
                    </TouchableOpacity>
                </View>
            </Modal>
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
    addPicBtn: { width: 80, height: 80, borderRadius: 10, borderWidth: 1, borderColor: '#00d4ff', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,212,255,0.05)' },
    removePicBtn: { position: 'absolute', top: -5, right: -5, backgroundColor: '#ef4444', width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    pickMapBtn: { backgroundColor: 'rgba(0,212,255,0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(0,212,255,0.3)' },
    pickMapBtnText: { color: '#00d4ff', fontSize: 12, fontWeight: '600' },
    modalContainer: { flex: 1, backgroundColor: '#0a0f1e' },
    modalHeader: { height: 70, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
    modalTitle: { color: '#f3f4f6', fontSize: 18, fontWeight: 'bold' },
    closeModalBtn: { padding: 10 },
    saveLocBtn: { position: 'absolute', bottom: 30, left: 20, right: 20, backgroundColor: '#00d4ff', padding: 16, borderRadius: 12, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 10 },
});
