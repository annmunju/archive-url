import { useRef } from "react";
import { Animated, PanResponder, Pressable, StyleSheet, Text, View } from "react-native";
import type { DocumentListItem } from "@/api/types";
import { colors, radius } from "@/theme/tokens";
import { DocumentCard } from "./DocumentCard";

const LEFT_ACTION_WIDTH = 92;
const RIGHT_ACTION_WIDTH = 92;
const OPEN_THRESHOLD_RATIO = 0.5;

type Props = {
  item: DocumentListItem;
  onPress: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
  onSwipeableOpen: (close: () => void) => void;
  disabled?: boolean;
};

export function SwipeableDocumentCard({
  item,
  onPress,
  onDelete,
  onTogglePin,
  onSwipeableOpen,
  disabled = false,
}: Props) {
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

  const openDelete = () => {
    Animated.spring(translateX, {
      toValue: LEFT_ACTION_WIDTH,
      useNativeDriver: true,
      bounciness: 0,
    }).start(() => {
      isOpen.current = true;
      onSwipeableOpen(close);
    });
  };

  const openPin = () => {
    Animated.spring(translateX, {
      toValue: -RIGHT_ACTION_WIDTH,
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
        Math.abs(gestureState.dx) > 8 &&
        Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
      onPanResponderMove: (_, gestureState) => {
        const next = Math.max(-RIGHT_ACTION_WIDTH, Math.min(LEFT_ACTION_WIDTH, gestureState.dx));
        translateX.setValue(next);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > LEFT_ACTION_WIDTH * OPEN_THRESHOLD_RATIO) {
          openDelete();
          return;
        }
        if (gestureState.dx < -RIGHT_ACTION_WIDTH * OPEN_THRESHOLD_RATIO) {
          openPin();
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
      <View style={styles.rightActionContainer}>
        <Pressable
          style={[styles.pinButton, disabled && styles.pinButtonDisabled]}
          onPress={() => {
            close();
            onTogglePin();
          }}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={item.is_pinned ? "고정 해제" : "문서 고정"}
        >
          <Text style={styles.pinText}>{item.is_pinned ? "해제" : "고정"}</Text>
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
    width: LEFT_ACTION_WIDTH,
    justifyContent: "center",
  },
  rightActionContainer: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: RIGHT_ACTION_WIDTH,
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
  pinButton: {
    flex: 1,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  pinButtonDisabled: {
    opacity: 0.5,
  },
  pinText: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: "#FFFFFF",
  },
});
