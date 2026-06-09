import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
    Animated,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const MTN = {
    yellow: "#FFCC00",
    black: "#0A0A0A",
    darkGray: "#1A1A1A",
    mediumGray: "#2C2C2C",
    white: "#FFFFFF",
};

type Props = {
    title: string;
    accentColor?: string;
    subtitle?: string;
};

export default function SubPageHeader({
    title,
    accentColor = MTN.yellow,
    subtitle,
}: Props) {
    const insets = useSafeAreaInsets();
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(-12)).current;
    const scaleAnim = useRef(new Animated.Value(0.92)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 320, useNativeDriver: true }),
            Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }),
            Animated.spring(scaleAnim, { toValue: 1, tension: 80, friction: 10, useNativeDriver: true }),
        ]).start();
    }, []);

    return (
        <View style={[styles.wrapper, { paddingTop: insets.top }]}>
            {/* Bande jaune décorative — colle tout en haut de l'écran */}
            <View style={[styles.topAccent, { top: insets.top }]} />

            {/* Ligne décorative accent couleur */}
            <View style={[styles.accentLine, { backgroundColor: accentColor, top: insets.top }]} />

            <View style={styles.header}>
                {/* Bouton retour */}
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.backBtn}
                    activeOpacity={0.75}
                >
                    <View style={styles.backBtnCorner} />
                    <MaterialIcons name="arrow-back-ios" size={16} color={MTN.white} style={{ marginLeft: 4 }} />
                </TouchableOpacity>

                {/* Titre animé */}
                <Animated.View
                    style={[
                        styles.titleBlock,
                        {
                            opacity: fadeAnim,
                            transform: [{ translateX: slideAnim }, { scale: scaleAnim }],
                        },
                    ]}
                >
                    <View style={[styles.titleDot, { backgroundColor: accentColor }]} />
                    <View>
                        <Text style={styles.title} numberOfLines={1}>{title}</Text>
                        {subtitle ? (
                            <Text style={styles.subtitle}>{subtitle}</Text>
                        ) : null}
                    </View>
                </Animated.View>

                {/* Badge MTN */}
                <View style={styles.mtnBadge}>
                    <Text style={styles.mtnBadgeText}>MTN</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        backgroundColor: MTN.darkGray,
        borderBottomWidth: 1,
        borderBottomColor: MTN.mediumGray,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 8,
    },
    topAccent: {
        position: "absolute",
        left: 0,
        right: "70%",
        height: 3,
        backgroundColor: MTN.yellow,
        borderBottomRightRadius: 4,
    },
    accentLine: {
        position: "absolute",
        left: 0,
        bottom: 0,
        width: 3,
        borderBottomRightRadius: 3,
        borderTopRightRadius: 3,
        opacity: 0.85,
        // top est défini dynamiquement avec insets.top
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 13,
        gap: 12,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 11,
        backgroundColor: "rgba(255,255,255,0.06)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.1)",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
    },
    backBtnCorner: {
        position: "absolute",
        top: 0,
        right: 0,
        width: 12,
        height: 12,
        backgroundColor: MTN.yellow,
        borderBottomLeftRadius: 8,
        opacity: 0.9,
    },
    titleBlock: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    titleDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
    },
    title: {
        fontSize: 16,
        fontWeight: "800",
        color: MTN.white,
        letterSpacing: 0.2,
    },
    subtitle: {
        fontSize: 11,
        color: "rgba(255,255,255,0.4)",
        fontWeight: "600",
        marginTop: 1,
        letterSpacing: 0.3,
    },
    mtnBadge: {
        backgroundColor: MTN.yellow,
        borderRadius: 8,
        paddingHorizontal: 9,
        paddingVertical: 4,
    },
    mtnBadgeText: {
        fontSize: 11,
        fontWeight: "900",
        color: MTN.black,
        letterSpacing: 1.5,
    },
});
