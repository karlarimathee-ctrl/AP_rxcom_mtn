import { router } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
    Animated,
    Dimensions,
    Easing,
    Image,
    StatusBar,
    StyleSheet,
    View
} from "react-native";
import Svg, { Circle } from "react-native-svg";
 
const { width, height } = Dimensions.get("window");
 
const C = {
    yellow: "#FFCC00",
    black:  "#0A0A0A",
    white:  "#FFFFFF",
};
 
// ─── Jauge circulaire (arc noir) ──────────────────────────────────────────────
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
            {/* Piste grise très légère */}
            <Circle
                cx={CENTER} cy={CENTER} r={RADIUS}
                stroke="rgba(0,0,0,0.15)"
                strokeWidth={STROKE}
                fill="none"
            />
            {/* Arc noir */}
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
 
// ─── Splash Screen ─────────────────────────────────────────────────────────────
export default function SplashScreen() {
    const progress     = useRef(new Animated.Value(0)).current;
    const logoOpacity  = useRef(new Animated.Value(0)).current;
    const logoScale    = useRef(new Animated.Value(0.88)).current;
    const gaugeOpacity = useRef(new Animated.Value(0)).current;
    const exitOpacity  = useRef(new Animated.Value(0)).current;
 
    useEffect(() => {
        // 1. Logo fade + scale
        Animated.parallel([
            Animated.timing(logoOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
            Animated.spring(logoScale,   { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
        ]).start();
 
        // 2. Jauge apparaît + se remplit
        setTimeout(() => {
            Animated.timing(gaugeOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
 
            Animated.timing(progress, {
                toValue:  1,
                duration: 2200,
                easing:   Easing.bezier(0.4, 0, 0.6, 1),
                useNativeDriver: false,
            }).start(() => {
                // 3. Sortie
                setTimeout(() => {
                    Animated.timing(exitOpacity, {
                        toValue:  1,
                        duration: 320,
                        useNativeDriver: true,
                    }).start(() => router.replace("/login"));
                }, 250);
            });
        }, 400);
    }, []);
 
    return (
        <View style={styles.root}>
            <StatusBar barStyle="dark-content" backgroundColor={C.yellow} translucent />
 
            {/* ── LOGO MTN ovale noir — centré ─────────────────── */}
            <Animated.View style={[
                styles.logoWrap,
                { opacity: logoOpacity, transform: [{ scale: logoScale }] },
            ]}>
                <View style={styles.logoWrapper}>
                    <Image source={require("../assets/images/logo.png")} style={styles.logo} resizeMode="contain" />
                </View>
                
            </Animated.View>
 
            {/* ── JAUGE en bas ─────────────────────────────────── */}
            <Animated.View style={[styles.gaugeWrap, { opacity: gaugeOpacity }]}>
                <CircularGauge progress={progress} />
            </Animated.View>
 
            {/* Overlay noir sortie */}
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
 
    // ── Logo ──────────────────────────────────────────────────────
    logoWrap: {
        position: "absolute",
        top: "40%",
        alignItems: "center",
        gap: 16,
        // translateY pour centrer visuellement un peu au-dessus du milieu
        transform: [{ translateY: -40 }],
    },
    oval: {
        borderWidth: 3.5,
        borderColor: C.black,
        borderRadius: 60,
        paddingHorizontal: 42,
        paddingVertical: 18,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: C.yellow,
    },
    ovalText: {
        fontSize: 42,
        fontWeight: "900",
        color: C.black,
        letterSpacing: 4,
        lineHeight: 46,
    },
    subTitle: {
        fontSize: 13,
        fontWeight: "700",
        color: "rgba(0,0,0,0.45)",
        letterSpacing: 2.5,
        textTransform: "uppercase",
    },
 
    // ── Jauge ─────────────────────────────────────────────────────
    gaugeWrap: {
        position: "absolute",
        bottom: height * 0.17,
        alignItems: "center",
        justifyContent: "center",
    },
    logoWrapper: {
        width: 100, height: 100, borderRadius: 22,
         alignItems: "center", justifyContent: "center",
         shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.45, shadowRadius: 20, elevation: 12, marginBottom: 10,
    },
    logo: { width: 150, height: 150 },
});