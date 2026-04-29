import { Stack } from 'expo-router';

export default function WorkoutsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="active/chat"
        options={{ presentation: 'modal' }}
      />
    </Stack>
  );
}
