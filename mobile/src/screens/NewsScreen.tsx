import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, StatusBar, Platform } from 'react-native';
import { useQuery } from 'convex/react';
import { api } from '@backend/_generated/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Bell, MapPin, ArrowRight, CheckCircle, Hammer, ClipboardList, AlertTriangle, Search, TrendingUp, Filter, BarChart, ChevronDown, ChevronUp } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import GlassCard from '../components/GlassCard';

export default function NewsScreen({ onViewWork }: { onViewWork?: (projectId: string) => void }) {
    const { user } = useAuth();
    const { colors, isDark } = useTheme();
    const styles = createStyles(colors, isDark);

    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sectorFilter, setSectorFilter] = useState('all');
    const [budgetSort, setBudgetSort] = useState('none'); // 'none', 'high-low', 'low-high'

    const projects = useQuery(api.projects.list) || [];
    const notifications = useQuery(api.notifications.listAll) || [];

    // Trending: Top 3 High Budget Projects from the last 3 days (Static to search)
    const threeDaysAgo = Date.now() - (3 * 24 * 60 * 60 * 1000);
    const topProjects = [...projects]
        .filter((p: any) => (p.createdAt || 0) >= threeDaysAgo)
        .sort((a: any, b: any) => (b.budget || 0) - (a.budget || 0))
        .slice(0, 3);

    const topProjectIds = topProjects.map(p => p._id);

    // Searchable Feed: Filtered by search query and sorted by budget (User preference)
    const feedInitiatives = [...projects]
        .filter((p: any) => {
            // Exclude already shown in trending
            if (topProjectIds.includes(p._id)) return false;

            if (searchQuery.trim() !== '') {
                const words = searchQuery.toLowerCase().split(/\s+/).filter(w => w.length > 0);
                const searchFields = [
                    p.name, 
                    p.description, 
                    p.location?.address, 
                    p.city, 
                    p.state, 
                    p.type
                ].join(' ').toLowerCase();
                
                return words.every(word => searchFields.includes(word));
            }
            return true;
        })
        .sort((a: any, b: any) => {
            if (budgetSort === 'high-low') return (b.budget || 0) - (a.budget || 0);
            if (budgetSort === 'low-high') return (a.budget || 0) - (b.budget || 0);
            return (b.budget || 0) - (a.budget || 0); // Default to high-low if budget order is requested
        });

    const StatusIcon = ({ status }: { status: string }) => {
        switch(status) {
            case 'completed': return <CheckCircle color={colors.success} size={20} />;
            case 'in_progress': return <Hammer color={colors.warning} size={20} />;
            case 'planned': return <ClipboardList color={colors.primary} size={20} />;
            default: return <AlertTriangle color={colors.iconDefault} size={20} />;
        }
    };

    const timeAgo = (ts: number) => {
        const diff = Date.now() - ts;
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return `${Math.floor(diff / 86400000)}d ago`;
    };

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
                <Text style={styles.pageTitle}>Government Initiatives</Text>
                <Text style={styles.pageSub}>Latest work in {user?.state || 'your area'} • Updates in real-time</Text>

                {/* Search Bar */}
                <GlassCard intensity={40} style={styles.searchContainer as any}>
                    <Search color={colors.textMuted} size={20} />
                    <TextInput 
                        style={styles.searchInput}
                        placeholder="Search initiatives, locations..."
                        placeholderTextColor={colors.textMuted}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </GlassCard>
                
                {/* Filters Row */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersRow} contentContainerStyle={{ paddingRight: 20 }}>
                    <TouchableOpacity 
                        style={[styles.filterChip, statusFilter !== 'all' && styles.filterChipActive]}
                        onPress={() => setStatusFilter(statusFilter === 'all' ? 'in_progress' : statusFilter === 'in_progress' ? 'completed' : statusFilter === 'completed' ? 'planned' : 'all')}
                    >
                        <Filter size={14} color={statusFilter !== 'all' ? '#fff' : colors.textMuted} />
                        <Text style={[styles.filterChipText, statusFilter !== 'all' && styles.filterChipTextActive]}>
                            {statusFilter === 'all' ? 'Status' : statusFilter.replace('_', ' ')}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.filterChip, sectorFilter !== 'all' && styles.filterChipActive]}
                        onPress={() => {
                            const sectors = ['all', 'hospital', 'bridge', 'road', 'school', 'metro', 'college', 'government_office', 'other'];
                            const nextIdx = (sectors.indexOf(sectorFilter) + 1) % sectors.length;
                            setSectorFilter(sectors[nextIdx]);
                        }}
                    >
                        <BarChart size={14} color={sectorFilter !== 'all' ? '#fff' : colors.textMuted} />
                        <Text style={[styles.filterChipText, sectorFilter !== 'all' && styles.filterChipTextActive]}>
                            {sectorFilter === 'all' ? 'Sector' : sectorFilter.replace('_', ' ')}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.filterChip, budgetSort !== 'none' && styles.filterChipActive]}
                        onPress={() => setBudgetSort(budgetSort === 'none' ? 'high-low' : budgetSort === 'high-low' ? 'low-high' : 'none')}
                    >
                        {budgetSort === 'low-high' ? <ChevronUp size={14} color="#fff" /> : budgetSort === 'high-low' ? <ChevronDown size={14} color="#fff" /> : <TrendingUp size={14} color={colors.textMuted} />}
                        <Text style={[styles.filterChipText, budgetSort !== 'none' && styles.filterChipTextActive]}>
                            Budget {budgetSort === 'high-low' ? '(H-L)' : budgetSort === 'low-high' ? '(L-H)' : ''}
                        </Text>
                    </TouchableOpacity>
                </ScrollView>

                {/* Top Projects Highlight Reel */}
                {topProjects.length > 0 && (
                    <View style={styles.trendingSection}>
                        <View style={styles.trendingHeader}>
                            <TrendingUp color={colors.primary} size={18} />
                            <Text style={styles.trendingTitle}>Top High-Budget Works</Text>
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trendingScrollContent}>
                            {topProjects.map((project: any) => (
                                <TouchableOpacity 
                                    key={project._id} 
                                    onPress={() => onViewWork?.(project._id)}
                                    activeOpacity={0.8}
                                    style={styles.highlightCardWrap}
                                >
                                    <GlassCard intensity={20} style={styles.highlightCard as any}>
                                        <View style={styles.highlightBudgetBox}>
                                            <Text style={styles.highlightBudgetText}>₹{(project.budget / 10000000).toFixed(1)} Cr</Text>
                                        </View>
                                        <Text style={styles.highlightTitle} numberOfLines={2}>{project.name}</Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                                            <MapPin color={colors.textMuted} size={12} />
                                            <Text style={styles.highlightLoc} numberOfLines={1}> {project.location?.address?.split(',')[0] || 'N/A'}</Text>
                                        </View>
                                    </GlassCard>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}



                <Text style={styles.feedHeader}>Recent Activity</Text>

                {feedInitiatives.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <Text style={styles.muted}>No initiatives found.</Text>
                    </View>
                ) : (
                    feedInitiatives.map((project: any) => (
                        <TouchableOpacity
                            key={project._id}
                            style={styles.newsCardWrap}
                            onPress={() => onViewWork?.(project._id)}
                            activeOpacity={0.8}
                        >
                            <GlassCard intensity={30} style={styles.newsCard as any}>
                                <View style={styles.newsHeader}>
                                    <StatusIcon status={project.status} />
                                    <View style={{ flex: 1, marginHorizontal: 10 }}>
                                        <Text style={styles.newsType}>{project.type.toUpperCase()}</Text>
                                        <Text style={styles.newsTime}>{timeAgo(project.createdAt)}</Text>
                                    </View>
                                    <Text style={styles.newsBudget}>₹{(project.budget / 10000000).toFixed(1)} Cr</Text>
                                </View>
                                <Text style={styles.newsTitle}>{project.name}</Text>
                                
                                {project.status === 'in_progress' && project.progress !== undefined && (
                                    <View style={styles.progressSection}>
                                        <View style={styles.progressBarBg}>
                                            <View style={[styles.progressBarFill, { width: `${project.progress}%` }]} />
                                        </View>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                                            <Text style={styles.progressLabel}>Status: In Progress</Text>
                                            <Text style={styles.progressPercent}>{project.progress}%</Text>
                                        </View>
                                    </View>
                                )}

                                <Text style={styles.newsDesc} numberOfLines={2}>{project.description}</Text>
                                <View style={styles.newsFooter}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <MapPin color={colors.textMuted} size={14} />
                                        <Text style={styles.newsLocation}> {project.location?.address || 'N/A'}</Text>
                                    </View>
                                    <ArrowRight color={colors.primary} size={18} />
                                </View>
                            </GlassCard>
                        </TouchableOpacity>
                    ))
                )}
            </ScrollView>
        </View>
    );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
    container: { flex: 1, paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 60 : 50 },
    pageTitle: { fontSize: 26, fontWeight: '900', color: colors.text, marginBottom: 4, letterSpacing: -0.5 },
    pageSub: { fontSize: 13, color: colors.textMuted, marginBottom: 20 },
    
    searchContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 20, borderWidth: 1, borderColor: colors.transparentBorder },
    searchInput: { flex: 1, marginLeft: 12, color: colors.text, fontSize: 16, padding: 0 },
    
    filtersRow: { flexDirection: 'row', marginBottom: 24, paddingVertical: 4 },
    filterChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.inputBg, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24, marginRight: 10, borderWidth: 1, borderColor: colors.transparentBorder },
    filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    filterChipText: { color: colors.textMuted, fontSize: 13, fontWeight: '700', marginLeft: 8 },
    filterChipTextActive: { color: '#fff' },

    trendingSection: { marginBottom: 30 },
    trendingHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    trendingTitle: { color: colors.text, fontSize: 18, fontWeight: '800', marginLeft: 8 },
    trendingScrollContent: { paddingRight: 16 },
    highlightCardWrap: { marginRight: 14 },
    highlightCard: { width: 180, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: colors.primary + '20' },
    highlightBudgetBox: { backgroundColor: colors.primary + '15', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, marginBottom: 14, borderWidth: 1, borderColor: colors.primary + '30' },
    highlightBudgetText: { color: colors.primary, fontWeight: '800', fontSize: 13 },
    highlightTitle: { color: colors.text, fontSize: 15, fontWeight: '700', lineHeight: 22, height: 44 },
    highlightLoc: { color: colors.textMuted, fontSize: 12, flex: 1, fontWeight: '500' },

    feedHeader: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 20 },

    emptyCard: { backgroundColor: colors.card, borderRadius: 16, padding: 32, alignItems: 'center', borderWidth: 1, borderStyle: 'dashed', borderColor: colors.transparentBorder },
    muted: { color: colors.textMuted, textAlign: 'center', fontSize: 14, fontWeight: '500' },
    newsCardWrap: { marginBottom: 16 },
    newsCard: { borderRadius: 20, padding: 20, borderWidth: 1, borderColor: colors.transparentBorder },
    newsHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
    newsType: { fontSize: 11, color: colors.textMuted, letterSpacing: 1.2, fontWeight: '800' },
    newsTime: { fontSize: 11, color: colors.iconDefault, marginTop: 4, fontWeight: '500' },
    newsBudget: { fontSize: 15, fontWeight: '900', color: colors.primary, letterSpacing: -0.5 },
    newsTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 10, lineHeight: 24 },
    newsDesc: { fontSize: 14, color: colors.textMuted, lineHeight: 22, marginBottom: 16 },
    newsFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.transparentBorder, paddingTop: 16 },
    newsLocation: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },

    progressSection: { marginBottom: 16, marginTop: 6 },
    progressBarBg: { height: 8, backgroundColor: colors.inputBg, borderRadius: 4, overflow: 'hidden' },
    progressBarFill: { height: '100%', backgroundColor: colors.primary },
    progressLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    progressPercent: { fontSize: 12, color: colors.primary, fontWeight: '900' },
});
