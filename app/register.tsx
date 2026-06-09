import { MaterialIcons } from "@expo/vector-icons";
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
    black: "#0A0A0A",
    darkGray: "#1A1A1A",
    mediumGray: "#2C2C2C",
    lightGray: "#B0B0B0",
    white: "#FFFFFF",
    error: "#FF4444",
    success: "#00C853"
};
 
const InputField = ({
    label, icon, value, onChangeText, placeholder, secureTextEntry,
    keyboardType = "default", fieldKey, maxLength, rightIcon, onRightIconPress, suffix,
    inputRef, nextRef, returnKeyType = "next", onSubmitEditing, focusedField, onFocus, onBlur,
}: any) => (
    <View style={styles.fieldGroup}>
        <Text style={styles.label}>{label}</Text>
        <TouchableWithoutFeedback onPress={() => inputRef?.current?.focus()}>
        <View style={[styles.inputRow, focusedField === fieldKey && styles.inputRowFocused]}>
            <MaterialIcons name={icon} size={20} color={focusedField === fieldKey ? MTN.yellow : MTN.lightGray} style={styles.inputIcon} />
            <TextInput
                ref={inputRef}
                style={styles.input}
                placeholder={placeholder}
                placeholderTextColor={MTN.lightGray}
                value={value}
                onChangeText={onChangeText}
                secureTextEntry={secureTextEntry}
                keyboardType={keyboardType}
                maxLength={maxLength}
                onFocus={onFocus}
                onBlur={onBlur}
                autoCapitalize="none"
                returnKeyType={returnKeyType}
                blurOnSubmit={false}
                onSubmitEditing={onSubmitEditing ?? (() => nextRef?.current?.focus())}
            />
            {rightIcon && (
                <TouchableOpacity onPress={onRightIconPress} style={styles.inputSuffix}>
                    <MaterialIcons name={rightIcon} size={20} color={MTN.lightGray} />
                </TouchableOpacity>
            )}
            {suffix}
        </View>
        </TouchableWithoutFeedback>
    </View>
);
 
export default function Register() {
    const [name, setName] = useState("");
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [numero, setNumero] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setErrorMsg] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [focusedField, setFocusedField] = useState<string | null>(null);
 
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;
    const logoScale = useRef(new Animated.Value(0.8)).current;
    const loadingRotate = useRef(new Animated.Value(0)).current;
    const shakeAnim = useRef(new Animated.Value(0)).current;
 
    const nameRef = useRef<TextInput>(null);
    const usernameRef = useRef<TextInput>(null);
    const emailRef = useRef<TextInput>(null);
    const numeroRef = useRef<TextInput>(null);
    const passwordRef = useRef<TextInput>(null);
    const confirmRef = useRef<TextInput>(null);
 
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
 
    const triggerShake = () => {
        Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
        ]).start();
    };
 
    const spin = loadingRotate.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
 
    const handleRegister = async () => {
        setErrorMsg("");
        if (!name.trim() || !username.trim()) {
            setErrorMsg("Veuillez entrer vos nom et username.");
            triggerShake();
            return;
        }
        if (!email.trim()) {
            setErrorMsg("Veuillez entrer votre adresse email.");
            triggerShake();
            return;
        }
        // L'utilisateur tape 9 chiffres commençant par 06 (ex: 061234567)
        if (!/^06\d{7}$/.test(numero)) {
            setErrorMsg("Numéro invalide. Tapez 9 chiffres commençant par 06 (ex: 061234567).");
            triggerShake();
            return;
        }
        if (password.length < 6) {
            setErrorMsg("Le mot de passe doit contenir au moins 6 caractères.");
            triggerShake();
            return;
        }
        if (password !== confirmPassword) {
            setErrorMsg("Les mots de passe ne correspondent pas.");
            triggerShake();
            return;
        }
 
        setLoading(true);
        try {
            // numero contient déjà le format complet 06XXXXXXX (9 chiffres)
            const response = await fetch(`${API_URL}/api/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, username, email, numero, password }),
            });
            const data = await response.json();
            if (!response.ok) {
                setErrorMsg(data.error || "Erreur d'inscription. Veuillez réessayer.");
                triggerShake();
                return;
            }
            router.replace("/login");
        } catch {
            setErrorMsg("Impossible de contacter le serveur. Vérifiez votre connexion.");
            triggerShake();
        } finally {
            setLoading(false);
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
 
                    {/* Card */}
                    <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }, { translateX: shakeAnim }] }]}>
                        <View style={styles.stepBadge}>
                            <Text style={styles.stepBadgeText}>NOUVEAU COMPTE</Text>
                        </View>
                        <Text style={styles.cardTitle}>Inscription</Text>
                        <Text style={styles.cardSubtitle}>Créez votre compte MOMO GRAMM</Text>
 
                        {error ? (
                            <View style={styles.errorBanner}>
                                <MaterialIcons name="error-outline" size={18} color={MTN.error} />
                                <Text style={styles.errorText}>{error}</Text>
                            </View>
                        ) : null}
 
                        {/* Nom */}
                        <InputField
                            label="Nom complet"
                            icon="person"
                            value={name}
                            onChangeText={setName}
                            placeholder="Ex:Nova joseph"
                            fieldKey="name"
                            inputRef={nameRef}
                            nextRef={usernameRef}
                            focusedField={focusedField}
                            onFocus={() => setFocusedField("name")}
                            onBlur={() => setFocusedField(null)}
                        />
 
                        {/* Username */}
                        <InputField
                            label="Nom d'utilisateur"
                            icon="alternate-email"
                            value={username}
                            onChangeText={setUsername}
                            placeholder="Ex: Nova_Joseph"
                            fieldKey="username"
                            inputRef={usernameRef}
                            nextRef={emailRef}
                            focusedField={focusedField}
                            onFocus={() => setFocusedField("username")}
                            onBlur={() => setFocusedField(null)}
                        />
 
                        {/* Email */}
                        <InputField
                            label="Adresse email"
                            icon="email"
                            value={email}
                            onChangeText={setEmail}
                            placeholder="exemple@email.com"
                            keyboardType="email-address"
                            fieldKey="email"
                            inputRef={emailRef}
                            nextRef={numeroRef}
                            focusedField={focusedField}
                            onFocus={() => setFocusedField("email")}
                            onBlur={() => setFocusedField(null)}
                        />
 
                        {/* Numéro MTN */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.label}>Numéro MTN</Text>
                            <TouchableWithoutFeedback onPress={() => numeroRef.current?.focus()}>
                            <View style={[styles.inputRow, focusedField === "numero" && styles.inputRowFocused]}>
                                <View style={styles.prefixBadge}>
                                    <Text style={styles.prefixText}>🇨🇬 +242</Text>
                                </View>
                                <TextInput
                                    ref={numeroRef}
                                    style={styles.input}
                                    placeholder="06XXXXXXX"
                                    placeholderTextColor={MTN.lightGray}
                                    keyboardType="phone-pad"
                                    value={numero}
                                    onChangeText={setNumero}
                                    maxLength={9}
                                    onFocus={() => setFocusedField("numero")}
                                    onBlur={() => setFocusedField(null)}
                                    returnKeyType="next"
                                    blurOnSubmit={false}
                                    onSubmitEditing={() => passwordRef.current?.focus()}
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
                            <View style={[styles.inputRow, focusedField === "password" && styles.inputRowFocused]}>
                                <MaterialIcons name="lock" size={20} color={focusedField === "password" ? MTN.yellow : MTN.lightGray} style={styles.inputIcon} />
                                <TextInput
                                    ref={passwordRef}
                                    style={styles.input}
                                    placeholder="Min. 6 caractères"
                                    placeholderTextColor={MTN.lightGray}
                                    secureTextEntry={!showPassword}
                                    value={password}
                                    onChangeText={setPassword}
                                    onFocus={() => setFocusedField("password")}
                                    onBlur={() => setFocusedField(null)}
                                    returnKeyType="next"
                                    blurOnSubmit={false}
                                    onSubmitEditing={() => confirmRef.current?.focus()}
                                />
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.inputSuffix}>
                                    <MaterialIcons name={showPassword ? "visibility" : "visibility-off"} size={20} color={MTN.lightGray} />
                                </TouchableOpacity>
                            </View>
                            </TouchableWithoutFeedback>
                        </View>
 
                        {/* Confirmer mot de passe */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.label}>Confirmer le mot de passe</Text>
                            <TouchableWithoutFeedback onPress={() => confirmRef.current?.focus()}>
                            <View style={[styles.inputRow, focusedField === "confirm" && styles.inputRowFocused]}>
                                <MaterialIcons name="lock-outline" size={20} color={focusedField === "confirm" ? MTN.yellow : MTN.lightGray} style={styles.inputIcon} />
                                <TextInput
                                    ref={confirmRef}
                                    style={styles.input}
                                    placeholder="Répéter le mot de passe"
                                    placeholderTextColor={MTN.lightGray}
                                    secureTextEntry={!showConfirm}
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    onFocus={() => setFocusedField("confirm")}
                                    onBlur={() => setFocusedField(null)}
                                    returnKeyType="done"
                                    onSubmitEditing={handleRegister}
                                />
                                <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={styles.inputSuffix}>
                                    <MaterialIcons name={showConfirm ? "visibility" : "visibility-off"} size={20} color={MTN.lightGray} />
                                </TouchableOpacity>
                            </View>
                            </TouchableWithoutFeedback>
                            {confirmPassword.length > 0 && (
                                <Text style={{ color: password === confirmPassword ? MTN.success : MTN.error, fontSize: 12, marginTop: 4 }}>
                                    {password === confirmPassword ? "✓ Les mots de passe correspondent" : "✗ Les mots de passe ne correspondent pas"}
                                </Text>
                            )}
                        </View>
 
                        {/* Bouton */}
                        <TouchableOpacity
                            style={[styles.registerButton, loading && styles.buttonDisabled]}
                            onPress={handleRegister}
                            disabled={loading}
                            activeOpacity={0.85}
                        >
                            {loading ? (
                                <Animated.View style={{ transform: [{ rotate: spin }] }}>
                                    <MaterialIcons name="refresh" size={24} color={MTN.black} />
                                </Animated.View>
                            ) : (
                                <Text style={styles.registerButtonText}>CRÉER MON COMPTE</Text>
                            )}
                        </TouchableOpacity>
 
                        {/* Divider */}
                        <View style={styles.divider}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerText}>ou</Text>
                            <View style={styles.dividerLine} />
                        </View>
 
                        {/* Lien connexion */}
                        <TouchableOpacity style={styles.loginRow} onPress={() => router.replace("/login")}>
                            <Text style={styles.loginText}>
                                Déjà un compte ?{"  "}
                                <Text style={styles.loginLink}>Se connecter</Text>
                            </Text>
                        </TouchableOpacity>
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
    scrollContainer: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40, alignItems: "center" },
    headerSection: { alignItems: "center", marginBottom: 24 },
    logoWrapper: {
        width: 88, height: 88, borderRadius: 20,
        backgroundColor: MTN.yellow, alignItems: "center", justifyContent: "center",
        shadowColor: MTN.yellow, shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4, shadowRadius: 18, elevation: 10, marginBottom: 10,
    },
    logo: { width: 64, height: 64 },
    brandName: { fontSize: 20, fontWeight: "900", color: MTN.white, letterSpacing: 4 },
    brandTagline: { fontSize: 11, fontWeight: "700", color: MTN.yellow, letterSpacing: 3, marginTop: 2 },
    card: {
        width: "100%", backgroundColor: MTN.darkGray, borderRadius: 24,
        padding: 28, borderWidth: 1, borderColor: MTN.mediumGray,
        shadowColor: "#000", shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.5, shadowRadius: 30, elevation: 10,
    },
    stepBadge: {
        alignSelf: "flex-start", backgroundColor: "rgba(255,204,0,0.15)",
        borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4,
        borderWidth: 1, borderColor: "rgba(255,204,0,0.3)", marginBottom: 12,
    },
    stepBadgeText: { color: MTN.yellow, fontSize: 11, fontWeight: "700", letterSpacing: 1 },
    cardTitle: { fontSize: 24, fontWeight: "800", color: MTN.white, marginBottom: 4, letterSpacing: -0.5 },
    cardSubtitle: { fontSize: 13, color: MTN.lightGray, marginBottom: 22 },
    errorBanner: {
        flexDirection: "row", alignItems: "center",
        backgroundColor: "rgba(255,68,68,0.12)", borderWidth: 1,
        borderColor: "rgba(255,68,68,0.3)", borderRadius: 10,
        paddingHorizontal: 14, paddingVertical: 10, marginBottom: 18, gap: 8,
    },
    errorText: { color: MTN.error, fontSize: 13, flex: 1, lineHeight: 18 },
    rowFields: { flexDirection: "row" },
    fieldGroup: { marginBottom: 16 },
    label: { fontSize: 11, fontWeight: "700", color: MTN.lightGray, letterSpacing: 1, textTransform: "uppercase", marginBottom: 7 },
    inputRow: {
        flexDirection: "row", alignItems: "center", backgroundColor: MTN.mediumGray,
        borderRadius: 12, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.08)",
        minHeight: 50, paddingHorizontal: 4,
    },
    inputRowFocused: {
        borderColor: MTN.yellow, shadowColor: MTN.yellow,
        shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
    },
    prefixBadge: {
        paddingHorizontal: 10, paddingVertical: 6, marginLeft: 4,
        backgroundColor: "rgba(255,204,0,0.12)", borderRadius: 8, marginRight: 4,
    },
    prefixText: { fontSize: 12, color: MTN.yellow, fontWeight: "700" },
    inputIcon: { marginLeft: 12, marginRight: 2 },
    input: { flex: 1, color: MTN.white, fontSize: 15, paddingHorizontal: 8, paddingVertical: 12, fontWeight: "500" },
    inputSuffix: { paddingHorizontal: 12 },
    registerButton: {
        backgroundColor: MTN.yellow, borderRadius: 14, height: 56,
        alignItems: "center", justifyContent: "center",
        shadowColor: MTN.yellow, shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.5, shadowRadius: 16, elevation: 8, marginTop: 6,
    },
    buttonDisabled: { opacity: 0.7 },
    registerButtonText: { color: MTN.black, fontSize: 15, fontWeight: "900", letterSpacing: 1 },
    divider: { flexDirection: "row", alignItems: "center", marginVertical: 22, gap: 12 },
    dividerLine: { flex: 1, height: 1, backgroundColor: MTN.mediumGray },
    dividerText: { color: MTN.lightGray, fontSize: 13, fontWeight: "600" },
    loginRow: { alignItems: "center" },
    loginText: { color: MTN.lightGray, fontSize: 14 },
    loginLink: { color: MTN.yellow, fontWeight: "700" },
    footer: { marginTop: 24, alignItems: "center" },
    footerText: { color: "rgba(255,255,255,0.2)", fontSize: 11, textAlign: "center" },
});