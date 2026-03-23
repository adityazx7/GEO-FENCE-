import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, StatusBar, Platform, TouchableOpacity, Modal, Image, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { useQuery, useAction, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { MapPin, Bell, RefreshCw, Maximize2, X, Activity, Sparkles, Navigation, List, ShieldAlert, ThumbsUp, ThumbsDown, MessageSquare, User, Trash2, CheckCircle } from 'lucide-react-native';

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

export default function HomeScreen({ onViewWork }: { onViewWork?: (id: string) => void }) {
    const { user } = useAuth();
    const { colors, isDark } = useTheme();
    const styles = createStyles(colors, isDark);

    const [location, setLocation] = useState<Location.LocationObject | null>(null);
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
                    }
                );

                // Check proximity immediately on start
                const currentLoc = await Location.getCurrentPositionAsync({});
                if (user?._id) {
                    await calculateProximity({
                        citizenId: user._id,
                        citizenLat: currentLoc.coords.latitude,
                        citizenLng: currentLoc.coords.longitude
                    });
                }
            } catch (e) {
                console.error(e);
                setErrorMsg('Could not get location');
            } finally {
                setRefreshing(false);
            }
        };
        
        startTracking();
        return () => {
            if (subscription) subscription.remove();
        };
    }, []);

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
            const msg = JSON.parse(event.nativeEvent.data);
            const { type, data } = msg;
            
            if (type === 'VIEW_PROJECT' && onViewWork) {
                // Handle both message formats for compatibility
                const projectId = data?.id || msg.id;
                if (projectId) onViewWork(projectId);
            } else if (type === 'MARK_READ') {
                const projectId = data?.id || msg.id;
                if (projectId && user?._id) {
                    markReadMutation({ projectId: projectId as any, userId: user._id });
                }
            }
        } catch (e) {
            console.error("Map message error:", e);
        }
    };

    const nearbyProjects = location
        ? projects
            .map((p: any) => ({
                ...p,
                distance: haversineDistance(
                    location.coords.latitude, location.coords.longitude,
                    p.location?.lat || 0, p.location?.lng || 0
                ),
            }))
            .filter((p: any) => p.distance <= 500)
            .filter((p: any) => showAllWorks || !readProjectIds.includes(p._id))
            .sort((a: any, b: any) => a.distance - b.distance)
        : [];

    const allProjects = projects.slice(0, 10);

    const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    const statusColor = (s: string) => s === 'completed' ? colors.success : s === 'in_progress' ? colors.warning : colors.iconDefault;

    const generateLeafletHtml = () => {
        if (!location) return '';
        
        const userLat = location.coords.latitude;
        const userLng = location.coords.longitude;
        const mapUrl = isDark ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
        const modalBg = colors.card;
        
        // Filter projects based on "New Only" setting
        const displayedProjects = showAllWorks 
            ? projects 
            : projects.filter((p: any) => !readProjectIds.includes(p._id));

        const markersJson = JSON.stringify(displayedProjects.map((p: any) => ({
            _id: p._id,
            lat: p.location?.lat,
            lng: p.location?.lng,
            name: p.name,
            type: p.type,
            status: p.status,
            budget: p.budget || 0,
            distance: haversineDistance(userLat, userLng, p.location?.lat || 0, p.location?.lng || 0)
        })));

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
                <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
                <style>
                    body { margin: 0; padding: 0; background: ${colors.background}; }
                    #map { height: 220px; width: 100%; border-radius: 12px; }
                    .leaflet-popup-content-wrapper { background: ${modalBg}; color: ${colors.text}; border: 1px solid ${colors.transparentBorder}; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
                    .leaflet-popup-tip { background: ${modalBg}; }
                    .user-marker { background: ${colors.danger}; width: 14px; height: 14px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 15px ${colors.danger}; position: relative; }
                    .user-marker .pulse { position: absolute; width: 30px; height: 30px; background: ${colors.danger}66; border-radius: 50%; top: -11px; left: -11px; animation: pulse 2s infinite; }
                    @keyframes pulse { 0% { transform: scale(0.5); opacity: 1; } 100% { transform: scale(1.5); opacity: 0; } }
                    .map-legend {
                        position: absolute; bottom: 10px; left: 10px; z-index: 1000;
                        background: rgba(10,10,18,0.88);
                        color: white;
                        border-radius: 14px; padding: 12px 14px; font-size: 10px;
                        backdrop-filter: blur(10px);
                        border: 1px solid rgba(255,255,255,0.12);
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                        min-width: 150px;
                        box-shadow: 0 8px 32px rgba(0,0,0,0.5);
                    }
                    .legend-header {
                        display: flex; align-items: center; gap: 6px;
                        font-size: 11px; font-weight: 700; letter-spacing: 0.5px;
                        color: rgba(255,255,255,0.9); margin-bottom: 10px;
                        border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px;
                    }
                    .legend-zone {
                        margin-bottom: 8px;
                    }
                    .legend-zone-label {
                        display: flex; align-items: center; gap: 5px;
                        font-size: 9px; font-weight: 600; letter-spacing: 0.6px;
                        text-transform: uppercase; opacity: 0.7;
                        margin-bottom: 5px;
                    }
                    .legend-gradient-bar {
                        position: relative; height: 8px; border-radius: 99px;
                        margin-bottom: 3px;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.4);
                    }
                    .legend-tick-labels {
                        display: flex; justify-content: space-between;
                        font-size: 8px; opacity: 0.6; margin-top: 2px;
                    }
                    .legend-divider {
                        border: none; border-top: 1px solid rgba(255,255,255,0.08);
                        margin: 8px 0;
                    }
                </style>
            </head>
            <body>
                <div id="map"></div>
                <div class="map-legend">
                    <div class="legend-header">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                        Budget Scale
                    </div>
                    <div class="legend-zone">
                        <div class="legend-zone-label" style="color:#F59E0B">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="#F59E0B" stroke="none"><path d="M12 2C8 7 6 10.5 6 14a6 6 0 0012 0c0-3.5-2-7-6-12z"/></svg>
                            Within 500m
                        </div>
                        <div class="legend-gradient-bar" style="background: linear-gradient(to right, #FDE68A, #F59E0B, #B45309);"></div>
                        <div class="legend-tick-labels"><span>Low</span><span>Mid</span><span>High</span></div>
                    </div>
                    <hr class="legend-divider"/>
                    <div class="legend-zone">
                        <div class="legend-zone-label" style="color:#38BDF8">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#38BDF8" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="2" x2="12" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="5" y1="5" x2="19" y2="19"/><line x1="19" y1="5" x2="5" y2="19"/></svg>
                            Outside 500m
                        </div>
                        <div class="legend-gradient-bar" style="background: linear-gradient(to right, #BAE6FD, #38BDF8, #1E3A8A);"></div>
                        <div class="legend-tick-labels"><span>Low</span><span>Mid</span><span>High</span></div>
                    </div>
                </div>

                <script>
                    function viewProject(id) {
                        window.ReactNativeWebView.postMessage(JSON.stringify({
                            type: 'VIEW_PROJECT', 
                            data: { id: id }
                        }));
                    }

                    const map = L.map('map', { zoomControl: false }).setView([${userLat}, ${userLng}], 16);
                    
                    L.tileLayer('${mapUrl}', {
                        attribution: '&copy; OpenStreetMap'
                    }).addTo(map);

                    const userIcon = L.divIcon({
                        className: '',
                        html: '<div class="user-marker"><div class="pulse"></div></div>',
                        iconSize: [14, 14]
                    });
                    L.marker([${userLat}, ${userLng}], { icon: userIcon })
                        .addTo(map)
                        .bindPopup('<b style="color: ${colors.text}">You are here</b>');

                    L.circle([${userLat}, ${userLng}], {
                        color: 'rgba(56, 189, 248, 0.6)',
                        fillColor: 'rgba(56, 189, 248, 0.12)',
                        fillOpacity: 0.12,
                        radius: 500,
                        weight: 1.5,
                        dashArray: '5 5'
                    }).addTo(map);

                    function getBudgetColor(budget, isNearby) {
                        const cr = budget / 10000000;
                        if (isNearby) {
                            // WARM palette — amber/orange/brown
                            if (cr < 1)  return { color: '#FDE68A', glow: '' };
                            if (cr < 10) return { color: '#F59E0B', glow: 'box-shadow: 0 0 8px #F59E0B;' };
                            return              { color: '#B45309', glow: 'box-shadow: 0 0 10px #B45309;' };
                        } else {
                            // COOL palette — sky/blue/navy
                            if (cr < 1)  return { color: '#BAE6FD', glow: '' };
                            if (cr < 10) return { color: '#38BDF8', glow: 'box-shadow: 0 0 8px #38BDF8;' };
                            return              { color: '#1E3A8A', glow: 'box-shadow: 0 0 10px #3B82F6;' };
                        }
                    }

                    const projects = ${markersJson};
                    projects.forEach(p => {
                        if (!p.lat || !p.lng) return;
                        
                        const isNearby = p.distance <= 500;
                        const { color, glow } = getBudgetColor(p.budget, isNearby);
                        const size = isNearby ? 10 : 8; // Smaller marker sizes
                        const border = isNearby ? '2px solid white' : '1px solid rgba(255,255,255,0.4)';
                        
                        const icon = L.divIcon({
                            className: 'project-marker',
                            html: '<div style="background: ' + color + '; width: ' + size + 'px; height: ' + size + 'px; border-radius: 50%; border: ' + border + '; ' + glow + '"></div>',
                            iconSize: [size, size]
                        });
                        
                        let budgetText = '';
                        if (p.budget >= 10000000) {
                            budgetText = '₹' + (p.budget / 10000000).toFixed(1) + ' Cr';
                        } else if (p.budget >= 100000) {
                            budgetText = '₹' + (p.budget / 100000).toFixed(1) + ' Lakhs';
                        } else {
                            budgetText = '₹' + p.budget.toLocaleString();
                        }
                        
                        const zone = isNearby ? 'Within 500m' : 'Outside 500m';
                        
                        const marker = L.marker([p.lat, p.lng], { icon: icon })
                            .addTo(map)
                            .bindPopup(
                                '<div style="cursor:pointer; padding: 2px" onclick="viewProject(\\'' + p._id + '\\')">' +
                                '<div style="border-bottom: 1px solid ' + color + '; padding-bottom: 4px; margin-bottom: 4px;">' +
                                '<b style="color: ${colors.text}; font-size:15px; display:block;">' + p.name + '</b>' +
                                '</div>' +
                                '<span style="color: ${colors.textMuted}; font-size: 12px; display:block; margin-bottom: 2px;">' + zone + ' · ' + Math.round(p.distance) + 'm</span>' +
                                '<span style="color: ' + color + '; font-weight:bold; font-size: 13px;">' + budgetText + '</span>' +
                                '<div style="margin-top: 8px; text-decoration: underline; color: ${colors.primary}; font-size: 11px; font-weight: bold;">Tap to View Details →</div>' +
                                '</div>'
                            );
                        marker.projectId = p._id; // Store ID for read tracking
                    });

                    // Track 3-second popup read status
                    let popupTimer = null;
                    map.on('popupopen', function(e) {
                        const marker = e.popup._source;
                        if (marker && marker.projectId) {
                            popupTimer = setTimeout(function() {
                                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MARK_READ', data: { id: marker.projectId } }));
                            }, 3000);
                        }
                    });
                    map.on('popupclose', function(e) {
                        if (popupTimer) {
                            clearTimeout(popupTimer);
                            popupTimer = null;
                        }
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
                        <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0]}!</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                            <MapPin color={colors.textMuted} size={12} />
                            <Text style={styles.location}> {user?.city || user?.state || 'India'}</Text>
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

                {/* Map Card */}
                <View style={styles.card}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Navigation color={colors.text} size={18} />
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
                                    <Text style={styles.gpsValue}>{location.coords.latitude.toFixed(5)}</Text>
                                </View>
                                <View style={[styles.gpsBox, { marginLeft: 5 }]}>
                                    <Text style={styles.gpsLabel}>LONGITUDE</Text>
                                    <Text style={styles.gpsValue}>{location.coords.longitude.toFixed(5)}</Text>
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
                                        <TouchableOpacity 
                                            style={[styles.toggleBtn, showAllWorks && styles.toggleBtnActive]}
                                            onPress={() => setShowAllWorks(!showAllWorks)}
                                        >
                                            <List color={showAllWorks ? "#fff" : colors.text} size={14} style={{marginRight: 4}} />
                                            <Text style={[styles.toggleBtnText, showAllWorks && styles.toggleBtnTextActive]}>
                                                {showAllWorks ? 'All Works' : 'New Only'}
                                            </Text>
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
                                        <TouchableOpacity 
                                            style={[styles.toggleBtn, showAllWorks && styles.toggleBtnActive]}
                                            onPress={() => setShowAllWorks(!showAllWorks)}
                                        >
                                            <List color={showAllWorks ? "#fff" : colors.text} size={14} style={{marginRight: 4}} />
                                            <Text style={[styles.toggleBtnText, showAllWorks && styles.toggleBtnTextActive]}>
                                                {showAllWorks ? 'All Works' : 'New Only'}
                                            </Text>
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


                {/* Nearby (500m) */}
                <View style={styles.sectionHeaderRow}>
                    <Navigation color={colors.primary} size={20} />
                    <Text style={styles.sectionTitle}>Within 500m Radar</Text>
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
                                srcDoc={generateLeafletHtml().replace('height: 220px', 'height: 100vh')}
                                style={{ width: '100%', height: '100%', border: 'none' }}
                            />
                        ) : (
                            <WebView
                                originWhitelist={['*']}
                                source={{ html: generateLeafletHtml().replace('height: 220px', 'height: 100vh') }}
                                style={{ flex: 1, backgroundColor: 'transparent' }}
                                onMessage={(e) => {
                                    handleMapMessage(e);
                                    setIsMapExpanded(false);
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
                                        style={[styles.closeModalBtn, { marginRight: 8, backgroundColor: colors.transparentError || 'rgba(239, 68, 68, 0.1)' }]}
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
    location: { fontSize: 12, color: colors.textMuted },
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
