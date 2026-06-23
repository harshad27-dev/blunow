import { Redirect } from "expo-router";

export default function LegacyAuthRoute() {
  return <Redirect href="/(auth)" />;
}
