import { Appearance } from "react-native";

export const ColorThemes = {
  light: {
    primary: "#050505",
    primaryLight: "#2D2D2D",
    primaryDark: "#000000",
    secondary: "#5F6368",
    secondaryLight: "#7B8087",
    accent: "#6B7280",
    bg: "#F7F7F5",
    bgCard: "#FFFFFF",
    bgElevated: "#ECEDEA",
    bgInput: "#F1F2EF",
    textPrimary: "#111111",
    textSecondary: "#5F6368",
    textMuted: "#90959B",
    textInverse: "#FFFFFF",
    border: "#D9DAD6",
    borderFocus: "#050505",
    success: "#2F855A",
    error: "#B42345",
    warning: "#9A6700",
    gradientPrimary: ["#050505", "#5F6368"] as const,
    gradientBg: ["#F7F7F5", "#FFFFFF"] as const,
    gradientCard: ["#FFFFFF", "#ECEDEA"] as const,
    white: "#FFFFFF",
    black: "#000000",
    transparent: "transparent",
    overlay: "rgba(255,255,255,0.78)",
  },
  dark: {
    primary: "#FFFFFF",
    primaryLight: "#E0E0E0",
    primaryDark: "#A0A0A0",
    secondary: "#C0C0C0",
    secondaryLight: "#D8D8D8",
    accent: "#888888",
    bg: "#050505",
    bgCard: "#0F0F0F",
    bgElevated: "#1A1A1A",
    bgInput: "#111111",
    textPrimary: "#F5F5F5",
    textSecondary: "#888888",
    textMuted: "#444444",
    textInverse: "#050505",
    border: "#222222",
    borderFocus: "#FFFFFF",
    success: "#6FBF8A",
    error: "#CF6679",
    warning: "#C8A86B",
    gradientPrimary: ["#FFFFFF", "#888888"] as const,
    gradientBg: ["#050505", "#0F0F0F"] as const,
    gradientCard: ["#1A1A1A", "#0F0F0F"] as const,
    white: "#FFFFFF",
    black: "#000000",
    transparent: "transparent",
    overlay: "rgba(0,0,0,0.75)",
  },
} as const;

export type ThemeName = keyof typeof ColorThemes;
export type ThemeColors = (typeof ColorThemes)[ThemeName];

export const getThemeColors = (theme: ThemeName = "dark") => ColorThemes[theme];

const getSystemTheme = (): ThemeName =>
  Appearance.getColorScheme() === "light" ? "light" : "dark";

export const Colors = new Proxy({} as ThemeColors, {
  get(_target, property: keyof ThemeColors) {
    return ColorThemes[getSystemTheme()][property];
  },
});
