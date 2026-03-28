import React from 'react';
import { StyleSheet, View, ViewStyle, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../context/ThemeContext';

interface GlassCardProps {
    children: React.ReactNode;
    style?: ViewStyle;
    intensity?: number;
    tint?: 'light' | 'dark' | 'default';
}

export default function GlassCard({ 
    children, 
    style, 
    intensity = 40, 
    tint 
}: GlassCardProps) {
    const { isDark, colors } = useTheme();
    const defaultTint = tint || (isDark ? 'dark' : 'light');

    if (Platform.OS === 'web') {
        return (
            <View style={[
                styles.webGlass, 
                { backgroundColor: colors.glassBg, borderColor: colors.border },
                style
            ]}>
                {children}
            </View>
        );
    }

    return (
        <BlurView 
            intensity={intensity} 
            tint={defaultTint} 
            style={[styles.container, { borderColor: colors.border }, style]}
        >
            {children}
        </BlurView>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: 24,
        borderWidth: 1,
        overflow: 'hidden',
        padding: 16,
    },
    webGlass: {
        borderRadius: 24,
        borderWidth: 1,
        padding: 16,
        // @ts-ignore
        backdropFilter: 'blur(10px)',
    }
});
