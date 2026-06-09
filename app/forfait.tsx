import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
    Animated,
    Dimensions,
    ImageBackground,
    Linking,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import API_URL from "../backend/api";
 
const { width: SW } = Dimensions.get("window");
 
const C = {
    yellow:  "#FFCC00",
    yellowD: "#C9A000",
    black:   "#080808",
    ink:     "#111111",
    card:    "#161616",
    border:  "#232323",
    surface: "#1E1E1E",
    muted:   "#3A3A3A",
    gray:    "#888888",
    light:   "#CCCCCC",
    white:   "#F8F8F8",
    green:   "#00D97E",
    blue:    "#3B8BFF",
    orange:  "#FF7A30",
    purple:  "#B26EFF",
    red:     "#FF4559",
    teal:    "#00C9B1",
};
 
type User = { name: string; username: string; numero: string; solde?: number };
 
// ─── CAROUSEL BANNERS ─────────────────────────────────────────────────────────
// Dégradés colorés simulant des bannières MTN (sans images externes)
const BANNERS = [
    {
        type:"image",
        title: "",
        image:require("../assets/images/ussd.png"),
        sub: "",
        badge: "",
        code: "",
        gradStart: "#FFCC00",
        gradEnd:   "#FF7A30",
        textDark: true,
        icon: "card-giftcard",
    },
    {
        type:"image",
        title: "",
        image:require("../assets/images/forfait1.png"),
        sub: "",
        badge: "",
        code: "",
        gradStart: "#1A1A2E",
        gradEnd:   "#16213E",
        textDark: false,
        icon: "wifi",
    },
    {
        type:"image",
        image: require("../assets/images/banner4.webp"),
        title: "",
        sub: "",
        badge: "",
        code: "",
        gradStart: "#0F3460",
        gradEnd:   "#533483",
        textDark: false,
        icon: "live-tv",
    },
    {
        type:"image",
        image:require("../assets/images/forfait2.png"),
        title: "",
        sub: "",
        badge: "",
        code: "",
        gradStart: "#00C9B1",
        gradEnd:   "#3B8BFF",
        textDark: false,
        icon: "savings",
    },
    {
        // Carte image plein fond — remplacez l'image par votre propre bannière
        type: "image",
        image: require("../assets/images/banner-promo.png"), // ← votre image ici
        title: "",
        sub: "",
        badge: "",
        code: "",
        gradStart: "#000",
        gradEnd: "#000",
        textDark: false,
        icon: "star",
    },
];
 
// ─── QUICK ACTIONS ────────────────────────────────────────────────────────────
const QUICK = [
    { icon: "phone",         label: "Appels",   color: C.orange, bg: "#FF7A3022", route: ""     },
    { icon: "public",         label: "Internet",  color: C.green,  bg: "#00D97E22", route: "/internet"          },
    { icon: "sms",        label: "SMS", color: C.blue,   bg: "#3B8BFF22", route: "" },
    { icon: "tune",    label: "MIX",   color: C.purple, bg: "#B26EFF22", route: ""          },
];
 

 
// ─── FORFAITS ─────────────────────────────────────────────────────────────────
const FORFAITS = [
    { nom: "Forfait Max 2GB", detail: "2GB · Ndeko Net",        prix: 500,  duree: "1 Jour",   hot: true,  ussdCode: "*154*3*6*7#" },
    { nom: "WKD 3.5GB Plan",   detail: "Ndeko Net",                 prix: 840,  duree: "3 Jours",  hot: false, ussdCode: "*154*3*6*2#" },
    { nom: "30 Jours 12.14GB", detail: "Ndeko Net",                 prix: 5550, duree: "30 Jours", hot: false, ussdCode: "*154*3*4*1#" },
    { nom: "Appels Illimités", detail: "230 Mins",         prix: 1210, duree: "7 Jours",  hot: false, ussdCode: "*154*4*3#" },
];
 

 
export default function ForfaitScreen() {
    const [user, setUser]          = useState<User | null>(null);
    const [soldeVisible, setSolde] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [bannerIdx, setBannerIdx]   = useState(0);
 
    const fade    = useRef(new Animated.Value(0)).current;
    const slide   = useRef(new Animated.Value(28)).current;
    const cardS   = useRef(new Animated.Value(0.97)).current;
    const pulseY  = useRef(new Animated.Value(0)).current;
    const bannerX = useRef(new Animated.Value(0)).current;
    const bannerRef = useRef<ScrollView>(null);
    const autoSlide = useRef<ReturnType<typeof setInterval> | null>(null);
 
    useEffect(() => {
        loadUser();
        Animated.parallel([
            Animated.timing(fade,  { toValue: 1, duration: 550, useNativeDriver: true }),
            Animated.spring(slide, { toValue: 0, tension: 80, friction: 9, useNativeDriver: true }),
            Animated.spring(cardS, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
        ]).start();
 
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseY, { toValue: -6, duration: 2200, useNativeDriver: true }),
                Animated.timing(pulseY, { toValue: 0,  duration: 2200, useNativeDriver: true }),
            ])
        ).start();
 
        // ── Auto-slide du carousel ──────────────────────────────────────────
        autoSlide.current = setInterval(() => {
            setBannerIdx((prev) => {
                const next = (prev + 1) % BANNERS.length;
                bannerRef.current?.scrollTo({ x: next * (SW - 32), animated: true });
                return next;
            });
        }, 3500);
 
        return () => { if (autoSlide.current) clearInterval(autoSlide.current); };
    }, []);
 
    const loadUser = async () => {
        try {
            const s = await AsyncStorage.getItem("user");
            if (!s) return;
            const parsed = JSON.parse(s);
            setUser(parsed);
            try {
                const res = await fetch(`${API_URL}/api/users/solde?numero=${parsed.numero}`);
                if (res.ok) {
                    const data = await res.json();
                    const updated = { ...parsed, solde: data.solde };
                    setUser(updated);
                    await AsyncStorage.setItem("user", JSON.stringify(updated));
                }
            } catch {}
        } catch {}
    };
 
    const onRefresh = async () => {
        setRefreshing(true);
        await loadUser();
        setTimeout(() => setRefreshing(false), 900);
    };
 
    const greeting = () => {
        const h = new Date().getHours();
        if (h < 12) return "Bonjour ";
        if (h < 18) return "Bon après-midi ";
        return "Bonsoir ";
    };
 
    const firstName = user?.name?.split(" ")[0] ?? "Vous";
    const solde     = user?.solde ?? 0;
 
    return (
        <SafeAreaView style={s.safe}>
            <StatusBar barStyle="light-content" backgroundColor={C.black} />
 
            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.yellow} />}
            >
 
               
                <View style={s.quickRow}>
                            {QUICK.map((q) => (
                                <TouchableOpacity
                                    key={q.label} style={s.quickItem}
                                    onPress={() => router.push(q.route as any)}
                                    activeOpacity={0.7}
                                >
                                    <View style={[s.quickIcon, { backgroundColor: q.bg }]}>
                                        <MaterialIcons name={q.icon as any} size={29} color={q.color} />
                                    </View>
                                    <Text style={s.quickLbl}>{q.label}</Text>
                                </TouchableOpacity>
                                )
                            )
                            }
                        </View>
 
                <Animated.View style={[s.content, { opacity: fade, transform: [{ translateY: slide }] }]}>
 
                    {/* ══════════════════════════════════════════════════
                        CAROUSEL AUTO-SLIDE
                    ══════════════════════════════════════════════════ */}
                    <View style={s.carouselWrap}>
                        <ScrollView
                            ref={bannerRef}
                            horizontal
                            pagingEnabled
                            showsHorizontalScrollIndicator={false}
                            scrollEventThrottle={16}
                            onMomentumScrollEnd={(e) => {
                                const idx = Math.round(e.nativeEvent.contentOffset.x / (SW - 32));
                                setBannerIdx(idx);
                            }}
                            onScrollBeginDrag={() => {
                                if (autoSlide.current) clearInterval(autoSlide.current);
                            }}
                            snapToInterval={SW - 32}
                            decelerationRate="fast"
                        >
                            {BANNERS.map((b, i) => (
                                b.type === "image" ? (
                                    /* Carte image plein fond */
                                    <TouchableOpacity key={i} activeOpacity={0.92} style={s.bannerCard}>
                                        <ImageBackground
                                            source={b.image}
                                            style={s.bannerImageFull}
                                            imageStyle={{ borderRadius: 20 }}
                                            resizeMode="cover"
                                        />
                                    </TouchableOpacity>
                                ) : (
                                <TouchableOpacity
                                    key={i}
                                    activeOpacity={0.92}
                                    style={[s.bannerCard, {
                                        backgroundColor: b.gradStart,
                                    }]}
                                >
                                    {/* Fond dégradé simulé avec deux Views */}
                                    <View style={[s.bannerBg, { backgroundColor: b.gradEnd }]} />
                                    <View style={s.bannerBgCircle1} />
                                    <View style={s.bannerBgCircle2} />
 
                                    {/* Contenu */}
                                    <View style={s.bannerContent}>
                                        <View style={s.bannerLeft}>
                                            <View style={[s.bannerBadge, {
                                                backgroundColor: b.textDark ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.15)"
                                            }]}>
                                                <Text style={[s.bannerBadgeTxt, { color: b.textDark ? "#000" : C.yellow }]}>
                                                    {b.badge}
                                                </Text>
                                            </View>
                                            <Text style={[s.bannerTitle, { color: b.textDark ? C.black : C.white }]}>
                                                {b.title}
                                            </Text>
                                            <Text style={[s.bannerSub, { color: b.textDark ? "rgba(0,0,0,0.65)" : "rgba(255,255,255,0.7)" }]}>
                                                {b.sub}
                                            </Text>
                                            <View style={[s.bannerCode, {
                                                backgroundColor: b.textDark ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.12)"
                                            }]}>
                                                <Text style={[s.bannerCodeTxt, {
                                                    color: b.textDark ? C.black : C.yellow
                                                }]}>{b.code}</Text>
                                            </View>
                                        </View>
                                        <View style={s.bannerRight}>
                                            <View style={[s.bannerIconWrap, {
                                                backgroundColor: b.textDark ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.12)"
                                            }]}>
                                                <MaterialIcons
                                                    name={b.icon as any} size={38}
                                                    color={b.textDark ? C.black : C.yellow}
                                                />
                                            </View>
                                            <View style={s.bannerMtnBadge}>
                                                <Text style={s.bannerMtnTxt}>MTN</Text>
                                            </View>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                                                            )
                            ))}
 
                        </ScrollView>
 
                        {/* Dots */}
                        <View style={s.dotsRow}>
                            {BANNERS.map((_, i) => (
                                <TouchableOpacity
                                    key={i}
                                    onPress={() => {
                                        bannerRef.current?.scrollTo({ x: i * (SW - 32), animated: true });
                                        setBannerIdx(i);
                                    }}
                                >
                                    <View style={[s.dot, i === bannerIdx && s.dotActive]} />
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
 
                    
 
                    {/* ══════════════════════════════════════════════════
                        FORFAITS LES PLUS UTILISÉS
                    ══════════════════════════════════════════════════ */}
                    <View style={s.section}>
                        <View style={s.sectionHead}>
                            <View style={s.sectionTitleRow}>
                                <View style={[s.accent, { backgroundColor: C.yellow }]} />
                                <Text style={s.sectionTitle}>Forfaits les plus utilisés</Text>
                            </View>
                            
                        </View>
 
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.forfaitsScroll}>
                            {FORFAITS.map((f, i) => (
                                <View key={i} style={[s.forfaitCard, f.hot && s.forfaitCardHot]}>
                                    {f.hot && (
                                        <View style={s.hotBadge}>
                                            <MaterialIcons name="local-fire-department" size={10} color={C.black} />
                                            <Text style={s.hotBadgeTxt}>POPULAIRE</Text>
                                        </View>
                                    )}
                                    <Text style={[s.forfaitNom, f.hot && { color: C.black }]}>{f.nom}</Text>
                                    <Text style={[s.forfaitDetail, f.hot && { color: "rgba(0,0,0,0.6)" }]}>{f.detail}</Text>
                                    <View style={s.forfaitPrixRow}>
                                        <Text style={[s.forfaitPrix, f.hot && { color: C.black }]}>
                                            {f.prix.toLocaleString("fr-FR")}
                                        </Text>
                                        <View>
                                            <Text style={[s.forfaitCur, f.hot && { color: "rgba(0,0,0,0.7)" }]}>FCFA</Text>
                                            <Text style={[s.forfaitDuree, f.hot && { color: "rgba(0,0,0,0.6)" }]}>{f.duree}</Text>
                                        </View>
                                    </View>
                                    <TouchableOpacity
                                        style={[s.acheterBtn, f.hot && s.acheterBtnHot]}
                                        activeOpacity={0.85}
                                        onPress={() => {
                                            if (f.ussdCode) {
                                                // Encoder le # en %23 pour l'URL tel:
                                                const encoded = f.ussdCode.replace(/#/g, "%23");
                                                Linking.openURL(`tel:${encoded}`);
                                            }
                                        }}
                                    >
                                        {f.ussdCode ? (
                                            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                                                <MaterialIcons name="phone" size={13} color={C.black} />
                                                <Text style={[s.acheterTxt, f.hot && { color: C.yellow }]}>Acheter</Text>
                                            </View>
                                        ) : (
                                            <Text style={[s.acheterTxt, f.hot && { color: C.yellow }]}>Acheter</Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </ScrollView>
                    </View>
 
                    
 
                </Animated.View>
            </ScrollView>
        </SafeAreaView>
    );
}
 
const SERV_ITEM_W = (SW - 32 - 30) / 4; // 4 colonnes avec gaps
 
const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.black },
 
    // Header
    header: { backgroundColor: C.ink, paddingBottom: 24, overflow: "hidden" },
    blobTL: { position: "absolute", top: -60, left: -60, width: 200, height: 200, borderRadius: 100, backgroundColor: C.yellow, opacity: 0.06 },
    blobBR: { position: "absolute", bottom: 20, right: -40, width: 140, height: 140, borderRadius: 70, backgroundColor: C.yellow, opacity: 0.04 },
    headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 },
    greeting: { fontSize: 13, color: C.gray, fontWeight: "600", marginBottom: 2 },
    userName: { fontSize: 24, fontWeight: "900", color: C.white, letterSpacing: -0.5 },
    headerIcons: { flexDirection: "row", alignItems: "center", gap: 10 },
    iconBtn: { padding: 8, position: "relative" },
    notifDot: { position: "absolute", top: 6, right: 6, width: 7, height: 7, borderRadius: 3.5, backgroundColor: C.red, borderWidth: 1.5, borderColor: C.ink },
    avatarBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.yellow, alignItems: "center", justifyContent: "center" },
    avatarTxt: { fontSize: 17, fontWeight: "900", color: C.black },
 
    // Balance card
    balCard: { marginHorizontal: 16, borderRadius: 24, backgroundColor: "#141414", borderWidth: 1, borderColor: "#2A2A2A", padding: 22, overflow: "hidden", shadowColor: C.yellow, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 24, elevation: 12 },
    glowOrb: { position: "absolute", top: -30, right: -30, width: 130, height: 130, borderRadius: 65, backgroundColor: C.yellow, opacity: 0.07 },
    balTop: { flexDirection: "row", alignItems: "flex-start", marginBottom: 20 },
    balChip: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.border, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, alignSelf: "flex-start", marginBottom: 12 },
    chipDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.green },
    chipTxt: { fontSize: 11, fontWeight: "700", color: C.gray, letterSpacing: 0.5 },
    balLbl: { fontSize: 11, color: C.gray, fontWeight: "600", letterSpacing: 0.8, marginBottom: 6 },
    balAmtRow: { flexDirection: "row", alignItems: "baseline", marginBottom: 6 },
    balAmt: { fontSize: 30, fontWeight: "900", color: C.white, letterSpacing: -1 },
    balCur: { fontSize: 14, fontWeight: "700", color: C.gray, marginLeft: 2 },
    eyeBtn: { marginLeft: 10, padding: 2 },
    balNum: { fontSize: 12, color: C.muted, fontWeight: "600" },
    cardLogo: { width: 56, height: 56, borderRadius: 16, backgroundColor: C.yellow, alignItems: "center", justifyContent: "center", shadowColor: C.yellow, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.5, shadowRadius: 14, elevation: 8 },
    cardLogoImg: { width: 40, height: 40 },
    cardDiv: { height: 1, backgroundColor: C.border, marginBottom: 18 },
    quickRow: { flexDirection: "row", justifyContent: "space-between" },
    quickItem: { alignItems: "center", gap: 6, flex: 1 },
    quickIcon: { width: 48, height: 48, borderRadius: 15, alignItems: "center", justifyContent: "center" },
    quickLbl: { fontSize: 11, color: C.gray, fontWeight: "700" },
 
    content: { backgroundColor: C.black, paddingTop: 16 },
 
    // ── CAROUSEL ─────────────────────────────────────────────────────────────
    carouselWrap: { paddingHorizontal: 16, marginBottom: 4 },
    bannerCard: {
        width: SW - 32, height: 148, borderRadius: 20,
        overflow: "hidden", position: "relative",
    },
    bannerBg: { position: "absolute", bottom: 0, right: 0, width: "60%", height: "100%", opacity: 0.7, borderTopLeftRadius: 80 },
    bannerBgCircle1: { position: "absolute", top: -20, right: -20, width: 120, height: 120, borderRadius: 60, backgroundColor: "rgba(255,255,255,0.06)" },
    bannerBgCircle2: { position: "absolute", bottom: -30, left: -10, width: 100, height: 100, borderRadius: 50, backgroundColor: "rgba(255,255,255,0.04)" },
    bannerContent: { flex: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16 },
    bannerLeft: { flex: 1, gap: 4 },
    bannerBadge: { alignSelf: "flex-start", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 4 },
    bannerBadgeTxt: { fontSize: 8, fontWeight: "900", letterSpacing: 1.2 },
    bannerTitle: { fontSize: 17, fontWeight: "900", letterSpacing: -0.3, lineHeight: 22 },
    bannerSub: { fontSize: 11, lineHeight: 16, marginTop: 2 },
    bannerCode: { alignSelf: "flex-start", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, marginTop: 8 },
    bannerCodeTxt: { fontSize: 16, fontWeight: "900", letterSpacing: 1 },
    bannerRight: { alignItems: "center", gap: 8, marginLeft: 12 },
    bannerIconWrap: { width: 70, height: 70, borderRadius: 20, alignItems: "center", justifyContent: "center" },
    bannerMtnBadge: { backgroundColor: C.yellow, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    bannerMtnTxt: { fontSize: 10, fontWeight: "900", color: C.black, letterSpacing: 1 },
 
    // Carte image plein fond
    bannerImageFull: {
        width: "100%",
        height: "100%",
        borderRadius: 20,
        overflow: "hidden",
    },
 
    // Dots
    dotsRow: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 10 },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.muted },
    dotActive: { width: 20, backgroundColor: C.yellow, borderRadius: 3 },
 
    // ── SECTIONS ─────────────────────────────────────────────────────────────
    section: { paddingHorizontal: 16, marginTop: 26 },
    sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
    sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    accent: { width: 4, height: 18, borderRadius: 2 },
    sectionTitle: { fontSize: 16, fontWeight: "800", color: C.white },
    seeAll: { flexDirection: "row", alignItems: "center", gap: 4 },
    seeAllTxt: { fontSize: 12, color: C.yellow, fontWeight: "700" },
 
    // ── SERVICES GRID — fond coloré ───────────────────────────────────────────
    servGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    servItem: { width: SERV_ITEM_W },
    servCard: {
        borderRadius: 16, padding: 12,
        alignItems: "center", gap: 8,
        borderWidth: 1, overflow: "hidden",
        minHeight: 90,
    },
    servCircle: { position: "absolute", top: -15, right: -15, width: 55, height: 55, borderRadius: 27.5 },
    servIconWrap: { width: 44, height: 44, borderRadius: 13, alignItems: "center", justifyContent: "center" },
    servLbl: { fontSize: 10, fontWeight: "700", textAlign: "center", lineHeight: 14 },
 
    // ── FORFAITS ─────────────────────────────────────────────────────────────
    forfaitsScroll: { gap: 12, paddingRight: 4 },
    forfaitCard: {
        width: 160, backgroundColor: C.card,
        borderRadius: 18, padding: 16,
        borderWidth: 1, borderColor: C.border,
        gap: 4,
    },
    forfaitCardHot: { backgroundColor: C.yellow, borderColor: C.yellowD },
    hotBadge: {
        flexDirection: "row", alignItems: "center", gap: 3,
        backgroundColor: "rgba(0,0,0,0.15)", alignSelf: "flex-start",
        borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3, marginBottom: 6,
    },
    hotBadgeTxt: { fontSize: 8, fontWeight: "900", color: C.black, letterSpacing: 0.8 },
    forfaitNom:    { fontSize: 13, fontWeight: "800", color: C.white, lineHeight: 18 },
    forfaitDetail: { fontSize: 11, color: C.gray, marginBottom: 8, lineHeight: 16 },
    forfaitPrixRow: { flexDirection: "row", alignItems: "flex-end", gap: 4, marginBottom: 12 },
    forfaitPrix:   { fontSize: 28, fontWeight: "900", color: C.yellow, letterSpacing: -1 },
    forfaitCur:    { fontSize: 10, fontWeight: "700", color: C.gray, lineHeight: 14 },
    forfaitDuree:  { fontSize: 10, color: C.gray, lineHeight: 14 },
    acheterBtn: {
        backgroundColor: C.yellow, borderRadius: 10,
        alignItems: "center", paddingVertical: 10,
    },
    acheterBtnHot: { backgroundColor: C.black },
    acheterTxt: { fontSize: 13, fontWeight: "900", color: C.black },
 
    // ── BALANCES ─────────────────────────────────────────────────────────────
    balGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    balCell: {
        width: (SW - 42) / 2,
        backgroundColor: C.card, borderRadius: 18,
        padding: 16, borderWidth: 1, borderColor: C.border,
        alignItems: "flex-start", overflow: "hidden",
    },
    balCellBg: { position: "absolute", bottom: -20, right: -20, width: 80, height: 80, borderRadius: 40 },
    balCellIcon: { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center", marginBottom: 12 },
    balCellLbl:  { fontSize: 11, color: C.gray, fontWeight: "700", marginBottom: 4 },
    balCellVal:  { fontSize: 20, color: C.white, fontWeight: "900", letterSpacing: -0.5 },
    balCellUnit: { fontSize: 10, color: C.muted, fontWeight: "600", marginBottom: 12 },
    balCellBtn:  { borderWidth: 1, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 5, alignSelf: "stretch", alignItems: "center" },
    balCellBtnTxt: { fontSize: 14, fontWeight: "900" },
 
    // ── TRANSACTIONS EMPTY ───────────────────────────────────────────────────
    emptyTx: { alignItems: "center", paddingVertical: 32 },
    emptyTxCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center", marginBottom: 16 },
    emptyTxTitle: { fontSize: 16, fontWeight: "800", color: C.light, marginBottom: 6 },
    emptyTxSub:   { fontSize: 13, color: C.gray, textAlign: "center", lineHeight: 19, marginBottom: 20 },
    emptyTxCta: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.yellow, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10 },
    emptyTxCtaTxt: { fontSize: 13, fontWeight: "800", color: C.black },
});