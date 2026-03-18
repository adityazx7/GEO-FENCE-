import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { useQuery } from 'convex/react';
import { useAuth } from '../context/AuthContext';

export default function NewsScreen({ onViewWork }: { onViewWork?: (projectId: string) => void }) {
    const { user } = useAuth();
    const projects = useQuery('projects:list' as any) || [];
    const notifications = useQuery('notifications:listAll' as any) || [];

    const initiatives = [...projects]
        .sort((a: any, b: any) => b.createdAt - a.createdAt)
        .filter((p: any) => {
            if (!user?.state) return true;
            return p.location?.address?.toLowerCase().includes(user.state.toLowerCase());
        });

    const statusEmoji = (s: string) => s === 'completed' ? '✅' : s === 'in_progress' ? '🔨' : s === 'planned' ? '📋' : '⚠️';
    const timeAgo = (ts: number) => {
        const diff = Date.now() - ts;
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return `${Math.floor(diff / 86400000)}d ago`;
    };

    return (
        <View style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                <Text style={styles.pageTitle}>Government Initiatives</Text>
                <Text style={styles.pageSub}>Latest work in {user?.state || 'your area'} • Updates in real-time</Text>

                {notifications.length > 0 && (
                    <View style={styles.notifBanner}>
                        <Text style={styles.notifBannerText}>🔔 {notifications.length} updates from the government</Text>
                    </View>
                )}

                {initiatives.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <Text style={styles.muted}>No initiatives in your area yet.</Text>
                    </View>
                ) : (
                    initiatives.map((project: any) => (
                        <TouchableOpacity
                            key={project._id}
                            style={styles.newsCard}
                            onPress={() => onViewWork?.(project._id)}
                            activeOpacity={0.75}
                        >
                            <View style={styles.newsHeader}>
                                <Text style={styles.newsEmoji}>{statusEmoji(project.status)}</Text>
                                <View style={{ flex: 1, marginHorizontal: 10 }}>
                                    <Text style={styles.newsType}>{project.type.toUpperCase()}</Text>
                                    <Text style={styles.newsTime}>{timeAgo(project.createdAt)}</Text>
                                </View>
                                <Text style={styles.newsBudget}>₹{(project.budget / 10000000).toFixed(1)} Cr</Text>
                            </View>
                            <Text style={styles.newsTitle}>{project.name}</Text>
                            <Text style={styles.newsDesc} numberOfLines={2}>{project.description}</Text>
                            <View style={styles.newsFooter}>
                                <Text style={styles.newsLocation}>📍 {project.location?.address || 'N/A'}</Text>
                                <Text style={styles.newsArrow}>→</Text>
                            </View>
                        </TouchableOpacity>
                    ))
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0a0f1e', paddingHorizontal: 16, paddingTop: 50 },
    pageTitle: { fontSize: 22, fontWeight: 'bold', color: '#f3f4f6', marginBottom: 4 },
    pageSub: { fontSize: 12, color: '#6b7280', marginBottom: 20 },
    notifBanner: { backgroundColor: 'rgba(0,212,255,0.08)', borderRadius: 12, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(0,212,255,0.15)' },
    notifBannerText: { color: '#00d4ff', fontSize: 13, fontWeight: '600', textAlign: 'center' },
    emptyCard: { backgroundColor: '#111827', borderRadius: 14, padding: 24, alignItems: 'center' },
    muted: { color: '#4b5563', textAlign: 'center', fontSize: 13 },
    newsCard: { backgroundColor: '#111827', borderRadius: 14, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
    newsHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    newsEmoji: { fontSize: 20 },
    newsType: { fontSize: 10, color: '#6b7280', letterSpacing: 1, fontWeight: '600' },
    newsTime: { fontSize: 10, color: '#374151' },
    newsBudget: { fontSize: 13, fontWeight: 'bold', color: '#00d4ff' },
    newsTitle: { fontSize: 16, fontWeight: '700', color: '#e5e7eb', marginBottom: 6 },
    newsDesc: { fontSize: 13, color: '#9ca3af', lineHeight: 20, marginBottom: 12 },
    newsFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    newsLocation: { fontSize: 11, color: '#4b5563' },
    newsArrow: { fontSize: 16, color: '#00d4ff', fontWeight: 'bold' },
});
