import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { useQuery } from 'convex/react';

const SECTORS = [
    { key: 'hospital', label: 'Healthcare', emoji: '🏥', color: '#ef4444' },
    { key: 'school', label: 'Education', emoji: '🎓', color: '#3b82f6' },
    { key: 'road', label: 'Roads & Highways', emoji: '🛣️', color: '#f59e0b' },
    { key: 'bridge', label: 'Bridges & Flyovers', emoji: '🌉', color: '#8b5cf6' },
    { key: 'metro', label: 'Metro & Transit', emoji: '🚇', color: '#06b6d4' },
    { key: 'college', label: 'Higher Education', emoji: '🏛️', color: '#10b981' },
    { key: 'government_office', label: 'Govt Offices', emoji: '🏢', color: '#6366f1' },
    { key: 'other', label: 'Other Projects', emoji: '📋', color: '#6b7280' },
];

export default function BudgetScreen({ onViewSector }: { onViewSector?: (type: string) => void }) {
    const projects = useQuery('projects:list' as any) || [];

    const getSectorData = (type: string) => {
        const sectorProjects = projects.filter((p: any) => p.type === type);
        const totalBudget = sectorProjects.reduce((sum: number, p: any) => sum + p.budget, 0);
        const completed = sectorProjects.filter((p: any) => p.status === 'completed').length;
        return { count: sectorProjects.length, totalBudget, completed };
    };

    const totalBudget = projects.reduce((sum: number, p: any) => sum + p.budget, 0);

    return (
        <View style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                <View style={styles.totalCard}>
                    <Text style={styles.totalLabel}>Total Government Spending</Text>
                    <Text style={styles.totalValue}>₹{(totalBudget / 10000000).toFixed(1)} Cr</Text>
                    <Text style={styles.totalSub}>{projects.length} projects across all sectors</Text>
                </View>

                <Text style={styles.sectionTitle}>Budget by Sector</Text>
                {SECTORS.map((sector) => {
                    const data = getSectorData(sector.key);
                    if (data.count === 0) return null;
                    return (
                        <TouchableOpacity
                            key={sector.key}
                            style={styles.sectorCard}
                            onPress={() => onViewSector?.(sector.key)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.sectorHeader}>
                                <Text style={styles.sectorEmoji}>{sector.emoji}</Text>
                                <View style={{ flex: 1, marginLeft: 14 }}>
                                    <Text style={styles.sectorName}>{sector.label}</Text>
                                    <Text style={styles.sectorCount}>{data.count} projects • {data.completed} completed</Text>
                                </View>
                                <Text style={[styles.sectorBudget, { color: sector.color }]}>
                                    ₹{(data.totalBudget / 10000000).toFixed(1)} Cr
                                </Text>
                            </View>
                            <View style={styles.barBg}>
                                <View style={[styles.barFill, {
                                    width: `${totalBudget > 0 ? Math.min((data.totalBudget / totalBudget) * 100, 100) : 0}%`,
                                    backgroundColor: sector.color
                                }]} />
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0a0f1e', paddingHorizontal: 16, paddingTop: 50 },
    totalCard: { backgroundColor: '#111827', borderRadius: 20, padding: 28, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(0,212,255,0.15)', alignItems: 'center' },
    totalLabel: { fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6 },
    totalValue: { fontSize: 36, fontWeight: 'bold', color: '#00d4ff' },
    totalSub: { fontSize: 13, color: '#4b5563', marginTop: 4 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#f3f4f6', marginBottom: 16 },
    sectorCard: { backgroundColor: '#111827', borderRadius: 14, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
    sectorHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    sectorEmoji: { fontSize: 28 },
    sectorName: { fontSize: 15, fontWeight: '700', color: '#e5e7eb' },
    sectorCount: { fontSize: 11, color: '#6b7280', marginTop: 2 },
    sectorBudget: { fontSize: 16, fontWeight: 'bold' },
    barBg: { height: 6, backgroundColor: '#1f2937', borderRadius: 3 },
    barFill: { height: 6, borderRadius: 3 },
});
