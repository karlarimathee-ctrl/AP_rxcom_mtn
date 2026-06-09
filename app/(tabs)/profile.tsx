import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    Alert,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import API_URL from "../../backend/api";
import PasswordModal from "../../components/PasswordModal";
 
const MTN = {
    yellow: "#FFCC00",
    black: "#0A0A0A",
    darkGray: "#1A1A1A",
    mediumGray: "#2C2C2C",
    lightGray: "#B0B0B0",
    white: "#FFFFFF",
    error: "#FF4444",
};
 
type User = { name: string; username: string; numero: string; solde?: number };
 
const MENU_ITEMS = [
    { icon: "person-outline",       label: "Informations personnelles", color: "#2196F3", route: "/informations" },
    { icon: "security",             label: "Sécurité & PIN",            color: "#9C27B0", route: "/securite" },
    { icon: "receipt-long",         label: "Historique complet",         color: "#FF9800", route: "/historique" },
    { icon: "notifications-none",   label: "Notifications",              color: "#00BCD4", route: "/notifications-settings" },
    { icon: "help-outline",         label: "Aide & Support",             color: "#4CAF50", route: "/aide" },
    { icon: "info-outline",         label: "À propos de MTN",            color: MTN.lightGray, route: "/apropos" },
];
 
export default function ProfileScreen() {
    const [user, setUser] = useState<User | null>(null);
    const [soldeVisible, setSoldeVisible] = useState(false);
    const [showPwdModal, setShowPwdModal] = useState(false);
 
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
 
    useEffect(() => {
        loadUser();
    }, []);
 
    const handleLogout = () => {
        Alert.alert("Déconnexion", "Voulez-vous vraiment vous déconnecter ?", [
            { text: "Annuler", style: "cancel" },
            {
                text: "Déconnexion",
                style: "destructive",
                onPress: async () => {
                    await AsyncStorage.removeItem("user");
                    router.replace("/login");
                },
            },
        ]);
    };
 
    const initials = user
        ? `${user.name[0] ?? ""}${user.username[0] ?? ""}`.toUpperCase()
        : "??";
 
    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" backgroundColor={MTN.black} />
 
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Mon Profil</Text>
                    <View style={styles.avatarSection}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>{initials}</Text>
                        </View>
                        <Text style={styles.userName}>
                            {user ? `${user.name} ${user.username}` : "—"}
                        </Text>
                        <View style={styles.numeroBadge}>
                            <MaterialIcons name="phone" size={14} color={MTN.black} />
                            <Text style={styles.numeroBadgeText}>
                                +242 {user?.numero ?? "—"}
                            </Text>
                        </View>
                        <View style={styles.verifiedBadge}>
                            <MaterialIcons name="verified" size={14} color={MTN.yellow} />
                            <Text style={styles.verifiedText}>Compte vérifié</Text>
                        </View>
                    </View>
                </View>
 
                {/* Stats rapides */}
                <View style={styles.statsRow}>
                    {/* Solde MoMo avec masquage */}
                    <TouchableOpacity
                        style={[styles.statItem, styles.statItemSolde]}
                        onPress={() => {
                            if (!soldeVisible) {
                                // Premier affichage → demander le mot de passe
                                setShowPwdModal(true);
                            } else {
                                // Re-masquer directement sans mot de passe
                                setSoldeVisible(false);
                            }
                        }}
                        activeOpacity={0.7}
                    >
                        <View style={styles.soldeRow}>
                            <Text style={styles.statValue} numberOfLines={1}>
                                {soldeVisible
                                    ? (user?.solde ?? 0).toLocaleString("fr-FR")
                                    : "••••••"}
                            </Text>
                            <MaterialIcons
                                name={soldeVisible ? "visibility" : "visibility-off"}
                                size={14}
                                color={MTN.lightGray}
                                style={{ marginLeft: 4 }}
                            />
                        </View>
                        <Text style={styles.statLabel}>Solde (FCFA)</Text>
                    </TouchableOpacity>
 
                    <View style={styles.statDivider} />
 
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>0</Text>
                        <Text style={styles.statLabel}>Transactions</Text>
                    </View>
 
                    <View style={styles.statDivider} />
 
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>0 F</Text>
                        <Text style={styles.statLabel}>Envoyé</Text>
                    </View>
                </View>
 
                {/* Menu */}
                <View style={styles.menuCard}>
                    {MENU_ITEMS.map((item, i) => (
                        <TouchableOpacity
                            key={item.label}
                            style={[
                                styles.menuItem,
                                i < MENU_ITEMS.length - 1 && styles.menuItemBorder,
                            ]}
                            activeOpacity={0.7}
                            onPress={() => router.push(item.route as any)}
                        >
                            <View style={[styles.menuIcon, { backgroundColor: item.color + "22" }]}>
                                <MaterialIcons name={item.icon as any} size={20} color={item.color} />
                            </View>
                            <Text style={styles.menuLabel}>{item.label}</Text>
                            <MaterialIcons name="chevron-right" size={20} color={MTN.lightGray} />
                        </TouchableOpacity>
                    ))}
                </View>
 
                {/* Déconnexion */}
                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
                    <MaterialIcons name="logout" size={20} color={MTN.error} />
                    <Text style={styles.logoutText}>Se déconnecter</Text>
                </TouchableOpacity>
 
                <Text style={styles.version}>MTN MoMo Congo v1.0.0</Text>
            </ScrollView>

            {/* ── MODAL MOT DE PASSE (voir solde) ── */}
            <PasswordModal
                visible={showPwdModal}
                title="Voir votre solde"
                subtitle="Saisissez votre mot de passe pour afficher votre solde MTN MoMo"
                confirmLabel="Afficher"
                onConfirm={() => { setShowPwdModal(false); setSoldeVisible(true); }}
                onCancel={() => setShowPwdModal(false)}
            />
        </SafeAreaView>
    );
}
 
const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: MTN.black },
    header: { backgroundColor: MTN.yellow, paddingTop: 16, paddingBottom: 32, alignItems: "center" },
    headerTitle: { fontSize: 18, fontWeight: "900", color: MTN.black, marginBottom: 20, alignSelf: "flex-start", paddingLeft: 20 },
    avatarSection: { alignItems: "center" },
    avatar: {
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: MTN.black, alignItems: "center", justifyContent: "center",
        marginBottom: 12, borderWidth: 3, borderColor: "rgba(0,0,0,0.2)",
    },
    avatarText: { fontSize: 28, fontWeight: "900", color: MTN.yellow },
    userName: { fontSize: 20, fontWeight: "900", color: MTN.black, marginBottom: 6 },
    numeroBadge: {
        flexDirection: "row", alignItems: "center", gap: 5,
        backgroundColor: "rgba(0,0,0,0.15)", borderRadius: 20,
        paddingHorizontal: 12, paddingVertical: 4, marginBottom: 8,
    },
    numeroBadgeText: { fontSize: 13, fontWeight: "700", color: MTN.black },
    verifiedBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
    verifiedText: { fontSize: 12, fontWeight: "700", color: MTN.black, opacity: 0.7 },
    statsRow: {
        flexDirection: "row", marginHorizontal: 16, marginTop: -16,
        backgroundColor: MTN.darkGray, borderRadius: 16,
        borderWidth: 1, borderColor: MTN.mediumGray,
        shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 6,
    },
    statItem: { flex: 1, alignItems: "center", paddingVertical: 18 },
    statItemSolde: { flex: 1.4 },
    soldeRow: { flexDirection: "row", alignItems: "center" },
    statDivider: { width: 1, height: 36, backgroundColor: MTN.mediumGray },
    statValue: { fontSize: 16, fontWeight: "900", color: MTN.yellow, marginBottom: 3 },
    statLabel: { fontSize: 11, color: MTN.lightGray, fontWeight: "600" },
    menuCard: {
        marginHorizontal: 16, marginTop: 20,
        backgroundColor: MTN.darkGray, borderRadius: 16,
        borderWidth: 1, borderColor: MTN.mediumGray,
        overflow: "hidden",
    },
    menuItem: {
        flexDirection: "row", alignItems: "center",
        paddingHorizontal: 18, paddingVertical: 16, gap: 14,
    },
    menuItemBorder: { borderBottomWidth: 1, borderBottomColor: MTN.mediumGray },
    menuIcon: { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center" },
    menuLabel: { flex: 1, fontSize: 14, color: MTN.white, fontWeight: "600" },
    logoutBtn: {
        flexDirection: "row", alignItems: "center", justifyContent: "center",
        gap: 10, marginHorizontal: 16, marginTop: 20, marginBottom: 12,
        backgroundColor: "rgba(255,68,68,0.1)", borderRadius: 14, height: 52,
        borderWidth: 1, borderColor: "rgba(255,68,68,0.2)",
    },
    logoutText: { color: MTN.error, fontSize: 15, fontWeight: "800" },
    version: { textAlign: "center", color: "rgba(255,255,255,0.15)", fontSize: 11, marginBottom: 100 },
});