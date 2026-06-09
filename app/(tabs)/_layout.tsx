import { MaterialIcons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

const MTN = {
    yellow: "#FFCC00",
    black: "#0A0A0A",
    darkGray: "#1A1A1A",
    mediumGray: "#2C2C2C",
    lightGray: "#B0B0B0",
    white: "#FFFFFF",
};

type IconName = React.ComponentProps<typeof MaterialIcons>["name"];

function TabIcon({ icon, label, focused }: { icon: IconName; label: string; focused: boolean }) {
    return (
        <View style={[tabStyles.tabItem, focused && tabStyles.tabItemActive]}>
            <MaterialIcons
                name={icon}
                size={24}
                color={focused ? MTN.yellow : MTN.lightGray}
            />
            <Text style={[tabStyles.tabLabel, focused && tabStyles.tabLabelActive]}>
                {label}
            </Text>
            {focused && <View style={tabStyles.tabDot} />}
        </View>
    );
}

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: MTN.darkGray,
                    borderTopWidth: 1,
                    borderTopColor: MTN.mediumGray,
                    height: Platform.OS === "ios" ? 85 : 65,
                    paddingBottom: Platform.OS === "ios" ? 20 : 8,
                    paddingTop: 8,
                    elevation: 20,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: -4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 12,
                },
                
                tabBarShowLabel: false,
                tabBarActiveTintColor: MTN.yellow,
                tabBarInactiveTintColor: MTN.lightGray,
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: "home",
                    tabBarIcon: ({ focused }) => (
                        <TabIcon icon="home" label="Home" focused={focused} />
                    ),
                }}
            />
            <Tabs.Screen 
            name="myqr"
            options={{
                title:"myqr",
                 tabBarIcon: ({ focused }) => (
                        <TabIcon icon="qr-code" label="code QR" focused={focused} />
                    ),
            }}
            />
            {/* Bouton central Shop / MoMo */}
            <Tabs.Screen
                name="momo"
                options={{
                    title: "MoMo",
                    tabBarIcon: ({ focused }) => (
                        <View style={tabStyles.centerBtn}>
                            <View style={[tabStyles.centerBtnInner, focused && tabStyles.centerBtnActive]}>
                                <MaterialIcons name="account-balance-wallet" size={28} color={MTN.black} />
                            </View>
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="chat"
                options={{
                    title: "chat",
                    tabBarIcon: ({ focused }) => (
                        <TabIcon icon="chat" label="chat" focused={focused} />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: "Profil",
                    tabBarIcon: ({ focused }) => (
                        <TabIcon icon="person" label="Profil" focused={focused} />
                    ),
                }}
            />
            
        </Tabs>

         
    );
}

const tabStyles = StyleSheet.create({
    tabItem: { alignItems: "center", justifyContent: "center", gap: 3, paddingHorizontal: 4 },
    tabItemActive: {},
    tabLabel: { fontSize: 10, color: MTN.lightGray, fontWeight: "600" },
    tabLabelActive: { color: MTN.yellow },
    tabDot: {
        width: 4, height: 4, borderRadius: 2,
        backgroundColor: MTN.yellow, position: "absolute", bottom: -4,
    },
    centerBtn: { alignItems: "center", justifyContent: "center", marginTop: -20 },
    centerBtnInner: {
        width: 58, height: 58, borderRadius: 29,
        backgroundColor: MTN.yellow, alignItems: "center", justifyContent: "center",
        shadowColor: MTN.yellow, shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5, shadowRadius: 12, elevation: 10,
        borderWidth: 3, borderColor: MTN.darkGray,
    },
    centerBtnActive: {
        shadowOpacity: 0.8, shadowRadius: 18, elevation: 14,
    },
});
