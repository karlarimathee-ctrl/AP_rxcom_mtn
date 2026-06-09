import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import {
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
const MTN = {
    yellow: "#FFCC00",
    black: "#0A0A0A",
    darkGray: "#1A1A1A",
    mediumGray: "#2C2C2C",
    lightGray: "#B0B0B0",
    white: "#FFFFFF",
    accent: "#2196F3",
};

type User = { name: string; username: string; numero: string; email?: string };

type InfoRowProps = {
    icon: string;
    label: string;
    value: string;
    editable?: boolean;
};

function InfoRow({ icon, label, value, editable = false }: InfoRowProps) {
    return (
        <View style={styles.row}>
            <View style={styles.rowIcon}>
                <MaterialIcons name={icon as any} size={18} color={MTN.accent} />
            </View>
            <View style={styles.rowContent}>
                <Text style={styles.rowLabel}>{label}</Text>
                <Text style={styles.rowValue}>{value}</Text>
            </View>
            {editable && (
                <MaterialIcons name="edit" size={16} color={MTN.lightGray} />
            )}
        </View>
    );
}

export default function InformationsScreen() {
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        AsyncStorage.getItem("user").then((v) => {
            if (v) setUser(JSON.parse(v));
        });
    }, []);

    const initials = user
        ? `${user.name[0] ?? ""}${user.username[0] ?? ""}`.toUpperCase()
        : "??";

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" backgroundColor={MTN.yellow} />
            {/*<SubPageHeader title="Information personnelles" accentColor={MTN.accent} />*/}
            

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
                {/* Avatar */}
                <View style={styles.avatarSection}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{initials}</Text>
                    </View>
                    <TouchableOpacity style={styles.editAvatarBtn} activeOpacity={0.8}>
                        <MaterialIcons name="photo-camera" size={14} color={MTN.black} />
                        <Text style={styles.editAvatarText}>Modifier</Text>
                    </TouchableOpacity>
                </View>

                {/* Infos */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Identité</Text>
                    <InfoRow icon="person" label="Nom complet" value={user?.name ?? "—"} editable />
                    <InfoRow icon="alternate-email" label="Nom d'utilisateur" value={user?.username ?? "—"} editable />
                    <InfoRow icon="email" label="Adresse email" value={user?.email ?? "—"} editable />
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Contact</Text>
                    <InfoRow icon="phone" label="Numéro MTN" value={user ? `+242 ${user.numero}` : "—"} />
                    <InfoRow icon="location-on" label="Pays" value="Congo-Brazzaville" />
                </View>

                <TouchableOpacity style={styles.saveBtn} activeOpacity={0.85}>
                    <Text style={styles.saveBtnText}>Enregistrer les modifications</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: MTN.black },
    container: { padding: 20, paddingBottom: 40 },
    avatarSection: { alignItems: "center", marginBottom: 24 },
    avatar: {
        width: 90, height: 90, borderRadius: 45,
        backgroundColor: MTN.darkGray, alignItems: "center", justifyContent: "center",
        borderWidth: 3, borderColor: MTN.accent, marginBottom: 10,
    },
    avatarText: { fontSize: 32, fontWeight: "900", color: MTN.accent },
    editAvatarBtn: {
        flexDirection: "row", alignItems: "center", gap: 5,
        backgroundColor: MTN.yellow, borderRadius: 20,
        paddingHorizontal: 14, paddingVertical: 6,
    },
    editAvatarText: { fontSize: 12, fontWeight: "800", color: MTN.black },
    card: {
        backgroundColor: MTN.darkGray, borderRadius: 16,
        borderWidth: 1, borderColor: MTN.mediumGray,
        marginBottom: 16, overflow: "hidden",
    },
    sectionTitle: {
        fontSize: 11, fontWeight: "700", color: MTN.lightGray,
        letterSpacing: 1, textTransform: "uppercase",
        paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8,
    },
    row: {
        flexDirection: "row", alignItems: "center",
        paddingHorizontal: 16, paddingVertical: 14,
        borderTopWidth: 1, borderTopColor: MTN.mediumGray, gap: 12,
    },
    rowIcon: {
        width: 34, height: 34, borderRadius: 10,
        backgroundColor: MTN.accent + "18",
        alignItems: "center", justifyContent: "center",
    },
    rowContent: { flex: 1 },
    rowLabel: { fontSize: 11, color: MTN.lightGray, fontWeight: "600", marginBottom: 2 },
    rowValue: { fontSize: 14, color: MTN.white, fontWeight: "600" },
    saveBtn: {
        backgroundColor: MTN.yellow, borderRadius: 14, height: 54,
        alignItems: "center", justifyContent: "center", marginTop: 8,
    },
    saveBtnText: { color: MTN.black, fontSize: 15, fontWeight: "900", letterSpacing: 0.5 },
});
