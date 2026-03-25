import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { useQuery } from 'convex/react';
import { useTheme } from '../context/ThemeContext';
import { Hospital, GraduationCap, Navigation, Map as MapIcon, Train, Building2, Landmark, List, ArrowLeft, ChevronRight, MapPin } from 'lucide-react-native';

const SECTORS = [
    { key: 'hospital', label: 'Healthcare', Icon: Hospital, color: '#ef4444' },
    { key: 'school', label: 'Education', Icon: GraduationCap, color: '#3b82f6' },
    { key: 'road', label: 'Roads & Highways', Icon: Navigation, color: '#f59e0b' },
    { key: 'bridge', label: 'Bridges & Flyovers', Icon: MapIcon, color: '#8b5cf6' },
    { key: 'metro', label: 'Metro & Transit', Icon: Train, color: '#06b6d4' },
    { key: 'college', label: 'Higher Education', Icon: Building2, color: '#10b981' },
    { key: 'government_office', label: 'Govt Offices', Icon: Landmark, color: '#6366f1' },
    { key: 'other', label: 'Other Projects', Icon: List, color: '#6b7280' },
];

export default function BudgetScreen({ onViewProject }: { onViewProject?: (id: string) => void }) {
    const [selectedSectorKey, setSelectedSectorKey] = React.useState<string | null>(null);
    const projects = useQuery('projects:list' as any) || [];
    const { colors } = useTheme();
    const styles = createStyles(colors);

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
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => setSelectedSectorKey(null)} style={styles.backBtn}>
                        <ArrowLeft color={colors.text} size={24} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{sector?.label} Projects</Text>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                    <View style={[styles.statsRow, { backgroundColor: sector?.color + '10', borderColor: sector?.color + '30' }]}>
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
                    </View>

                    {sectorProjects.map((p: any) => (
                        <TouchableOpacity 
                            key={p._id} 
                            style={styles.projectItem}
                            onPress={() => onViewProject?.(p._id)}
                        >
                            <View style={styles.projectInfo}>
                                <Text style={styles.projectName}>{p.name}</Text>
                                <View style={styles.projectMeta}>
                                    <MapPin size={12} color={colors.textMuted} />
                                    <Text style={styles.projectAddress} numberOfLines={1}>{p.location?.address || 'N/A'}</Text>
                                </View>
                                <View style={styles.projectFooter}>
                                    <View style={[styles.statusBadge, { backgroundColor: p.status === 'completed' ? '#22c55e20' : '#f59e0b20' }]}>
                                        <Text style={[styles.statusText, { color: p.status === 'completed' ? '#22c55e' : '#f59e0b' }]}>
                                            {p.status.replace('_', ' ')}
                                        </Text>
                                    </View>
                                    <Text style={styles.projectBudget}>{formatBudget(p.budget)}</Text>
                                </View>
                            </View>
                            <ChevronRight color={colors.textMuted} size={20} />
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                <View style={styles.totalCard}>
                    <Landmark color={colors.primary} size={48} style={{ marginBottom: 12, opacity: 0.8 }} />
                    <Text style={styles.totalLabel}>Total Government Spending</Text>
                    <Text style={styles.totalValue}>{formatBudget(totalSpending)}</Text>
                    <Text style={styles.totalSub}>{projects.length} projects across all sectors</Text>
                </View>

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
                            style={styles.sectorCard}
                            onPress={() => setSelectedSectorKey(sector.key)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.sectorHeader}>
                                <View style={[styles.iconContainer, { backgroundColor: sector.color + '15' }]}>
                                    <Icon color={sector.color} size={22} />
                                </View>
                                <View style={{ flex: 1, marginLeft: 14 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <Text style={styles.sectorName}>{sector.label}</Text>
                                        <View style={[styles.percentBadge, { backgroundColor: sector.color + '10' }]}>
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
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 16, paddingTop: 50 },
    totalCard: { backgroundColor: colors.card, borderRadius: 20, padding: 28, marginBottom: 24, borderWidth: 1, borderColor: colors.transparentBorder, alignItems: 'center' },
    totalLabel: { fontSize: 13, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6, fontWeight: '600' },
    totalValue: { fontSize: 36, fontWeight: 'bold', color: colors.primary },
    totalSub: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 16 },
    sectorCard: { 
        backgroundColor: colors.card, 
        borderRadius: 20, 
        padding: 20, 
        marginBottom: 16, 
        borderWidth: 1, 
        borderColor: colors.transparentBorder,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3
    },
    sectorHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    iconContainer: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    sectorName: { fontSize: 16, fontWeight: '800', color: colors.text, letterSpacing: -0.3 },
    sectorCount: { fontSize: 12, color: colors.textMuted, marginTop: 2, fontWeight: '500' },
    percentBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    percentText: { fontSize: 10, fontWeight: 'bold' },
    budgetRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    budgetLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
    sectorBudget: { fontSize: 18, fontWeight: '900' },
    barBg: { height: 6, backgroundColor: colors.inputBg, borderRadius: 3, overflow: 'hidden' },
    barFill: { height: 6, borderRadius: 3 },

    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, paddingTop: 10 },
    backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text },
    statsRow: { flexDirection: 'row', padding: 20, borderRadius: 16, marginBottom: 24, borderWidth: 1, alignItems: 'center' },
    statItem: { flex: 1, alignItems: 'center' },
    statLabel: { fontSize: 12, color: colors.textMuted, marginBottom: 4, textTransform: 'uppercase' },
    statValue: { fontSize: 18, fontWeight: 'bold' },
    statDivider: { width: 1, height: 30, backgroundColor: colors.transparentBorder },
    projectItem: { backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.transparentBorder, flexDirection: 'row', alignItems: 'center' },
    projectInfo: { flex: 1 },
    projectName: { fontSize: 16, fontWeight: 'bold', color: colors.text, marginBottom: 4 },
    projectMeta: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    projectAddress: { fontSize: 12, color: colors.textMuted, marginLeft: 4, flex: 1 },
    projectFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    statusText: { fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
    projectBudget: { fontSize: 14, fontWeight: 'bold', color: colors.text },
});
