import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Colors } from "@/constants/colors";
import { Radius, Spacing } from "@/constants/spacing";
import { FontFamily, FontSize } from "@/constants/typography";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

type BirthDateCalendarProps = {
  accent: string;
  onChangeDate: (value: string) => void;
  value: string;
};

export function BirthDateCalendar({
  accent,
  onChangeDate,
  value,
}: BirthDateCalendarProps) {
  const selectedDate = parseBirthDate(value);
  const maxDate = getMaxBirthDate();
  const initialMonth = selectedDate ?? maxDate;
  const [isOpen, setIsOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(
    () =>
      new Date(
        Date.UTC(initialMonth.getUTCFullYear(), initialMonth.getUTCMonth(), 1),
      ),
  );
  const minDate = getMinBirthDate();
  const calendarDays = getCalendarDays(visibleMonth);
  const canGoPrevious = !isSameCalendarMonth(visibleMonth, minDate);
  const canGoNext = !isSameCalendarMonth(visibleMonth, maxDate);
  const canGoPreviousYear = canGoPrevious;
  const canGoNextYear =
    clampCalendarMonth(
      new Date(
        Date.UTC(
          visibleMonth.getUTCFullYear() + 1,
          visibleMonth.getUTCMonth(),
          1,
        ),
      ),
    ).getTime() !== visibleMonth.getTime();

  const moveMonth = (offset: number) => {
    setVisibleMonth((current) =>
      clampCalendarMonth(
        new Date(
          Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + offset, 1),
        ),
      ),
    );
  };

  const handleSelectDate = (date: Date) => {
    if (isDateAfter(date, maxDate)) return;
    onChangeDate(formatCalendarDate(date));
    setIsOpen(false);
  };

  return (
    <View style={styles.calendarWrap}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen }}
        activeOpacity={0.82}
        onPress={() => setIsOpen((open) => !open)}
        style={[styles.inputWrap, isOpen && { borderColor: `${accent}55` }]}
      >
        <View style={styles.inputLabelRow}>
          <Ionicons
            name="calendar-outline"
            size={16}
            color={Colors.textSecondary}
          />
          <Text style={styles.inputLabel}>Birth date</Text>
        </View>
        <View style={styles.calendarFieldRow}>
          <Text
            style={[
              styles.calendarFieldText,
              !value && styles.calendarPlaceholder,
            ]}
          >
            {value || "MM/DD/YYYY"}
          </Text>
          <Ionicons
            name={isOpen ? "chevron-up" : "chevron-down"}
            size={18}
            color={Colors.textMuted}
          />
        </View>
      </TouchableOpacity>
      <Modal
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
        statusBarTranslucent
        transparent
        visible={isOpen}
      >
        <StatusBar style="light" backgroundColor="#1C1C1C" />
        <View style={styles.calendarDialogBackdrop}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close birth date calendar"
            onPress={() => setIsOpen(false)}
            style={styles.calendarDialogScrim}
          />
          <View style={styles.calendarDialogCard}>
            <View style={styles.calendarDialogTitleRow}>
              <View>
                <Text style={styles.calendarDialogEyebrow}>Birth date</Text>
                <Text style={styles.calendarDialogTitle}>
                  {value || "Select your birthday"}
                </Text>
              </View>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Close calendar"
                activeOpacity={0.72}
                onPress={() => setIsOpen(false)}
                style={styles.calendarCloseButton}
              >
                <Ionicons name="close" size={19} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View
              style={[styles.calendarPanel, { borderColor: `${accent}2E` }]}
            >
              <View style={styles.calendarHeader}>
                <View style={styles.calendarNavCluster}>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Previous year"
                    activeOpacity={0.72}
                    disabled={!canGoPreviousYear}
                    onPress={() => moveMonth(-12)}
                    style={[
                      styles.calendarNavButton,
                      !canGoPreviousYear && styles.calendarNavButtonDisabled,
                    ]}
                  >
                    <Ionicons
                      name="play-back"
                      size={15}
                      color={
                        canGoPreviousYear
                          ? Colors.textPrimary
                          : Colors.textMuted
                      }
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Previous month"
                    activeOpacity={0.72}
                    disabled={!canGoPrevious}
                    onPress={() => moveMonth(-1)}
                    style={[
                      styles.calendarNavButton,
                      !canGoPrevious && styles.calendarNavButtonDisabled,
                    ]}
                  >
                    <Ionicons
                      name="chevron-back"
                      size={18}
                      color={
                        canGoPrevious ? Colors.textPrimary : Colors.textMuted
                      }
                    />
                  </TouchableOpacity>
                </View>
                <Text style={styles.calendarMonthTitle}>
                  {formatCalendarMonth(visibleMonth)}
                </Text>
                <View style={styles.calendarNavCluster}>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Next month"
                    activeOpacity={0.72}
                    disabled={!canGoNext}
                    onPress={() => moveMonth(1)}
                    style={[
                      styles.calendarNavButton,
                      !canGoNext && styles.calendarNavButtonDisabled,
                    ]}
                  >
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={canGoNext ? Colors.textPrimary : Colors.textMuted}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Next year"
                    activeOpacity={0.72}
                    disabled={!canGoNextYear}
                    onPress={() => moveMonth(12)}
                    style={[
                      styles.calendarNavButton,
                      !canGoNextYear && styles.calendarNavButtonDisabled,
                    ]}
                  >
                    <Ionicons
                      name="play-forward"
                      size={15}
                      color={
                        canGoNextYear ? Colors.textPrimary : Colors.textMuted
                      }
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.weekdayRow}>
                {WEEKDAY_LABELS.map((day) => (
                  <Text key={day} style={styles.weekdayText}>
                    {day}
                  </Text>
                ))}
              </View>

              <View style={styles.calendarGrid}>
                {calendarDays.map((date) => {
                  const inMonth =
                    date.getUTCMonth() === visibleMonth.getUTCMonth();
                  const selected = selectedDate
                    ? isSameCalendarDay(date, selectedDate)
                    : false;
                  const disabled = !inMonth || isDateAfter(date, maxDate);
                  return (
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityState={{ disabled, selected }}
                      activeOpacity={0.72}
                      disabled={disabled}
                      key={date.toISOString()}
                      onPress={() => handleSelectDate(date)}
                      style={[
                        styles.calendarDay,
                        selected && {
                          backgroundColor: accent,
                          borderColor: accent,
                        },
                        disabled && styles.calendarDayDisabled,
                      ]}
                    >
                      <Text
                        style={[
                          styles.calendarDayText,
                          !inMonth && styles.calendarDayMuted,
                          disabled && styles.calendarDayMuted,
                          selected && styles.calendarDayTextSelected,
                        ]}
                      >
                        {date.getUTCDate()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={styles.calendarHelper}>
                Choose a date on or before {formatCalendarDate(maxDate)}.
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const parseBirthDate = (birthDate: string) => {
  const trimmed = birthDate.trim();
  const usMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  const year = usMatch
    ? Number(usMatch[3])
    : isoMatch
      ? Number(isoMatch[1])
      : 0;
  const month = usMatch
    ? Number(usMatch[1])
    : isoMatch
      ? Number(isoMatch[2])
      : 0;
  const day = usMatch ? Number(usMatch[2]) : isoMatch ? Number(isoMatch[3]) : 0;
  if (!year || !month || !day || month > 12 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  )
    return null;
  return date;
};

const getMaxBirthDate = () => {
  const today = new Date();
  return new Date(
    Date.UTC(today.getFullYear() - 18, today.getMonth(), today.getDate()),
  );
};

const getMinBirthDate = () => {
  const maxDate = getMaxBirthDate();
  return new Date(Date.UTC(maxDate.getUTCFullYear() - 100, 0, 1));
};

const clampCalendarMonth = (date: Date) => {
  const minDate = getMinBirthDate();
  const maxDate = getMaxBirthDate();
  const minMonth = new Date(
    Date.UTC(minDate.getUTCFullYear(), minDate.getUTCMonth(), 1),
  );
  const maxMonth = new Date(
    Date.UTC(maxDate.getUTCFullYear(), maxDate.getUTCMonth(), 1),
  );
  if (date.getTime() < minMonth.getTime()) return minMonth;
  if (date.getTime() > maxMonth.getTime()) return maxMonth;
  return date;
};

const getCalendarDays = (visibleMonth: Date) => {
  const firstDay = new Date(
    Date.UTC(visibleMonth.getUTCFullYear(), visibleMonth.getUTCMonth(), 1),
  );
  const gridStart = new Date(firstDay);
  gridStart.setUTCDate(firstDay.getUTCDate() - firstDay.getUTCDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setUTCDate(gridStart.getUTCDate() + index);
    return date;
  });
};

const isDateAfter = (date: Date, comparison: Date) =>
  date.getTime() > comparison.getTime();

const isSameCalendarDay = (left: Date, right: Date) =>
  left.getUTCFullYear() === right.getUTCFullYear() &&
  left.getUTCMonth() === right.getUTCMonth() &&
  left.getUTCDate() === right.getUTCDate();

const isSameCalendarMonth = (left: Date, right: Date) =>
  left.getUTCFullYear() === right.getUTCFullYear() &&
  left.getUTCMonth() === right.getUTCMonth();

const formatCalendarDate = (date: Date) => {
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${month}/${day}/${date.getUTCFullYear()}`;
};

const formatCalendarMonth = (date: Date) =>
  `${MONTH_LABELS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;

const styles = StyleSheet.create({
  calendarWrap: { gap: Spacing.sm },
  inputWrap: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderColor: "rgba(28,28,28,0.08)",
    borderRadius: Radius.lg,
    borderWidth: 1,
    minHeight: 70,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  inputLabelRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    marginBottom: 4,
  },
  inputLabel: {
    color: Colors.textSecondary,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
    textTransform: "uppercase",
  },
  calendarFieldRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 34,
  },
  calendarFieldText: {
    color: Colors.textPrimary,
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.md,
  },
  calendarPlaceholder: { color: Colors.textMuted },
  calendarDialogBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(28,28,28,0.38)",
    flex: 1,
    justifyContent: "center",
    padding: Spacing.lg,
  },
  calendarDialogScrim: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  calendarDialogCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    maxWidth: 420,
    padding: Spacing.md,
    shadowColor: Colors.black,
    shadowOffset: { height: 18, width: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    width: "100%",
  },
  calendarDialogTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  calendarDialogEyebrow: {
    color: Colors.textMuted,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
    textTransform: "uppercase",
  },
  calendarDialogTitle: {
    color: Colors.textPrimary,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    marginTop: 2,
  },
  calendarCloseButton: {
    alignItems: "center",
    backgroundColor: "rgba(248,244,240,0.84)",
    borderColor: "rgba(28,28,28,0.08)",
    borderRadius: Radius.full,
    borderWidth: 1,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  calendarPanel: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    shadowColor: Colors.black,
    shadowOffset: { height: 10, width: 0 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
  },
  calendarHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  calendarMonthTitle: {
    color: Colors.textPrimary,
    flex: 1,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
    textAlign: "center",
  },
  calendarNavCluster: {
    flexDirection: "row",
    gap: Spacing.xs,
  },
  calendarNavButton: {
    alignItems: "center",
    backgroundColor: "rgba(248,244,240,0.84)",
    borderColor: "rgba(28,28,28,0.08)",
    borderRadius: Radius.full,
    borderWidth: 1,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  calendarNavButtonDisabled: { opacity: 0.42 },
  weekdayRow: {
    flexDirection: "row",
    marginBottom: Spacing.xs,
  },
  weekdayText: {
    color: Colors.textMuted,
    flex: 1,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
    textAlign: "center",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  calendarDay: {
    alignItems: "center",
    aspectRatio: 1,
    borderColor: "transparent",
    borderRadius: Radius.full,
    borderWidth: 1,
    justifyContent: "center",
    width: "14.2857%",
  },
  calendarDayDisabled: { opacity: 0.32 },
  calendarDayText: {
    color: Colors.textPrimary,
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
  },
  calendarDayMuted: { color: Colors.textMuted },
  calendarDayTextSelected: { color: Colors.white },
  calendarHelper: {
    color: Colors.textMuted,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    lineHeight: 18,
    marginTop: Spacing.sm,
    textAlign: "center",
  },
});