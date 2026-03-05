import { useRef } from "react";
import { Animated, PanResponder, Pressable, StyleSheet, Text, View } from "react-native";
import type { DocumentListItem } from "@/api/types";
import { colors, radius } from "@/theme/tokens";
import { DocumentCard } from "./DocumentCard";

const ACTION_WIDTH = 92;

type Props = {
  item: DocumentListItem;
  onPress: () => void;
  onDelete: () => void;
  onSwipeableOpen: (close: () => void) => void;
  disabled?: boolean;
};

export function SwipeableDocumentCard({ item, onPress, onDelete, onSwipeableOpen, disabled = false }: Props) {
  const translateX = useRef(new Animated.Value(0)).current;
  const isOpen = useRef(false);

  const close = () => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 0,
    }).start(() => {
      isOpen.current = false;
    });
  };

  const open = () => {
    Animated.spring(translateX, {
      toValue: ACTION_WIDTH,
      useNativeDriver: true,
      bounciness: 0,
    }).start(() => {
      isOpen.current = true;
      onSwipeableOpen(close);
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        !disabled &&
        gestureState.dx > 8 &&
        Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
      onPanResponderMove: (_, gestureState) => {
        const next = Math.max(0, Math.min(ACTION_WIDTH, gestureState.dx));
        translateX.setValue(next);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > ACTION_WIDTH * 0.5) {
          open();
          return;
        }
        close();
      },
      onPanResponderTerminate: close,
    }),
  ).current;

  return (
    <View style={styles.container}>
      <View style={styles.leftActionContainer}>
        <Pressable
          style={[styles.deleteButton, disabled && styles.deleteButtonDisabled]}
          onPress={() => {
            close();
            onDelete();
          }}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel="문서 삭제"
        >
          <Text style={styles.deleteText}>삭제</Text>
        </Pressable>
      </View>
      <Animated.View style={{ transform: [{ translateX }] }} {...panResponder.panHandlers}>
        <DocumentCard
          item={item}
          onPress={() => {
            if (isOpen.current) {
              close();
              return;
            }
            onPress();
          }}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
  },
  leftActionContainer: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 92,
    justifyContent: "center",
  },
  deleteButton: {
    flex: 1,
    borderRadius: radius.md,
    backgroundColor: colors.error,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteButtonDisabled: {
    opacity: 0.5,
  },
  deleteText: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: "#FFFFFF",
  },
});
