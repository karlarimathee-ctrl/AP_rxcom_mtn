import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
    Animated,
    Dimensions,
    Easing,
    Image,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import Svg, { Circle } from "react-native-svg";

const { width, height } = Dimensions.get("window");

const C = {
    yellow:     "#FFCC00",
    yellowDim:  "rgba(255,204,0,0.15)",
    black:      "#0A0A0A",
    darkGray:   "#1A1A1A",
    mediumGray: "#2C2C2C",
    lightGray:  "#B0B0B0",
    white:      "#FFFFFF",
    error:      "#FF4444",
    errorDim:   "rgba(255,68,68,0.12)",
    errorBorder:"rgba(255,68,68,0.3)",
};

// ─── Durée de session : 1 mois en millisecondes ───────────────────────────────
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 jours

// ─── Jauge circulaire ────────────────────────────────────────────────────────
const RADIUS = 22;
const STROKE = 2.8;
const CIRCUM = 2 * Math.PI * RADIUS;
const CENTER = RADIUS + STROKE + 1;
const SIZE   = CENTER * 2;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function CircularGauge({ progress }: { progress: Animated.Value }) {
    const strokeDashoffset = progress.interpolate({
        inputRange:  [0, 1],
        outputRange: [CIRCUM, 0],
    });

    return (
        <Svg width={SIZE} height={SIZE}>
            <Circle
                cx={CENTER} cy={CENTER} r={RADIUS}
                stroke="rgba(0,0,0,0.15)"
                strokeWidth={STROKE}
                fill="none"
            />
            <AnimatedCircle
                cx={CENTER} cy={CENTER} r={RADIUS}
                stroke={C.black}
                strokeWidth={STROKE}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={CIRCUM}
                strokeDashoffset={strokeDashoffset}
                transform={`rotate(-90, ${CENTER}, ${CENTER})`}
            />
        </Svg>
    );
}

// ─── Vérifie la connectivité réseau en pingant l'API ─────────────────────────
async function checkNetwork(): Promise<boolean> {
    try {
        // Import dynamique pour éviter les problèmes de dépendance circulaire
        const { default: API_URL } = await import("../backend/api");
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(`${API_URL}/`, {
            method: "GET",
            signal: controller.signal,
        });
        clearTimeout(timeout);
        return res.ok;
    } catch {
        return false;
    }
}

// ─── Splash Screen ───────────────────────────────────────────────────────────
export default function SplashScreen() {
    const progress     = useRef(new Animated.Value(0)).current;
    const logoOpacity  = useRef(new Animated.Value(0)).current;
    const logoScale    = useRef(new Animated.Value(0.88)).current;
    const gaugeOpacity = useRef(new Animated.Value(0)).current;
    const exitOpacity  = useRef(new Animated.Value(0)).current;
    const errorOpacity = useRef(new Animated.Value(0)).current;

    const [noNetwork, setNoNetwork] = useState(false);

    // ─── Animation d'entrée logo ──────────────────────────────────────────────
    useEffect(() => {
        Animated.parallel([
            Animated.timing(logoOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
            Animated.spring(logoScale,   { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
        ]).start();

        runSplashLogic();
    }, []);

    // ─── Logique principale du splash ─────────────────────────────────────────
    const runSplashLogic = async () => {
        // 1. Jauge apparaît et se remplit pendant les vérifications
        setTimeout(() => {
            Animated.timing(gaugeOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();

            Animated.timing(progress, {
                toValue:  1,
                duration: 2200,
                easing:   Easing.bezier(0.4, 0, 0.6, 1),
                useNativeDriver: false,
            }).start();
        }, 400);

        // 2. Vérifications en parallèle (session + réseau)
        const [userRaw, loginTimestampRaw] = await Promise.all([
            AsyncStorage.getItem("user"),
            AsyncStorage.getItem("loginTimestamp"),
        ]);

        const hasValidSession = (() => {
            if (!userRaw || !loginTimestampRaw) return false;
            const loginTime = parseInt(loginTimestampRaw, 10);
            if (isNaN(loginTime)) return false;
            return Date.now() - loginTime < SESSION_DURATION_MS;
        })();

        // 3. Attendre la fin de la jauge (min 2.6s depuis le début)
        await new Promise(resolve => setTimeout(resolve, 2800));

        // ── Cas 1 : Session valide → on vérifie le réseau puis on navigue ────
        if (hasValidSession) {
            const online = await checkNetwork();
            if (!online) {
                showNoNetwork();
                return;
            }
            navigateTo("/(tabs)");
            return;
        }

        // ── Cas 2 : Pas de session valide → login (réseau requis) ────────────
        const online = await checkNetwork();
        if (!online) {
            showNoNetwork();
            return;
        }
        navigateTo("/login");
    };

    const showNoNetwork = () => {
        setNoNetwork(true);
        Animated.timing(errorOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    };

    const navigateTo = (path: string) => {
        setTimeout(() => {
            Animated.timing(exitOpacity, {
                toValue:  1,
                duration: 320,
                useNativeDriver: true,
            }).start(() => router.replace(path as any));
        }, 250);
    };

    // ─── Bouton Réessayer ─────────────────────────────────────────────────────
    const handleRetry = async () => {
        setNoNetwork(false);
        Animated.timing(errorOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();

        // Réinitialise la jauge
        progress.setValue(0);
        Animated.timing(progress, {
            toValue:  1,
            duration: 1800,
            easing:   Easing.bezier(0.4, 0, 0.6, 1),
            useNativeDriver: false,
        }).start();

        await new Promise(r => setTimeout(r, 1000));
        await runSplashLogic();
    };

    return (
        <View style={styles.root}>
            <StatusBar barStyle="dark-content" backgroundColor={C.yellow} translucent />

            {/* ── LOGO ───────────────────────────────────────────────────────── */}
            <Animated.View style={[
                styles.logoWrap,
                { opacity: logoOpacity, transform: [{ scale: logoScale }] },
            ]}>
                <View style={styles.logoWrapper}>
                    <Image
                        source={require("../assets/images/logo.png")}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                </View>
            </Animated.View>

            {/* ── JAUGE ──────────────────────────────────────────────────────── */}
            {!noNetwork && (
                <Animated.View style={[styles.gaugeWrap, { opacity: gaugeOpacity }]}>
                    <CircularGauge progress={progress} />
                </Animated.View>
            )}

            {/* ── BANNIÈRE ERREUR RÉSEAU ──────────────────────────────────────── */}
            {noNetwork && (
                <Animated.View style={[styles.errorWrap, { opacity: errorOpacity }]}>
                    {/* Icône */}
                    <View style={styles.errorIconCircle}>
                        <Text style={styles.errorIcon}>⚠</Text>
                    </View>

                    <Text style={styles.errorTitle}>Impossible de se connecter</Text>
                    <Text style={styles.errorSubtitle}>Pas d'accès Internet</Text>
                    <Text style={styles.errorHint}>
                        Vérifiez votre connexion Wi‑Fi ou données mobiles, puis réessayez.
                    </Text>

                    <TouchableOpacity style={styles.retryBtn} onPress={handleRetry} activeOpacity={0.8}>
                        <Text style={styles.retryBtnText}>↻  Réessayer</Text>
                    </TouchableOpacity>
                </Animated.View>
            )}

            {/* ── OVERLAY SORTIE ─────────────────────────────────────────────── */}
            <Animated.View style={[StyleSheet.absoluteFillObject, {
                backgroundColor: C.black,
                opacity: exitOpacity,
                // @ts-ignore
                pointerEvents: "none",
            }]} />
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: C.yellow,
        alignItems: "center",
        justifyContent: "center",
    },

    // ── Logo ──────────────────────────────────────────────────────────────────
    logoWrap: {
        position: "absolute",
        top: "40%",
        alignItems: "center",
        gap: 16,
        transform: [{ translateY: -40 }],
    },
    logoWrapper: {
        width: 100, height: 100, borderRadius: 22,
        alignItems: "center", justifyContent: "center",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.45, shadowRadius: 20, elevation: 12, marginBottom: 10,
    },
    logo: { width: 150, height: 150 },

    // ── Jauge ─────────────────────────────────────────────────────────────────
    gaugeWrap: {
        position: "absolute",
        bottom: height * 0.17,
        alignItems: "center",
        justifyContent: "center",
    },

    // ── Erreur réseau ─────────────────────────────────────────────────────────
    errorWrap: {
        position: "absolute",
        bottom: height * 0.08,
        width: width * 0.84,
        backgroundColor: C.darkGray,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: C.errorBorder,
        paddingVertical: 28,
        paddingHorizontal: 24,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.45,
        shadowRadius: 24,
        elevation: 14,
    },
    errorIconCircle: {
        width: 56, height: 56, borderRadius: 28,
        backgroundColor: C.errorDim,
        borderWidth: 1, borderColor: C.errorBorder,
        alignItems: "center", justifyContent: "center",
        marginBottom: 14,
    },
    errorIcon: { fontSize: 26 },
    errorTitle: {
        fontSize: 17,
        fontWeight: "800",
        color: C.white,
        letterSpacing: 0.2,
        marginBottom: 4,
        textAlign: "center",
    },
    errorSubtitle: {
        fontSize: 13,
        fontWeight: "700",
        color: C.error,
        marginBottom: 10,
        letterSpacing: 0.5,
    },
    errorHint: {
        fontSize: 12,
        color: C.lightGray,
        textAlign: "center",
        lineHeight: 18,
        marginBottom: 22,
    },
    retryBtn: {
        backgroundColor: C.yellow,
        borderRadius: 12,
        paddingHorizontal: 32,
        paddingVertical: 13,
        shadowColor: C.yellow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.45,
        shadowRadius: 12,
        elevation: 6,
    },
    retryBtnText: {
        color: C.black,
        fontWeight: "900",
        fontSize: 14,
        letterSpacing: 0.5,
    },
});
