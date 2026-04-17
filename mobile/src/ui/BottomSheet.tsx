import { PropsWithChildren, useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Modal,
  Pressable,
  StyleProp,
  StyleSheet,
  useWindowDimensions,
  View,
  ViewStyle,
} from "react-native";
import { theme } from "./theme";

export default function BottomSheet({
  visible,
  onClose,
  heightPct = 0.82,
  style,
  children,
}: PropsWithChildren<{
  visible: boolean;
  onClose: () => void;
  heightPct?: number;
  style?: StyleProp<ViewStyle>;
}>) {
  const { height } = useWindowDimensions();
  
  const sheetHeight = useMemo(
    () => Math.max(320, Math.floor(height * Math.min(0.95, Math.max(0.4, heightPct)))),
    [height, heightPct]
  );

  const translateY = useRef(new Animated.Value(sheetHeight)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Animasi Masuk
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, sheetHeight]);

  const close = () => {
    // Animasi Keluar
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: sheetHeight,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) onClose();
    });
  };

  return (
    <Modal 
      visible={visible} 
      transparent 
      animationType="none" 
      onRequestClose={close}
      statusBarTranslucent // Agar backdrop menutupi hingga status bar
    >
      <View style={styles.root}>
        {/* Backdrop dengan animasi fade */}
        <Animated.View 
          style={[
            styles.backdrop, 
            { opacity: backdropOpacity }
          ]} 
        >
          <Pressable style={{ flex: 1 }} onPress={close} />
        </Animated.View>

        {/* Sheet dengan animasi slide & spring */}
        <Animated.View
          style={[
            styles.sheet,
            {
              height: sheetHeight,
              transform: [{ translateY }],
            },
            style,
          ]}
        >
          {/* Handle bar yang lebih elegan */}
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          {/* 
              PENTING: KeyboardAvoidingView dihapus dari sini. 
              Biarkan komponen pemanggil (children) yang mengaturnya 
              untuk menghindari gap ganda.
          */}
          <View style={{ flex: 1 }}>
            {children}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  sheet: {
    backgroundColor: "#121212", // Warna solid yang lebih modern
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    // Menghilangkan border mencolok, gunakan shadow tipis atau border sangat soft
    borderTopWidth: 0.5,
    borderColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
    elevation: 20, // Shadow untuk Android
    shadowColor: "#000", // Shadow untuk iOS
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  handleContainer: {
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
});