import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, StatusBar, Platform } from 'react-native';
import { useQuery } from 'convex/react';
import { api } from '@backend/_generated/api';
import { useTheme } from '../context/ThemeContext';
import { Activity, Rocket, Car, Construction, TrainFront, Building2, Landmark, Package, List, ArrowLeft, ChevronRight, MapPin } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import GlassCard from '../components/GlassCard';

const SECTORS = [
    { key: 'hospital', label: 'Healthcare', Icon: Activity, color: '#f43f5e' },
    { key: 'school', label: 'Education', Icon: Rocket, color: '#10b981' },
    { key: 'road', label: 'Roads & Highways', Icon: Car, color: '#f59e0b' },
    { key: 'bridge', label: 'Bridges & Flyovers', Icon: Construction, color: '#6366f1' },
    { key: 'metro', label: 'Metro & Transit', Icon: TrainFront, color: '#8b5cf6' },
    { key: 'college', label: 'Higher Education', Icon: Building2, color: '#10b981' },
    { key: 'government_office', label: 'Govt Offices', Icon: Landmark, color: '#6366f1' },
    { key: 'other', label: 'Other Projects', Icon: Package, color: '#6b7280' },
];

export default function BudgetScreen({ onViewProject }: { onViewProject?: (id: string) => void }) {
    const [selectedSectorKey, setSelectedSectorKey] = useState<string | null>(null);
    const projects = useQuery(api.projects.list) || [];
    const { colors, isDark } = useTheme();
    const styles = createStyles(colors, isDark);

    const formatBudget = (amount: number) => {
        if (!amount || amount === 0) return "₹0.0";
        if (amount >= 10000000) {
            return `₹${(amount / 10000000).toFixed(1)} Cr`;
        } else if (amount >= 100000) {
            return `₹${(amount / 100000).toFixed(1)} L`;
        } else if (amount >= 1000) {
            return `₹${(amount / 1000).toFixed(1)} K`;
        } else {
            return `₹${amount.toLocaleString()}`;
        }
    };

    const totalSpending = projects.reduce((sum: number, p: any) => sum + (p.budget || 0), 0);

    if (selectedSectorKey) {
        const sector = SECTORS.find(s => s.key === selectedSectorKey);
        const sectorProjects = projects.filter((p: any) => p.type === selectedSectorKey);
        const { Icon } = sector || { Icon: List };

        return (
            <View style={styles.container}>
                <LinearGradient
                    colors={isDark ? ['#080b14', '#0d1225'] : ['#f1f5f9', '#e2e8f0']}
                    style={StyleSheet.absoluteFill}
                />
                <StatusBar 
                    barStyle={isDark ? "light-content" : "dark-content"} 
                    backgroundColor="transparent" 
                    translucent 
                />
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => setSelectedSectorKey(null)} style={styles.backBtn}>
                        <ArrowLeft color={colors.text} size={24} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{sector?.label} Projects</Text>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                    <GlassCard intensity={30} style={[styles.statsRow, { borderColor: sector?.color + '40' }] as any}>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Projects</Text>
                            <Text style={[styles.statValue, { color: sector?.color }]}>{sectorProjects.length}</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Total Budget</Text>
                            <Text style={[styles.statValue, { color: sector?.color }]}>
                                {formatBudget(sectorProjects.reduce((sum: number, p: any) => sum + (p.budget || 0), 0))}
                            </Text>
                        </View>
                    </GlassCard>

                    {sectorProjects.map((p: any) => (
                        <TouchableOpacity 
                            key={p._id} 
                            style={styles.projectItem}
                            onPress={() => onViewProject?.(p._id)}
                            activeOpacity={0.8}
                        >
                            <GlassCard intensity={20} style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}>
                                <View style={styles.projectInfo}>
                                    <Text style={styles.projectName}>{p.name}</Text>
                                    <View style={styles.projectMeta}>
                                        <MapPin size={12} color={colors.textMuted} />
                                        <Text style={styles.projectAddress} numberOfLines={1}>{p.location?.address || 'N/A'}</Text>
                                    </View>
                                    <View style={styles.projectFooter}>
                                        <View style={[styles.statusBadge, { backgroundColor: p.status === 'completed' ? '#22c55e15' : '#f59e0b15', borderWidth: 1, borderColor: p.status === 'completed' ? '#22c55e40' : '#f59e0b40' }]}>
                                            <Text style={[styles.statusText, { color: p.status === 'completed' ? '#22c55e' : '#f59e0b' }]}>
                                                {p.status.replace('_', ' ')}
                                            </Text>
                                        </View>
                                        <Text style={styles.projectBudget}>{formatBudget(p.budget)}</Text>
                                    </View>
                                </View>
                                <ChevronRight color={colors.textMuted} size={20} style={{ marginLeft: 8 }} />
                            </GlassCard>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={isDark ? ['#080b14', '#0d1225'] : ['#f1f5f9', '#e2e8f0']}
                style={StyleSheet.absoluteFill}
            />
            <StatusBar 
                barStyle={isDark ? "light-content" : "dark-content"} 
                backgroundColor="transparent" 
                translucent 
            />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
                <GlassCard intensity={50} style={styles.totalCard as any}>
                    <View style={styles.totalIconWrap}>
                        <Landmark color={colors.primary} size={36} />
                    </View>
                    <Text style={styles.totalLabel}>Total Government Spending</Text>
                    <Text style={styles.totalValue}>{formatBudget(totalSpending)}</Text>
                    <Text style={styles.totalSub}>{projects.length} projects across all sectors</Text>
                </GlassCard>

                <Text style={styles.sectionTitle}>Budget by Sector</Text>
                {SECTORS.map((sector) => {
                    const sectorProjectCount = projects.filter((p: any) => p.type === sector.key).length;
                    if (sectorProjectCount === 0) return null;
                    const { Icon } = sector;
                    
                    const sectorSpending = projects
                        .filter((p: any) => p.type === sector.key)
                        .reduce((sum: number, p: any) => sum + (p.budget || 0), 0);
                    const completedCount = projects.filter((p: any) => p.type === sector.key && p.status === 'completed').length;

                    return (
                        <TouchableOpacity
                            key={sector.key}
                            style={styles.sectorCardWrap}
                            onPress={() => setSelectedSectorKey(sector.key)}
                            activeOpacity={0.8}
                        >
                            <GlassCard intensity={30} style={styles.sectorCard as any}>
                                <View style={styles.sectorHeader}>
                                    <View style={[styles.iconContainer, { backgroundColor: sector.color + '15', shadowColor: sector.color }]}>
                                        <Icon color={sector.color} size={22} />
                                    </View>
                                    <View style={{ flex: 1, marginLeft: 14 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <Text style={styles.sectorName}>{sector.label}</Text>
                                            <View style={[styles.percentBadge, { backgroundColor: sector.color + '15', borderWidth: 1, borderColor: sector.color + '30' }]}>
                                                <Text style={[styles.percentText, { color: sector.color }]}>
                                                    {totalSpending > 0 ? Math.round((sectorSpending / totalSpending) * 100) : 0}%
                                                </Text>
                                            </View>
                                        </View>
                                        <Text style={styles.sectorCount}>{sectorProjectCount} projects • {completedCount} completed</Text>
                                    </View>
                                </View>
                                
                                <View style={styles.budgetRow}>
                                    <Text style={styles.budgetLabel}>Allocated Budget</Text>
                                    <Text style={[styles.sectorBudget, { color: sector.color }]}>
                                        {formatBudget(sectorSpending)}
                                    </Text>
                                </View>

                                <View style={styles.barBg}>
                                    <View style={[styles.barFill, {
                                        width: `${totalSpending > 0 ? Math.min((sectorSpending / totalSpending) * 100, 100) : 0}%`,
                                        backgroundColor: sector.color
                                    }]} />
                                </View>
                            </GlassCard>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
    container: { flex: 1, paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 60 : 50 },
    totalCard: { borderRadius: 24, padding: 32, marginBottom: 24, alignItems: 'center', borderColor: colors.primary + '30', borderWidth: 1 },
    totalIconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primary + '15', alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderWidth: 1, borderColor: colors.primary + '40', shadowColor: colors.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 10, elevation: 5 },
    totalLabel: { fontSize: 13, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8, fontWeight: '700' },
    totalValue: { fontSize: 40, fontWeight: '900', color: colors.primary, letterSpacing: -1 },
    totalSub: { fontSize: 13, color: colors.textMuted, marginTop: 8 },
    sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 16, marginTop: 8 },
    sectorCardWrap: { marginBottom: 16 },
    sectorCard: { borderRadius: 24, padding: 20 },
    sectorHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },

    iconContainer: { 
        width: 44, 
        height: 44, 
        borderRadius: 14, 
        alignItems: 'center', 
        justifyContent: 'center',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 8,
        elevation: 4
    },
    sectorName: { fontSize: 16, fontWeight: '800', color: colors.text, letterSpacing: -0.3 },
    sectorCount: { fontSize: 12, color: colors.textMuted, marginTop: 2, fontWeight: '500' },
    percentBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    percentText: { fontSize: 10, fontWeight: 'bold' },
    budgetRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    budgetLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
    sectorBudget: { fontSize: 18, fontWeight: '900' },
    barBg: { height: 6, backgroundColor: colors.inputBg, borderRadius: 3, overflow: 'hidden' },
    barFill: { height: 6, borderRadius: 3 },

    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
    backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.inputBg, alignItems: 'center', justifyContent: 'center', marginRight: 16, borderWidth: 1, borderColor: colors.transparentBorder },
    headerTitle: { fontSize: 24, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
    statsRow: { flexDirection: 'row', padding: 20, borderRadius: 24, marginBottom: 24, borderWidth: 1, alignItems: 'center' },
    statItem: { flex: 1, alignItems: 'center' },
    statLabel: { fontSize: 11, color: colors.textMuted, marginBottom: 6, textTransform: 'uppercase', fontWeight: '700', letterSpacing: 0.5 },
    statValue: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
    statDivider: { width: 1, height: 40, backgroundColor: colors.transparentBorder },
    projectItem: { marginBottom: 12, borderRadius: 20, overflow: 'hidden' },

    projectInfo: { flex: 1 },
    projectName: { fontSize: 16, fontWeight: 'bold', color: colors.text, marginBottom: 4 },
    projectMeta: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    projectAddress: { fontSize: 12, color: colors.textMuted, marginLeft: 4, flex: 1 },
    projectFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    statusText: { fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
    projectBudget: { fontSize: 14, fontWeight: 'bold', color: colors.text },
});
