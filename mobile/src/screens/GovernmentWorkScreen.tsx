import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useQuery } from 'convex/react';

function formatBudget(amount: number | undefined): string {
    if (amount === undefined || amount === null) return '₹0';
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)} Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)} L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)} K`;
    return `₹${amount}`;
}

export default function GovernmentWorkScreen({ projectId, onBack }: { projectId: string; onBack: () => void }) {
    const projects = useQuery('projects:list' as any) || [];
    const project = projects.find((p: any) => p._id === projectId);

    if (!project) {
        return (
            <View style={styles.container}>
                <TouchableOpacity onPress={onBack} style={styles.backBtn}>
                    <Text style={styles.backText}>← Back</Text>
                </TouchableOpacity>
                <View style={styles.emptyCard}><Text style={styles.muted}>Project not found.</Text></View>
            </View>
        );
    }

    const statusColor = project.status === 'completed' ? '#22c55e' : project.status === 'in_progress' ? '#f59e0b' : '#6b7280';
    const progress = project.status === 'completed' ? 100 : project.status === 'in_progress' ? 65 : project.status === 'planned' ? 10 : 40;

    return (
        <View style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                <TouchableOpacity onPress={onBack} style={styles.backBtn}>
                    <Text style={styles.backText}>← Back to list</Text>
                </TouchableOpacity>

                <View style={styles.titleCard}>
                    <Text style={styles.typeTag}>{project.type.toUpperCase()}</Text>
                    <Text style={styles.title}>{project.name}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20`, borderColor: `${statusColor}40` }]}>
                        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                        <Text style={[styles.statusText, { color: statusColor }]}>
                            {project.status.replace('_', ' ').toUpperCase()}
                        </Text>
                    </View>
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardLabel}>Completion Progress</Text>
                    <View style={styles.progressRow}>
                        <View style={styles.progressBg}>
                            <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: statusColor }]} />
                        </View>
                        <Text style={[styles.progressText, { color: statusColor }]}>{progress}%</Text>
                    </View>
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardLabel}>Description</Text>
                    <Text style={styles.desc}>{project.description}</Text>
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardLabel}>Civic Impact</Text>
                    <Text style={styles.impact}>{project.impact}</Text>
                </View>

                {/* Before & After Images */}
                {(project.beforeImages?.length > 0 || project.afterImages?.length > 0) && (
                    <View style={styles.card}>
                        <Text style={styles.cardLabel}>Project Photos</Text>
                        
                        {project.beforeImages?.length > 0 && (
                            <View style={{ marginBottom: 16 }}>
                                <Text style={styles.imageSubLabel}>Before Work</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    {project.beforeImages.map((img: string, idx: number) => (
                                        <Image key={idx} source={{ uri: img }} style={styles.detailImage} />
                                    ))}
                                </ScrollView>
                            </View>
                        )}

                        {project.afterImages?.length > 0 && (
                            <View>
                                <Text style={styles.imageSubLabel}>After Completion</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    {project.afterImages.map((img: string, idx: number) => (
                                        <Image key={idx} source={{ uri: img }} style={styles.detailImage} />
                                    ))}
                                </ScrollView>
                            </View>
                        )}
                    </View>
                )}

                <View style={styles.statsRow}>
                    <View style={[styles.statBox, { marginRight: 6 }]}>
                        <Text style={styles.statLabel}>Budget</Text>
                        <Text style={styles.statValue}>{formatBudget(project.budget)}</Text>
                    </View>
                    <View style={[styles.statBox, { marginLeft: 6 }]}>
                        <Text style={styles.statLabel}>Location</Text>
                        <Text style={styles.statValue} numberOfLines={2}>{project.location?.address || 'N/A'}</Text>
                    </View>
                </View>

                <View style={styles.statsRow}>
                    <View style={[styles.statBox, { marginRight: 6 }]}>
                        <Text style={styles.statLabel}>Coordinates</Text>
                        <Text style={styles.statValueSmall}>
                            {project.location?.lat.toFixed(4)}, {project.location?.lng.toFixed(4)}
                        </Text>
                    </View>
                    <View style={[styles.statBox, { marginLeft: 6 }]}>
                        <Text style={styles.statLabel}>Completion</Text>
                        <Text style={styles.statValue}>{project.completionDate || 'TBD'}</Text>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0a0f1e', paddingHorizontal: 16, paddingTop: 50 },
    backBtn: { marginBottom: 16 },
    backText: { color: '#00d4ff', fontSize: 14, fontWeight: '500' },
    emptyCard: { backgroundColor: '#111827', borderRadius: 14, padding: 24, alignItems: 'center' },
    muted: { color: '#4b5563', fontSize: 13 },

    titleCard: { backgroundColor: '#111827', borderRadius: 20, padding: 24, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(0,212,255,0.1)' },
    typeTag: { fontSize: 10, color: '#6b7280', letterSpacing: 2, fontWeight: '700', marginBottom: 8 },
    title: { fontSize: 22, fontWeight: 'bold', color: '#f3f4f6', marginBottom: 14, lineHeight: 30 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, alignSelf: 'flex-start' },
    statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
    statusText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },

    card: { backgroundColor: '#111827', borderRadius: 14, padding: 20, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
    cardLabel: { fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 },
    desc: { fontSize: 14, color: '#d1d5db', lineHeight: 22 },
    impact: { fontSize: 15, color: '#00d4ff', lineHeight: 22, fontWeight: '500' },

    progressRow: { flexDirection: 'row', alignItems: 'center' },
    progressBg: { flex: 1, height: 10, backgroundColor: '#1f2937', borderRadius: 5, marginRight: 12 },
    progressFill: { height: 10, borderRadius: 5 },
    progressText: { fontSize: 16, fontWeight: 'bold' },

    statsRow: { flexDirection: 'row', marginBottom: 12 },
    statBox: { flex: 1, backgroundColor: '#111827', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
    statLabel: { fontSize: 10, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
    statValue: { fontSize: 14, fontWeight: '700', color: '#e5e7eb' },
    statValueSmall: { fontSize: 12, fontWeight: '500', color: '#9ca3af', fontFamily: 'monospace' },
    imageSubLabel: { fontSize: 12, color: '#9ca3af', marginBottom: 8, fontWeight: '600' },
    detailImage: { width: 140, height: 100, borderRadius: 10, marginRight: 10, backgroundColor: '#1f2937' },
});
