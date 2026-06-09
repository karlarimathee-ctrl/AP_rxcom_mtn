import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useRef, useState } from "react";
import {
    Animated,
    Keyboard,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from "react-native";
import API_URL from "../backend/api";

const MTN = {
    yellow: "#FFCC00",
    black: "#0A0A0A",
    darkGray: "#1A1A1A",
    mediumGray: "#2C2C2C",
    lightGray: "#B0B0B0",
    white: "#FFFFFF",
    error: "#FF4444",
    success: "#00C853",
};

type Props = {
    visible: boolean;
    title?: string;
    subtitle?: string;
    confirmLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
};

export default function PasswordModal({
    visible,
    title = "Confirmation requise",
    subtitle = "Saisissez votre mot de passe pour continuer",
    confirmLabel = "Confirmer",
    onConfirm,
    onCancel,
}: Props) {
    const [password, setPassword] = useState("");
    const [showPwd, setShowPwd] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const shakeAnim  = useRef(new Animated.Value(0)).current;
    const scaleAnim  = useRef(new Animated.Value(0.88)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const inputRef   = useRef<TextInput>(null);

    // Animate in when visible
    useEffect(() => {
        if (visible) {
            setPassword(""); setError(""); setShowPwd(false);
            Animated.parallel([
                Animated.spring(scaleAnim,   { toValue: 1,  tension: 80, friction: 9,  useNativeDriver: true }),
                Animated.timing(opacityAnim, { toValue: 1,  duration: 220,             useNativeDriver: true }),
            ]).start(() => setTimeout(() => inputRef.current?.focus(), 80));
        } else {
            scaleAnim.setValue(0.88);
            opacityAnim.setValue(0);
        }
    }, [visible]);

    const triggerShake = () => {
        Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 10,  duration: 55, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -10, duration: 55, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 6,   duration: 55, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0,   duration: 55, useNativeDriver: true }),
        ]).start();
    };

    const handleConfirm = async () => {
        if (!password.trim()) {
            setError("Veuillez saisir votre mot de passe.");
            triggerShake(); return;
        }
        setLoading(true); setError("");
        try {
            // Récupère le numéro depuis le cache local
            const raw = await AsyncStorage.getItem("user");
            if (!raw) { setError("Session expirée. Reconnectez-vous."); setLoading(false); return; }
            const user = JSON.parse(raw);

            const res = await fetch(`${API_URL}/api/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ numero: user.numero, password: password.trim() }),
            });

            if (res.ok) {
                setPassword("");
                onConfirm();   // ✅ mot de passe correct → déclenche l'action
            } else {
                setError("Mot de passe incorrect.");
                triggerShake();
            }
        } catch {
            setError("Impossible de vérifier. Vérifiez votre connexion.");
            triggerShake();
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            statusBarTranslucent
            onRequestClose={onCancel}
        >
            <TouchableWithoutFeedback onPress={() => { Keyboard.dismiss(); onCancel(); }}>
                <View style={styles.backdrop}>
                    <TouchableWithoutFeedback>
                        <Animated.View
                            style={[
                                styles.sheet,
                                {
                                    opacity: opacityAnim,
                                    transform: [{ scale: scaleAnim }, { translateX: shakeAnim }],
                                },
                            ]}
                        >
                            {/* Bande jaune MTN en haut */}
                            <View style={styles.topBar} />

                            {/* Icône verrou */}
                            <View style={styles.iconWrap}>
                                <View style={styles.iconCircle}>
                                    <View style={styles.iconCorner} />
                                    <MaterialIcons name="lock" size={28} color={MTN.black} />
                                </View>
                            </View>

                            {/* Titre */}
                            <Text style={styles.title}>{title}</Text>
                            <Text style={styles.subtitle}>{subtitle}</Text>

                            {/* Champ mot de passe */}
                            <View style={[styles.inputRow, error ? styles.inputError : null]}>
                                <MaterialIcons
                                    name="lock-outline"
                                    size={18}
                                    color={error ? MTN.error : MTN.lightGray}
                                    style={{ marginLeft: 14 }}
                                />
                                <TextInput
                                    ref={inputRef}
                                    style={styles.input}
                                    placeholder="Mot de passe"
                                    placeholderTextColor={MTN.lightGray}
                                    secureTextEntry={!showPwd}
                                    value={password}
                                    onChangeText={(t) => { setPassword(t); setError(""); }}
                                    autoCapitalize="none"
                                    returnKeyType="done"
                                    onSubmitEditing={handleConfirm}
                                />
                                <TouchableOpacity onPress={() => setShowPwd(!showPwd)} style={styles.eyeBtn}>
                                    <MaterialIcons
                                        name={showPwd ? "visibility" : "visibility-off"}
                                        size={18}
                                        color={MTN.lightGray}
                                    />
                                </TouchableOpacity>
                            </View>

                            {/* Message d'erreur */}
                            {error ? (
                                <View style={styles.errorRow}>
                                    <MaterialIcons name="error-outline" size={13} color={MTN.error} />
                                    <Text style={styles.errorTxt}>{error}</Text>
                                </View>
                            ) : null}

                            {/* Boutons */}
                            <View style={styles.btnRow}>
                                <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.7}>
                                    <Text style={styles.cancelTxt}>Annuler</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.confirmBtn, loading && styles.confirmBtnLoading]}
                                    onPress={handleConfirm}
                                    activeOpacity={0.85}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <Text style={styles.confirmTxt}>Vérification...</Text>
                                    ) : (
                                        <>
                                            <MaterialIcons name="check" size={16} color={MTN.black} />
                                            <Text style={styles.confirmTxt}>{confirmLabel}</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>

                            {/* Badge sécurité */}
                            <View style={styles.securityBadge}>
                                <MaterialIcons name="security" size={11} color={MTN.lightGray} />
                                <Text style={styles.securityTxt}>Vérification sécurisée MTN MoMo</Text>
                            </View>
                        </Animated.View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.72)",
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 24,
    },
    sheet: {
        width: "100%",
        backgroundColor: MTN.darkGray,
        borderRadius: 24,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: MTN.mediumGray,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.5,
        shadowRadius: 32,
        elevation: 20,
    },
    topBar: {
        height: 4,
        backgroundColor: MTN.yellow,
        width: "40%",
        borderBottomRightRadius: 4,
    },

    iconWrap: { alignItems: "center", marginTop: 24, marginBottom: 16 },
    iconCircle: {
        width: 64, height: 64, borderRadius: 20,
        backgroundColor: MTN.yellow,
        alignItems: "center", justifyContent: "center",
        overflow: "hidden",
        shadowColor: MTN.yellow,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.45,
        shadowRadius: 14,
        elevation: 8,
    },
    iconCorner: {
        position: "absolute", top: 0, right: 0,
        width: 18, height: 18,
        backgroundColor: "rgba(0,0,0,0.15)",
        borderBottomLeftRadius: 12,
    },

    title: {
        fontSize: 17,
        fontWeight: "900",
        color: MTN.white,
        textAlign: "center",
        marginBottom: 6,
        paddingHorizontal: 20,
    },
    subtitle: {
        fontSize: 13,
        color: MTN.lightGray,
        textAlign: "center",
        lineHeight: 19,
        marginBottom: 22,
        paddingHorizontal: 24,
    },

    inputRow: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.05)",
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: MTN.mediumGray,
        marginHorizontal: 20,
        minHeight: 52,
    },
    inputError: {
        borderColor: MTN.error,
        backgroundColor: "rgba(255,68,68,0.05)",
    },
    input: {
        flex: 1,
        color: MTN.white,
        fontSize: 15,
        paddingHorizontal: 10,
        paddingVertical: 14,
        letterSpacing: 0.3,
    },
    eyeBtn: { padding: 12 },

    errorRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        marginHorizontal: 20,
        marginTop: 8,
    },
    errorTxt: { color: MTN.error, fontSize: 12, fontWeight: "600", flex: 1 },

    btnRow: {
        flexDirection: "row",
        gap: 10,
        marginHorizontal: 20,
        marginTop: 20,
    },
    cancelBtn: {
        flex: 1,
        height: 50,
        borderRadius: 13,
        backgroundColor: "rgba(255,255,255,0.06)",
        borderWidth: 1,
        borderColor: MTN.mediumGray,
        alignItems: "center",
        justifyContent: "center",
    },
    cancelTxt: { color: MTN.lightGray, fontSize: 14, fontWeight: "700" },

    confirmBtn: {
        flex: 1.6,
        height: 50,
        borderRadius: 13,
        backgroundColor: MTN.yellow,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        shadowColor: MTN.yellow,
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 6,
    },
    confirmBtnLoading: { opacity: 0.75 },
    confirmTxt: { color: MTN.black, fontSize: 14, fontWeight: "900" },

    securityBadge: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 5,
        marginTop: 14,
        marginBottom: 20,
    },
    securityTxt: { color: "rgba(255,255,255,0.2)", fontSize: 10, fontWeight: "600" },
});
