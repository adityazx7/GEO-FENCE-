import React from 'react';
import { StyleSheet, View, Text, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import GlassCard from './GlassCard';

interface MetricCardProps {
    label: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
    description?: string;
    style?: StyleProp<ViewStyle>;
}

export default function MetricCard({
    label,
    value,
    icon,
    color,
    description,
    style
}: MetricCardProps) {
    const { colors } = useTheme();

    return (
        <GlassCard intensity={30} style={[styles.container as any, style] as any}>
            <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
                {icon}
            </View>
            <View style={styles.textContainer}>
                <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
                <Text style={[styles.value, { color: colors.text }]}>{value}</Text>
                {description && (
                    <Text style={[styles.description, { color: colors.textMuted }]}>
                        {description}
                    </Text>
                )}
            </View>
        </GlassCard>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        margin: 6,
        padding: 16,
        minHeight: 140,
        justifyContent: 'space-between',
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    textContainer: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    label: {
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    value: {
        fontSize: 24,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    description: {
        fontSize: 11,
        marginTop: 4,
    }
});
