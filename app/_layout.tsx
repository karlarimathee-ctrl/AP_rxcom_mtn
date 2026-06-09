import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="splash" options={{ animation: "none",headerShown: false }} />
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />

         {/* Sous-pages profil — sans tabs */}
            <Stack.Screen name="informations" />
            <Stack.Screen name="securite" />
            <Stack.Screen name="historique" />
            <Stack.Screen name="notifications-settings" />
            <Stack.Screen name="aide" />
            <Stack.Screen name="apropos" />



          {/* Sous-pages momo — sans tabs */}
           <Stack.Screen name="send" />
           <Stack.Screen name="epargne" />
           <Stack.Screen name='recharge'/>
           <Stack.Screen name='payment'/>
           <Stack.Screen name='forfait'/>

          {/* Sous-pages index — tabs */}
           <Stack.Screen name='internet' options={{title:"Internet"}}/>

      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
