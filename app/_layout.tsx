import { Stack } from "expo-router";
import React from "react";

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="home" options={{ title: "Home" }} />
    </Stack>
  );
}
