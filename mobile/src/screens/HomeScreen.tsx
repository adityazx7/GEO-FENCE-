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
import { useQuery, useAction, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { 
    MapPin, Bell, RefreshCw, Maximize2, X, Activity, Sparkles, 
    Navigation, List, ShieldAlert, ThumbsUp, ThumbsDown, 
    MessageSquare, User, Trash2, CheckCircle, AlertTriangle,
    Clock, XCircle, Info, ChevronRight, Search
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
                <Image 
                    source={require('../../assets/radar.png')} 
                    style={{ width: 18, height: 18, tintColor: colors.primary }} 
                />
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
    const markReadMutation = useMutation(api.projects.markRead);
    const translateText = useAction(api.ai.translateText);
    const updateLocation = useMutation(api.users.updateLocation);
    const calculateProximity = useAction(api.geospatial.calculateProximity);
    const userNotifications = useQuery(api.notifications.listForUser, { userId: user?._id || '' }) || [];
    const unreadCount = userNotifications.filter(n => n.status !== 'read').length;
    const deleteAllNotifs = useMutation(api.notifications.deleteAllForUser);

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
                    citizenLng: loc.coords.longitude
                });
            }

            // Get human-readable address
            const rev = await Location.reverseGeocodeAsync({
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude
            });
            if (rev.length > 0) {
                const a = rev[0];
                setAddress(`${a.name || a.street || ''}, ${a.district || a.city || ''}`);
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
                                citizenLng: loc.coords.longitude
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
                                setAddress(`${a.name || a.street || ''}, ${a.district || a.city || ''}`);
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
                        setAddress(`${a.name || a.street || ''}, ${a.district || a.city || ''}`);
                    }
                } catch (e) {}

                if (user?._id) {
                    await calculateProximity({
                        citizenId: user._id,
                        citizenLat: currentLoc.coords.latitude,
                        citizenLng: currentLoc.coords.longitude
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

    const nearbyProjects = location
        ? projects
            .filter((p: any) => p.location && typeof p.location.lat === 'number' && typeof p.location.lng === 'number')
            .map((p: any) => ({
                ...p,
                distance: haversineDistance(
                    location.coords.latitude, location.coords.longitude,
                    p.location.lat, p.location.lng
                ),
            }))
            .filter((p: any) => p.distance <= 500)
            .filter((p: any) => showAllWorks || !readProjectIds.includes(p._id))
            .sort((a: any, b: any) => a.distance - b.distance)
        : [];

    const allProjects = projects.slice(0, 10);

    const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
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
            style={isHighlight ? styles.projectCardHighlight : styles.projectCard}
            onPress={() => onViewWork && onViewWork(project._id)}
            activeOpacity={0.7}
        >
            <View style={{ flexDirection: 'row' }}>
                {project.afterImages && project.afterImages.length > 0 && (
                    <Image source={{ uri: project.afterImages[0] }} style={styles.thumbnail} />
                )}
                <View style={{ flex: 1 }}>
                    <View style={styles.projectHeader}>
                        <View style={[styles.statusDot, { backgroundColor: statusColor(project.status) }]} />
                        <Text style={styles.projectType}>{project.type.toUpperCase()}</Text>
                        {project.distance !== undefined && (
                            <View style={[styles.distBadge, { borderColor: project.distance <= 500 ? colors.success : colors.transparentBorder }]}>
                                <Text style={[styles.distText, { color: project.distance <= 500 ? colors.success : colors.textMuted }]}>{Math.round(project.distance)}m</Text>
                            </View>
                        )}
                    </View>
                    <Text style={styles.projectName}>{project.name}</Text>
                    <Text style={styles.projectDesc} numberOfLines={2}>{project.description}</Text>
                    {isHighlight && project.areaImpact && (
                        <View style={styles.impactBadge}>
                            <Sparkles color={colors.primary} size={14} />
                            <Text style={styles.impactText}>{project.areaImpact}</Text>
                        </View>
                    )}
                    <View style={styles.authorRow}>
                        <User color={colors.textMuted} size={12} />
                        <Text style={styles.authorName}>{project.authorName || 'Govt Department'}</Text>
                    </View>

                    <View style={styles.projectFooter}>
                        <View style={styles.statsRow}>
                            <View style={styles.statItem}>
                                <ThumbsUp color={colors.primary} size={14} />
                                <Text style={styles.statValue}>{project.likes || 0}</Text>
                            </View>
                            <View style={styles.statItem}>
                                <ThumbsDown color={colors.textMuted} size={14} />
                                <Text style={styles.statValue}>{project.dislikes || 0}</Text>
                            </View>
                        </View>
                        <Text style={styles.projectBudget}>{formatBudget(project.budget)}</Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );


    return (
        <View style={styles.container}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{getInitials(user?.name || 'U')}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 14 }}>
                        <Text style={styles.greeting}>Hello, CivicSentinel!</Text>
                        <View style={styles.locationBox}>
                            <MapPin color={colors.primary} size={14} />
                            <Text style={styles.locationText} numberOfLines={1}> {address}</Text>
                        </View>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <TouchableOpacity style={styles.iconBtn} onPress={() => setIsNotifModalOpen(true)}>
                            <Bell color={colors.text} size={20} />
                            {unreadCount > 0 && (
                                <View style={styles.notifBadge}>
                                    <Text style={styles.notifBadgeText}>{unreadCount}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.iconBtn} onPress={fetchLocation} disabled={refreshing}>
                            {refreshing ? <Activity color={colors.text} size={20} /> : <RefreshCw color={colors.text} size={20} />}
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
                            <Text style={styles.liveText}>500m Focus</Text>
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


                {/* Within 500m Radar Section */}
                <View style={styles.sectionHeaderRow}>
                    <PulseRadar colors={colors} />
                    <Text style={styles.sectionTitle}> Within 500m Radar</Text>
                </View>
                <Text style={styles.sectionSub}>Hyper-local projects affecting your current spot</Text>


                {nearbyProjects.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <ShieldAlert color={colors.iconDefault} size={28} style={{ marginBottom: 12 }} />
                        <Text style={styles.muted}>
                            {location ? 'No projects detected in 500m radius.' : 'Waiting for GPS...'}
                        </Text>
                    </View>
                ) : (
                    nearbyProjects.map((project: any) => renderProjectCard(project, true))
                )}

                {/* All Projects */}
                <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
                    <List color={colors.text} size={20} />
                    <Text style={styles.sectionTitle}>All Constituent Initiatives</Text>
                </View>
                <Text style={styles.sectionSub}>Complete list of government works in your city</Text>

                {allProjects.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <Text style={styles.muted}>No projects found yet.</Text>
                    </View>
                ) : (
                    allProjects.map((project: any) => renderProjectCard(project, false))
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
                                    <TouchableOpacity 
                                        onPress={handleClearAll} 
                                        style={[styles.closeModalBtn, { marginRight: 8, backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}
                                    >
                                        <Trash2 color="#ef4444" size={16} />
                                    </TouchableOpacity>
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
                                userNotifications.map(notif => {
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
    iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.inputBg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.transparentBorder },

    card: { backgroundColor: colors.card, borderRadius: 20, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: colors.transparentBorder },
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

    projectCard: { backgroundColor: colors.card, borderRadius: 16, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: colors.transparentBorder },
    projectCardHighlight: { backgroundColor: colors.card, borderRadius: 16, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: colors.transparentPrimary },
    projectHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
    thumbnail: { width: 70, height: 70, borderRadius: 12, marginRight: 14, alignSelf: 'center', backgroundColor: colors.inputBg },
    projectType: { fontSize: 10, color: colors.textMuted, letterSpacing: 1, fontWeight: '700', flex: 1 },
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
