import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Image, Platform, TextInput, ActivityIndicator, Alert, Modal, KeyboardAvoidingView } from 'react-native';
import { useQuery, useAction, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { ArrowLeft, MapPin, Code, Receipt, Calendar, Camera, Languages, Sparkles, ThumbsUp, ThumbsDown, MessageSquare, Trash2, Edit3, User, Send, X } from 'lucide-react-native';
import ProgressSlider from '../components/ProgressSlider';

interface Project {
    _id: string;
    name: string;
    description: string;
    type: string;
    status: 'completed' | 'in_progress' | 'planned' | 'delayed';
    budget: number;
    completionDate?: string;
    impact?: string;
    location: {
        lat: number;
        lng: number;
        address: string;
    };
    authorName?: string;
    authorId?: string;
    submittedBy?: string;
    likes: number;
    dislikes: number;
    beforeImages?: string[];
    afterImages?: string[];
    progress?: number;
    createdAt: number;
}

function formatBudget(amount: number | undefined): string {
    if (amount === undefined || amount === null) return '₹0';
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)} Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)} L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)} K`;
    return `₹${amount}`;
}

export default function GovernmentWorkScreen({ projectId, onBack }: { projectId: string; onBack: () => void }) {
    const { user } = useAuth();
    const { colors, isDark } = useTheme();
    const styles = createStyles(colors, isDark);
    
    const projects = useQuery(api.projects.list) || [];
    const project = projects.find((p: any) => p._id === projectId);
    
    const translateText = useAction(api.ai.translateText);
    const deleteWork = useMutation(api.projects.deleteWork);
    const toggleInteraction = useMutation(api.projects.toggleInteraction);
    const markRead = useMutation(api.projects.markRead);
    const addComment = useMutation(api.projects.addComment);
    const comments = useQuery(api.projects.getComments, { projectId: projectId as any }) || [];
    const userInteraction = useQuery(api.projects.getInteractions, { projectId: projectId as any, userId: user?.email || '' });

    const [translatedDesc, setTranslatedDesc] = useState<string | null>(null);
    const [translatedImpact, setTranslatedImpact] = useState<string | null>(null);
    const [isTranslating, setIsTranslating] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);
    const [selectedPreviewImage, setSelectedPreviewImage] = useState<string | null>(null);

    // Timer for marking as read
    React.useEffect(() => {
        if (projectId && user?._id) {
            const timer = setTimeout(() => {
                console.log(`[READ] Marking project ${projectId} as read for user ${user._id}`);
                markRead({ projectId: projectId as any, userId: user._id });
            }, 3000); // 3 seconds
            return () => clearTimeout(timer);
        }
    }, [projectId, user?._id]);

    // Improved authorization logic
    const isAuthor = project && user && (
        user._id === project.authorId || 
        user.email === project.submittedBy ||
        (project.authorId?.toString && user._id === project.authorId.toString()) ||
        (user.orgName && project.authorName === user.orgName)
    );

    // DEBUG: Log authorization status
    React.useEffect(() => {
        if (project && user) {
            console.log("=== AUTHORITY CHECK ===");
            console.log("User ID:", user._id);
            console.log("Project Author ID:", project.authorId);
            console.log("User Email:", user.email);
            console.log("Project Submitted By:", project.submittedBy);
            console.log("Is Author Evaluated:", isAuthor);
            console.log("=======================");
        }
    }, [project, user, isAuthor]);

    // Edit State (initialized in useEffect or when project loads)
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [editName, setEditName] = useState('');
    const [editBudget, setEditBudget] = useState('0');
    const [editStatus, setEditStatus] = useState<'planned' | 'in_progress' | 'completed' | 'delayed'>('planned');
    const [editDesc, setEditDesc] = useState('');
    const [editProgress, setEditProgress] = useState(0);
    const [isUpdating, setIsUpdating] = useState(false);

    // Set edit state when project is loaded
    React.useEffect(() => {
        if (project) {
            setEditName(project.name);
            setEditBudget(project.budget?.toString() || '0');
            setEditStatus(project.status);
            setEditDesc(project.description);
            setEditProgress(project.progress || 0);
        }
    }, [project]);

    const updateWork = useMutation(api.projects.updateWork);

    const handleUpdate = async () => {
        setIsUpdating(true);
        try {
            await updateWork({
                id: projectId as any,
                name: editName,
                budget: parseFloat(editBudget),
                status: editStatus,
                description: editDesc,
                progress: editStatus === 'completed' ? 100 : editStatus === 'planned' ? 0 : editProgress,
            });
            setIsEditModalVisible(false);
            Alert.alert("Success", "Initiative updated successfully.");
        } catch (e) {
            Alert.alert("Error", "Failed to update project.");
        } finally {
            setIsUpdating(false);
        }
    };

    const handleToggleLike = async (type: 'like' | 'dislike') => {
        if (!user) { Alert.alert("Login Required", "Please login to like or dislike."); return; }
        try {
            await toggleInteraction({ projectId: projectId as any, userId: user.email, type });
        } catch (e) { console.error(e); }
    };

    const handleAddComment = async () => {
        if (!user) { Alert.alert("Login Required", "Please login to comment."); return; }
        if (!commentText.trim()) return;
        setIsSubmittingComment(true);
        try {
            await addComment({
                projectId: projectId as any,
                userId: user.email,
                authorName: user.orgName || user.name || 'Anonymous',
                text: commentText
            });
            setCommentText('');
        } catch (e) { console.error(e); }
        finally { setIsSubmittingComment(false); }
    };

    const handleDelete = () => {
        const executeDelete = async () => {
            try {
                console.log("Deleting project:", projectId);
                const result = await deleteWork({ id: projectId });
                if (result?.success) {
                    onBack();
                } else {
                    Alert.alert("Error", result?.error || "Failed to delete initiative.");
                }
            } catch (e) { 
                console.error("Delete error:", e);
                Alert.alert("Error", "A system error occurred while deleting."); 
            }
        };

        if (Platform.OS === 'web') {
            const confirmed = window.confirm("Are you sure you want to remove this project? This action cannot be undone.");
            if (confirmed) {
                executeDelete();
            }
            return;
        }

        Alert.alert(
            "Delete Initiative",
            "Are you sure you want to remove this project? This action cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: executeDelete }
            ]
        );
    };

    if (!project) {
        return (
            <View style={styles.container}>
                <TouchableOpacity onPress={onBack} style={styles.backBtn}>
                    <ArrowLeft color={colors.primary} size={16} />
                    <Text style={styles.backText}> Back</Text>
                </TouchableOpacity>
                <View style={styles.emptyCard}>
                    <Text style={styles.muted}>Project not found.</Text>
                </View>
            </View>
        );
    }

    const handleTranslate = async () => {
        if (isTranslating) return;
        setIsTranslating(true);
        try {
            const targetLang = user?.preferredLanguage || user?.motherTongue || 'English';
            if (project.description) {
                const d = await translateText({ text: project.description, targetLanguage: targetLang });
                setTranslatedDesc(d);
            }
            if (project.impact) {
                const i = await translateText({ text: project.impact, targetLanguage: targetLang });
                setTranslatedImpact(i);
            }
        } catch (e) {
            console.error("Translation error", e);
        } finally {
            setIsTranslating(false);
        }
    };

    const statusColor = project.status === 'completed' ? colors.success : project.status === 'in_progress' ? colors.warning : colors.iconDefault;
    const progress = project.progress !== undefined ? project.progress : (project.status === 'completed' ? 100 : project.status === 'in_progress' ? 0 : 0);

    return (
        <View style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={onBack} style={styles.backBtn}>
                        <ArrowLeft color={colors.primary} size={16} style={{ marginRight: 6 }} />
                        <Text style={styles.backText}>Back to radar</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        style={[styles.translateBtn, isTranslating && { opacity: 0.6 }]} 
                        onPress={handleTranslate}
                        disabled={isTranslating}
                    >
                        <Languages color={colors.primary} size={16} />
                        <Text style={styles.translateText}>
                            {isTranslating ? 'Translating...' : (translatedDesc ? 'Localized' : 'Translate')}
                        </Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.titleCard}>
                    <View style={{ marginBottom: 14 }}>
                        <Text style={styles.typeTag}>{project.type.toUpperCase()}</Text>
                        <Text style={styles.title}>{project.name}</Text>
                    </View>

                    <View style={styles.authorBadge}>
                        <User color={colors.textMuted} size={12} />
                        <Text style={styles.authorName}>Posted by: {project.authorName || 'Govt Department'}</Text>
                    </View>

                    <View style={styles.engagementRow}>
                        <TouchableOpacity 
                            style={[styles.engageBtn, userInteraction?.type === 'like' && styles.engageBtnActive]} 
                            onPress={() => handleToggleLike('like')}
                        >
                            <ThumbsUp color={userInteraction?.type === 'like' ? '#fff' : colors.primary} size={16} />
                            <Text style={[styles.engageText, userInteraction?.type === 'like' && { color: '#fff' }]}>{project.likes || 0}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={[styles.engageBtn, { marginLeft: 10 }, userInteraction?.type === 'dislike' && styles.engageBtnActiveDanger]} 
                            onPress={() => handleToggleLike('dislike')}
                        >
                            <ThumbsDown color={userInteraction?.type === 'dislike' ? '#fff' : colors.textMuted} size={16} />
                            <Text style={[styles.engageText, userInteraction?.type === 'dislike' && { color: '#fff' }]}>{project.dislikes || 0}</Text>
                        </TouchableOpacity>

                        <View style={[styles.engageBtn, { marginLeft: 'auto', borderWidth: 0, backgroundColor: colors.inputBg }]}>
                            <MessageSquare color={colors.textMuted} size={16} />
                            <Text style={styles.engageText}>{comments.length}</Text>
                        </View>
                    </View>

                    {/* MANAGEMENT TOOLS shifted below engagement row */}
                    {isAuthor && (
                        <View style={styles.authorManagementRow}>
                            <Text style={styles.managementLabel}>Author Tools</Text>
                            <View style={styles.adminActions}>
                                <TouchableOpacity style={styles.adminBtn} onPress={() => setIsEditModalVisible(true)}>
                                    <Edit3 color={colors.primary} size={18} />
                                    <Text style={styles.adminBtnText}>Edit</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.adminBtn, { marginLeft: 10 }]} onPress={handleDelete}>
                                    <Trash2 color={colors.danger} size={18} />
                                    <Text style={[styles.adminBtnText, { color: colors.danger }]}>Delete</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    <View style={[styles.statusBadge, { backgroundColor: statusColor + '15', borderColor: statusColor + '30', marginTop: 16 }]}>
                        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                        <Text style={[styles.statusText, { color: statusColor }]}>
                            {project.status.replace('_', ' ').toUpperCase()}
                        </Text>
                    </View>
                </View>

                {/* Progress Card */}
                <View style={styles.card}>
                    <Text style={styles.cardLabel}>Completion Progress</Text>
                    <View style={styles.progressRow}>
                        <View style={styles.progressBg}>
                            <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: statusColor }]} />
                        </View>
                        <Text style={[styles.progressText, { color: statusColor }]}>{progress}%</Text>
                    </View>
                </View>

                {/* Description Card */}
                <View style={styles.card}>
                    <View style={styles.labelRow}>
                        <Text style={styles.cardLabel}>Detailed Description</Text>
                        {translatedDesc && <Sparkles color={colors.primary} size={12} />}
                    </View>
                    <Text style={[styles.desc, translatedDesc && { color: colors.primary, fontWeight: '600' }]}>
                        {translatedDesc || project.description}
                    </Text>
                </View>

                {/* Impact Card */}
                {project.impact && (
                    <View style={styles.card}>
                        <View style={styles.labelRow}>
                            <Text style={styles.cardLabel}>Civic Impact</Text>
                            {translatedImpact && <Sparkles color={colors.primary} size={12} />}
                        </View>
                        <Text style={[styles.impact, translatedImpact && { color: colors.primary }]}>
                            {translatedImpact || project.impact}
                        </Text>
                    </View>
                )}

                {/* Before & After Images */}
                {(project.beforeImages?.length! > 0 || project.afterImages?.length! > 0) && (
                    <View style={styles.card}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
                            <Camera color={colors.textMuted} size={16} />
                            <Text style={[styles.cardLabel, { marginBottom: 0, marginLeft: 8 }]}>Project Records</Text>
                        </View>

                        {project.beforeImages?.length! > 0 && (
                            <View style={{ marginBottom: 20 }}>
                                <Text style={styles.imageSubLabel}>Initial State (Before)</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    {project.beforeImages?.map((img: string, idx: number) => (
                                        <TouchableOpacity key={idx} onPress={() => setSelectedPreviewImage(img)}>
                                            <Image source={{ uri: img }} style={styles.detailImage} />
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        )}

                        {project.afterImages?.length! > 0 && (
                            <View>
                                <Text style={styles.imageSubLabel}>Current Progress / Final Result</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    {project.afterImages?.map((img: string, idx: number) => (
                                        <TouchableOpacity key={idx} onPress={() => setSelectedPreviewImage(img)}>
                                            <Image source={{ uri: img }} style={styles.detailImage} />
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        )}
                    </View>
                )}

                <View style={styles.statsRow}>
                    <View style={[styles.statBox, { marginRight: 6 }]}>
                        <View style={styles.statIconRow}>
                            <Receipt color={colors.textMuted} size={14} />
                            <Text style={styles.statLabel}>Allocated Budget</Text>
                        </View>
                        <Text style={styles.statValue}>{formatBudget(project.budget)}</Text>
                    </View>
                    <View style={[styles.statBox, { marginLeft: 6 }]}>
                        <View style={styles.statIconRow}>
                            <MapPin color={colors.textMuted} size={14} />
                            <Text style={styles.statLabel}>Location Area</Text>
                        </View>
                        <Text style={styles.statValue} numberOfLines={2}>{project.location?.address || 'N/A'}</Text>
                    </View>
                </View>

                <View style={styles.statsRow}>
                    <View style={[styles.statBox, { marginRight: 6 }]}>
                        <View style={styles.statIconRow}>
                            <Code color={colors.textMuted} size={14} />
                            <Text style={styles.statLabel}>Geo Coordinates</Text>
                        </View>
                        <Text style={styles.statValueSmall}>
                            {project.location?.lat.toFixed(4)}, {project.location?.lng.toFixed(4)}
                        </Text>
                    </View>
                    <View style={[styles.statBox, { marginLeft: 6 }]}>
                        <View style={styles.statIconRow}>
                            <Calendar color={colors.textMuted} size={14} />
                            <Text style={styles.statLabel}>Timeline</Text>
                        </View>
                        <Text style={styles.statValue}>{project.completionDate || 'Ongoing'}</Text>
                    </View>
                </View>

                {/* Comments Section */}
                <View style={[styles.card, { marginTop: 12 }]}>
                    <Text style={[styles.cardLabel, { marginBottom: 16 }]}>Community Discussion ({comments.length})</Text>
                    
                    <View style={styles.commentInputRow}>
                        <TextInput 
                            style={styles.commentInput} 
                            placeholder="Add a comment..." 
                            placeholderTextColor={colors.textMuted}
                            value={commentText}
                            onChangeText={setCommentText}
                            multiline
                        />
                        <TouchableOpacity 
                            style={[styles.sendBtn, !commentText.trim() && { opacity: 0.5 }]} 
                            onPress={handleAddComment}
                            disabled={isSubmittingComment || !commentText.trim()}
                        >
                            {isSubmittingComment ? <ActivityIndicator size="small" color="#fff" /> : <Send color="#fff" size={18} />}
                        </TouchableOpacity>
                    </View>

                    {comments.length === 0 ? (
                        <Text style={styles.noCommentsText}>Be the first to comment on this initiative.</Text>
                    ) : (
                        comments.map((c: any) => (
                            <View key={c._id} style={styles.commentCard}>
                                <View style={styles.commentHeader}>
                                    <Text style={styles.commentAuthor}>{c.authorName}</Text>
                                    <Text style={styles.commentTime}>{new Date(c.createdAt).toLocaleDateString()}</Text>
                                </View>
                                <Text style={styles.commentText}>{c.text}</Text>
                            </View>
                        ))
                    )}
                </View>
            </ScrollView>

            {/* Edit Modal */}
            <Modal
                visible={isEditModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setIsEditModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <KeyboardAvoidingView 
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
                        style={styles.modalContent}
                    >
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Edit Initiative</Text>
                            <TouchableOpacity onPress={() => setIsEditModalVisible(false)}>
                                <Text style={{ color: colors.textMuted }}>Cancel</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={styles.inputLabel}>Project Name</Text>
                            <TextInput 
                                style={styles.modalInput}
                                value={editName}
                                onChangeText={setEditName}
                                placeholder="Project Name"
                                placeholderTextColor={colors.textMuted}
                            />

                            <Text style={styles.inputLabel}>Budget (₹)</Text>
                            <TextInput 
                                style={styles.modalInput}
                                value={editBudget}
                                onChangeText={setEditBudget}
                                keyboardType="numeric"
                                placeholder="Budget"
                                placeholderTextColor={colors.textMuted}
                            />

                            <Text style={styles.inputLabel}>Status</Text>
                            <View style={styles.statusPicker}>
                                {['planned', 'in_progress', 'completed', 'delayed'].map((s) => (
                                    <TouchableOpacity 
                                        key={s} 
                                        style={[styles.statusOption, editStatus === s && { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}
                                        onPress={() => setEditStatus(s as any)}
                                    >
                                        <Text style={[styles.statusOptionText, editStatus === s && { color: colors.primary }]}>
                                            {s.replace('_', ' ').toUpperCase()}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.inputLabel}>Description</Text>
                            <TextInput 
                                style={[styles.modalInput, { height: 100, textAlignVertical: 'top' }]}
                                value={editDesc}
                                onChangeText={setEditDesc}
                                multiline
                                placeholder="Describe the work..."
                                placeholderTextColor={colors.textMuted}
                            />

                            {/* Progress Update Slider */}
                            {editStatus === 'in_progress' && (
                                <ProgressSlider 
                                    progress={editProgress} 
                                    onChange={setEditProgress}
                                    label="Update Progress"
                                />
                            )}

                            <TouchableOpacity 
                                style={styles.saveBtn} 
                                onPress={handleUpdate}
                                disabled={isUpdating}
                            >
                                {isUpdating ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
                            </TouchableOpacity>
                        </ScrollView>
                    </KeyboardAvoidingView>
                </View>
            </Modal>

            {/* Image Preview Modal */}
            <Modal
                visible={!!selectedPreviewImage}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setSelectedPreviewImage(null)}
            >
                <View style={styles.previewOverlay}>
                    <TouchableOpacity 
                        style={styles.previewCloseBtn} 
                        onPress={() => setSelectedPreviewImage(null)}
                    >
                        <X color="#fff" size={28} />
                    </TouchableOpacity>
                    
                    {selectedPreviewImage && (
                        <Image 
                            source={{ uri: selectedPreviewImage }} 
                            style={styles.previewImage} 
                            resizeMode="contain" 
                        />
                    )}
                </View>
            </Modal>
        </View>
    );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 16, paddingTop: 50 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    backBtn: { flexDirection: 'row', alignItems: 'center', padding: 4 },
    backText: { color: colors.primary, fontSize: 14, fontWeight: '600' },
    translateBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.inputBg, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: colors.transparentBorder },
    translateText: { color: colors.primary, fontSize: 12, fontWeight: '700', marginLeft: 6 },
    
    emptyCard: { backgroundColor: colors.card, borderRadius: 14, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: colors.transparentBorder },
    muted: { color: colors.textMuted, fontSize: 13 },

    titleCard: { backgroundColor: colors.card, borderRadius: 20, padding: 24, marginBottom: 16, borderWidth: 1, borderColor: colors.transparentBorder },
    typeTag: { fontSize: 11, color: colors.textMuted, letterSpacing: 2, fontWeight: '700', marginBottom: 8 },
    title: { fontSize: 24, fontWeight: 'bold', color: colors.text, marginBottom: 14, lineHeight: 32 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, alignSelf: 'flex-start' },
    statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
    statusText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },

    card: { backgroundColor: colors.card, borderRadius: 16, padding: 20, marginBottom: 12, borderWidth: 1, borderColor: colors.transparentBorder },
    labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    cardLabel: { fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: '600' },
    desc: { fontSize: 14, color: colors.text, lineHeight: 22 },
    impact: { fontSize: 15, color: colors.text, lineHeight: 22, fontWeight: '500' },

    progressRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
    progressBg: { flex: 1, height: 10, backgroundColor: colors.inputBg, borderRadius: 5, marginRight: 12 },
    progressFill: { height: 10, borderRadius: 5 },
    progressText: { fontSize: 16, fontWeight: 'bold' },

    statsRow: { flexDirection: 'row', marginBottom: 12 },
    statBox: { flex: 1, backgroundColor: colors.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.transparentBorder },
    statIconRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    statLabel: { fontSize: 10, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginLeft: 6, fontWeight: '600' },
    statValue: { fontSize: 14, fontWeight: 'bold', color: colors.text },
    statValueSmall: { fontSize: 13, fontWeight: '600', color: colors.textMuted, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
    imageSubLabel: { fontSize: 12, color: colors.textMuted, marginBottom: 10, fontWeight: '600' },
    detailImage: { width: 160, height: 110, borderRadius: 12, marginRight: 12, backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.transparentBorder },

    adminActions: { flexDirection: 'row', alignItems: 'center' },
    adminBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.transparentBorder },
    adminBtnText: { color: colors.primary, fontSize: 13, fontWeight: 'bold', marginLeft: 8 },
    authorBadge: { flexDirection: 'row', alignItems: 'center', marginTop: -8, marginBottom: 16 },
    authorName: { fontSize: 12, color: colors.textMuted, marginLeft: 6, fontWeight: '600' },
    engagementRow: { flexDirection: 'row', alignItems: 'center' },
    engageBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: colors.transparentBorder },
    engageBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    engageBtnActiveDanger: { backgroundColor: colors.danger, borderColor: colors.danger },
    engageText: { fontSize: 13, fontWeight: 'bold', marginLeft: 8, color: colors.text },

    authorManagementRow: { marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: colors.transparentBorder },
    managementLabel: { fontSize: 10, color: colors.textMuted, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 },

    commentInputRow: { flexDirection: 'row', marginBottom: 20 },
    commentInput: { flex: 1, backgroundColor: colors.inputBg, borderRadius: 12, padding: 12, color: colors.text, fontSize: 14, minHeight: 46, borderWidth: 1, borderColor: colors.transparentBorder },
    sendBtn: { width: 46, height: 46, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginLeft: 10 },
    noCommentsText: { textAlign: 'center', color: colors.textMuted, fontSize: 13, paddingVertical: 20, fontStyle: 'italic' },
    commentCard: { borderBottomWidth: 1, borderBottomColor: colors.transparentBorder, paddingVertical: 14 },
    commentHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    commentAuthor: { fontSize: 13, fontWeight: 'bold', color: colors.text },
    commentTime: { fontSize: 11, color: colors.textMuted },
    commentText: { fontSize: 14, color: colors.text, lineHeight: 20 },

    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text },
    inputLabel: { fontSize: 12, fontWeight: '700', color: colors.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
    modalInput: { backgroundColor: colors.inputBg, borderRadius: 12, padding: 14, color: colors.text, fontSize: 16, marginBottom: 20, borderWidth: 1, borderColor: colors.transparentBorder },
    statusPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
    statusOption: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: colors.transparentBorder, backgroundColor: colors.inputBg },
    statusOptionText: { fontSize: 11, fontWeight: 'bold', color: colors.textMuted },
    saveBtn: { backgroundColor: colors.primary, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 10 },
    saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

    // Preview Styles
    previewOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
    previewCloseBtn: { position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 10 },
    previewImage: { width: '100%', height: '80%' },

    editProgressWrapper: { flexDirection: 'row', justifyContent: 'space-between', height: 12, backgroundColor: colors.inputBg, borderRadius: 6, paddingHorizontal: 2, alignItems: 'center' },
    editProgressStep: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.transparentBorder, borderWidth: 1, borderColor: colors.card },
});
