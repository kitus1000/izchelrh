import React, { useRef } from 'react';
import { Text, StyleSheet, Pressable, Animated } from 'react-native';

type ActionButtonProps = {
    title: string;
    color: string;
    onPress: () => void;
    icon?: string;
};

export default function ActionButton({ title, color, onPress }: ActionButtonProps) {
    const scale = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scale, {
            toValue: 0.95,
            useNativeDriver: true,
            speed: 20,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: true,
            speed: 20,
        }).start();
    };

    return (
        <Animated.View style={[styles.button, { backgroundColor: color, transform: [{ scale }] }]}>
            <Pressable
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                onPress={onPress}
                style={StyleSheet.absoluteFill}
            />
            <Text
                style={styles.text}
                pointerEvents="none"
                numberOfLines={2}
                adjustsFontSizeToFit
                minimumFontScale={0.5}
            >
                {title}
            </Text>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    button: {
        flex: 1,
        width: '100%',
        height: '100%',
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    text: {
        color: '#ffffff',
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        letterSpacing: 0.5,
    },
});
