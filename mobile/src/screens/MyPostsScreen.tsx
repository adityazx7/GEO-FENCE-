import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Platform } from 'react-native';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@backend/_generated/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { ArrowLeft, Trash2, Edit3, ChevronRight, MapPin, Package } from 'lucide-react-native';

export default function MyPostsScreen({ onBack, onOpenProject }: { onBack: () => void, onOpenProject: (id: string) => void }) {
    const { user } = useAuth();
    const { colors, isDark } = useTheme();
    const styles = createStyles(colors, isDark);
    
    const projects = useQuery(api.projects.list) || [];
    const deleteWork = useMutation(api.projects.deleteWork);

    // Robust filter for ownership
    const myProjects = projects.filter((p: any) => 
        (user?._id && p.authorId === user._id) || 
        (user?.email && p.submittedBy === user.email) ||
        (p.authorId?.toString && user?._id && p.authorId.toString() === user._id) ||
        (user?.orgName && p.authorName === user.orgName)
    );

    const handleDelete = async (id: string, name: string) => {
        const executeDelete = async () => {
            try {
                const result = await deleteWork({ id: id });
                if (result?.success) {
                    // Convex auto-updates
                } else {
                    Alert.alert("Error", result?.error || "Failed to delete post.");
                }
            } catch (e) {
                console.error("Delete error:", e);
                Alert.alert("Error", "A system error occurred while deleting.");
            }
        };

        if (Platform.OS === 'web') {
            const confirmed = window.confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`);
            if (confirmed) {
                executeDelete();
            }
            return;
        }

        Alert.alert(
            "Delete Post",
            `Are you sure you want to delete "${name}"?`,
            [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: executeDelete }
            ]
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backBtn}>
                    <ArrowLeft color={colors.primary} size={20} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Initiatives</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16 }}>
                {myProjects.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Package color={colors.textMuted} size={48} strokeWidth={1} />
                        <Text style={styles.emptyTitle}>No posts yet</Text>
                        <Text style={styles.emptySubtitle}>Initiatives you create will appear here for management.</Text>
                    </View>
                ) : (
                    myProjects.map((p: any) => (
                        <TouchableOpacity 
                            key={p._id} 
                            style={styles.postCard} 
                            onPress={() => onOpenProject(p._id)}
                        >
                            <View style={styles.cardContent}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.projectType}>{p.type.toUpperCase()}</Text>
                                    <Text style={styles.projectName} numberOfLines={1}>{p.name}</Text>
                                    <View style={styles.locationRow}>
                                        <MapPin color={colors.textMuted} size={12} />
                                        <Text style={styles.locationText} numberOfLines={1}>{p.location.address}</Text>
                                    </View>
                                </View>
                                <ChevronRight color={colors.transparentBorder} size={20} />
                            </View>

                            <View style={styles.cardActions}>
                                <TouchableOpacity 
                                    style={[styles.actionBtn, { borderColor: colors.primary + '30' }]}
                                    onPress={() => onOpenProject(p._id)} // Details screen has edit flow
                                >
                                    <Edit3 color={colors.primary} size={16} />
                                    <Text style={[styles.actionText, { color: colors.primary }]}>Edit</Text>
                                </TouchableOpacity>
                                
                                <TouchableOpacity 
                                    style={[styles.actionBtn, { borderColor: colors.danger + '30', marginLeft: 12 }]}
                                    onPress={() => handleDelete(p._id, p.name)}
                                >
                                    <Trash2 color={colors.danger} size={16} />
                                    <Text style={[styles.actionText, { color: colors.danger }]}>Delete</Text>
                                </TouchableOpacity>

                                <View style={styles.statusBadge}>
                                    <Text style={styles.statusText}>{p.status.replace('_', ' ')}</Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))
                )}
            </ScrollView>
        </View>
    );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, paddingTop: 60 },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 10 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.transparentBorder },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text, marginLeft: 12 },
    
    emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 100, padding: 40 },
    emptyTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginTop: 16 },
    emptySubtitle: { fontSize: 14, color: colors.textMuted, textAlign: 'center', marginTop: 8, lineHeight: 20 },

    postCard: { backgroundColor: colors.card, borderRadius: 16, marginBottom: 16, padding: 16, borderWidth: 1, borderColor: colors.transparentBorder },
    cardContent: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    projectType: { fontSize: 10, color: colors.primary, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
    projectName: { fontSize: 16, fontWeight: 'bold', color: colors.text, marginBottom: 4 },
    locationRow: { flexDirection: 'row', alignItems: 'center' },
    locationText: { fontSize: 12, color: colors.textMuted, marginLeft: 4 },
    
    cardActions: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.transparentBorder, paddingTop: 12 },
    actionBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
    actionText: { fontSize: 12, fontWeight: '700', marginLeft: 6 },
    
    statusBadge: { marginLeft: 'auto', backgroundColor: colors.inputBg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    statusText: { fontSize: 10, color: colors.textMuted, fontWeight: '700', textTransform: 'uppercase' },
});
