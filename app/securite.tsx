import { MaterialIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
    Alert,
    ScrollView,
    StatusBar,
    StyleSheet,
    Switch,
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
    accent: "#9C27B0",
    error: "#FF4444",
    success: "#00C853",
};

type ToggleRowProps = {
    icon: string;
    label: string;
    description: string;
    value: boolean;
    onToggle: (v: boolean) => void;
    color?: string;
};

function ToggleRow({ icon, label, description, value, onToggle, color = MTN.accent }: ToggleRowProps) {
    return (
        <View style={styles.row}>
            <View style={[styles.rowIcon, { backgroundColor: color + "18" }]}>
                <MaterialIcons name={icon as any} size={18} color={color} />
            </View>
            <View style={styles.rowContent}>
                <Text style={styles.rowLabel}>{label}</Text>
                <Text style={styles.rowDesc}>{description}</Text>
            </View>
            <Switch
                value={value}
                onValueChange={onToggle}
                trackColor={{ false: MTN.mediumGray, true: color + "88" }}
                thumbColor={value ? color : MTN.lightGray}
            />
        </View>
    );
}

type ActionRowProps = {
    icon: string;
    label: string;
    description: string;
    onPress: () => void;
    danger?: boolean;
};

function ActionRow({ icon, label, description, onPress, danger = false }: ActionRowProps) {
    const color = danger ? MTN.error : MTN.accent;
    return (
        <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
            <View style={[styles.rowIcon, { backgroundColor: color + "18" }]}>
                <MaterialIcons name={icon as any} size={18} color={color} />
            </View>
            <View style={styles.rowContent}>
                <Text style={[styles.rowLabel, danger && { color: MTN.error }]}>{label}</Text>
                <Text style={styles.rowDesc}>{description}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={MTN.lightGray} />
        </TouchableOpacity>
    );
}

export default function SecuriteScreen() {
    const [biometrie, setBiometrie] = useState(false);
    const [doubleAuth, setDoubleAuth] = useState(false);
    const [alertesConnexion, setAlertesConnexion] = useState(true);

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" backgroundColor={MTN.yellow} />
            {/*<SubPageHeader title="Sécurité & PIN" accentColor={MTN.accent} />*/}


            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>

                {/* Niveau de sécurité */}
                <View style={styles.securityBadge}>
                    <MaterialIcons name="shield" size={28} color={MTN.success} />
                    <View style={styles.securityInfo}>
                        <Text style={styles.securityTitle}>Niveau de sécurité : Bon</Text>
                        <Text style={styles.securityDesc}>Activez la double authentification pour le maximiser</Text>
                    </View>
                </View>

                {/* PIN */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Code PIN</Text>
                    <ActionRow
                        icon="pin"
                        label="Modifier le PIN"
                        description="Changer votre code PIN de 4 chiffres"
                        onPress={() => Alert.alert("PIN", "Fonctionnalité à venir")}
                    />
                    <ActionRow
                        icon="lock-reset"
                        label="Réinitialiser le PIN"
                        description="En cas d'oubli, via votre email"
                        onPress={() => Alert.alert("Reset PIN", "Un email de réinitialisation vous sera envoyé.")}
                    />
                </View>

                {/* Authentification */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Authentification</Text>
                    <ToggleRow
                        icon="fingerprint"
                        label="Biométrie"
                        description="Empreinte digitale / Face ID"
                        value={biometrie}
                        onToggle={setBiometrie}
                    />
                    <ToggleRow
                        icon="verified-user"
                        label="Double authentification"
                        description="Code envoyé par SMS à chaque connexion"
                        value={doubleAuth}
                        onToggle={setDoubleAuth}
                    />
                    <ToggleRow
                        icon="notifications-active"
                        label="Alertes de connexion"
                        description="Notifié à chaque nouvelle connexion"
                        value={alertesConnexion}
                        onToggle={setAlertesConnexion}
                        color="#FF9800"
                    />
                </View>

                {/* Danger */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Zone de danger</Text>
                    <ActionRow
                        icon="no-accounts"
                        label="Désactiver le compte"
                        description="Votre compte sera suspendu temporairement"
                        onPress={() => Alert.alert("Désactiver", "Êtes-vous sûr ?", [
                            { text: "Annuler", style: "cancel" },
                            { text: "Désactiver", style: "destructive", onPress: () => {} },
                        ])}
                        danger
                    />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: MTN.black },
    container: { padding: 20, paddingBottom: 40 },
    securityBadge: {
        flexDirection: "row", alignItems: "center", gap: 14,
        backgroundColor: MTN.success + "15", borderRadius: 16,
        borderWidth: 1, borderColor: MTN.success + "40",
        padding: 16, marginBottom: 20,
    },
    securityInfo: { flex: 1 },
    securityTitle: { fontSize: 14, fontWeight: "800", color: MTN.success, marginBottom: 3 },
    securityDesc: { fontSize: 12, color: MTN.lightGray, lineHeight: 16 },
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
        alignItems: "center", justifyContent: "center",
    },
    rowContent: { flex: 1 },
    rowLabel: { fontSize: 14, color: MTN.white, fontWeight: "600", marginBottom: 2 },
    rowDesc: { fontSize: 11, color: MTN.lightGray, lineHeight: 15 },
});
