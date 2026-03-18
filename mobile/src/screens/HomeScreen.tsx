import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, StatusBar, Platform, TouchableOpacity } from 'react-native';
import * as Location from 'expo-location';
import { useQuery } from 'convex/react';
import { useAuth } from '../context/AuthContext';

// Haversine distance function (returns meters)
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000; // Earth radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

export default function HomeScreen() {
    const { user } = useAuth();
    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const projects = useQuery('projects:list' as any) || [];

    const fetchLocation = async () => {
        setRefreshing(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') { setErrorMsg('Location denied'); return; }
            const loc = await Location.getCurrentPositionAsync({ 
                accuracy: Location.Accuracy.High 
            });
            setLocation(loc);
        } catch (e) { 
            console.error(e);
            setErrorMsg('Could not get location'); 
        } finally {
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchLocation();
    }, []);

    // Filter projects within 500m of user location
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
            .sort((a: any, b: any) => a.distance - b.distance)
        : [];

    // All projects (for "All Work" section)
    const allProjects = projects.slice(0, 10);

    const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    const statusColor = (s: string) => s === 'completed' ? '#22c55e' : s === 'in_progress' ? '#f59e0b' : '#6b7280';

    // Leaflet HTML as a string
    const generateLeafletHtml = () => {
        if (!location) return '';
        
        const userLat = location.coords.latitude;
        const userLng = location.coords.longitude;
        
        const markersJson = JSON.stringify(projects.map((p: any) => ({
            lat: p.location?.lat,
            lng: p.location?.lng,
            name: p.name,
            type: p.type,
            status: p.status,
            distance: haversineDistance(userLat, userLng, p.location?.lat || 0, p.location?.lng || 0)
        })));

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
                <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
                <style>
                    body { margin: 0; padding: 0; background: #0a0f1e; }
                    #map { height: 220px; width: 100%; border-radius: 12px; }
                    .leaflet-popup-content-wrapper { background: #111827; color: #f3f4f6; border: 1px solid rgba(0,212,255,0.2); }
                    .leaflet-popup-tip { background: #111827; }
                </style>
            </head>
            <body>
                <div id="map"></div>
                <script>
                    const map = L.map('map', { zoomControl: false }).setView([${userLat}, ${userLng}], 16);
                    
                    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                        attribution: '&copy; OpenStreetMap'
                    }).addTo(map);

                    // User location marker
                    const userIcon = L.divIcon({
                        className: 'user-marker',
                        html: '<div style="background: #00d4ff; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px #00d4ff;"></div>',
                        iconSize: [12, 12]
                    });
                    L.marker([${userLat}, ${userLng}], { icon: userIcon }).addTo(map);

                    // 500m Radius Circle
                    L.circle([${userLat}, ${userLng}], {
                        color: '#00d4ff',
                        fillColor: '#00d4ff',
                        fillOpacity: 0.1,
                        radius: 500,
                        weight: 1
                    }).addTo(map);

                    // Project markers
                    const projects = ${markersJson};
                    projects.forEach(p => {
                        if (!p.lat || !p.lng) return;
                        
                        const isNearby = p.distance <= 500;
                        const markerColor = isNearby ? '#00d4ff' : '#6b7280';
                        const glow = isNearby ? 'box-shadow: 0 0 10px #00d4ff;' : '';
                        
                        const icon = L.divIcon({
                            className: 'project-marker',
                            html: '<div style="background: ' + markerColor + '; width: 8px; height: 8px; border-radius: 50%; border: 1px solid white; ' + glow + '"></div>',
                            iconSize: [8, 8]
                        });
                        
                        L.marker([p.lat, p.lng], { icon: icon })
                            .addTo(map)
                            .bindPopup('<b>' + p.name + '</b><br>' + Math.round(p.distance) + 'm away');
                    });
                </script>
            </body>
            </html>
        `;
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#0a0f1e" />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{getInitials(user?.name || 'U')}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 14 }}>
                        <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0]}!</Text>
                        <Text style={styles.location}>📍 {user?.city || user?.state || 'India'}</Text>
                    </View>
                    <TouchableOpacity style={styles.refreshBtn} onPress={fetchLocation} disabled={refreshing}>
                        <Text style={styles.refreshEmoji}>{refreshing ? '⌛' : '🔄'}</Text>
                    </TouchableOpacity>
                </View>

                {/* Map Card */}
                <View style={styles.card}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                        <Text style={styles.cardTitle}>📍 Live Area Radar</Text>
                        <View style={styles.liveBadge}>
                            <View style={styles.liveDot} />
                            <Text style={styles.liveText}>500m Focus</Text>
                        </View>
                    </View>
                    
                    {location ? (
                        <>
                            <View style={styles.gpsRow}>
                                <View style={[styles.gpsBox, { marginRight: 5 }]}>
                                    <Text style={styles.gpsLabel}>LAT</Text>
                                    <Text style={styles.gpsValue}>{location.coords.latitude.toFixed(5)}</Text>
                                </View>
                                <View style={[styles.gpsBox, { marginLeft: 5 }]}>
                                    <Text style={styles.gpsLabel}>LNG</Text>
                                    <Text style={styles.gpsValue}>{location.coords.longitude.toFixed(5)}</Text>
                                </View>
                            </View>
                            
                            {Platform.OS === 'web' ? (
                                <View style={styles.mapContainer}>
                                    <iframe
                                        srcDoc={generateLeafletHtml()}
                                        style={{ width: '100%', height: 220, border: 'none', borderRadius: 12 }}
                                    />
                                </View>
                            ) : (
                                <View style={styles.mapPlaceholder}>
                                    <Text style={styles.mapText}>🗺️ Interactive Radar View</Text>
                                    <Text style={styles.mapSub}>Showing 500m radius & local markers</Text>
                                </View>
                            )}
                        </>
                    ) : (
                        <View style={styles.mapPlaceholder}>
                            <Text style={styles.muted}>{errorMsg || '📡 Acquiring GPS...'}</Text>
                        </View>
                    )}
                </View>

                {/* Nearby (500m) */}
                <Text style={styles.sectionTitle}>🎯 Within 500m Radar</Text>
                <Text style={styles.sectionSub}>Hyper-local projects affecting your current spot</Text>

                {nearbyProjects.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <Text style={styles.muted}>
                            {location ? 'No projects detected in 500m radius.' : 'Waiting for GPS...'}
                        </Text>
                        {location && (
                            <Text style={[styles.muted, { fontSize: 11, marginTop: -8 }]}>
                                Try moving or adding work at your current lat/lng.
                            </Text>
                        )}
                    </View>
                ) : (
                    nearbyProjects.map((project: any) => (
                        <View key={project._id} style={styles.projectCardHighlight}>
                            <View style={styles.projectHeader}>
                                <View style={[styles.statusDot, { backgroundColor: statusColor(project.status) }]} />
                                <Text style={styles.projectType}>{project.type.toUpperCase()}</Text>
                                <View style={styles.distBadge}>
                                    <Text style={styles.distText}>{Math.round(project.distance)}m</Text>
                                </View>
                            </View>
                            <Text style={styles.projectName}>{project.name}</Text>
                            <Text style={styles.projectDesc} numberOfLines={2}>{project.description}</Text>
                            {project.areaImpact && (
                                <View style={styles.impactBadge}>
                                    <Text style={styles.impactText}>✨ {project.areaImpact}</Text>
                                </View>
                            )}
                            <View style={styles.projectFooter}>
                                <Text style={styles.projectBudget}>₹{(project.budget / 10000000).toFixed(1)} Cr</Text>
                                <Text style={[styles.projectStatus, { color: statusColor(project.status) }]}>
                                    {project.status.replace('_', ' ').toUpperCase()}
                                </Text>
                            </View>
                        </View>
                    ))
                )}

                {/* All Projects */}
                <Text style={[styles.sectionTitle, { marginTop: 24 }]}>🏗️ All Constituent Initiatives</Text>
                <Text style={styles.sectionSub}>Complete list of government works in your city</Text>

                {allProjects.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <Text style={styles.muted}>No projects found yet.</Text>
                    </View>
                ) : (
                    allProjects.map((project: any) => (
                        <View key={project._id} style={styles.projectCard}>
                            <View style={styles.projectHeader}>
                                <View style={[styles.statusDot, { backgroundColor: statusColor(project.status) }]} />
                                <Text style={styles.projectType}>{project.type.toUpperCase()}</Text>
                            </View>
                            <Text style={styles.projectName}>{project.name}</Text>
                            <Text style={styles.projectDesc} numberOfLines={2}>{project.description}</Text>
                            <View style={styles.projectFooter}>
                                <Text style={styles.projectBudget}>₹{(project.budget / 10000000).toFixed(1)} Cr</Text>
                                <Text style={[styles.projectStatus, { color: statusColor(project.status) }]}>
                                    {project.status.replace('_', ' ').toUpperCase()}
                                </Text>
                            </View>
                        </View>
                    ))
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0a0f1e', paddingHorizontal: 16, paddingTop: 50 },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
    avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#1e3a5f', alignItems: 'center', justifyContent: 'center' },
    avatarText: { color: '#00d4ff', fontWeight: 'bold', fontSize: 16 },
    greeting: { fontSize: 20, fontWeight: 'bold', color: '#f3f4f6' },
    location: { fontSize: 12, color: '#6b7280', marginTop: 2 },
    refreshBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    refreshEmoji: { fontSize: 18 },

    card: { backgroundColor: '#111827', borderRadius: 20, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(0,212,255,0.15)', shadowColor: '#00d4ff', shadowOpacity: 0.1, shadowRadius: 10 },
    cardTitle: { fontSize: 16, fontWeight: '700', color: '#e5e7eb' },
    liveBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,212,255,0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#00d4ff', marginRight: 6 },
    liveText: { color: '#00d4ff', fontSize: 10, fontWeight: 'bold' },

    gpsRow: { flexDirection: 'row', marginBottom: 14 },
    gpsBox: { flex: 1, backgroundColor: '#1f2937', borderRadius: 12, padding: 12 },
    gpsLabel: { fontSize: 10, color: '#6b7280', letterSpacing: 1 },
    gpsValue: { fontSize: 14, color: '#00d4ff', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontWeight: 'bold', marginTop: 4 },
    muted: { color: '#4b5563', textAlign: 'center', fontSize: 13, paddingVertical: 12 },
    mapContainer: { borderRadius: 14, overflow: 'hidden', marginTop: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    mapPlaceholder: { backgroundColor: '#1a2332', borderRadius: 12, padding: 24, alignItems: 'center', marginTop: 8 },
    mapText: { fontSize: 14, color: '#6b7280' },
    mapSub: { fontSize: 11, color: '#4b5563', marginTop: 4 },

    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#f3f4f6', marginBottom: 4 },
    sectionSub: { fontSize: 12, color: '#6b7280', marginBottom: 16 },

    emptyCard: { backgroundColor: '#111827', borderRadius: 14, padding: 24, alignItems: 'center', borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.1)' },

    projectCard: { backgroundColor: '#111827', borderRadius: 16, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
    projectCardHighlight: { backgroundColor: '#111827', borderRadius: 16, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(0,212,255,0.3)', shadowColor: '#00d4ff', shadowOpacity: 0.05, shadowRadius: 5 },
    projectHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
    projectType: { fontSize: 10, color: '#6b7280', letterSpacing: 1, fontWeight: '700', flex: 1 },
    projectName: { fontSize: 17, fontWeight: '800', color: '#f3f4f6', marginBottom: 6 },
    projectDesc: { fontSize: 14, color: '#9ca3af', lineHeight: 22, marginBottom: 14 },
    impactBadge: { backgroundColor: 'rgba(0,212,255,0.08)', padding: 10, borderRadius: 10, marginBottom: 14 },
    impactText: { fontSize: 13, color: '#00d4ff', fontWeight: '500' },
    projectFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    projectBudget: { fontSize: 15, fontWeight: 'bold', color: '#00d4ff' },
    projectStatus: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
    distBadge: { backgroundColor: 'rgba(34,197,94,0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)' },
    distText: { fontSize: 10, color: '#22c55e', fontWeight: 'bold' },
});
