# Instructions d'intégration

## Structure finale attendue

```
app/
├── (tabs)/
│   ├── _layout.tsx       ← modifier (voir ci-dessous)
│   ├── profile.tsx       ← remplacer par le fichier fourni
│   ├── index.tsx
│   ├── momo.tsx
│   ├── send.tsx
│   └── chat.tsx
├── _layout.tsx           ← modifier (voir ci-dessous)
├── informations.tsx      ← NOUVEAU
├── securite.tsx          ← NOUVEAU
├── historique.tsx        ← NOUVEAU
├── notifications-settings.tsx ← NOUVEAU
├── aide.tsx              ← NOUVEAU
├── apropos.tsx           ← NOUVEAU
├── login.tsx
├── register.tsx
└── modal.tsx

components/
└── SubPageHeader.tsx     ← NOUVEAU (composant partagé)
```

## 1. Placer les fichiers

- Copier les 6 nouvelles pages dans `app/` (pas dans `(tabs)/`)
- Copier `SubPageHeader.tsx` dans `components/`
- Remplacer `app/(tabs)/profile.tsx` par le fichier fourni

## 2. Modifier app/_layout.tsx

Ajouter les 6 routes dans le Stack pour qu'elles soient sans tabs :

```tsx
import { Stack } from "expo-router";

export default function RootLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="login" />
            <Stack.Screen name="register" />
            <Stack.Screen name="modal" options={{ presentation: "modal" }} />

            {/* Sous-pages profil — sans tabs */}
            <Stack.Screen name="informations" />
            <Stack.Screen name="securite" />
            <Stack.Screen name="historique" />
            <Stack.Screen name="notifications-settings" />
            <Stack.Screen name="aide" />
            <Stack.Screen name="apropos" />
        </Stack>
    );
}
```

## 3. Pourquoi cette structure ?

- Les pages dans `app/` (hors `(tabs)/`) n'affichent **pas** la barre de navigation du bas
- `router.push("/informations")` depuis profile.tsx navigue vers `app/informations.tsx`
- `router.back()` dans SubPageHeader ramène à l'écran profil
- Chaque page reçoit ses propres `props` et `useState` locaux, sans modifier le contexte global
