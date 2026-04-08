import React, { useState, useRef } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useAction } from 'convex/react';
import { api } from '@backend/_generated/api';
import { useAuth } from '../context/AuthContext';
import { Send, Bot, User, ArrowLeft, Languages } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AIChatScreen({ onBack }: { onBack: () => void }) {
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const chatAction = useAction(api.ragAgent.chat);
    
    const [messages, setMessages] = useState([{ role: 'assistant', content: 'Namaste! I am JanSang AI. You can ask me about any government project, budget, or official accountable. How can I help you today?' }]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [language, setLanguage] = useState(user?.preferredLanguage === 'hi' ? 'hi' : 'en');
    const scrollRef = useRef<ScrollView>(null);

    const toggleLanguage = () => {
        setLanguage(prev => prev === 'en' ? 'hi' : 'en');
        const greeting = language === 'en' ? 'नमस्ते! मैं जनसंग एआई हूँ। आप मुझसे किसी भी सरकारी योजना या बजट के बारे में पूछ सकते हैं।' : 'Namaste! I am JanSang AI. Ask me about any government project or official.';
        setMessages([{ role: 'assistant', content: greeting }]);
    };

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const userMsg = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setLoading(true);

        // Convert messages to history format required by backend
        const history = messages.map(m => ({ role: m.role, content: m.content }));

        try {
            const reply = await chatAction({
                question: userMsg,
                language,
                history,
            });
            setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
        } catch (e: any) {
            console.error("Chat Error:", e);
            setMessages(prev => [...prev, { role: 'assistant', content: 'Connection issue. Please try again.' }]);
        } finally {
            setLoading(false);
            setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
        }
    };

    return (
        <KeyboardAvoidingView 
            style={styles.container} 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
            {/* Header */}
            <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
                <TouchableOpacity onPress={onBack} style={styles.backBtn}>
                    <ArrowLeft color="#fff" size={24} />
                </TouchableOpacity>
                <View style={styles.headerTitleBox}>
                    <Bot color="#3b82f6" size={24} />
                    <Text style={styles.headerTitle}>JanSang AI</Text>
                </View>
                <TouchableOpacity onPress={toggleLanguage} style={styles.langBtn}>
                    <Languages color={language === 'hi' ? '#3b82f6' : '#9ca3af'} size={20} />
                    <Text style={[styles.langText, language === 'hi' && { color: '#3b82f6' }]}>
                        {language === 'hi' ? 'HI' : 'EN'}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Chat List */}
            <ScrollView 
                ref={scrollRef}
                style={styles.chatArea} 
                contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
                onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
            >
                {messages.map((m, idx) => (
                    <View key={idx} style={[styles.msgRow, m.role === 'user' ? styles.userRow : styles.aiRow]}>
                        {m.role === 'assistant' && (
                            <View style={styles.avatarAi}>
                                <Bot color="#fff" size={16} />
                            </View>
                        )}
                        <View style={[styles.bubble, m.role === 'user' ? styles.userBubble : styles.aiBubble]}>
                            <Text style={styles.msgText}>{m.content}</Text>
                        </View>
                        {m.role === 'user' && (
                            <View style={styles.avatarUser}>
                                <User color="#0a0f1e" size={16} />
                            </View>
                        )}
                    </View>
                ))}
                {loading && (
                    <View style={[styles.msgRow, styles.aiRow]}>
                        <View style={styles.avatarAi}>
                            <Bot color="#fff" size={16} />
                        </View>
                        <View style={[styles.bubble, styles.aiBubble, { paddingVertical: 14 }]}>
                            <ActivityIndicator color="#3b82f6" size="small" />
                        </View>
                    </View>
                )}
            </ScrollView>

            {/* Input Area */}
            <View style={[styles.inputArea, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                <TextInput
                    style={styles.input}
                    value={input}
                    onChangeText={setInput}
                    placeholder={`Ask about projects in ${language === 'hi' ? 'Hindi' : 'English'}...`}
                    placeholderTextColor="#6b7280"
                    multiline
                />
                <TouchableOpacity style={[styles.sendBtn, !input.trim() && { opacity: 0.5 }]} onPress={handleSend} disabled={!input.trim() || loading}>
                    <Send color="#fff" size={20} />
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0a0f1e' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, backgroundColor: '#111827', borderBottomWidth: 1, borderBottomColor: '#1f2937' },
    backBtn: { padding: 8 },
    headerTitleBox: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
    langBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 8, backgroundColor: '#1f2937', borderRadius: 12 },
    langText: { color: '#9ca3af', fontSize: 13, fontWeight: 'bold' },
    chatArea: { flex: 1 },
    msgRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 16, width: '100%' },
    userRow: { justifyContent: 'flex-end' },
    aiRow: { justifyContent: 'flex-start' },
    avatarAi: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#3b82f6', alignItems: 'center', justifyContent: 'center', marginRight: 8, marginBottom: 4 },
    avatarUser: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginLeft: 8, marginBottom: 4 },
    bubble: { maxWidth: '75%', padding: 14, borderRadius: 20 },
    aiBubble: { backgroundColor: '#1f2937', borderBottomLeftRadius: 4 },
    userBubble: { backgroundColor: '#3b82f6', borderBottomRightRadius: 4 },
    msgText: { color: '#fff', fontSize: 15, lineHeight: 22 },
    inputArea: { flexDirection: 'row', alignItems: 'flex-end', padding: 16, borderTopWidth: 1, borderTopColor: '#1f2937', backgroundColor: '#111827' },
    input: { flex: 1, backgroundColor: '#1f2937', color: '#fff', borderRadius: 24, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 14, fontSize: 15, maxHeight: 100 },
    sendBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#3b82f6', alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
});
