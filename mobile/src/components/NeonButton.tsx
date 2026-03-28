import React from 'react';
import { StyleSheet, TouchableOpacity, Text, View, ViewStyle, TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';

interface NeonButtonProps {
    onPress: () => void;
    title: string;
    style?: ViewStyle;
    textStyle?: TextStyle;
    variant?: 'primary' | 'accent' | 'success' | 'danger' | 'glass';
    size?: 'small' | 'medium' | 'large';
    icon?: React.ReactNode;
}

export default function NeonButton({
    onPress,
    title,
    style,
    textStyle,
    variant = 'primary',
    size = 'medium',
    icon
}: NeonButtonProps) {
    const { colors } = useTheme();

    const getGradients = () => {
        switch (variant) {
            case 'primary': return [colors.primary, '#0090ff'];
            case 'accent': return [colors.accent, '#7c3aed'];
            case 'success': return [colors.success, '#10b981'];
            case 'danger': return [colors.danger, '#ef4444'];
            default: return ['transparent', 'transparent'];
        }
    };

    const isGlass = variant === 'glass';

    return (
        <TouchableOpacity 
            onPress={onPress} 
            activeOpacity={0.8}
            style={[
                styles.button, 
                size === 'small' && styles.small,
                size === 'large' && styles.large,
                isGlass && { backgroundColor: colors.glassBg, borderColor: colors.border, borderWidth: 1 },
                style
            ]}
        >
            {!isGlass && (
                <LinearGradient
                    colors={getGradients()}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                />
            )}
            <View style={styles.content}>
                {icon && <View style={styles.icon}>{icon}</View>}
                <Text style={[
                    styles.text, 
                    { color: isGlass ? colors.text : '#fff' },
                    size === 'small' && styles.smallText,
                    textStyle
                ]}>
                    {title}
                </Text>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    button: {
        borderRadius: 16,
        overflow: 'hidden',
        height: 52,
        justifyContent: 'center',
        alignItems: 'center',
    },
    small: { height: 40, borderRadius: 12, paddingHorizontal: 16 },
    large: { height: 64, borderRadius: 20 },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    text: {
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    smallText: { fontSize: 14 },
    icon: { marginRight: 8 }
});
