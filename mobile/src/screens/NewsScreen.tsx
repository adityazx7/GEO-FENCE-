import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { useQuery } from 'convex/react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Bell, MapPin, ArrowRight, CheckCircle2, Hammer, ClipboardList, AlertTriangle } from 'lucide-react-native';

export default function NewsScreen({ onViewWork }: { onViewWork?: (projectId: string) => void }) {
    const { user } = useAuth();
    const { colors } = useTheme();
    const styles = createStyles(colors);

    const projects = useQuery('projects:list' as any) || [];
    const notifications = useQuery('notifications:listAll' as any) || [];

    const initiatives = [...projects]
        .sort((a: any, b: any) => b.createdAt - a.createdAt)
        .filter((p: any) => {
            if (!user?.state) return true;
            return p.location?.address?.toLowerCase().includes(user.state.toLowerCase());
        });

    const StatusIcon = ({ status }: { status: string }) => {
        switch(status) {
            case 'completed': return <CheckCircle2 color={colors.success} size={20} />;
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
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                <Text style={styles.pageTitle}>Government Initiatives</Text>
                <Text style={styles.pageSub}>Latest work in {user?.state || 'your area'} • Updates in real-time</Text>

                {notifications.length > 0 && (
                    <View style={styles.notifBanner}>
                        <Bell color={colors.primary} size={16} />
                        <Text style={styles.notifBannerText}>{notifications.length} updates from the government</Text>
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
                                <StatusIcon status={project.status} />
                                <View style={{ flex: 1, marginHorizontal: 10 }}>
                                    <Text style={styles.newsType}>{project.type.toUpperCase()}</Text>
                                    <Text style={styles.newsTime}>{timeAgo(project.createdAt)}</Text>
                                </View>
                                <Text style={styles.newsBudget}>₹{(project.budget / 10000000).toFixed(1)} Cr</Text>
                            </View>
                            <Text style={styles.newsTitle}>{project.name}</Text>
                            <Text style={styles.newsDesc} numberOfLines={2}>{project.description}</Text>
                            <View style={styles.newsFooter}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <MapPin color={colors.textMuted} size={14} />
                                    <Text style={styles.newsLocation}> {project.location?.address || 'N/A'}</Text>
                                </View>
                                <ArrowRight color={colors.primary} size={18} />
                            </View>
                        </TouchableOpacity>
                    ))
                )}
            </ScrollView>
        </View>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 16, paddingTop: 50 },
    pageTitle: { fontSize: 22, fontWeight: 'bold', color: colors.text, marginBottom: 4 },
    pageSub: { fontSize: 13, color: colors.textMuted, marginBottom: 20 },
    notifBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.transparentPrimary, borderRadius: 12, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: colors.transparentBorder },
    notifBannerText: { color: colors.primary, fontSize: 13, fontWeight: '600', marginLeft: 8 },
    emptyCard: { backgroundColor: colors.card, borderRadius: 14, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: colors.transparentBorder },
    muted: { color: colors.textMuted, textAlign: 'center', fontSize: 13 },
    newsCard: { backgroundColor: colors.card, borderRadius: 14, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: colors.transparentBorder },
    newsHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    newsType: { fontSize: 10, color: colors.textMuted, letterSpacing: 1, fontWeight: '600' },
    newsTime: { fontSize: 10, color: colors.iconDefault, marginTop: 2 },
    newsBudget: { fontSize: 13, fontWeight: 'bold', color: colors.primary },
    newsTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 6 },
    newsDesc: { fontSize: 13, color: colors.textMuted, lineHeight: 20, marginBottom: 16 },
    newsFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.transparentBorder, paddingTop: 12 },
    newsLocation: { fontSize: 12, color: colors.textMuted },
});
