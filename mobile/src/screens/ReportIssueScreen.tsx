import React, { useState, useEffect, useRef } from 'react';
import {
    StyleSheet, Text, View, TextInput, TouchableOpacity,
    ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Alert, Image, Animated,
    Modal
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
    ThumbsUp, ThumbsDown, MessageCircle, Search, Radio, RefreshCw, Activity,
    ShieldAlert
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
    const [isDiscussModalOpen, setIsDiscussModalOpen] = useState(false);
    const [activeIssueId, setActiveIssueId] = useState<string | null>(null);
    const [commentText, setCommentText] = useState('');

    const allIssues = useQuery(api.issues.getIssues);
    const issueComments = (useQuery(api.projects.getComments, activeIssueId ? { issueId: activeIssueId as any } : "skip") || []) as any[];

    const reportIssueMutation = useMutation(api.issues.reportIssue);
    const addComment = useMutation(api.projects.addComment);

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

    const handleAddComment = async () => {
        if (!commentText.trim() || !activeIssueId || !user) {
            Alert.alert('Error', 'Please enter a comment');
            return;
        }

        setLoading(true);
        try {
            await addComment({
                issueId: activeIssueId as any,
                userId: user._id || user.email || 'anon',
                authorName: user.name || 'Anonymous citizen',
                text: commentText.trim()
            });
            setCommentText('');
        } catch (e) {
            Alert.alert('Error', 'Failed to add comment');
        } finally {
            setLoading(false);
        }
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
        
        // Filter by status: Remove resolved and rejected from public view
        if (issue.status === 'resolved' || issue.status === 'rejected') return false;

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
                <View style={[styles.header, { justifyContent: 'space-between', marginBottom: 20 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={styles.pageIconContainer}>
                            <MapPin color={colors.primary} size={20} />
                        </View>
                        <View style={{ marginLeft: 12 }}>
                            <Text style={styles.pageTitle}>Nearby Issues</Text>
                            <Text style={styles.pageSubHeader}>500m area pulse</Text>
                        </View>
                    </View>
                    <TouchableOpacity 
                        style={styles.topReportBtn}
                        onPress={() => setIsReporting(true)}
                    >
                        <Plus color="#fff" size={18} />
                    </TouchableOpacity>
                </View>

                {/* Big Prominent Location Card */}
                <View style={styles.glassLocationCard}>
                    <View style={styles.locationHeaderRow}>
                        <View style={styles.pulseContainer}>
                            <PulseRadar colors={colors} />
                            <Text style={styles.locationLabel}> LIVE RADAR</Text>
                        </View>
                        <TouchableOpacity style={styles.refreshBtn} onPress={() => { setLat(''); setLng(''); setAddress(''); }}>
                            <RefreshCw color={colors.primary} size={14} />
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.addressLine} numberOfLines={2}>{address || 'Locating...'}</Text>
                    <View style={styles.coordsRow}>
                        <Clock color={colors.textMuted} size={10} />
                        <Text style={styles.coordsText}>{lat}, {lng}</Text>
                    </View>
                </View>

                <View style={styles.searchContainer}>
                    <Search color={colors.primary} size={18} />
                    <TextInput 
                        style={styles.searchInput}
                        placeholder="Search neighborhood reports..."
                        placeholderTextColor={colors.textMuted}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoCapitalize="none"
                    />
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
                    {nearbyIssues.length === 0 ? (
                        <View style={styles.emptyState}>
                            <View style={styles.emptyIconCircle}>
                                <ShieldAlert color={colors.primary} size={32} />
                            </View>
                            <Text style={styles.emptyText}>Area is currently clear</Text>
                            <Text style={styles.emptySubText}>No civic issues detected within 500m. Everything looks good!</Text>
                            <TouchableOpacity style={styles.emptyReportBtn} onPress={() => setIsReporting(true)}>
                                <Text style={styles.emptyReportBtnText}>Report New Issue</Text>
                            </TouchableOpacity>
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
                                    style={[styles.issueCard, isExpanded && styles.issueCardExpanded]}
                                    activeOpacity={0.9}
                                    onPress={() => setExpandedId(isExpanded ? null : issue._id)}
                                >
                                    <View style={styles.cardHeader}>
                                        <View style={[styles.cardIconBox, { backgroundColor: cat.color + '20' }]}>
                                            <Icon color={cat.color} size={18} />
                                        </View>
                                        <View style={{ flex: 1, marginLeft: 12 }}>
                                            <Text style={styles.cardTitle}>{cat.label}</Text>
                                            <View style={styles.cardMetaRow}>
                                                <Clock color={colors.textMuted} size={10} />
                                                <Text style={styles.cardTime}> {new Date(issue.createdAt).toLocaleDateString()}</Text>
                                            </View>
                                        </View>
                                        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                                            {issue.status === 'in-progress' && (
                                                <View style={[styles.distBadge, { borderColor: '#eab308', backgroundColor: '#eab30810' }]}>
                                                    <Text style={[styles.distBadgeText, { color: '#eab308' }]}>IN PROGRESS</Text>
                                                </View>
                                            )}
                                            <View style={styles.distBadge}>
                                                <Text style={styles.distBadgeText}>{Math.round(dist)}m</Text>
                                            </View>
                                        </View>
                                    </View>
                                    
                                    <Text style={styles.cardDesc} numberOfLines={isExpanded ? undefined : 2}>{issue.description}</Text>
                                    
                                    <View style={styles.cardLocationBox}>
                                        <MapPin color={colors.primary} size={10} />
                                        <Text style={styles.cardLocationText} numberOfLines={1}>
                                            {issue.location.address || 'Precise location not provided'}
                                        </Text>
                                    </View>
                                    
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
                                            <Camera size={10} color={colors.primary} style={{marginRight: 4}} />
                                            <Text style={styles.cardTagText}>{issue.images.length} Evidence Attached</Text>
                                        </View>
                                    )}

                                    {isExpanded && (
                                        <View style={styles.cardActions}>
                                            <TouchableOpacity 
                                                style={[styles.cardActionBtn, (issue.upvotes || []).includes(user?._id || user?.email || 'anon') && styles.cardActionBtnActive]}
                                                onPress={() => toggleUpvote({ issueId: issue._id, userId: user?._id || user?.email || 'anon' })}
                                            >
                                                <ThumbsUp color={(issue.upvotes || []).includes(user?._id || user?.email || 'anon') ? '#fff' : colors.primary} size={14} />
                                                <Text style={[styles.cardActionText, (issue.upvotes || []).includes(user?._id || user?.email || 'anon') && { color: '#fff' }]}>
                                                    {issue.upvotes?.length || 0}
                                                </Text>
                                            </TouchableOpacity>
                                            
                                            <TouchableOpacity 
                                                style={[styles.cardActionBtn, (issue.downvotes || []).includes(user?._id || user?.email || 'anon') && styles.cardActionBtnDanger]}
                                                onPress={() => toggleDownvote({ issueId: issue._id, userId: user?._id || user?.email || 'anon' })}
                                            >
                                                <ThumbsDown color={(issue.downvotes || []).includes(user?._id || user?.email || 'anon') ? '#fff' : colors.textMuted} size={14} />
                                            </TouchableOpacity>
                                            
                                            <View style={{ flex: 1 }} />
                                            
                                            <TouchableOpacity 
                                                style={styles.discussBtn}
                                                onPress={() => {
                                                    setActiveIssueId(issue._id);
                                                    setIsDiscussModalOpen(true);
                                                }}
                                            >
                                                <MessageCircle color="#fff" size={14} />
                                                <Text style={styles.discussBtnText}>Discuss</Text>
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
        <>
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
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

        {/* Discussion Modal */}
        <Modal visible={isDiscussModalOpen} transparent animationType="slide" onRequestClose={() => setIsDiscussModalOpen(false)}>
            <View style={styles.modalOverlay}>
                <View style={styles.commentModal}>
                    <View style={styles.modalHeader}>
                        <View>
                            <Text style={styles.modalTitle}>Community Discussion</Text>
                            <Text style={styles.modalSub}>{issueComments.length} thoughts shared</Text>
                        </View>
                        <TouchableOpacity style={styles.modalClose} onPress={() => setIsDiscussModalOpen(false)}>
                            <X color={colors.textMuted} size={20} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.commentList} showsVerticalScrollIndicator={false}>
                        {issueComments.length === 0 ? (
                            <View style={styles.emptyComments}>
                                <MessageCircle color={colors.transparentBorder} size={40} />
                                <Text style={styles.emptyCommentsText}>No discussions yet. Be the first to speak!</Text>
                            </View>
                        ) : (
                            issueComments.map((comment: any) => (
                                <View key={comment._id} style={styles.commentItem}>
                                    <View style={styles.commentHeader}>
                                        <Text style={styles.commentAuthor}>{comment.authorName}</Text>
                                        <Text style={styles.commentTime}>
                                            {new Date(comment.createdAt).toLocaleDateString()}
                                        </Text>
                                    </View>
                                    <Text style={styles.commentText}>{comment.text}</Text>
                                </View>
                            ))
                        )}
                    </ScrollView>

                    <View style={styles.commentInputRow}>
                        <TextInput
                            style={styles.commentInput}
                            placeholder="Add your thought..."
                            placeholderTextColor={colors.textMuted}
                            value={commentText}
                            onChangeText={setCommentText}
                            multiline
                        />
                        <TouchableOpacity 
                            style={[styles.sendBtn, !commentText.trim() && { opacity: 0.5 }]} 
                            onPress={handleAddComment}
                            disabled={!commentText.trim() || loading}
                        >
                            {loading ? <ActivityIndicator size="small" color="#fff" /> : <Plus color="#fff" size={20} />}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
        </>
    );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 16, paddingTop: 50 },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    pageIconContainer: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primary + '15', alignItems: 'center', justifyContent: 'center' },
    pageTitle: { fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
    pageSubHeader: { fontSize: 10, color: colors.primary, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, marginTop: -2 },
    
    glassLocationCard: { 
        backgroundColor: colors.card,
        borderRadius: 20,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: colors.primary + '30',
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 4,
    },
    locationHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    pulseContainer: { flexDirection: 'row', alignItems: 'center' },
    locationLabel: { fontSize: 10, color: colors.primary, fontWeight: '900', letterSpacing: 1.5 },
    refreshBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.inputBg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.transparentBorder },
    addressLine: { fontSize: 16, fontWeight: 'bold', color: colors.text, marginBottom: 8, lineHeight: 22 },
    coordsRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    coordsText: { fontSize: 11, color: colors.textMuted, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },

    pageSub: { fontSize: 13, color: colors.textMuted, marginBottom: 20, fontWeight: '500' },
    label: { fontSize: 11, color: colors.textMuted, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: '700' },
    input: { backgroundColor: colors.inputBg, borderRadius: 14, padding: 16, color: colors.text, fontSize: 15, marginBottom: 16, borderWidth: 1, borderColor: colors.transparentBorder },
    smallInput: { backgroundColor: colors.inputBg + '40', borderRadius: 12, padding: 12, color: colors.textMuted, fontSize: 12, marginBottom: 16, borderWidth: 1, borderColor: colors.transparentBorder },
    rowInputs: { flexDirection: 'row' },
    divider: { height: 1, backgroundColor: colors.transparentBorder, marginVertical: 24 },
    sectionHead: { fontSize: 16, fontWeight: 'bold', color: colors.text },
    
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20, gap: 10 },
    chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.transparentBorder },
    chipText: { fontSize: 13, color: colors.textMuted, fontWeight: '700' },
    
    photoContainer: { marginBottom: 20 },
    photoWrapper: { position: 'relative', marginRight: 14 },
    photo: { width: 90, height: 90, borderRadius: 16, borderWidth: 1, borderColor: colors.transparentBorder },
    removePhoto: { position: 'absolute', top: -8, right: -8, backgroundColor: colors.danger, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.background, zIndex: 10 },
    addPhotoBtn: { width: 90, height: 90, borderRadius: 16, borderWidth: 1, borderColor: colors.primary, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary + '08' },
    addPhotoText: { fontSize: 10, color: colors.primary, marginTop: 6, fontWeight: '800', textTransform: 'uppercase' },
    
    btn: { backgroundColor: colors.primary, borderRadius: 16, padding: 18, alignItems: 'center', marginTop: 10, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6 },
    btnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
    cancelBtn: { padding: 18, alignItems: 'center' },
    cancelBtnText: { color: colors.textMuted, fontSize: 15, fontWeight: '700' },
    error: { color: colors.danger, fontSize: 13, marginBottom: 20, backgroundColor: 'rgba(239,68,68,0.1)', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)' },

    /* Feed UI Styles */
    emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, paddingHorizontal: 32 },
    emptyIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary + '10', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
    emptyText: { color: colors.text, fontSize: 18, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
    emptySubText: { color: colors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 22, opacity: 0.8 },
    emptyReportBtn: { marginTop: 24, backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
    emptyReportBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
    
    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 16, paddingHorizontal: 16, height: 52, marginBottom: 20, borderWidth: 1, borderColor: colors.transparentBorder },
    searchInput: { flex: 1, marginLeft: 12, color: colors.text, fontSize: 15, padding: 0, fontWeight: '500' },

    topReportBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
    
    issueCard: { backgroundColor: colors.card, borderRadius: 20, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: colors.transparentBorder, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
    issueCardExpanded: { borderColor: colors.primary + '40', shadowOpacity: 0.1 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
    cardIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    cardTitle: { color: colors.text, fontSize: 16, fontWeight: 'bold' },
    cardMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
    cardTime: { color: colors.textMuted, fontSize: 11, fontWeight: '500' },
    distBadge: { backgroundColor: colors.inputBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1, borderColor: colors.transparentBorder },
    distBadgeText: { color: colors.primary, fontSize: 11, fontWeight: 'bold' },
    cardDesc: { color: (isDark ? 'rgba(255,255,255,0.7)' : '#444'), fontSize: 14, lineHeight: 22 },
    cardTagRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14, backgroundColor: colors.primary + '10', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
    cardTagText: { color: colors.primary, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
    
    cardPhotosGrid: { marginTop: 16, marginBottom: 4 },
    cardDetailPhoto: { width: 140, height: 140, borderRadius: 14, marginRight: 10, backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.transparentBorder },
    
    cardActions: { flexDirection: 'row', alignItems: 'center', marginTop: 18, borderTopWidth: 1, borderTopColor: colors.transparentBorder, paddingTop: 16, gap: 12 },
    cardActionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.inputBg, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: colors.transparentBorder },
    cardActionBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    cardActionBtnDanger: { backgroundColor: colors.danger, borderColor: colors.danger },
    cardActionText: { color: colors.textMuted, fontSize: 13, marginLeft: 8, fontWeight: '700' },
    discussBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.text, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, gap: 8 },
    discussBtnText: { color: colors.background, fontSize: 13, fontWeight: 'bold' },
    cardLocationBox: { flexDirection: 'row', alignItems: 'center', marginTop: 10, backgroundColor: colors.inputBg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start' },
    cardLocationText: { fontSize: 11, color: colors.textMuted, marginLeft: 4, fontWeight: '600' },
    
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    commentModal: { backgroundColor: colors.card, borderTopLeftRadius: 30, borderTopRightRadius: 30, height: '70%', padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 20, color: colors.text, fontWeight: 'bold' },
    modalSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    modalClose: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.inputBg, alignItems: 'center', justifyContent: 'center' },
    
    commentList: { flex: 1 },
    emptyComments: { alignItems: 'center', marginTop: 40, opacity: 0.5 },
    emptyCommentsText: { color: colors.textMuted, marginTop: 12, fontSize: 14, textAlign: 'center' },
    
    commentItem: { backgroundColor: colors.inputBg, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.transparentBorder },
    commentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    commentAuthor: { fontWeight: 'bold', color: colors.text, fontSize: 14 },
    commentTime: { fontSize: 11, color: colors.textMuted },
    commentText: { fontSize: 14, color: colors.text, lineHeight: 20 },
    
    commentInputRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16, gap: 12 },
    commentInput: { flex: 1, backgroundColor: colors.inputBg, borderRadius: 15, paddingHorizontal: 16, paddingVertical: 12, color: colors.text, fontSize: 14, maxHeight: 100, borderWidth: 1, borderColor: colors.transparentBorder },
    sendBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
});
