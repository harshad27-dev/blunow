import React, { useRef, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  PanResponder,
  LayoutChangeEvent,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Colors } from "@/constants/colors";
import { FontFamily } from "@/constants/typography";

interface RangeSliderProps {
  min: number;
  max: number;
  minValue: number;
  maxValue: number;
  onValuesChange: (values: { min: number; max: number }) => void;
  step?: number;
  minDifference?: number;
  mode?: "range" | "single";
  singleThumb?: "min" | "max";
  valueFormatter?: (minValue: number, maxValue: number) => string;
}

const THUMB_RADIUS = 12;
const THUMB_SIZE = THUMB_RADIUS * 2;
const BUBBLE_WIDTH = 34;

export const RangeSlider: React.FC<RangeSliderProps> = ({
  min,
  max,
  minValue,
  maxValue,
  onValuesChange,
  step = 1,
  minDifference = 1,
  mode,
  singleThumb,
  valueFormatter,
}) => {
  const [containerWidth, setContainerWidth] = useState(0);
  const [activeThumb, setActiveThumb] = useState<"min" | "max" | null>(null);

  // Local values for zero-latency dragging
  const [localMin, setLocalMin] = useState(minValue);
  const [localMax, setLocalMax] = useState(maxValue);

  // Keep local state in sync when parent props change (e.g., on reset)
  React.useEffect(() => {
    setLocalMin(minValue);
    setLocalMax(maxValue);
  }, [minValue, maxValue]);

  const startTouchX = useRef(0);
  const lastHapticValue = useRef({ min: minValue, max: maxValue });
  const resolvedMode = mode ?? (singleThumb ? "single" : "range");
  const resolvedSingleThumb = singleThumb ?? "max";
  const showMinThumb = resolvedMode === "range" || resolvedSingleThumb === "min";
  const showMaxThumb = resolvedMode === "range" || resolvedSingleThumb === "max";

  const trackWidth = containerWidth - THUMB_SIZE;
  const minPercent = (localMin - min) / (max - min);
  const maxPercent = (localMax - min) / (max - min);

  const minX = containerWidth > 0 ? minPercent * trackWidth : 0;
  const maxX = containerWidth > 0 ? maxPercent * trackWidth : 0;
  const activeTrackStart =
    resolvedMode === "single" && resolvedSingleThumb === "max"
      ? THUMB_RADIUS
      : minX + THUMB_RADIUS;
  const activeTrackEnd =
    resolvedMode === "single" && resolvedSingleThumb === "min"
      ? containerWidth - THUMB_RADIUS
      : maxX + THUMB_RADIUS;

  const triggerHaptic = (newMin: number, newMax: number) => {
    if (
      newMin !== lastHapticValue.current.min ||
      newMax !== lastHapticValue.current.max
    ) {
      lastHapticValue.current = { min: newMin, max: newMax };
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  };

  const getValFromX = (x: number, currentTrackWidth: number) => {
    if (currentTrackWidth <= 0) return min;
    const fraction = x / currentTrackWidth;
    const clampedFraction = Math.max(0, Math.min(1, fraction));
    const val = min + clampedFraction * (max - min);
    const steppedVal = min + Math.round((val - min) / step) * step;
    return Math.max(min, Math.min(max, steppedVal));
  };

  const activeThumbRef = useRef<"min" | "max" | null>(null);
  activeThumbRef.current = activeThumb;

  const stateRef = useRef({ localMin, localMax, minX, maxX, containerWidth, activeThumb, trackWidth });
  stateRef.current = { localMin, localMax, minX, maxX, containerWidth, activeThumb, trackWidth };

  const grantHandler = (touchX: number) => {
    const s = stateRef.current;
    
    const distMin = Math.abs(touchX - (s.minX + THUMB_RADIUS));
    const distMax = Math.abs(touchX - (s.maxX + THUMB_RADIUS));
    const thumb =
      resolvedMode === "single"
        ? resolvedSingleThumb
        : distMin < distMax
          ? "min"
          : "max";
    
    setActiveThumb(thumb);
    activeThumbRef.current = thumb;
    startTouchX.current = touchX;

    // Snap to touch location immediately
    const startVal = getValFromX(touchX - THUMB_RADIUS, s.trackWidth);
    if (thumb === "min") {
      const newMin = Math.max(min, Math.min(startVal, s.localMax - minDifference));
      if (newMin !== s.localMin) {
        setLocalMin(newMin);
        onValuesChange({ min: newMin, max: s.localMax });
        triggerHaptic(newMin, s.localMax);
      }
    } else {
      const newMax = Math.max(s.localMin + minDifference, Math.min(startVal, max));
      if (newMax !== s.localMax) {
        setLocalMax(newMax);
        onValuesChange({ min: s.localMin, max: newMax });
        triggerHaptic(s.localMin, newMax);
      }
    }
  };

  const moveHandler = (deltaX: number) => {
    const s = stateRef.current;
    const currentTouchX = startTouchX.current + deltaX;
    const thumb = activeThumbRef.current;
    if (!thumb) return;

    const newVal = getValFromX(currentTouchX - THUMB_RADIUS, s.trackWidth);

    if (thumb === "min") {
      const newMin = Math.max(min, Math.min(newVal, s.localMax - minDifference));
      if (newMin !== s.localMin) {
        setLocalMin(newMin);
        onValuesChange({ min: newMin, max: s.localMax });
        triggerHaptic(newMin, s.localMax);
      }
    } else {
      const newMax = Math.max(s.localMin + minDifference, Math.min(newVal, max));
      if (newMax !== s.localMax) {
        setLocalMax(newMax);
        onValuesChange({ min: s.localMin, max: newMax });
        triggerHaptic(s.localMin, newMax);
      }
    }
  };

  // PanResponder is created once, so route gestures through refs that always
  // point at the latest props, dimensions, and callbacks.
  const grantHandlerRef = useRef(grantHandler);
  const moveHandlerRef = useRef(moveHandler);
  grantHandlerRef.current = grantHandler;
  moveHandlerRef.current = moveHandler;

  const panResponderInstance = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        grantHandlerRef.current(evt.nativeEvent.locationX);
      },
      onPanResponderMove: (_, gestureState) => {
        moveHandlerRef.current(gestureState.dx);
      },
      onPanResponderRelease: () => {
        setActiveThumb(null);
        activeThumbRef.current = null;
      },
      onPanResponderTerminate: () => {
        setActiveThumb(null);
        activeThumbRef.current = null;
      },
    })
  ).current;

  const onLayout = (e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  };

  return (
    <View style={styles.container}>
      {/* Label and display values */}
      <View style={styles.rangeLabelRow}>
        <Text style={styles.rangeText}>
          {valueFormatter
            ? valueFormatter(localMin, localMax)
            : `${localMin}–${localMax} years old`}
        </Text>
        <Text style={styles.modeText}>
          {resolvedMode === "single" ? "MAXIMUM" : "RANGE"}
        </Text>
      </View>

      {/* Slider Track and Knobs */}
      <View
        style={[styles.sliderTrackContainer, { opacity: containerWidth > 0 ? 1 : 0 }]}
        onLayout={onLayout}
        {...panResponderInstance.panHandlers}
      >
        {/* Gray Background Track */}
        <View style={styles.trackBackground} pointerEvents="none" />

        {/* Active Highlighted Track */}
        <View
          style={[
            styles.trackActive,
            {
              left: activeTrackStart,
              width: Math.max(0, activeTrackEnd - activeTrackStart),
            },
          ]}
          pointerEvents="none"
        />

        {/* Left Tooltip */}
        {showMinThumb ? <View
          style={[
            styles.bubbleContainer,
            {
              left: minX + THUMB_RADIUS - BUBBLE_WIDTH / 2,
              opacity: activeThumb === "min" ? 1 : 0.8,
              transform: [{ scale: activeThumb === "min" ? 1.15 : 1 }],
            },
          ]}
          pointerEvents="none"
        >
          <View style={styles.bubble}>
            <Text style={styles.bubbleText}>{localMin}</Text>
          </View>
          <View style={styles.bubbleArrow} />
        </View> : null}

        {/* Right Tooltip */}
        {showMaxThumb ? <View
          style={[
            styles.bubbleContainer,
            {
              left: maxX + THUMB_RADIUS - BUBBLE_WIDTH / 2,
              opacity: activeThumb === "max" ? 1 : 0.8,
              transform: [{ scale: activeThumb === "max" ? 1.15 : 1 }],
            },
          ]}
          pointerEvents="none"
        >
          <View style={styles.bubble}>
            <Text style={styles.bubbleText}>{localMax}</Text>
          </View>
          <View style={styles.bubbleArrow} />
        </View> : null}

        {/* Left Thumb (Min) */}
        {showMinThumb ? <View
          style={[
            styles.thumb,
            { left: minX },
            activeThumb === "min" && styles.thumbActive,
          ]}
          pointerEvents="none"
        >
          <View style={styles.thumbDot} />
        </View> : null}

        {/* Right Thumb (Max) */}
        {showMaxThumb ? <View
          style={[
            styles.thumb,
            { left: maxX },
            activeThumb === "max" && styles.thumbActive,
          ]}
          pointerEvents="none"
        >
          <View style={styles.thumbDot} />
        </View> : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
    borderRadius: 18,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  rangeLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  rangeText: {
    fontSize: 14,
    fontFamily: FontFamily.bold,
    color: Colors.textPrimary,
  },
  modeText: {
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: Colors.bgCard,
    color: Colors.textSecondary,
    fontSize: 9,
    fontFamily: FontFamily.bold,
    letterSpacing: 1,
  },
  sliderTrackContainer: {
    height: 48,
    justifyContent: "center",
    position: "relative",
    width: "100%",
  },
  trackBackground: {
    position: "absolute",
    left: THUMB_RADIUS,
    right: THUMB_RADIUS,
    top: 21,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.border,
  },
  trackActive: {
    position: "absolute",
    top: 21,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  thumb: {
    position: "absolute",
    top: 12,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_RADIUS,
    backgroundColor: Colors.bgCard,
    borderWidth: 2.5,
    borderColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 3,
    elevation: 3,
  },
  thumbActive: {
    borderColor: Colors.accent,
    shadowOpacity: 0.25,
    shadowRadius: 5,
  },
  thumbDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  bubbleContainer: {
    position: "absolute",
    top: -8,
    width: BUBBLE_WIDTH,
    alignItems: "center",
  },
  bubble: {
    backgroundColor: Colors.primary,
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 6,
    minWidth: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  bubbleText: {
    color: "#fff",
    fontSize: 10,
    fontFamily: FontFamily.bold,
  },
  bubbleArrow: {
    width: 6,
    height: 6,
    backgroundColor: Colors.primary,
    transform: [{ rotate: "45deg" }],
    marginTop: -3,
  },
});
