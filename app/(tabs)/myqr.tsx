import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator, Share, StatusBar, StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { SafeAreaView } from "react-native-safe-area-context";

const MTN = {
    yellow: "#FFCC00", black: "#0A0A0A", darkGray: "#1A1A1A",
    mediumGray: "#2C2C2C", lightGray: "#B0B0B0", white: "#FFFFFF",
};

export default function MyQRScreen() {
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        AsyncStorage.getItem("user").then((raw) => {
            if (raw) setUser(JSON.parse(raw));
        });
    }, []);

    if (!user) {
        return (
            <SafeAreaView style={styles.safe}>
                <ActivityIndicator size="large" color={MTN.yellow} style={{ marginTop: 60 }} />
            </SafeAreaView>
        );
    }

    // Données encodées dans le QR — format JSON lu par le scanner
    const qrData = JSON.stringify({
        numero: user.numero,
        nom: user.name,
        username: user.username,
    });

    const handleShare = async () => {
        await Share.share({ message: `Mon numéro MTN MoMo Gramm : +242 ${user.numero} (@${user.username})` });
    };

    return (
        <SafeAreaView style={styles.safe}>
            <StatusBar barStyle="light-content" backgroundColor={MTN.black} />

            <View style={styles.header}>
                <Text style={styles.headerTitle}>Mon QR Code</Text>
                <Text style={styles.headerSub}>Faites scanner ce code pour recevoir de l'argent</Text>
            </View>

            <View style={styles.content}>
                {/* Carte QR */}
                <View style={styles.qrCard}>
                    {/* Avatar initiales */}
                    <View style={styles.avatar}>
                        <Text style={styles.avatarTxt}>
                            {user.name?.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)}
                        </Text>
                    </View>
                    <Text style={styles.name}>{user.name}</Text>
                    <Text style={styles.username}>@{user.username}</Text>
                    <Text style={styles.numero}>+242 {user.numero}</Text>

                    {/* QR Code */}
                    <View style={styles.qrWrap}>
                        <QRCode
                            value={qrData}
                            size={200}
                            color={MTN.black}
                            backgroundColor={MTN.white}
                            logo={require("../../assets/images/logo.png")}
                            logoSize={40}
                            logoBackgroundColor={MTN.yellow}
                            logoBorderRadius={8}
                        />
                    </View>

                    <View style={styles.hint}>
                        <MaterialIcons name="qr-code-scanner" size={15} color={MTN.lightGray} />
                        <Text style={styles.hintTxt}>
                            L'expéditeur scanne ce code depuis l'onglet Envoyer
                        </Text>
                    </View>
                </View>

                {/* Bouton partager */}
                <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
                    <MaterialIcons name="share" size={20} color={MTN.black} />
                    <Text style={styles.shareBtnTxt}>Partager mon numéro</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: MTN.black },
    header: {
        backgroundColor: MTN.yellow, paddingHorizontal: 20,
        paddingTop: 16, paddingBottom: 20,
    },
    headerTitle: { fontSize: 22, fontWeight: "900", color: MTN.black },
    headerSub: { fontSize: 12, color: "rgba(0,0,0,0.55)", fontWeight: "600", marginTop: 2 },
    content: { flex: 1, alignItems: "center", padding: 24 },
    qrCard: {
        backgroundColor: MTN.darkGray, borderRadius: 24, padding: 28,
        alignItems: "center", borderWidth: 1, borderColor: MTN.mediumGray,
        width: "100%",
    },
    avatar: {
        width: 64, height: 64, borderRadius: 32,
        backgroundColor: MTN.yellow, alignItems: "center", justifyContent: "center",
        marginBottom: 12,
    },
    avatarTxt: { fontSize: 24, fontWeight: "900", color: MTN.black },
    name: { fontSize: 20, fontWeight: "900", color: MTN.white, marginBottom: 2 },
    username: { fontSize: 14, color: MTN.lightGray, marginBottom: 2 },
    numero: { fontSize: 15, fontWeight: "700", color: MTN.yellow, marginBottom: 24 },
    qrWrap: {
        padding: 16, backgroundColor: MTN.white, borderRadius: 16,
        marginBottom: 20,
    },
    hint: { flexDirection: "row", alignItems: "center", gap: 6 },
    hintTxt: { fontSize: 12, color: MTN.lightGray, textAlign: "center", flex: 1 },
    shareBtn: {
        flexDirection: "row", alignItems: "center", gap: 8,
        backgroundColor: MTN.yellow, borderRadius: 14, height: 52,
        paddingHorizontal: 28, marginTop: 20,
    },
    shareBtnTxt: { color: MTN.black, fontWeight: "900", fontSize: 15 },
});
