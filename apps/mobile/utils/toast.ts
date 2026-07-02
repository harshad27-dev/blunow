import { Alert, Platform, ToastAndroid } from "react-native";

export const showToast = (message: string, title = "Notice") => {
  if (Platform.OS === "android") {
    ToastAndroid.show(message, ToastAndroid.SHORT);
    return;
  }

  Alert.alert(title, message);
};
