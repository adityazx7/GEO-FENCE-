import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, StatusBar, Platform, TouchableOpacity, Modal, Image, Alert, Animated } from 'react-native';


// Only import WebView on native platforms — it crashes Expo Web
let WebView: any = null;
if (Platform.OS !== 'web') {
    try {
        WebView = require('react-native-webview').WebView;
    } catch (e) {
        console.warn('react-native-webview not available');
    }
}
import * as Location from 'expo-location';
import { startBackgroundLocationTracking, stopBackgroundLocationTracking } from '../services/BackgroundLocation';
import { registerForPushNotifications } from '../services/PushNotifications';
import { useQuery, useAction, useMutation } from 'convex/react';
import { api } from '@backend/_generated/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { 
    MapPin, Bell, RefreshCw, Maximize2, X, Activity, Sparkles, 
    Navigation, List, ShieldAlert, ThumbsDown, 
    MessageSquare, User, Trash2, CheckCircle, AlertTriangle,
    Clock, XCircle, Info, ChevronRight, Search, Radio, Wallet, 
    Rocket,
    TrainFront,
    Car,
    Package,
    Construction
} from 'lucide-react-native';

interface NotificationAlert {
    id: string;
    projectId: string;
    projectName: string;
    message: string;
    time: Date;
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function formatBudget(amount: number | undefined): string {
    if (amount === undefined || amount === null) return '₹0';
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)} Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)} L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)} K`;
    return `₹${amount}`;
}



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

export default function HomeScreen({ onViewWork }: { onViewWork?: (id: string) => void }) {
    const { user } = useAuth();
    const { colors, isDark } = useTheme();
    const styles = createStyles(colors, isDark);

    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const [address, setAddress] = useState<string>('Detecting location...');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [isMapExpanded, setIsMapExpanded] = useState(false);
    const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);
    const [showAllWorks, setShowAllWorks] = useState(false);

    const projects = useQuery(api.projects.list) || [];
    const readProjectIds = useQuery(api.projects.getReadProjects, { userId: user?._id || '' }) || [];
    const userNotifications = (useQuery(api.notifications.listForUser, { userId: user?._id || '' }) || []) as any[];
    const recentEntries = (useQuery(api.projects.getRecentGeofenceEntries, { userId: user?._id || '' }) || []) as any[];
    
    const unreadCount = userNotifications.filter((n: any) => n.status !== 'read').length;
    const markReadMutation = useMutation(api.projects.markRead);
    const translateText = useAction(api.ai.translateText);
    const updateLocation = useMutation(api.users.updateLocation);
    const calculateProximity = useAction(api.geospatial.calculateProximity);
    const deleteAllNotifs = useMutation(api.notifications.deleteAllForUser);
    const updateBatchTimer = useMutation(api.users.updateBatchTimer);
    const savePushToken = useMutation(api.projects.savePushToken);
    const markAllRead = useMutation(api.notifications.markAllRead);
    const clearRecentEntries = useMutation(api.projects.clearRecentGeofences);
    
    // ===== Push Notification + Background Location Registration =====
    useEffect(() => {
        if (!user?._id) return;

        const CONVEX_URL = process.env.EXPO_PUBLIC_CONVEX_URL || 'https://befitting-chipmunk-858.convex.cloud';

        // 1. Register for push notifications and save token to DB
        (async () => {
            try {
                const token = await registerForPushNotifications();
                if (token) {
                    await savePushToken({ userId: user._id as any, token });
                    console.log('[HomeScreen] Push token saved:', token);
                }
            } catch (e) {
                console.warn('[HomeScreen] Push token registration failed:', e);
            }
        })();

        // 2. Start background location tracking (100m trigger)
        startBackgroundLocationTracking(user._id, CONVEX_URL);

        return () => {
            // Cleanup on unmount (e.g. logout)
            stopBackgroundLocationTracking();
        };
    }, [user?._id]);
    
    // Custom Icon Mapping with Glow
    const getProjectIcon = (type: string) => {
        const t = (type || '').toLowerCase();
        if (t.includes('bridge')) return Construction;
        if (t.includes('education') || t.includes('school')) return Rocket;
        if (t.includes('hospital') || t.includes('health')) return Activity;
        if (t.includes('metro') || t.includes('rail')) return TrainFront;
        if (t.includes('road') || t.includes('highway')) return Car;
        return Package;
    };

    const fetchLocation = async () => {
        setRefreshing(true);
        try {
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
            setLocation(loc);
            
            // Manual check on refresh
            if (user?._id) {
                await calculateProximity({
                    citizenId: user._id,
                    citizenLat: loc.coords.latitude,
                    citizenLng: loc.coords.longitude,
                    speed: loc.coords.speed || 0
                });
            }

            // Get human-readable address
            const reverseGeocode = await Location.reverseGeocodeAsync({
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
            });

            if (reverseGeocode.length > 0) {
                const first = reverseGeocode[0];
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
                ].filter((p, i, arr) => {
                    const clean = p ? p.trim() : '';
                    return clean && arr.indexOf(p) === i;
                });
                
                const addr = parts.join(', ');
                setAddress(addr || 'Unknown Location');
            }
        } catch(e) {}
        setRefreshing(false);
    };

    useEffect(() => {
        let subscription: Location.LocationSubscription | null = null;
        
        const startTracking = async () => {
            setRefreshing(true);
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') { setErrorMsg('Location denied'); return; }
                
                subscription = await Location.watchPositionAsync(
                    { accuracy: Location.Accuracy.High, distanceInterval: 10 },
                    async (loc) => {
                        setLocation(loc);
                        // Sync with backend
                        try {
                            await updateLocation({ 
                                clerkId: user?._id || '', 
                                lat: loc.coords.latitude, 
                                lng: loc.coords.longitude 
                            });
                            await calculateProximity({
                                citizenId: user?._id || '',
                                citizenLat: loc.coords.latitude,
                                citizenLng: loc.coords.longitude,
                                speed: loc.coords.speed || 0
                            });
                        } catch (e) {
                            console.log("Sync location error:", e);
                        }

                        // Also update address for the header box
                        try {
                            const rev = await Location.reverseGeocodeAsync({
                                latitude: loc.coords.latitude,
                                longitude: loc.coords.longitude
                            });
                            if (rev.length > 0) {
                                const a = rev[0];
                                const parts = [
                                    a.name,
                                    a.streetNumber ? `${a.streetNumber} ${a.street}` : a.street,
                                    a.subregion,
                                    a.district || a.city,
                                    a.region,
                                    a.postalCode
                                ].filter(Boolean);
                                const addr = parts.join(', ');
                                setAddress(addr || 'Unknown Location');
                            }
                        } catch (e) {}
                    }
                );

                // Check proximity immediately on start
                const currentLoc = await Location.getCurrentPositionAsync({});
                
                // Initial address fetch
                try {
                    const rev = await Location.reverseGeocodeAsync({
                        latitude: currentLoc.coords.latitude,
                        longitude: currentLoc.coords.longitude
                    });
                    if (rev.length > 0) {
                        const a = rev[0];
                        const parts = [
                            a.name,
                            a.streetNumber ? `${a.streetNumber} ${a.street}` : a.street,
                            a.subregion,
                            a.district || a.city,
                            a.region,
                            a.postalCode
                        ].filter(Boolean);
                        const addr = parts.join(', ');
                        setAddress(addr || 'Unknown Location');
                    }
                } catch (e) {}

                if (user?._id) {
                    await calculateProximity({
                        citizenId: user._id,
                        citizenLat: currentLoc.coords.latitude,
                        citizenLng: currentLoc.coords.longitude,
                        speed: currentLoc.coords.speed || 0
                    });
                }
            } catch (e) {
                console.log("Tracking error:", e);
                setErrorMsg('Could not get location');
            } finally {
                setRefreshing(false);
            }
        };
        
        startTracking();

        const timeoutId = setTimeout(() => {
            setAddress(prev => {
                if (prev === 'Detecting location...') {
                    if (location) return `${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)}`;
                    return user?.city || user?.state || 'Current Location';
                }
                return prev;
            });
        }, 3000);

        return () => {
            subscription?.remove();
            clearTimeout(timeoutId);
        };
    }, [user?._id]);

    const handleClearAll = () => {
        if (!user?._id) return;
        Alert.alert(
            "Clear All", 
            "Remove all notifications?", 
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Clear", 
                    onPress: async () => {
                        try {
                            await deleteAllNotifs({ userId: user._id });
                            setIsNotifModalOpen(false);
                        } catch (err) {
                            Alert.alert("Error", "Failed to clear notifications");
                        }
                    }, 
                    style: 'destructive' 
                }
            ]
        );
    };

    const handleMarkAllRead = async () => {
        if (!user?._id) return;
        try {
            await markAllRead({ userId: user._id });
        } catch (e) {
            Alert.alert("Error", "Could not mark notifications as read.");
        }
    };

    const handleMapMessage = (event: any) => {
        try {
            const msg = typeof event.nativeEvent?.data === 'string' ? JSON.parse(event.nativeEvent.data) : event.data ? JSON.parse(event.data) : null;
            if (!msg) return;

            const { type, data } = msg;

            if (type === 'VIEW_PROJECT' && onViewWork) {
                // Handle both message formats for compatibility
                const projectId = data?.id || msg.id;
                if (projectId) {
                    setIsMapExpanded(false);
                    onViewWork(projectId);
                }
            } else if (type === 'TOGGLE_WORKS') {
                setShowAllWorks(prev => !prev);
            } else if (type === 'MARK_READ') {
                const projectId = data?.id || msg.id;
                if (projectId && user?._id) {
                    markReadMutation({ projectId: projectId as any, userId: user._id });
                }
            }
        } catch (e) {
            // Ignore non-json messages (like react devtools)
        }
    };

    useEffect(() => {
        if (Platform.OS === 'web') {
            const handleWebMessage = (event: MessageEvent) => {
                if (event.data && typeof event.data === 'string') {
                    // Re-use existing handler logic
                    handleMapMessage({ data: event.data });
                }
            };
            window.addEventListener('message', handleWebMessage);
            return () => window.removeEventListener('message', handleWebMessage);
        }
    }, [onViewWork, user?._id]);
    
    // Calculate nearby projects in JS using local coordinates for immediate UI feedback
    const userRadius = user?.notificationRadius || 500;
    const nearbyProjects = location
        ? (projects || [])
            .filter((p: any) => p && p.location && typeof p.location.lat === 'number' && typeof p.location.lng === 'number')
            .map((p: any) => ({
                ...p,
                distance: haversineDistance(
                    location.coords.latitude, location.coords.longitude,
                    p.location.lat, p.location.lng
                ),
            }))
            .filter((p: any) => p.distance <= userRadius)
            .filter((p: any) => showAllWorks || !readProjectIds.includes(p._id))
            .sort((a: any, b: any) => a.distance - b.distance)
        : [];


    const allProjectsByDate = (projects || [])
        .slice()
        .sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0))
        .slice(0, 15);

    const getInitials = (name: string) => (name || '').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
    const statusColor = (s: string) => s === 'completed' ? colors.success : s === 'in_progress' ? colors.warning : colors.iconDefault;

    const generateLeafletHtml = (isExpanded: boolean = false) => {
        if (!location) return '';
        
        const userLat = location.coords.latitude;
        const userLng = location.coords.longitude;
        const mapUrl = isDark ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
        
        // Filter projects with valid location
        const displayedProjects = (projects || [])
            .filter((p: any) => p && p.location && typeof p.location.lat === 'number' && typeof p.location.lng === 'number')
            .filter((p: any) => showAllWorks || !readProjectIds.includes(p._id));

        const markersJson = JSON.stringify(displayedProjects.map((p: any) => ({
            _id: p._id,
            lat: p.location.lat,
            lng: p.location.lng,
            name: p.name || 'Project',
            type: p.type || 'Other',
            status: p.status || 'planned',
            budget: p.budget || 0,
            areaImpact: p.areaImpact || '',
            image: (p.afterImages && p.afterImages.length > 0) ? p.afterImages[0] : null,
            distance: haversineDistance(userLat, userLng, p.location.lat, p.location.lng)
        })));

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
                <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
                <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
                <style>
                    body { margin: 0; padding: 0; background: ${colors.background}; font-family: -apple-system, sans-serif; overflow: hidden; }
                    #map { height: 100vh; width: 100%; border-radius: ${isExpanded ? '0' : '12px'}; }
                    
                    /* Glass UI Base */
                    .glass-panel {
                        background: ${isDark ? 'rgba(15, 23, 42, 0.75)' : 'rgba(255, 255, 255, 0.85)'};
                        backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
                        border: 1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'};
                        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                        color: ${colors.text};
                    }

                    /* Mini Legend */
                    .mini-legend {
                        position: absolute; bottom: ${isExpanded ? '24px' : '15px'}; left: ${isExpanded ? '20px' : '10px'}; z-index: 1000;
                        padding: ${isExpanded ? '12px 14px' : '8px 10px'}; 
                        border-radius: ${isExpanded ? '14px' : '10px'}; 
                        font-size: ${isExpanded ? '13px' : '10px'};
                        display: flex; flex-direction: column; gap: ${isExpanded ? '8px' : '6px'}; 
                        font-weight: 600;
                        pointer-events: none;
                    }
                    .leg-row { display: flex; align-items: center; gap: 8px; }
                    .leg-dot { width: ${isExpanded ? '14px' : '10px'}; height: ${isExpanded ? '14px' : '10px'}; border-radius: 50%; border: 1.5px solid rgba(255,255,255,0.8); }
                    
                    /* Toggle Button */
                    .toggle-btn {
                        position: absolute; top: ${isExpanded ? '24px' : '10px'}; left: ${isExpanded ? '20px' : '10px'}; z-index: 1000;
                        padding: ${isExpanded ? '10px 14px' : '6px 10px'}; 
                        border-radius: ${isExpanded ? '20px' : '16px'}; 
                        font-size: ${isExpanded ? '13px' : '11px'};
                        font-weight: 600; cursor: pointer;
                        display: flex; align-items: center; gap: 6px;
                        transition: all 0.2s ease;
                    }
                    .toggle-btn.active {
                        background: ${colors.primary}; color: white; border-color: ${colors.primary};
                        box-shadow: 0 0 14px ${colors.primary}40;
                    }

                    /* Custom Popup */
                    .leaflet-popup-content-wrapper { background: ${colors.card}; color: ${colors.text}; border-radius: 12px; padding: 0; overflow: hidden; border: 1px solid ${colors.transparentBorder}; box-shadow: 0 8px 24px rgba(0,0,0,0.3); }
                    .leaflet-popup-tip { background: ${colors.card}; }
                    .leaflet-popup-content { margin: ${isExpanded ? '16px' : '12px'}; }
                    .leaflet-container a.leaflet-popup-close-button { color: ${colors.textMuted}; right: 8px; top: 8px; }
                </style>
            </head>
            <body>
                <div id="map"></div>
                
                <div class="glass-panel mini-legend">
                    <div class="leg-row"><div class="leg-dot" style="background:#ef4444; box-shadow: 0 0 12px #ef4444, 0 0 20px #ef4444"></div> &gt; 1 Cr</div>
                    <div class="leg-row"><div class="leg-dot" style="background:#f59e0b; box-shadow: 0 0 12px #f59e0b, 0 0 20px #f59e0b"></div> 10 L - 1 Cr</div>
                    <div class="leg-row"><div class="leg-dot" style="background:#10b981; box-shadow: 0 0 12px #10b981, 0 0 20px #10b981"></div> &lt; 10 L</div>
                </div>

                <div class="toggle-btn ${showAllWorks ? 'active' : 'glass-panel'}" onclick="sendAction('TOGGLE_WORKS')">
                    <svg width="${isExpanded ? '16' : '14'}" height="${isExpanded ? '16' : '14'}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
                    ${showAllWorks ? 'All Works' : 'New Only'}
                </div>

                <script>
                    function formatBudgetText(amount) {
                        if (!amount) return '₹0';
                        if (amount >= 10000000) return '₹' + (amount / 10000000).toFixed(1) + ' Cr';
                        if (amount >= 100000) return '₹' + (amount / 100000).toFixed(1) + ' L';
                        if (amount >= 1000) return '₹' + (amount / 1000).toFixed(1) + ' K';
                        return '₹' + amount;
                    }

                    window.sendAction = function(type, id) {
                        const msg = JSON.stringify({ type: type, id: id });
                        if (window.ReactNativeWebView) {
                            window.ReactNativeWebView.postMessage(msg);
                        } else {
                            window.parent.postMessage(msg, '*');
                        }
                    };

                    const map = L.map('map', { zoomControl: false, attributionControl: false }).setView([${userLat}, ${userLng}], 15);
                    L.tileLayer('${mapUrl}').addTo(map);

                    const userSvg = \`
                        <svg width="46" height="46" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0px 8px 12px rgba(0,0,0,0.5));">
                          <!-- Outer Teardrop/Pin -->
                          <path d="M50 85 C 50 85, 20 50, 20 35 A 30 30 0 1 1 80 35 C 80 50, 50 85, 50 85 Z" fill="#ff8a65" stroke="#4b3e33" stroke-width="5" stroke-linejoin="round"/>
                          
                          <!-- Inner red shadow curve -->
                          <path d="M50 74 C 50 74, 27 48, 27 35 A 23 23 0 1 1 73 35 C 73 48, 50 74, 50 74 Z" fill="none" stroke="#ff5252" stroke-width="4"/>
                          
                          <!-- Center White Circle -->
                          <circle cx="50" cy="35" r="18" fill="white" stroke="#4b3e33" stroke-width="5"/>
                          
                          <!-- Person Head -->
                          <circle cx="50" cy="26" r="5" fill="#ffcc80" stroke="#4b3e33" stroke-width="4"/>
                          
                          <!-- Person Body -->
                          <path d="M 38 43 A 12 12 0 0 1 62 43 Z" fill="#fde047" stroke="#4b3e33" stroke-width="4" stroke-linejoin="round"/>
                        </svg>
                    \`;

                    const userIcon = L.divIcon({ className: '', html: userSvg, iconSize: [46, 46], iconAnchor: [23, 39] });
                    L.marker([${userLat}, ${userLng}], { icon: userIcon, zIndexOffset: 1000 }).addTo(map);

                    // Add Radius Circle
                    L.circle([${userLat}, ${userLng}], {
                        radius: ${userRadius},
                        color: '${colors.primary}',
                        fillColor: '${colors.primary}',
                        fillOpacity: 0.1,
                        weight: 1,
                        dashArray: '5, 5'
                    }).addTo(map);

                    const projects = ${markersJson};
                    projects.forEach(p => {
                        let bgColor = '#10b981'; 
                        if (p.budget >= 10000000) bgColor = '#ef4444'; 
                        else if (p.budget >= 1000000) bgColor = '#f59e0b'; 
                        
                        const iconHtml = '<div style="background: ' + bgColor + '; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 12px ' + bgColor + ', 0 0 24px ' + bgColor + ';"></div>';
                        const icon = L.divIcon({
                            className: '', html: iconHtml, iconSize: [14, 14]
                        });
                        
                        const popupHtml = \`
                            <div style="width: 180px; font-family: -apple-system, sans-serif;">
                                \${p.image ? \`<img src="\${p.image}" style="width: 100%; height: \${${isExpanded ? '120' : '80'}}px; object-fit: cover; border-radius: 6px; margin-bottom: 8px;" />\` : ''}
                                <h4 style="margin: 0 0 4px 0; font-size: \${${isExpanded ? '15' : '13'}}px; font-weight: 700; color: ${colors.text}; line-height: 1.2;">
                                    \${p.name}
                                </h4>
                                <div style="display: flex; justify-content: space-between; font-size: \${${isExpanded ? '11' : '10'}}px; color: ${colors.textMuted}; margin-bottom: 6px;">
                                    <span style="font-weight: 600; color: ${colors.primary};">\${formatBudgetText(p.budget)}</span>
                                    <span>\${Math.round(p.distance)}m away</span>
                                </div>
                                \${p.areaImpact ? \`<div style="font-size: \${${isExpanded ? '11' : '10'}}px; color: ${colors.textMuted}; margin-bottom: \${${isExpanded ? '14' : '10'}}px; line-height: 1.3;">\${p.areaImpact}</div>\` : ''}
                                
                                <button onclick="sendAction('VIEW_PROJECT', '\${p._id}')" style="width: 100%; padding: \${${isExpanded ? '10' : '8'}}px; background: ${colors.primary}; color: white; border: none; border-radius: 6px; font-size: \${${isExpanded ? '12' : '11'}}px; font-weight: 600; cursor: pointer;">
                                    Tap to see details
                                </button>
                            </div>
                        \`;

                        L.marker([p.lat, p.lng], { icon: icon }).addTo(map).bindPopup(popupHtml);
                    });
                </script>
            </body>
            </html>
        `;
    };


    const renderProjectCard = (project: any, isHighlight: boolean = false) => (
        <TouchableOpacity 
            key={project._id} 
            style={[
                isHighlight ? styles.projectCardHighlight : styles.projectCard,
                { overflow: 'hidden' }
            ]}
            onPress={() => onViewWork && onViewWork(project._id)}
            activeOpacity={0.8}
        >
            {/* Subtle Gradient Hint */}
            <View style={{ 
                position: 'absolute', top: 0, left: 0, width: 4, height: '100%', 
                backgroundColor: statusColor(project.status) 
            }} />
            
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                {project.afterImages && project.afterImages.length > 0 ? (
                    <Image source={{ uri: project.afterImages[0] }} style={[styles.thumbnail, { width: 84, height: 84, borderRadius: 16 }]} />
                ) : (
                    <View style={[styles.thumbnail, { width: 84, height: 84, borderRadius: 16, backgroundColor: colors.inputBg, alignItems: 'center', justifyContent: 'center' }]}>
                        {React.createElement(getProjectIcon(project.type), { color: colors.textMuted, size: 24 })}
                    </View>
                )}
                
                <View style={{ flex: 1, marginLeft: 6 }}>
                    <View style={[styles.projectHeader, { marginBottom: 6 }]}>
                        <View style={styles.iconGlowContainer}>
                            {React.createElement(getProjectIcon(project.type), {
                                color: colors.primary,
                                size: 12
                            })}
                        </View>
                        <Text style={[styles.projectType, { fontSize: 9, opacity: 0.8 }]}>{project.type.toUpperCase()}</Text>
                        
                        <View style={styles.headerRightBadges}>
                            <View style={styles.budgetBadge}>
                                <Wallet color={colors.primary} size={10} style={{ marginRight: 4 }} />
                                <Text style={styles.budgetText}>{formatBudget(project.budget)}</Text>
                            </View>

                            {project.distance !== undefined && (
                                <View style={[styles.distBadge, { backgroundColor: project.distance <= userRadius ? colors.success + '15' : 'transparent', borderColor: project.distance <= userRadius ? colors.success + '40' : colors.transparentBorder }]}>
                                    <Text style={[styles.distText, { color: project.distance <= userRadius ? colors.success : colors.textMuted, fontSize: 9 }]}>{Math.round(project.distance)}m</Text>
                                </View>
                            )}
                        </View>
                    </View>
                    
                    <Text style={[styles.projectName, { fontSize: 16, marginBottom: 4 }]} numberOfLines={1}>{project.name}</Text>
                    <Text style={[styles.projectDesc, { fontSize: 13, marginBottom: 10, opacity: 0.7 }]} numberOfLines={2}>{project.description}</Text>
                    
                    <View style={styles.projectFooter}>
                        <View style={styles.authorRow}>
                            <User color={colors.primary} size={10} />
                            <Text style={[styles.authorName, { fontSize: 10, color: colors.text }]}>{project.authorName || 'Govt Dept'}</Text>
                        </View>
                        
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginLeft: 8 }}>
                            <MapPin color={colors.textMuted} size={10} style={{ marginRight: 4 }} />
                            <Text style={[styles.statValue, { fontSize: 10, color: colors.textMuted, flexShrink: 1 }]} numberOfLines={1}>
                                {project.location?.address?.split(',')[0] || project.city || project.state || 'N/A'}
                            </Text>
                        </View>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );


    return (
        <View style={styles.container}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                <View style={styles.header}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{getInitials(user?.name || 'U')}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.greeting}>Hello, {(user?.name || 'there').split(' ')[0]}!</Text>
                        <View style={[styles.locationBox, { height: 'auto', minHeight: 34, paddingVertical: 6, paddingHorizontal: 12 }]}>
                            <MapPin color={colors.primary} size={12} />
                            <Text style={[styles.locationText, { flex: 1, height: 'auto' }]}>
                                {[user?.city, user?.state].filter(Boolean).join(', ') || 'Location not set'}
                            </Text>
                        </View>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <TouchableOpacity style={styles.iconBtn} onPress={() => setIsNotifModalOpen(true)}>
                            <Bell color={colors.text} size={20} />
                            {unreadCount > 0 && (
                                <View style={styles.notifBadge} />
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.iconBtn} onPress={fetchLocation} disabled={refreshing}>
                            {refreshing ? <Activity color={colors.text} size={20} /> : <RefreshCw color={colors.text} size={18} />}
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Live Area Radar Box */}
                <View style={styles.card}>
                    <View style={styles.labelRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <PulseRadar colors={colors} />
                            <Text style={styles.cardTitle}> Live Area Radar</Text>
                        </View>
                        <View style={styles.liveBadge}>
                            <View style={styles.liveDot} />
                            <Text style={styles.liveText}>{userRadius}m Focus</Text>
                        </View>
                    </View>
                    
                    {location ? (
                        <>
                            <View style={styles.gpsRow}>
                                <View style={[styles.gpsBox, { marginRight: 5 }]}>
                                    <Text style={styles.gpsLabel}>LATITUDE</Text>
                                    <Text style={styles.gpsValue}>{location?.coords?.latitude?.toFixed(5)}</Text>
                                </View>
                                <View style={[styles.gpsBox, { marginLeft: 5 }]}>
                                    <Text style={styles.gpsLabel}>LONGITUDE</Text>
                                    <Text style={styles.gpsValue}>{location?.coords?.longitude?.toFixed(5)}</Text>
                                </View>
                            </View>
                            
                            {/* Big Location Address Card */}
                            {address ? (
                                <View style={{
                                    backgroundColor: colors.inputBg,
                                    borderRadius: 16,
                                    padding: 16,
                                    marginBottom: 12,
                                    borderWidth: 1,
                                    borderColor: colors.primary + '30',
                                    shadowColor: colors.primary,
                                    shadowOffset: { width: 0, height: 0 },
                                    shadowOpacity: 0.2,
                                    shadowRadius: 10,
                                    elevation: 4,
                                    flexDirection: 'row',
                                    alignItems: 'flex-start',
                                    gap: 12,
                                }}>
                                    <View style={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: 12,
                                        backgroundColor: colors.primary + '20',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        shadowColor: colors.primary,
                                        shadowOffset: { width: 0, height: 0 },
                                        shadowOpacity: 0.8,
                                        shadowRadius: 6,
                                        elevation: 4,
                                        flexShrink: 0,
                                    }}>
                                        <Navigation color={colors.primary} size={20} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 10, color: colors.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4 }}>
                                            Current Location
                                        </Text>
                                        <Text style={{ fontSize: 15, color: colors.text, fontWeight: '600', lineHeight: 22 }}>
                                            {address}
                                        </Text>
                                    </View>
                                </View>
                            ) : null}

                            {Platform.OS === 'web' ? (
                                <View style={styles.mapContainer}>
                                    <View style={{ position: 'relative' }}>
                                        <iframe
                                            srcDoc={generateLeafletHtml()}
                                            style={{ width: '100%', height: 220, border: 'none', borderRadius: 12 }}
                                        />
                                        <TouchableOpacity 
                                            style={styles.expandBtn}
                                            onPress={() => setIsMapExpanded(true)}
                                        >
                                            <Maximize2 color="#fff" size={16} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ) : (
                                <View style={styles.mapContainer}>
                                    <View style={{ position: 'relative' }}>
                                        <WebView
                                            originWhitelist={['*']}
                                            source={{ html: generateLeafletHtml() }}
                                            style={{ height: 220, backgroundColor: 'transparent' }}
                                            scrollEnabled={false}
                                            onMessage={handleMapMessage}
                                        />
                                        <TouchableOpacity 
                                            style={styles.expandBtn}
                                            onPress={() => setIsMapExpanded(true)}
                                        >
                                            <Maximize2 color="#fff" size={16} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}
                        </>
                    ) : (
                        <View style={styles.mapPlaceholder}>
                            <Activity color={colors.textMuted} size={24} />
                            <Text style={styles.muted}>{errorMsg || 'Acquiring GPS...'}</Text>
                        </View>
                    )}
                </View>


                {/* Within Dynamic Radius Section */}
                <View style={styles.sectionHeaderRow}>
                    <PulseRadar colors={colors} />
                    <Text style={styles.sectionTitle}> Within {userRadius}m Radar</Text>
                </View>
                <Text style={styles.sectionSub}>Hyper-local projects affecting your current spot</Text>


                {nearbyProjects.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <ShieldAlert color={colors.iconDefault} size={28} style={{ marginBottom: 12 }} />
                        <Text style={styles.muted}>
                            {location ? `No projects detected in ${userRadius}m radius.` : 'Waiting for GPS...'}
                        </Text>
                    </View>
                ) : (
                    nearbyProjects.map((project: any) => renderProjectCard(project, true))
                )}

                {/* Recent Geofences Section */}
                <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
                    <Clock color={colors.primary} size={20} />
                    <Text style={styles.sectionTitle}> Recent Geofences</Text>
                    {recentEntries.length > 0 && (
                        <View style={[styles.liveBadge, { marginLeft: 'auto', backgroundColor: colors.primary + '20' }]}>
                            <Text style={[styles.liveText, { color: colors.primary }]}>{recentEntries.length} In-Window</Text>
                        </View>
                    )}
                    <TouchableOpacity 
                        style={{ marginLeft: 6, padding: 8, backgroundColor: colors.card, borderRadius: 10, borderWidth: 1, borderColor: colors.transparentBorder }}
                        onPress={() => {
                            if (user?._id) {
                                Alert.alert("Clear Recent", "Delete all recent geofence logs forever?", [
                                    { text: "Cancel", style: "cancel" },
                                    { 
                                        text: "Delete", 
                                        onPress: async () => {
                                            try {
                                                const result = await clearRecentEntries({ userId: user._id });
                                                console.log("[HomeScreen] Clear result:", result);
                                                // No need for alert on success if cards just disappear, 
                                                // but let's add one if count is 0 to explain
                                                if (result && (result as any).count === 0) {
                                                    Alert.alert("Info", "No entries found to delete.");
                                                }
                                            } catch (e) {
                                                console.error("[HomeScreen] Clear failed:", e);
                                                Alert.alert("Error", "Failed to clear geofences.");
                                            }
                                        }, 
                                        style: 'destructive' 
                                    }
                                ]);
                            }
                        }}
                    >
                        <Trash2 color={colors.danger} size={14} />
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={{ marginLeft: 6, padding: 8, backgroundColor: colors.card, borderRadius: 10, borderWidth: 1, borderColor: colors.transparentBorder }}
                        onPress={() => {
                            if (user?._id) {
                                Alert.alert("Refresh Window", "Mark these as seen and start a fresh monitoring window?", [
                                    { text: "Cancel", style: "cancel" },
                                    { text: "Refresh", onPress: () => updateBatchTimer({ userId: user._id }) }
                                ]);
                            }
                        }}
                    >
                        <RefreshCw color={colors.primary} size={14} />
                    </TouchableOpacity>
                </View>
                <Text style={styles.sectionSub}>Works saved during your {user?.notificationFrequency || 'current'} window</Text>

                {recentEntries.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <Clock color={colors.textMuted} size={24} style={{ marginBottom: 8, opacity: 0.5 }} />
                        <Text style={styles.muted}>No geofence entries saved in this window.</Text>
                    </View>
                ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 20, paddingTop: 12 }}>
                        {recentEntries.map((entry: any) => (
                            <TouchableOpacity 
                                key={entry._id} 
                                style={[styles.card, { width: 280, marginRight: 16, marginBottom: 8, padding: 14, borderLeftWidth: 4, borderLeftColor: colors.primary }]}
                                onPress={() => entry.projectId && onViewWork?.(entry.projectId)}
                                activeOpacity={0.8}
                            >
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                    <View style={{ flex: 1, marginRight: 8 }}>
                                        <Text style={{ color: colors.text, fontWeight: 'bold', fontSize: 15 }} numberOfLines={1}>{entry.geoFenceName}</Text>
                                    </View>
                                    <View style={{ backgroundColor: colors.primary + '15', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: colors.primary + '30' }}>
                                        <Text style={{ color: colors.primary, fontSize: 9, fontWeight: '900', textTransform: 'uppercase' }}>{entry.geoFenceType}</Text>
                                    </View>
                                </View>
                                <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: 12 }} numberOfLines={1}>
                                    {entry.projectName || 'Tap to view details'}
                                </Text>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Clock color={colors.primary} size={10} />
                                        <Text style={{ color: colors.textMuted, fontSize: 10, marginLeft: 4, fontWeight: '600' }}>
                                            {new Date(entry.enteredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </Text>
                                    </View>
                                    <ChevronRight color={colors.primary} size={14} />
                                </View>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                )}


                {/* All Projects */}
                <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
                    <List color={colors.text} size={20} />
                    <Text style={styles.sectionTitle}>All Constituent Initiatives</Text>
                </View>
                <Text style={styles.sectionSub}>Complete list of government works in your city</Text>

                {allProjectsByDate.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <Text style={styles.muted}>No projects found yet.</Text>
                    </View>
                ) : (
                    allProjectsByDate.map((project: any) => renderProjectCard(project, false))
                )}
            </ScrollView>

            {/* Map Expanded Modal */}
            <Modal visible={isMapExpanded} transparent={false} animationType="slide">
                <View style={styles.expandedMapContainer}>
                    <TouchableOpacity style={styles.closeMapBtn} onPress={() => setIsMapExpanded(false)}>
                        <X color="#fff" size={20} />
                        <Text style={{color: 'white', fontWeight: 'bold', fontSize: 16, marginLeft: 8}}>Close</Text>
                    </TouchableOpacity>
                    {location ? (
                        Platform.OS === 'web' ? (
                            <iframe
                                srcDoc={generateLeafletHtml(true).replace('height: 220px', 'height: 100vh')}
                                style={{ width: '100%', height: '100%', border: 'none' }}
                            />
                        ) : (
                            <WebView
                                originWhitelist={['*']}
                                source={{ html: generateLeafletHtml(true).replace('height: 220px', 'height: 100vh') }}
                                style={{ flex: 1, backgroundColor: 'transparent' }}
                                onMessage={(e: any) => {
                                    handleMapMessage(e);
                                }}
                            />
                        )
                    ) : null}
                </View>
            </Modal>

            {/* Notification Log Modal */}
            <Modal visible={isNotifModalOpen} transparent animationType="fade" onRequestClose={() => setIsNotifModalOpen(false)}>
                <View style={styles.modalBg}>
                    <View style={styles.notifModalContainer}>
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={styles.modalTitle}>Notifications</Text>
                                <Text style={{ fontSize: 11, color: colors.textMuted }}>{unreadCount} unread messages</Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                {userNotifications.length > 0 && (
                                    <>
                                        <TouchableOpacity 
                                            onPress={handleMarkAllRead} 
                                            style={[styles.closeModalBtn, { marginRight: 8, backgroundColor: colors.primary + '15' }]}
                                        >
                                            <CheckCircle color={colors.primary} size={16} />
                                        </TouchableOpacity>
                                        <TouchableOpacity 
                                            onPress={handleClearAll} 
                                            style={[styles.closeModalBtn, { marginRight: 8, backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}
                                        >
                                            <Trash2 color="#ef4444" size={16} />
                                        </TouchableOpacity>
                                    </>
                                )}
                                <TouchableOpacity onPress={() => setIsNotifModalOpen(false)} style={styles.closeModalBtn}>
                                    <X color={colors.textMuted} size={22} />
                                </TouchableOpacity>
                            </View>
                        </View>
                        <ScrollView style={{ padding: 16 }}>
                            {userNotifications.length === 0 ? (
                                <View style={{ alignItems: 'center', marginTop: 40 }}>
                                    <Bell color={colors.transparentBorder} size={48} />
                                    <Text style={{ color: colors.textMuted, marginTop: 16 }}>No notifications yet.</Text>
                                </View>
                            ) : (
                                userNotifications.map((notif: any) => {
                                    const isAlert = notif.type === 'proximity_alert';
                                    return (
                                        <TouchableOpacity 
                                            key={notif._id} 
                                            style={[styles.notifCard, notif.status === 'read' && { opacity: 0.6 }]}
                                            onPress={() => {
                                                setIsNotifModalOpen(false);
                                                if (notif.projectId) onViewWork?.(notif.projectId);
                                            }}>
                                            <View style={{ flexDirection: 'row' }}>
                                                <View style={[styles.notifIconContainer, { backgroundColor: isAlert ? 'rgba(236, 72, 153, 0.1)' : 'rgba(59, 130, 246, 0.1)' }]}>
                                                    {isAlert ? <MapPin color="#ec4899" size={16} /> : <Activity color="#3b82f6" size={16} />}
                                                </View>
                                                <View style={{ flex: 1, marginLeft: 12 }}>
                                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                                        <Text style={[styles.notifTag, { color: isAlert ? '#ec4899' : '#3b82f6' }]}>
                                                            {isAlert ? 'NEARBY ALERT' : 'INFRASTRUCTURE'}
                                                        </Text>
                                                        {notif.status !== 'read' && <View style={styles.unreadDot} />}
                                                    </View>
                                                    <Text style={styles.notifProjectName}>{notif.title}</Text>
                                                    <Text style={styles.notifMessage} numberOfLines={2}>{notif.content}</Text>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                                                        <Activity size={10} color={colors.textMuted} />
                                                        <Text style={[styles.notifTime, { marginLeft: 4 }]}>
                                                            {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </Text>
                                                    </View>
                                                </View>
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 16, paddingTop: 50 },
    expandedMapContainer: { flex: 1, backgroundColor: '#000', width: '100%', height: '100%' },
    closeMapBtn: { flexDirection: 'row', alignItems: 'center', position: 'absolute', top: 50, right: 20, zIndex: 999, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: colors.transparentBorder },
    avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.transparentPrimary, alignItems: 'center', justifyContent: 'center' },
    avatarText: { color: colors.primary, fontWeight: 'bold', fontSize: 16 },
    greeting: { fontSize: 20, fontWeight: 'bold', color: colors.text },
    locationBox: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        marginTop: 6, 
        backgroundColor: colors.inputBg, 
        paddingHorizontal: 10, 
        paddingVertical: 4, 
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.transparentBorder,
        alignSelf: 'flex-start',
        maxWidth: '95%'
    },
    locationText: { fontSize: 12, color: colors.text, fontWeight: '600' },
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
    iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.inputBg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.transparentBorder },

    card: { backgroundColor: colors.card, borderRadius: 20, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: colors.transparentBorder },
    labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    cardTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
    liveBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.transparentPrimary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary, marginRight: 6 },
    liveText: { color: colors.primary, fontSize: 10, fontWeight: 'bold' },

    gpsRow: { flexDirection: 'row', marginBottom: 14 },
    gpsBox: { flex: 1, backgroundColor: colors.inputBg, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.transparentBorder },
    gpsLabel: { fontSize: 10, color: colors.textMuted, letterSpacing: 1 },
    gpsValue: { fontSize: 14, color: colors.primary, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontWeight: 'bold', marginTop: 4 },
    muted: { color: colors.textMuted, textAlign: 'center', fontSize: 13, paddingVertical: 12 },
    mapContainer: { borderRadius: 14, overflow: 'hidden', marginTop: 8, borderWidth: 1, borderColor: colors.transparentBorder },
    expandBtn: { position: 'absolute', top: 10, right: 10, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
    mapPlaceholder: { backgroundColor: colors.inputBg, borderRadius: 12, padding: 24, alignItems: 'center', marginTop: 8 },
    mapText: { fontSize: 14, color: colors.text, marginTop: 8, fontWeight: '600' },
    mapSub: { fontSize: 11, color: colors.textMuted, marginTop: 4 },

    legendCard: { backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: colors.transparentBorder },
    legendTitle: { fontSize: 14, fontWeight: 'bold', color: colors.text },
    legendGroup: { backgroundColor: colors.inputBg, borderRadius: 12, padding: 10, borderWidth: 1 },
    legendGroupLabel: { fontSize: 11, fontWeight: '700', marginBottom: 8, letterSpacing: 0.3 },
    legendRow: { flexDirection: 'row' as const, alignItems: 'center' as const, marginBottom: 5 },
    legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
    legendLabel: { fontSize: 11, color: colors.textMuted },

    sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginLeft: 8 },
    sectionSub: { fontSize: 12, color: colors.textMuted, marginBottom: 16 },
    
    toggleBtn: { position: 'absolute', top: 10, left: 10, height: 32, borderRadius: 16, backgroundColor: colors.card, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4 },
    toggleBtnActive: { backgroundColor: colors.primary },
    toggleBtnText: { fontSize: 12, fontWeight: '600', color: colors.text },
    toggleBtnTextActive: { color: '#fff' },

    emptyCard: { backgroundColor: colors.card, borderRadius: 14, padding: 24, alignItems: 'center', borderWidth: 1, borderStyle: 'dashed', borderColor: colors.transparentBorder },

    projectCard: { backgroundColor: colors.card, borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.transparentBorder, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
    projectCardHighlight: { backgroundColor: colors.card, borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.primary + '40', shadowColor: colors.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 4 },
    projectHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
    thumbnail: { width: 70, height: 70, borderRadius: 12, marginRight: 14, alignSelf: 'center', backgroundColor: colors.inputBg },
    projectType: { fontSize: 10, color: colors.textMuted, letterSpacing: 1, fontWeight: '700', flex: 1 },
    iconGlowContainer: {
        width: 24,
        height: 24,
        backgroundColor: colors.inputBg,
        borderRadius: 6,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 6,
        elevation: 4
    },
    projectName: { fontSize: 17, fontWeight: '800', color: colors.text, marginBottom: 6 },
    projectDesc: { fontSize: 14, color: colors.textMuted, lineHeight: 22, marginBottom: 14 },
    impactBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.transparentPrimary, padding: 10, borderRadius: 10, marginBottom: 14 },
    impactText: { fontSize: 13, color: colors.primary, fontWeight: '600', marginLeft: 6 },
    projectFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    authorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, backgroundColor: colors.inputBg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start' },
    authorName: { fontSize: 11, color: colors.textMuted, marginLeft: 4, fontWeight: '600' },
    statsRow: { flexDirection: 'row', alignItems: 'center' },
    statItem: { flexDirection: 'row', alignItems: 'center', marginRight: 12 },
    statValue: { fontSize: 12, color: colors.textMuted, marginLeft: 4, fontWeight: '700' },
    projectBudget: { fontSize: 15, fontWeight: 'bold', color: colors.primary },
    projectStatus: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
    distBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
    distText: { fontSize: 10, fontWeight: 'bold' },
    headerRightBadges: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    budgetBadge: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        backgroundColor: colors.primary + '15', 
        paddingHorizontal: 8, 
        paddingVertical: 3, 
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.primary + '30'
    },
    budgetText: { color: colors.primary, fontSize: 10, fontWeight: '800' },

    notifBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: colors.danger, borderRadius: 10, width: 16, height: 16, justifyContent: 'center', alignItems: 'center' },
    notifBadgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
    unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginTop: 4 },
    modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end', paddingBottom: 40 },
    notifModalContainer: { backgroundColor: colors.card, borderRadius: 24, maxHeight: '80%', marginHorizontal: 16, borderWidth: 1, borderColor: colors.transparentBorder, overflow: 'hidden' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.transparentBorder },
    modalTitle: { fontSize: 18, color: colors.text, fontWeight: 'bold' },
    closeModalBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.inputBg, alignItems: 'center', justifyContent: 'center' },
    notifCard: { backgroundColor: colors.inputBg, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.transparentBorder },
    notifIconContainer: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    notifTag: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
    notifProjectName: { fontSize: 16, fontWeight: 'bold', color: colors.text, marginBottom: 4, flex: 1 },
    notifMessage: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },
    notifTime: { fontSize: 10, color: colors.iconDefault, fontWeight: '600' },
});
