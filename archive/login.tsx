import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
    Animated,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import API_URL from "../backend/api";
 
const MTN = {
    yellow: "#FFCC00",
    yellowDark: "#E6B800",
    black: "#0A0A0A",
    darkGray: "#1A1A1A",
    mediumGray: "#2C2C2C",
    lightGray: "#B0B0B0",
    white: "#FFFFFF",
    error: "#FF4444",
    success: "#00C853",
};
 
// ─── ÉTAPE 1 : Numéro + mot de passe
// ─── ÉTAPE 2 : Code OTP envoyé par email
 
export default function Login() {
    const [step, setStep] = useState<1 | 2>(1);
 
    // Étape 1
    const [numero, setNumero] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [numeroFocused, setNumeroFocused] = useState(false);
    const [passwordFocused, setPasswordFocused] = useState(false);
 
    // Étape 2
    const [otp, setOtp] = useState(["", "", "", "", "", ""]);
    const [otpEmail, setOtpEmail] = useState(""); // email masqué ex: j***@gmail.com
    const [otpFocused, setOtpFocused] = useState<number | null>(null);
    const otpRefs = useRef<(TextInput | null)[]>([]);
    const [resendTimer, setResendTimer] = useState(60);
    const [canResend, setCanResend] = useState(false);
 
    const [loading, setLoading] = useState(false);
    const [error, setErrorMsg] = useState("");
 
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(40)).current;
    const logoScale = useRef(new Animated.Value(0.8)).current;
    const loadingRotate = useRef(new Animated.Value(0)).current;
    const shakeAnim = useRef(new Animated.Value(0)).current;
    const stepAnim = useRef(new Animated.Value(0)).current;
    const numeroRef = useRef<TextInput>(null);
    const passwordRef = useRef<TextInput>(null);
 
    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
            Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 8, useNativeDriver: true }),
            Animated.spring(logoScale, { toValue: 1, tension: 80, friction: 6, useNativeDriver: true }),
        ]).start();
    }, []);
 
    useEffect(() => {
        if (loading) {
            Animated.loop(
                Animated.timing(loadingRotate, { toValue: 1, duration: 900, useNativeDriver: true })
            ).start();
        } else {
            loadingRotate.setValue(0);
        }
    }, [loading]);
 
    // Compte à rebours renvoi OTP
    useEffect(() => {
        if (step !== 2) return;
        setResendTimer(60);
        setCanResend(false);
        const interval = setInterval(() => {
            setResendTimer((t) => {
                if (t <= 1) { clearInterval(interval); setCanResend(true); return 0; }
                return t - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [step]);
 
    const triggerShake = () => {
        Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
        ]).start();
    };
 
    const goToStep2 = () => {
        Animated.timing(stepAnim, {
            toValue: 1, duration: 350, useNativeDriver: true,
        }).start(() => {
            setStep(2);
            stepAnim.setValue(0);
        });
    };
 
    const spin = loadingRotate.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
 
    // ─── ÉTAPE 1 : Vérifier identifiants + envoyer OTP ───────────────────────
    const handleStep1 = async () => {
        setErrorMsg("");
        // Nettoyer le numéro avant validation
        const cleanNumero = numero.replace(/[\s\-]/g, "").trim();
        if (!/^06\d{7}$/.test(cleanNumero)) {
            setErrorMsg("Numéro invalide. Tapez 9 chiffres commençant par 06 (ex: 061234567).");
            triggerShake();
            return;
        }
        if (password.length < 6) {
            setErrorMsg("Le mot de passe doit contenir au moins 6 caractères.");
            triggerShake();
            return;
        }
        setLoading(true);
        try {
            // Timeout de 10 secondes pour éviter un blocage silencieux
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            let response: Response;
            try {
                response = await fetch(`${API_URL}/api/login/step1`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    // Envoyer le numéro nettoyé
                    body: JSON.stringify({ numero: cleanNumero, password }),
                    signal: controller.signal,
                });
            } catch (fetchErr: any) {
                if (fetchErr?.name === "AbortError") {
                    setErrorMsg("Le serveur ne répond pas. Vérifiez votre connexion réseau.");
                } else {
                    setErrorMsg(`Impossible de contacter le serveur (${API_URL}). Vérifiez votre réseau ou l'URL du serveur.`);
                }
                triggerShake();
                return;
            } finally {
                clearTimeout(timeoutId);
            }
            let data: any = {};
            try {
                data = await response.json();
            } catch {
                setErrorMsg("Réponse invalide du serveur.");
                triggerShake();
                return;
            }
            if (!response.ok) {
                setErrorMsg(data.error || "Identifiants incorrects.");
                triggerShake();
                return;
            }
            // data.email = email masqué ex: "j***@gmail.com"
            setOtpEmail(data.email);
            goToStep2();
        } finally {
            setLoading(false);
        }
    };
 
    // ─── ÉTAPE 2 : Vérifier OTP ───────────────────────────────────────────────
    const handleStep2 = async () => {
        const code = otp.join("");
        if (code.length !== 6) {
            setErrorMsg("Entrez le code à 6 chiffres reçu par email.");
            triggerShake();
            return;
        }
        setErrorMsg("");
        setLoading(true);
        try {
            const cleanNumero = numero.replace(/[\s\-]/g, "").trim();
            const controller2 = new AbortController();
            const timeoutId2 = setTimeout(() => controller2.abort(), 10000);
            let response: Response;
            try {
                response = await fetch(`${API_URL}/api/login/step2`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ numero: cleanNumero, code }),
                    signal: controller2.signal,
                });
            } catch (fetchErr: any) {
                if (fetchErr?.name === "AbortError") {
                    setErrorMsg("Le serveur ne répond pas. Vérifiez votre connexion réseau.");
                } else {
                    setErrorMsg("Impossible de contacter le serveur. Vérifiez votre réseau.");
                }
                triggerShake();
                return;
            } finally {
                clearTimeout(timeoutId2);
            }
            const data = await response.json();
            if (!response.ok) {
                setErrorMsg(data.error || "Code incorrect ou expiré.");
                triggerShake();
                setOtp(["", "", "", "", "", ""]);
                otpRefs.current[0]?.focus();
                return;
            }
            await AsyncStorage.setItem("user", JSON.stringify(data));
            router.replace("/(tabs)");
        } catch {
            setErrorMsg("Impossible de contacter le serveur.");
            triggerShake();
        } finally {
            setLoading(false);
        }
    };
 
    // ─── RENVOYER OTP ─────────────────────────────────────────────────────────
    const handleResend = async () => {
        if (!canResend) return;
        setCanResend(false);
        setOtp(["", "", "", "", "", ""]);
        setErrorMsg("");
        try {
            await fetch(`${API_URL}/api/login/resend-otp`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ numero }),
            });
            setResendTimer(60);
            const interval = setInterval(() => {
                setResendTimer((t) => {
                    if (t <= 1) { clearInterval(interval); setCanResend(true); return 0; }
                    return t - 1;
                });
            }, 1000);
        } catch {}
    };
 
    // ─── GESTION OTP INPUT ────────────────────────────────────────────────────
    const handleOtpChange = (val: string, idx: number) => {
        if (!/^\d*$/.test(val)) return;
        const newOtp = [...otp];
        newOtp[idx] = val.slice(-1);
        setOtp(newOtp);
        if (val && idx < 5) otpRefs.current[idx + 1]?.focus();
        // Auto-submit si complet
        if (idx === 5 && val && newOtp.every((v) => v !== "")) {
            setTimeout(handleStep2, 100);
        }
    };
 
    const handleOtpKeyPress = (e: any, idx: number) => {
        if (e.nativeEvent.key === "Backspace" && !otp[idx] && idx > 0) {
            otpRefs.current[idx - 1]?.focus();
        }
    };
 
    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" backgroundColor={MTN.black} />
            <View style={styles.bgDecorTop} />
            <View style={styles.bgDecorBottom} />
 
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
                <ScrollView
                    contentContainerStyle={styles.scrollContainer}
                    keyboardShouldPersistTaps="always"
                    showsVerticalScrollIndicator={false}
                    keyboardDismissMode="none"
                >
                    {/* Header */}
                    <Animated.View style={[styles.headerSection, { opacity: fadeAnim, transform: [{ scale: logoScale }] }]}>
                        <View style={styles.logoWrapper}>
                            <Image source={require("../assets/images/logo.png")} style={styles.logo} resizeMode="contain" />
                        </View>
                        <Text style={styles.brandName}>MTN</Text>
                        <Text style={styles.brandTagline}>MOMO GRAMM</Text>
                    </Animated.View>
 
                    {/* Indicateur d'étapes */}
                    <View style={styles.stepsIndicator}>
                        <View style={styles.stepDot}>
                            <View style={[styles.stepDotInner, styles.stepDotActive]}>
                                <Text style={styles.stepDotTxt}>1</Text>
                            </View>
                            <Text style={styles.stepLbl}>Identifiants</Text>
                        </View>
                        <View style={[styles.stepLine, step === 2 && styles.stepLineActive]} />
                        <View style={styles.stepDot}>
                            <View style={[styles.stepDotInner, step === 2 && styles.stepDotActive, step === 1 && styles.stepDotInactive]}>
                                <Text style={[styles.stepDotTxt, step === 1 && { color: MTN.lightGray }]}>2</Text>
                            </View>
                            <Text style={[styles.stepLbl, step === 1 && { color: MTN.lightGray }]}>Vérification</Text>
                        </View>
                    </View>
 
                    {/* ── CARD ─────────────────────────────────────────────── */}
                    <Animated.View style={[styles.card, {
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnim }, { translateX: shakeAnim }],
                    }]}>
 
                        {error ? (
                            <View style={styles.errorBanner}>
                                <MaterialIcons name="error-outline" size={18} color={MTN.error} />
                                <Text style={styles.errorText}>{error}</Text>
                            </View>
                        ) : null}
 
                        {/* ── ÉTAPE 1 ──────────────────────────────────────── */}
                        {step === 1 && (
                            <>
                                <Text style={styles.cardTitle}>Connexion</Text>
                                <Text style={styles.cardSubtitle}>Accédez à votre compte MOMO GRAMM</Text>
 
                                {/* Numéro */}
                                <View style={styles.fieldGroup}>
                                    <Text style={styles.label}>Numéro MTN</Text>
                                    <TouchableWithoutFeedback onPress={() => numeroRef.current?.focus()}>
                                        <View style={[styles.inputRow, numeroFocused && styles.inputRowFocused]}>
                                            <View style={styles.prefixBadge}>
                                                <Text style={styles.prefixText}>🇨🇬 +242</Text>
                                            </View>
                                            <TextInput
                                                ref={numeroRef}
                                                style={styles.input}
                                                placeholder="061234567"
                                                placeholderTextColor={MTN.lightGray}
                                                keyboardType="phone-pad"
                                                value={numero}
                                                onChangeText={setNumero}
                                                onFocus={() => setNumeroFocused(true)}
                                                onBlur={() => setNumeroFocused(false)}
                                                maxLength={9}
                                                returnKeyType="next"
                                                onSubmitEditing={() => passwordRef.current?.focus()}
                                                blurOnSubmit={false}
                                            />
                                            {numero.length === 9 && (
                                                <MaterialIcons name="check-circle" size={20} color={MTN.success} style={styles.inputSuffix} />
                                            )}
                                        </View>
                                    </TouchableWithoutFeedback>
                                </View>
 
                                {/* Mot de passe */}
                                <View style={styles.fieldGroup}>
                                    <Text style={styles.label}>Mot de passe</Text>
                                    <TouchableWithoutFeedback onPress={() => passwordRef.current?.focus()}>
                                        <View style={[styles.inputRow, passwordFocused && styles.inputRowFocused]}>
                                            <MaterialIcons name="lock" size={20} color={passwordFocused ? MTN.yellow : MTN.lightGray} style={styles.inputIcon} />
                                            <TextInput
                                                ref={passwordRef}
                                                style={styles.input}
                                                placeholder="••••••••"
                                                placeholderTextColor={MTN.lightGray}
                                                secureTextEntry={!showPassword}
                                                value={password}
                                                onChangeText={setPassword}
                                                onFocus={() => setPasswordFocused(true)}
                                                onBlur={() => setPasswordFocused(false)}
                                                returnKeyType="done"
                                                onSubmitEditing={handleStep1}
                                            />
                                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.inputSuffix}>
                                                <MaterialIcons name={showPassword ? "visibility" : "visibility-off"} size={20} color={MTN.lightGray} />
                                            </TouchableOpacity>
                                        </View>
                                    </TouchableWithoutFeedback>
                                </View>
 
                                <TouchableOpacity style={styles.forgotRow}>
                                    <Text style={styles.forgotText}>Mot de passe oublié ?</Text>
                                </TouchableOpacity>
 
                                <TouchableOpacity
                                    style={[styles.loginButton, loading && styles.loginButtonDisabled]}
                                    onPress={handleStep1}
                                    disabled={loading}
                                    activeOpacity={0.85}
                                >
                                    {loading ? (
                                        <Animated.View style={{ transform: [{ rotate: spin }] }}>
                                            <MaterialIcons name="refresh" size={24} color={MTN.black} />
                                        </Animated.View>
                                    ) : (
                                        <View style={styles.btnRow}>
                                            <Text style={styles.loginButtonText}>CONTINUER</Text>
                                            <MaterialIcons name="arrow-forward" size={20} color={MTN.black} />
                                        </View>
                                    )}
                                </TouchableOpacity>
 
                                <View style={styles.divider}>
                                    <View style={styles.dividerLine} />
                                    <Text style={styles.dividerText}>ou</Text>
                                    <View style={styles.dividerLine} />
                                </View>
 
                                <TouchableOpacity style={styles.registerRow} onPress={() => router.push("/register")}>
                                    <Text style={styles.registerText}>
                                        Pas encore de compte ?{"  "}
                                        <Text style={styles.registerLink}>S'inscrire</Text>
                                    </Text>
                                </TouchableOpacity>
                            </>
                        )}
 
                        {/* ── ÉTAPE 2 : OTP ────────────────────────────────── */}
                        {step === 2 && (
                            <>
                                <TouchableOpacity
                                    style={styles.backBtn}
                                    onPress={() => { setStep(1); setErrorMsg(""); setOtp(["", "", "", "", "", ""]); }}
                                >
                                    <MaterialIcons name="arrow-back" size={18} color={MTN.yellow} />
                                    <Text style={styles.backBtnTxt}>Retour</Text>
                                </TouchableOpacity>
 
                                <View style={styles.otpIconWrap}>
                                    <MaterialIcons name="mark-email-unread" size={36} color={MTN.yellow} />
                                </View>
                                <Text style={styles.cardTitle}>Code de vérification</Text>
                                <Text style={styles.cardSubtitle}>
                                    Un code à 6 chiffres a été envoyé à{"\n"}
                                    <Text style={styles.emailHighlight}>{otpEmail}</Text>
                                </Text>
 
                                {/* Cellules OTP */}
                                <View style={styles.otpRow}>
                                    {otp.map((digit, idx) => (
                                        <TextInput
                                            key={idx}
                                            ref={(r) => { otpRefs.current[idx] = r; }}
                                            style={[
                                                styles.otpCell,
                                                otpFocused === idx && styles.otpCellFocused,
                                                digit && styles.otpCellFilled,
                                            ]}
                                            value={digit}
                                            onChangeText={(v) => handleOtpChange(v, idx)}
                                            onKeyPress={(e) => handleOtpKeyPress(e, idx)}
                                            onFocus={() => setOtpFocused(idx)}
                                            onBlur={() => setOtpFocused(null)}
                                            keyboardType="number-pad"
                                            maxLength={1}
                                            textAlign="center"
                                            selectTextOnFocus
                                        />
                                    ))}
                                </View>
 
                                <TouchableOpacity
                                    style={[styles.loginButton, loading && styles.loginButtonDisabled, { marginTop: 8 }]}
                                    onPress={handleStep2}
                                    disabled={loading || otp.join("").length !== 6}
                                    activeOpacity={0.85}
                                >
                                    {loading ? (
                                        <Animated.View style={{ transform: [{ rotate: spin }] }}>
                                            <MaterialIcons name="refresh" size={24} color={MTN.black} />
                                        </Animated.View>
                                    ) : (
                                        <View style={styles.btnRow}>
                                            <MaterialIcons name="verified-user" size={20} color={MTN.black} />
                                            <Text style={styles.loginButtonText}>VÉRIFIER</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
 
                                {/* Renvoi OTP */}
                                <View style={styles.resendRow}>
                                    <Text style={styles.resendTxt}>Code non reçu ? </Text>
                                    {canResend ? (
                                        <TouchableOpacity onPress={handleResend}>
                                            <Text style={styles.resendLink}>Renvoyer le code</Text>
                                        </TouchableOpacity>
                                    ) : (
                                        <Text style={styles.resendTimer}>Renvoyer dans {resendTimer}s</Text>
                                    )}
                                </View>
 
                                {/* Info sécurité */}
                                <View style={styles.securityNote}>
                                    <MaterialIcons name="security" size={14} color={MTN.success} />
                                    <Text style={styles.securityTxt}>
                                        Ce code expire dans 10 minutes. Ne le partagez à personne.
                                    </Text>
                                </View>
                            </>
                        )}
                    </Animated.View>
 
                    <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
                        <Text style={styles.footerText}>© {new Date().getFullYear()} MTN Congo — Tous droits réservés</Text>
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
 
const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: MTN.black },
    bgDecorTop: {
        position: "absolute", top: -80, right: -80,
        width: 260, height: 260, borderRadius: 130,
        backgroundColor: MTN.yellow, opacity: 0.08,
    },
    bgDecorBottom: {
        position: "absolute", bottom: -100, left: -60,
        width: 300, height: 300, borderRadius: 150,
        backgroundColor: MTN.yellow, opacity: 0.05,
    },
    scrollContainer: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40, alignItems: "center" },
 
    headerSection: { alignItems: "center", marginBottom: 20 },
    logoWrapper: {
        width: 90, height: 90, borderRadius: 22,
        backgroundColor: MTN.yellow, alignItems: "center", justifyContent: "center",
        shadowColor: MTN.yellow, shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.45, shadowRadius: 20, elevation: 12, marginBottom: 10,
    },
    logo: { width: 66, height: 66 },
    brandName: { fontSize: 22, fontWeight: "900", color: MTN.white, letterSpacing: 4 },
    brandTagline: { fontSize: 11, fontWeight: "700", color: MTN.yellow, letterSpacing: 3, marginTop: 2 },
 
    // Étapes
    stepsIndicator: {
        flexDirection: "row", alignItems: "center",
        marginBottom: 20, width: "70%",
    },
    stepDot: { alignItems: "center", gap: 4 },
    stepDotInner: {
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: MTN.yellow, alignItems: "center", justifyContent: "center",
    },
    stepDotActive: { backgroundColor: MTN.yellow },
    stepDotInactive: { backgroundColor: MTN.mediumGray },
    stepDotTxt: { fontSize: 13, fontWeight: "900", color: MTN.black },
    stepLbl: { fontSize: 10, fontWeight: "700", color: MTN.yellow, letterSpacing: 0.5 },
    stepLine: { flex: 1, height: 2, backgroundColor: MTN.mediumGray, marginHorizontal: 8, marginBottom: 14 },
    stepLineActive: { backgroundColor: MTN.yellow },
 
    card: {
        width: "100%", backgroundColor: MTN.darkGray, borderRadius: 24,
        padding: 28, borderWidth: 1, borderColor: MTN.mediumGray,
        shadowColor: "#000", shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.5, shadowRadius: 30, elevation: 10,
    },
    cardTitle: { fontSize: 24, fontWeight: "800", color: MTN.white, marginBottom: 4, letterSpacing: -0.5 },
    cardSubtitle: { fontSize: 13, color: MTN.lightGray, marginBottom: 22, lineHeight: 20 },
 
    errorBanner: {
        flexDirection: "row", alignItems: "center",
        backgroundColor: "rgba(255,68,68,0.12)", borderWidth: 1,
        borderColor: "rgba(255,68,68,0.3)", borderRadius: 10,
        paddingHorizontal: 14, paddingVertical: 10, marginBottom: 16, gap: 8,
    },
    errorText: { color: MTN.error, fontSize: 13, flex: 1, lineHeight: 18 },
 
    fieldGroup: { marginBottom: 18 },
    label: { fontSize: 12, fontWeight: "700", color: MTN.lightGray, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 },
    inputRow: {
        flexDirection: "row", alignItems: "center", backgroundColor: MTN.mediumGray,
        borderRadius: 12, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.08)",
        minHeight: 52, paddingHorizontal: 4,
    },
    inputRowFocused: {
        borderColor: MTN.yellow, shadowColor: MTN.yellow,
        shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
    },
    prefixBadge: {
        paddingHorizontal: 12, paddingVertical: 6, marginLeft: 4,
        backgroundColor: "rgba(255,204,0,0.12)", borderRadius: 8, marginRight: 4,
    },
    prefixText: { fontSize: 13, color: MTN.yellow, fontWeight: "700" },
    inputIcon: { marginLeft: 14, marginRight: 4 },
    input: { flex: 1, color: MTN.white, fontSize: 16, paddingHorizontal: 10, paddingVertical: 14, fontWeight: "500" },
    inputSuffix: { paddingHorizontal: 12 },
    forgotRow: { alignSelf: "flex-end", marginBottom: 24, marginTop: -6 },
    forgotText: { color: MTN.yellow, fontSize: 13, fontWeight: "600" },
 
    loginButton: {
        backgroundColor: MTN.yellow, borderRadius: 14, height: 56,
        alignItems: "center", justifyContent: "center",
        shadowColor: MTN.yellow, shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.5, shadowRadius: 16, elevation: 8,
    },
    loginButtonDisabled: { opacity: 0.5 },
    loginButtonText: { color: MTN.black, fontSize: 16, fontWeight: "900", letterSpacing: 1 },
    btnRow: { flexDirection: "row", alignItems: "center", gap: 8 },
 
    divider: { flexDirection: "row", alignItems: "center", marginVertical: 22, gap: 12 },
    dividerLine: { flex: 1, height: 1, backgroundColor: MTN.mediumGray },
    dividerText: { color: MTN.lightGray, fontSize: 13, fontWeight: "600" },
    registerRow: { alignItems: "center" },
    registerText: { color: MTN.lightGray, fontSize: 14 },
    registerLink: { color: MTN.yellow, fontWeight: "700" },
 
    // Étape 2
    backBtn: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 18 },
    backBtnTxt: { color: MTN.yellow, fontWeight: "700", fontSize: 14 },
    otpIconWrap: {
        width: 70, height: 70, borderRadius: 20,
        backgroundColor: "rgba(255,204,0,0.12)", alignItems: "center", justifyContent: "center",
        borderWidth: 1, borderColor: "rgba(255,204,0,0.2)",
        marginBottom: 16, alignSelf: "center",
    },
    emailHighlight: { color: MTN.yellow, fontWeight: "700" },
    otpRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24, gap: 8 },
    otpCell: {
        flex: 1, height: 56, borderRadius: 12,
        backgroundColor: MTN.mediumGray, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.08)",
        color: MTN.white, fontSize: 22, fontWeight: "900", textAlign: "center",
    },
    otpCellFocused: {
        borderColor: MTN.yellow, shadowColor: MTN.yellow,
        shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 4,
    },
    otpCellFilled: { borderColor: "rgba(255,204,0,0.4)", backgroundColor: "rgba(255,204,0,0.08)" },
 
    resendRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 20 },
    resendTxt: { color: MTN.lightGray, fontSize: 13 },
    resendLink: { color: MTN.yellow, fontWeight: "700", fontSize: 13 },
    resendTimer: { color: MTN.lightGray, fontSize: 13 },
 
    securityNote: {
        flexDirection: "row", alignItems: "flex-start", gap: 8,
        backgroundColor: "rgba(0,200,83,0.08)", borderRadius: 10, padding: 12, marginTop: 16,
        borderWidth: 1, borderColor: "rgba(0,200,83,0.2)",
    },
    securityTxt: { color: MTN.lightGray, fontSize: 12, flex: 1, lineHeight: 17 },
 
    footer: { marginTop: 28, alignItems: "center" },
    footerText: { color: "rgba(255,255,255,0.2)", fontSize: 11, textAlign: "center" },
});