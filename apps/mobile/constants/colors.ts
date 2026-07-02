import { Appearance } from "react-native";

export const ColorThemes = {
  light: {
    primary: "#1C1C1C",
    primaryLight: "#B19F91",
    primaryDark: "#111111",
    secondary: "#6F6259",
    secondaryLight: "#A99B91",
    accent: "#B19F91",
    bg: "#f7f4f0",
    bgCard: "#FFFFFF",
    bgElevated: "#E4DDD7",
    bgInput: "#FFFFFF",
    textPrimary: "#1C1C1C",
    textSecondary: "#6F6259",
    textMuted: "#A99B91",
    textInverse: "#F8F4F0",
    border: "#E4DDD7",
    borderFocus: "#B19F91",
    success: "#5CB879",
    error: "#B42345",
    warning: "#9A6700",
    gradientPrimary: ["#1C1C1C", "#6F6259"] as const,
    gradientBg: ["#F8F4F0", "#FFFFFF"] as const,
    gradientCard: ["#FFFFFF", "#E4DDD7"] as const,
    white: "#FFFFFF",
    black: "#1C1C1C",
    whiteAlpha80: "rgba(255,255,255,0.8)",
    onImageMuted: "rgba(255,255,255,0.84)",
    overlayDark: "rgba(0,0,0,0.72)",
    overlayDarkStrong: "rgba(0,0,0,0.96)",
    overlayDarkSoft: "rgba(0,0,0,0.18)",
    overlayLightSoft: "rgba(255,255,255,0.12)",
    transparent: "transparent",
    overlay: "rgba(248,244,240,0.78)",
  },
  dark: {
    primary: "#F8F4F0",
    primaryLight: "#C8B8AA",
    primaryDark: "#0B0A09",
    secondary: "#D6C8BE",
    secondaryLight: "#E8DDD4",
    accent: "#B19F91",
    bg: "#0F0E0D",
    bgCard: "#171412",
    bgElevated: "#241F1B",
    bgInput: "#1D1916",
    textPrimary: "#F8F4F0",
    textSecondary: "#D7CABF",
    textMuted: "#9F9186",
    textInverse: "#111111",
    border: "#332B26",
    borderFocus: "#C8B8AA",
    success: "#6DD58C",
    error: "#FF6F8F",
    warning: "#F1B84B",
    gradientPrimary: ["#F8F4F0", "#C8B8AA"] as const,
    gradientBg: ["#0F0E0D", "#171412"] as const,
    gradientCard: ["#241F1B", "#171412"] as const,
    white: "#FFFFFF",
    black: "#0F0E0D",
    whiteAlpha80: "rgba(255,255,255,0.8)",
    onImageMuted: "rgba(255,255,255,0.84)",
    overlayDark: "rgba(0,0,0,0.72)",
    overlayDarkStrong: "rgba(0,0,0,0.96)",
    overlayDarkSoft: "rgba(0,0,0,0.34)",
    overlayLightSoft: "rgba(255,255,255,0.14)",
    transparent: "transparent",
    overlay: "rgba(0,0,0,0.72)",
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
