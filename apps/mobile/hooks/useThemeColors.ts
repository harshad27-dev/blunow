import { useColorScheme } from "nativewind";
import { getThemeColors } from "@/constants/colors";

export const useThemeColors = () => {
  const { colorScheme } = useColorScheme();
  return getThemeColors(colorScheme === "light" ? "light" : "dark");
};
