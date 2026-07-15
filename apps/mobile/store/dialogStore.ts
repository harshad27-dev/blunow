import { Ionicons } from "@expo/vector-icons";
import { create } from "zustand";

export interface DialogButton {
  text?: string;
  onPress?: () => void;
  style?: "default" | "cancel" | "destructive";
}

export interface DialogOptions {
  cancelable?: boolean;
  onDismiss?: () => void;
}

interface DialogState {
  visible: boolean;
  title: string;
  message?: string;
  buttons?: DialogButton[];
  options?: DialogOptions;
  customIcon?: keyof typeof Ionicons.glyphMap;
  customAccent?: string;

  show: (params: {
    title: string;
    message?: string;
    buttons?: DialogButton[];
    options?: DialogOptions;
    icon?: keyof typeof Ionicons.glyphMap;
    accent?: string;
  }) => void;
  hide: () => void;
}

export const useDialogStore = create<DialogState>((set) => ({
  visible: false,
  title: "",
  message: "",
  buttons: undefined,
  options: undefined,
  customIcon: undefined,
  customAccent: undefined,

  show: (params) => {
    set({
      visible: true,
      title: params.title,
      message: params.message,
      buttons: params.buttons,
      options: params.options,
      customIcon: params.icon,
      customAccent: params.accent,
    });
  },

  hide: () => {
    set({
      visible: false,
      title: "",
      message: "",
      buttons: undefined,
      options: undefined,
      customIcon: undefined,
      customAccent: undefined,
    });
  },
}));
