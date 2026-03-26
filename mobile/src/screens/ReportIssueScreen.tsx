import React, { useState, useEffect, useRef } from 'react';
import {
    StyleSheet, Text, View, TextInput, TouchableOpacity,
    ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Alert, Image, Animated
} from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@backend/_generated/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { 
    AlertTriangle, Camera, MapPin, X, Plus, 
    Droplets, Lightbulb, Trash2, HelpCircle, Navigation, Clock,
    ThumbsUp, ThumbsDown, MessageCircle, Search, Radio, RefreshCw, Activity
} from 'lucide-react-native';

const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const toRad = (x: number) => (x * Math.PI) / 180;
    const R = 6371e3; // metres
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

const IssueImage = ({ storageId, styles }: { storageId: string, styles: any }) => {
    const url = useQuery(api.files.getUrl, { storageId });
    if (!url) return <View style={[styles.cardDetailPhoto, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#eee' }]}><ActivityIndicator size="small" /></View>;
    return <Image source={{ uri: url }} style={styles.cardDetailPhoto} />;
};

const CATEGORIES = [
    { key: 'road_damage', label: 'Road Damage', Icon: Navigation, color: '#f59e0b' },
    { key: 'water_leak', label: 'Water Leak', Icon: Droplets, color: '#3b82f6' },
    { key: 'street_light', label: 'Street Light', Icon: Lightbulb, color: '#eab308' },
    { key: 'garbage', label: 'Garbage', Icon: Trash2, color: '#ef4444' },
    { key: 'other', label: 'Other', Icon: HelpCircle, color: '#6b7280' },
];

const PulseRadar = ({ colors }: { colors: any }) => {
    const scale1 = useRef(new Animated.Value(1)).current;
    const opacity1 = useRef(new Animated.Value(0.6)).current;
    const scale2 = useRef(new Animated.Value(1)).current;
    const opacity2 = useRef(new Animated.Value(0.4)).current;

    useEffect(() => {
        const pulse = (scale: Animated.Value, opacity: Animated.Value, delay: number) => {
            Animated.loop(
                Animated.sequence([
                    Animated.delay(delay),
                    Animated.parallel([
                        Animated.timing(scale, { toValue: 2.5, duration: 3000, useNativeDriver: true }),
                        Animated.timing(opacity, { toValue: 0, duration: 3000, useNativeDriver: true })
                    ])
                ])
            ).start();
        };
        pulse(scale1, opacity1, 0);
        pulse(scale2, opacity2, 1500);
    }, []);

    return (
        <View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
            <Animated.View style={{
                position: 'absolute', width: 20, height: 20, borderRadius: 10,
                backgroundColor: colors.primary, transform: [{ scale: scale1 }], opacity: opacity1,
            }} />
            <Animated.View style={{
                position: 'absolute', width: 20, height: 20, borderRadius: 10,
                backgroundColor: colors.primary, transform: [{ scale: scale2 }], opacity: opacity2,
            }} />
            <View style={{
                backgroundColor: colors.inputBg, borderRadius: 12, padding: 2,
                shadowColor: colors.primary, shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.8, shadowRadius: 6, elevation: 5
            }}>
                <Radio color={colors.primary} size={18} />
            </View>
        </View>
    );
};

export default function ReportIssueScreen({ onDone }: { onDone: () => void }) {
    const { user } = useAuth();
    const { colors, isDark } = useTheme();
    const styles = createStyles(colors, isDark);
    
    const reportIssue = useMutation(api.issues.reportIssue);
    const generateUploadUrl = useMutation(api.files.generateUploadUrl);
    const toggleUpvote = useMutation(api.issues.toggleUpvote);
    const toggleDownvote = useMutation(api.issues.toggleDownvote);

    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('road_damage');
    const [lat, setLat] = useState('');
    const [lng, setLng] = useState('');
    const [address, setAddress] = useState('');
    const [images, setImages] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isReporting, setIsReporting] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const allIssues = useQuery(api.issues.getIssues);

    useEffect(() => {
        (async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status === 'granted') {
                    const loc = await Location.getCurrentPositionAsync({});
                    setLat(loc.coords.latitude.toFixed(6));
                    setLng(loc.coords.longitude.toFixed(6));
                    
                    // Reverse geocode to get address
                    const rev = await Location.reverseGeocodeAsync({
                        latitude: loc.coords.latitude,
                        longitude: loc.coords.longitude
                    });
                    if (rev.length > 0) {
                        const first = rev[0];
                        // Smart de-duplication and prioritization
                        const name = first.name || '';
                        const street = first.street || '';
                        const subregion = first.subregion || '';
                        const district = first.district || first.city || '';
                        
                        // If name is just the city name, null it to avoid redundancy
                        const filteredName = (name && name !== district) ? name : '';
                        
                        const parts = [
                    (first.name && first.name !== first.city && first.name !== first.district) ? first.name : '',
                    first.streetNumber ? `${first.streetNumber} ${first.street}` : first.street,
                    first.subregion,
                    first.district || first.city,
                    first.region,
                    first.postalCode
                ].filter((v, i, a) => v && a.indexOf(v) === i);
                
                const addr = parts.join(', ');
                setAddress(addr || 'Unknown Location');
                    }
                }
            } catch (e) {
                console.log('Location error:', e);
            }
        })();

        const timeoutId = setTimeout(() => {
            setAddress(prev => {
                if (prev === '') {
                    if (lat && lng) return `${lat}, ${lng}`;
                    return user?.city || user?.state || 'Current Location';
                }
                return prev;
            });
        }, 3000);

        return () => clearTimeout(timeoutId);
    }, [user?._id, lat, lng]);

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Please grant gallery access to upload photos.');
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.7,
        });

        if (!result.canceled && result.assets && result.assets[0].uri) {
            setImages([...images, result.assets[0].uri]);
        }
    };

    const takePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Please grant camera access to take photos.');
            return;
        }

        let result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.7,
        });

        if (!result.canceled && result.assets && result.assets[0].uri) {
            setImages([...images, result.assets[0].uri]);
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
        if (!description || !category || !lat || !lng) {
            setError('Please fill required fields (Description, Category, Location).');
            return;
        }
        setError('');
        setLoading(true);
        try {
            const storageIds = await Promise.all(images.map(uri => uploadImage(uri)));

            await reportIssue({
                userId: user?._id || user?.email || 'anonymous',
                description,
                category: category as any,
                location: {
                    lat: parseFloat(lat),
                    lng: parseFloat(lng),
                    address: address || undefined,
                },
                images: storageIds.length > 0 ? storageIds : undefined,
            });

            Alert.alert('✅ Success', 'Thank you! Your report has been submitted.');
            setIsReporting(false);
            setDescription(''); setImages([]);
        } catch (e: any) {
            setError(e?.message || 'Failed to submit report.');
        } finally {
            setLoading(false);
        }
    };

    if (allIssues === undefined || !lat || !lng) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator color={colors.primary} size="large" />
                <Text style={{color: colors.textMuted, marginTop: 16}}>Finding your location...</Text>
            </View>
        );
    }

    const nearbyIssues = allIssues.filter((issue: any) => {
        if (!issue.location?.lat || !issue.location?.lng) return false;
        const dist = haversineDistance(parseFloat(lat), parseFloat(lng), issue.location.lat, issue.location.lng);
        if (dist > 500) return false;

        if (searchQuery.trim() !== '') {
            const query = searchQuery.toLowerCase();
            const words = query.split(/\s+/).filter(w => w.length > 0);
            const searchFields = [
                issue.description,
                issue.category,
                issue.location?.address
            ].join(' ').toLowerCase();
            return words.every(word => searchFields.includes(word));
        }
        return true;
    });

    if (!isReporting) {
        return (
            <View style={styles.container}>
                <View style={[styles.header, { justifyContent: 'space-between', marginBottom: 16 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <MapPin color={colors.primary} size={24} />
                        <Text style={styles.pageTitle}>Nearby Issues</Text>
                    </View>
                    <TouchableOpacity 
                        style={styles.topReportBtn}
                        onPress={() => setIsReporting(true)}
                    >
                        <Plus color="#fff" size={16} />
                        <Text style={styles.topReportBtnText}>Report Issue</Text>
                    </TouchableOpacity>
                </View>

                {/* Big Prominent Location Card */}
                <View style={styles.locationBox}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Navigation color={colors.primary} size={16} />
                            <Text style={[styles.locationText, { fontSize: 11, color: colors.primary, fontWeight: '800', letterSpacing: 1, marginLeft: 6 }]}>YOUR LOCATION</Text>
                        </View>
                        <TouchableOpacity onPress={() => { setLat(''); setLng(''); setAddress(''); }}>
                            <RefreshCw color={colors.primary} size={14} />
                        </TouchableOpacity>
                    </View>
                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.text, marginBottom: 4 }} numberOfLines={2}>{address || 'Detecting...'}</Text>
                    {lat && lng ? (
                        <Text style={{ fontSize: 11, color: colors.textMuted }}>{lat}, {lng}</Text>
                    ) : null}
                </View>

                <Text style={styles.pageSub}>Civic problems reported within 500m of you</Text>
                
                <View style={styles.searchContainer}>
                    <Search color={colors.textMuted} size={18} />
                    <TextInput 
                        style={styles.searchInput}
                        placeholder="Search nearby issues..."
                        placeholderTextColor={colors.textMuted}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoCapitalize="none"
                    />
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
                    {nearbyIssues.length === 0 ? (
                        <View style={styles.emptyState}>
                            <AlertTriangle color={colors.textMuted} size={40} style={{marginBottom: 16}} />
                            <Text style={styles.emptyText}>No issues reported within 500m.</Text>
                            <Text style={styles.emptySubText}>Be the first to keep your neighborhood clean and safe!</Text>
                        </View>
                    ) : (
                        nearbyIssues.map((issue: any) => {
                            const cat = CATEGORIES.find(c => c.key === issue.category) || CATEGORIES[4];
                            const Icon = cat.Icon;
                            const dist = haversineDistance(parseFloat(lat), parseFloat(lng), issue.location.lat, issue.location.lng);
                            const isExpanded = expandedId === issue._id;
                            
                            return (
                                <TouchableOpacity 
                                    key={issue._id} 
                                    style={styles.card}
                                    activeOpacity={0.8}
                                    onPress={() => setExpandedId(isExpanded ? null : issue._id)}
                                >
                                    <View style={styles.cardHeader}>
                                        <View style={[styles.cardIconBox, { 
                                            backgroundColor: cat.color + '15', 
                                            shadowColor: cat.color, 
                                            shadowOffset: { width: 0, height: 0 }, 
                                            shadowOpacity: 0.8, 
                                            shadowRadius: 6, 
                                            elevation: 4 
                                        }]}>
                                            <Icon color={cat.color} size={18} />
                                        </View>
                                        <View style={{ flex: 1, marginLeft: 12 }}>
                                            <Text style={styles.cardTitle}>{cat.label}</Text>
                                            <Text style={styles.cardTime}>
                                                {new Date(issue.createdAt).toLocaleDateString()}
                                            </Text>
                                        </View>
                                        <Text style={styles.cardDistance}>{Math.round(dist)}m away</Text>
                                    </View>
                                    <Text style={styles.cardDesc} numberOfLines={isExpanded ? undefined : 3}>{issue.description}</Text>
                                    
                                    {isExpanded && issue.images && issue.images.length > 0 && (
                                        <View style={styles.cardPhotosGrid}>
                                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                                {issue.images.map((img: string, i: number) => (
                                                    <IssueImage key={i} storageId={img} styles={styles} />
                                                ))}
                                            </ScrollView>
                                        </View>
                                    )}

                                    {!isExpanded && issue.images && issue.images.length > 0 && (
                                        <View style={styles.cardTagRow}>
                                            <Camera size={12} color={colors.textMuted} style={{marginRight: 4}} />
                                            <Text style={styles.cardTagText}>{issue.images.length} Photo{issue.images.length > 1 ? 's' : ''}</Text>
                                        </View>
                                    )}

                                    {isExpanded && (
                                        <View style={styles.cardActions}>
                                            <TouchableOpacity 
                                                style={styles.cardActionBtn}
                                                onPress={() => toggleUpvote({ issueId: issue._id, userId: user?._id || user?.email || 'anon' })}
                                            >
                                                <ThumbsUp color={(issue.upvotes || []).includes(user?._id || user?.email || 'anon') ? colors.primary : colors.textMuted} size={16} />
                                                <Text style={[styles.cardActionText, (issue.upvotes || []).includes(user?._id || user?.email || 'anon') && { color: colors.primary }]}>
                                                    {issue.upvotes?.length || 0} Upvotes
                                                </Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity 
                                                style={styles.cardActionBtn}
                                                onPress={() => toggleDownvote({ issueId: issue._id, userId: user?._id || user?.email || 'anon' })}
                                            >
                                                <ThumbsDown color={(issue.downvotes || []).includes(user?._id || user?.email || 'anon') ? colors.danger : colors.textMuted} size={16} />
                                            </TouchableOpacity>
                                            <View style={{ flex: 1 }} />
                                            <TouchableOpacity style={styles.cardActionBtn}>
                                                <MessageCircle color={colors.textMuted} size={16} />
                                                <Text style={styles.cardActionText}>Discuss</Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        })
                    )}
                </ScrollView>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <AlertTriangle color={colors.primary} size={24} />
                    <Text style={styles.pageTitle}>Report Civic Issue</Text>
                </View>
                <Text style={styles.pageSub}>Help us improve your area by reporting local problems</Text>

                {error ? <Text style={styles.error}>{error}</Text> : null}

                {/* Category Selection */}
                <Text style={styles.label}>Category *</Text>
                <View style={styles.chipRow}>
                    {CATEGORIES.map((cat) => {
                        const { Icon } = cat;
                        const active = category === cat.key;
                        return (
                            <TouchableOpacity key={cat.key}
                                style={[styles.chip, active && { borderColor: cat.color, backgroundColor: cat.color + '20' }]}
                                onPress={() => setCategory(cat.key)}>
                                <View style={active ? {
                                    shadowColor: cat.color,
                                    shadowOffset: { width: 0, height: 0 },
                                    shadowOpacity: 0.8,
                                    shadowRadius: 4,
                                    elevation: 2,
                                    marginRight: 6
                                } : { marginRight: 6 }}>
                                    <Icon color={active ? cat.color : colors.textMuted} size={14} />
                                </View>
                                <Text style={[styles.chipText, active && { color: cat.color }]}>
                                    {cat.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Description */}
                <Text style={styles.label}>Description *</Text>
                <TextInput 
                    style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                    value={description} onChangeText={setDescription} multiline
                    placeholder="Describe the issue in detail..." 
                    placeholderTextColor={colors.textMuted} 
                />

                {/* Photos */}
                <Text style={styles.label}>Photos</Text>
                <View style={styles.photoContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {images.map((uri, idx) => (
                            <View key={idx} style={styles.photoWrapper}>
                                <Image source={{ uri }} style={styles.photo} />
                                <TouchableOpacity 
                                    style={styles.removePhoto}
                                    onPress={() => setImages(images.filter((_, i) => i !== idx))}>
                                    <X color="#fff" size={12} />
                                </TouchableOpacity>
                            </View>
                        ))}
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <TouchableOpacity style={styles.addPhotoBtn} onPress={takePhoto}>
                                <Camera color={colors.primary} size={20} />
                                <Text style={styles.addPhotoText}>Camera</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.addPhotoBtn} onPress={pickImage}>
                                <Plus color={colors.primary} size={20} />
                                <Text style={styles.addPhotoText}>Gallery</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>

                {/* Location */}
                <View style={styles.divider} />
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                    <MapPin color={colors.text} size={18} />
                    <Text style={styles.sectionHead}> Location Detected</Text>
                </View>

                <View style={styles.rowInputs}>
                    <View style={{ flex: 1, marginRight: 6 }}>
                        <Text style={styles.label}>Lat</Text>
                        <TextInput style={styles.smallInput} value={lat} editable={false} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 6 }}>
                        <Text style={styles.label}>Lng</Text>
                        <TextInput style={styles.smallInput} value={lng} editable={false} />
                    </View>
                </View>

                <Text style={styles.label}>Address / Area Name</Text>
                <TextInput style={styles.input} value={address} onChangeText={setAddress}
                    placeholder="Approximate address..." placeholderTextColor={colors.textMuted} />

                {/* Submit */}
                <TouchableOpacity style={styles.btn} onPress={handleSubmit} disabled={loading}>
                    {loading ? <ActivityIndicator color={isDark ? '#0a0f1e' : '#fff'} /> : <Text style={styles.btnText}>Submit Report</Text>}
                </TouchableOpacity>

                <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsReporting(false)} disabled={loading}>
                    <Text style={styles.cancelBtnText}>Discard</Text>
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 16, paddingTop: 50 },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    pageTitle: { fontSize: 22, fontWeight: 'bold', color: colors.text },
    locationBox: { 
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: colors.primary + '40',
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    locationText: { fontSize: 11, color: colors.text, fontWeight: '600', marginLeft: 4 },
    bigLocationCard: {
        backgroundColor: colors.card,
        borderRadius: 20,
        padding: 16,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: colors.transparentBorder,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 4
    },
    locationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    locationLabel: { fontSize: 10, color: colors.primary, fontWeight: '800', letterSpacing: 1 },
    addressMain: { fontSize: 17, fontWeight: 'bold', color: colors.text, marginBottom: 4 },
    addressSub: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },
    pageSub: { fontSize: 13, color: colors.textMuted, marginBottom: 24, marginTop: 10 },
    label: { fontSize: 11, color: colors.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
    input: { backgroundColor: colors.inputBg, borderRadius: 12, padding: 14, color: colors.text, fontSize: 14, marginBottom: 16, borderWidth: 1, borderColor: colors.transparentBorder },
    smallInput: { backgroundColor: colors.inputBg + '40', borderRadius: 10, padding: 10, color: colors.textMuted, fontSize: 12, marginBottom: 16, borderWidth: 1, borderColor: colors.transparentBorder },
    rowInputs: { flexDirection: 'row' },
    divider: { height: 1, backgroundColor: colors.transparentBorder, marginVertical: 20 },
    sectionHead: { fontSize: 16, fontWeight: 'bold', color: colors.text },
    
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16, gap: 8 },
    chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.transparentBorder },
    chipText: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
    
    photoContainer: { marginBottom: 16 },
    photoWrapper: { position: 'relative', marginRight: 12 },
    photo: { width: 80, height: 80, borderRadius: 12, borderWidth: 1, borderColor: colors.transparentBorder },
    removePhoto: { position: 'absolute', top: -6, right: -6, backgroundColor: colors.danger, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.background },
    addPhotoBtn: { width: 80, height: 80, borderRadius: 12, borderWidth: 1, borderColor: colors.primary, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.transparentPrimary },
    addPhotoText: { fontSize: 10, color: colors.primary, marginTop: 4, fontWeight: 'bold' },
    
    btn: { backgroundColor: colors.primary, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 10 },
    btnText: { color: isDark ? '#0a0f1e' : '#fff', fontWeight: 'bold', fontSize: 16 },
    cancelBtn: { padding: 16, alignItems: 'center' },
    cancelBtnText: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
    error: { color: colors.danger, fontSize: 13, marginBottom: 16, backgroundColor: 'rgba(239,68,68,0.1)', padding: 12, borderRadius: 10 },

    /* Feed UI Styles */
    emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 20 },
    emptyText: { color: colors.text, fontSize: 16, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
    emptySubText: { color: colors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 20 },
    
    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 12, paddingHorizontal: 16, height: 48, marginBottom: 16, borderWidth: 1, borderColor: colors.transparentBorder },
    searchInput: { flex: 1, marginLeft: 10, color: colors.text, fontSize: 14, padding: 0 },

    topReportBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, shadowColor: colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 3 },
    topReportBtnText: { color: '#fff', fontSize: 13, fontWeight: 'bold', marginLeft: 6 },
    
    card: { backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.transparentBorder, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    cardIconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    cardTitle: { color: colors.text, fontSize: 15, fontWeight: 'bold' },
    cardTime: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
    cardDistance: { color: colors.primary, fontSize: 12, fontWeight: 'bold' },
    cardDesc: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
    cardTagRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, backgroundColor: colors.inputBg, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    cardTagText: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },
    
    cardPhotosGrid: { marginTop: 12, marginBottom: 4 },
    cardDetailPhoto: { width: 120, height: 120, borderRadius: 10, marginRight: 8, borderWidth: 1, borderColor: colors.transparentBorder },
    
    cardActions: { flexDirection: 'row', alignItems: 'center', marginTop: 16, borderTopWidth: 1, borderTopColor: colors.transparentBorder, paddingTop: 12, gap: 16 },
    cardActionBtn: { flexDirection: 'row', alignItems: 'center', padding: 4 },
    cardActionText: { color: colors.textMuted, fontSize: 12, marginLeft: 6, fontWeight: '600' },
});
