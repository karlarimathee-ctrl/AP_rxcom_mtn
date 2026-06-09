import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
    Image,
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
};

const MOMO_SERVICES = [
    { icon: "send", label: "Envoyer de l'argent", desc: "Transférer vers un numéro MTN", color: "#FF9800", route: "/send" },
    { icon: "call-received", label: "Recevoir", desc: "Partager votre numéro", color: "#00C853", route: "/(tabs)/myqr" },
    { icon: "add-circle-outline", label: "Recharger", desc: "Recharger via agent ou carte", color: "#2196F3", route: "/recharge" },
    { icon: "payment", label: "Payer une facture", desc: "SNDE, canal+, et plus", color: "#9C27B0", route: "/payment" },
    { icon: "savings", label: "Épargne", desc: "Épargner avec MTN MoMo", color: "#F44336", route: "/epargne" },
    { icon: "history", label: "Historique", desc: "Voir toutes vos transactions", color: "#607D8B", route: "/historique" },
];

export default function MoMoScreen() {
    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" backgroundColor={MTN.black} />

            <View style={styles.header}>
                <View style={styles.headerIcon}>
                    <MaterialIcons name="account-balance-wallet" size={32} color={MTN.black}  />
                    <Image source={require("../../assets/images/logo.png")} style={styles.logo} resizeMode="contain" />
                </View>
                <Text style={styles.headerTitle}>MTN MoMo</Text>
                <Text style={styles.headerSub}>Mobile Money Congo</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                <Text style={styles.sectionTitle}>Services disponibles</Text>

                {MOMO_SERVICES.map((service, i) => (
                    <TouchableOpacity
                        key={i}
                        style={styles.serviceCard}
                        activeOpacity={0.75}
                        onPress={() => service.route ? router.push(service.route as any) : null}
                    >
                        <View style={[styles.serviceIcon, { backgroundColor: service.color + "22" }]}>
                            <MaterialIcons name={service.icon as any} size={26} color={service.color} />
                        </View>
                        <View style={styles.serviceText}>
                            <Text style={styles.serviceLabel}>{service.label}</Text>
                            <Text style={styles.serviceDesc}>{service.desc}</Text>
                        </View>
                        <MaterialIcons name="chevron-right" size={22} color={MTN.lightGray} />
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: MTN.black },
    logo: { position: "absolute", width: 80, height: 80, bottom: -4, right: -4 },
    header: {
        backgroundColor: MTN.yellow, alignItems: "center",
        paddingTop: 16, paddingBottom: 28,
    },
    headerIcon: {
        width: 70, height: 70, borderRadius: 20, backgroundColor: MTN.black,
        alignItems: "center", justifyContent: "center",
        marginBottom: 12, shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
    },
    headerTitle: { fontSize: 24, fontWeight: "900", color: MTN.black },
    headerSub: { fontSize: 13, color: "rgba(0,0,0,0.6)", fontWeight: "600", marginTop: 2 },
    content: { padding: 16, paddingBottom: 100 },
    sectionTitle: { fontSize: 13, fontWeight: "700", color: MTN.lightGray, letterSpacing: 1, textTransform: "uppercase", marginBottom: 14 },
    serviceCard: {
        flexDirection: "row", alignItems: "center",
        backgroundColor: MTN.darkGray, borderRadius: 16,
        padding: 16, marginBottom: 10,
        borderWidth: 1, borderColor: MTN.mediumGray, gap: 14,
    },
    serviceIcon: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center" },
    serviceText: { flex: 1 },
    serviceLabel: { fontSize: 15, fontWeight: "700", color: MTN.white, marginBottom: 3 },
    serviceDesc: { fontSize: 12, color: MTN.lightGray },
});
