// apps/mobile/app/(tabs)/calendar.tsx
import React, { useMemo, useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
} from "react-native";
import { useTasks, Task } from "../context/tasks";
import { useProjects } from "../context/projects";
import TaskList from "../../components/TaskList";

type ViewMode = "5day" | "week" | "month";

const GRAY = "#9CA3AF";

export default function CalendarScreen() {
    const { tasks } = useTasks();
    const { projects } = useProjects();

    const today = useMemo(() => new Date(), []);
    const [viewMode, setViewMode] = useState<ViewMode>("5day");
    const [currentDate, setCurrentDate] = useState<Date>(today);
    const [selectedDate, setSelectedDate] = useState<Date>(today);

    // Map tasks -> dateKey "YYYY-MM-DD"
    const tasksByDate = useMemo(() => {
        const map: Record<string, Task[]> = {};
        for (const t of tasks) {
            const key = toDateKey(t.dueDate);
            if (!key) continue;
            if (!map[key]) map[key] = [];
            map[key].push(t);
        }
        return map;
    }, [tasks]);

    const selectedKey = toDateKeyFromDate(selectedDate);
    const tasksForSelected = selectedKey ? tasksByDate[selectedKey] ?? [] : [];

    // ----- RANGE BUILDERS -----
    const rangeDays = useMemo(() => {
        switch (viewMode) {
            case "5day":
                return buildRange(selectedDate, 5, 0); // 5 days starting selected
            case "week":
                return buildWeekRange(currentDate);
            case "month":
                return buildMonthGrid(currentDate);
            default:
                return [];
        }
    }, [viewMode, currentDate, selectedDate]);

    const goPrev = () => {
        if (viewMode === "5day") {
            setSelectedDate(addDays(selectedDate, -5));
            setCurrentDate(addDays(currentDate, -5));
        } else if (viewMode === "week") {
            setCurrentDate(addDays(currentDate, -7));
        } else {
            // month
            setCurrentDate(addMonths(currentDate, -1));
        }
    };

    const goNext = () => {
        if (viewMode === "5day") {
            setSelectedDate(addDays(selectedDate, 5));
            setCurrentDate(addDays(currentDate, 5));
        } else if (viewMode === "week") {
            setCurrentDate(addDays(currentDate, 7));
        } else {
            setCurrentDate(addMonths(currentDate, 1));
        }
    };

    const onSelectDay = (d: Date) => {
        setSelectedDate(d);
    };

    const headerLabel =
        viewMode === "month"
            ? formatMonthYear(currentDate)
            : `${formatMonthYear(currentDate)}`;

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.headerRow}>
                <View>
                    <Text style={styles.appName}>DO BEE</Text>
                    <Text style={styles.screenTitle}>Calendar</Text>
                </View>

                {/* View mode switch */}
                <View style={styles.segmentRow}>
                    {(["5day", "week", "month"] as ViewMode[]).map((mode) => (
                        <TouchableOpacity
                            key={mode}
                            style={[
                                styles.segment,
                                viewMode === mode && styles.segmentActive,
                            ]}
                            onPress={() => setViewMode(mode)}
                        >
                            <Text
                                style={[
                                    styles.segmentText,
                                    viewMode === mode && styles.segmentTextActive,
                                ]}
                            >
                                {mode === "5day"
                                    ? "5 days"
                                    : mode === "week"
                                        ? "Week"
                                        : "Month"}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Calendar header controls */}
            <View style={styles.calendarHeaderRow}>
                <TouchableOpacity onPress={goPrev} style={styles.navButton}>
                    <Text style={styles.navButtonText}>‹</Text>
                </TouchableOpacity>

                <Text style={styles.calendarHeaderText}>{headerLabel}</Text>

                <TouchableOpacity onPress={goNext} style={styles.navButton}>
                    <Text style={styles.navButtonText}>›</Text>
                </TouchableOpacity>
            </View>

            {/* Calendar view */}
            <View style={styles.calendarCard}>
                {viewMode === "month" ? (
                    <MonthGrid
                        days={rangeDays}
                        selectedDate={selectedDate}
                        onSelect={onSelectDay}
                        tasksByDate={tasksByDate}
                        getTaskColor={(t) => getTaskColor(t, projects)}
                    />
                ) : (
                    <HorizontalDaysRow
                        days={rangeDays}
                        selectedDate={selectedDate}
                        onSelect={onSelectDay}
                        tasksByDate={tasksByDate}
                        getTaskColor={(t) => getTaskColor(t, projects)}
                    />
                )}
            </View>

            {/* Tasks for selected date */}
            <ScrollView
                style={{ flex: 1, marginTop: 16 }}
                contentContainerStyle={{ paddingBottom: 120 }}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.tasksCard}>
                    <Text style={styles.tasksTitle}>
                        {formatFullDate(selectedDate)}
                    </Text>
                    {tasksForSelected.length === 0 ? (
                        <Text style={styles.noTasksText}>
                            No tasks yet. Tap the + button to add your first one.
                        </Text>
                    ) : (
                        <TaskList tasks={tasksForSelected} />
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

/* ---------- Small calendar components ---------- */

type DayCell = {
    date: Date;
    isCurrentMonth?: boolean;
};

type DayRowProps = {
    days: DayCell[];
    selectedDate: Date;
    onSelect: (d: Date) => void;
    tasksByDate: Record<string, Task[]>;
    getTaskColor: (t: Task) => string;
};

function HorizontalDaysRow({
    days,
    selectedDate,
    onSelect,
    tasksByDate,
    getTaskColor,
}: DayRowProps) {
    return (
        <View style={styles.horizontalDaysRow}>
            {days.map(({ date }) => {
                const key = toDateKeyFromDate(date);
                const tasks = key ? tasksByDate[key] ?? [] : [];
                const isSelected = isSameDate(date, selectedDate);

                return (
                    <TouchableOpacity
                        key={key}
                        style={[
                            styles.dayCell,
                            isSelected && styles.dayCellSelected,
                        ]}
                        onPress={() => onSelect(date)}
                    >
                        <Text style={styles.dayNameText}>
                            {weekdayShort(date)}
                        </Text>
                        <Text
                            style={[
                                styles.dayNumberText,
                                isSelected && styles.dayNumberSelected,
                            ]}
                        >
                            {date.getDate()}
                        </Text>

                        {/* color dots for tasks */}
                        <View style={styles.dotsRow}>
                            {tasks.slice(0, 3).map((t) => (
                                <View
                                    key={t.id}
                                    style={[
                                        styles.dot,
                                        { backgroundColor: getTaskColor(t) },
                                    ]}
                                />
                            ))}
                            {tasks.length > 3 && (
                                <Text style={styles.moreDotsText}>
                                    +{tasks.length - 3}
                                </Text>
                            )}
                        </View>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

type MonthGridProps = DayRowProps;

function MonthGrid({
    days,
    selectedDate,
    onSelect,
    tasksByDate,
    getTaskColor,
}: MonthGridProps) {
    // days is length 42 (6 weeks * 7)
    const rows: DayCell[][] = [];
    for (let i = 0; i < days.length; i += 7) {
        rows.push(days.slice(i, i + 7));
    }

    return (
        <View>
            {/* weekday labels */}
            <View style={styles.weekdayHeaderRow}>
                {["S", "M", "T", "W", "T", "F", "S"].map((w, idx) => (
                    <Text
                        key={`${w}-${idx}`}              // 👈 unique key now
                        style={styles.weekdayHeaderText}
                    >
                        {w}
                    </Text>
                ))}
            </View>


            {rows.map((row, idx) => (
                <View key={idx} style={styles.monthRow}>
                    {row.map((cell) => {
                        const key = toDateKeyFromDate(cell.date);
                        const tasks = key ? tasksByDate[key] ?? [] : [];
                        const isSelected = isSameDate(cell.date, selectedDate);
                        const isDim = cell.isCurrentMonth === false;

                        return (
                            <TouchableOpacity
                                key={key}
                                style={[
                                    styles.monthCell,
                                    isSelected && styles.monthCellSelected,
                                ]}
                                onPress={() => onSelect(cell.date)}
                            >
                                <Text
                                    style={[
                                        styles.monthCellNumber,
                                        isDim && styles.monthCellNumberDim,
                                        isSelected && styles.monthCellNumberSelected,
                                    ]}
                                >
                                    {cell.date.getDate()}
                                </Text>

                                <View style={styles.dotsRowMonth}>
                                    {tasks.slice(0, 3).map((t) => (
                                        <View
                                            key={t.id}
                                            style={[
                                                styles.dotSmall,
                                                { backgroundColor: getTaskColor(t) },
                                            ]}
                                        />
                                    ))}
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            ))}
        </View>
    );
}

/* ---------- Helpers ---------- */

// tasks use "mm/dd/yyyy" or null
function toDateKey(dueDate?: string | null): string | null {
    if (!dueDate) return null;
    const parts = dueDate.split("/");
    if (parts.length !== 3) return null;
    const [mm, dd, yyyy] = parts;
    const date = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    if (isNaN(date.getTime())) return null;
    return toDateKeyFromDate(date);
}

function toDateKeyFromDate(date: Date): string {
    return date.toISOString().slice(0, 10); // YYYY-MM-DD
}

function addDays(d: Date, days: number): Date {
    const result = new Date(d);
    result.setDate(result.getDate() + days);
    return result;
}

function addMonths(d: Date, months: number): Date {
    const result = new Date(d);
    result.setMonth(result.getMonth() + months);
    return result;
}

function startOfWeek(d: Date): Date {
    const result = new Date(d);
    const day = result.getDay(); // 0 Sun
    result.setDate(result.getDate() - day);
    return result;
}

function startOfMonth(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), 1);
}

function buildRange(start: Date, length: number, offset: number): DayCell[] {
    const days: DayCell[] = [];
    const base = addDays(start, offset);
    for (let i = 0; i < length; i++) {
        days.push({ date: addDays(base, i) });
    }
    return days;
}

function buildWeekRange(current: Date): DayCell[] {
    const start = startOfWeek(current);
    return buildRange(start, 7, 0);
}

// 6x7 grid for month view
function buildMonthGrid(current: Date): DayCell[] {
    const first = startOfMonth(current);
    const startWeekDay = first.getDay(); // 0 Sun
    const startGrid = addDays(first, -startWeekDay);

    const days: DayCell[] = [];
    for (let i = 0; i < 42; i++) {
        const date = addDays(startGrid, i);
        days.push({
            date,
            isCurrentMonth: date.getMonth() === current.getMonth(),
        });
    }
    return days;
}

function isSameDate(a: Date, b: Date): boolean {
    return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    );
}

function weekdayShort(d: Date): string {
    return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()];
}

function formatMonthYear(d: Date): string {
    const monthNames = [
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
    return `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
}

function formatFullDate(d: Date): string {
    const weekday = weekdayShort(d);
    const monthNamesShort = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
    ];
    return `${weekday}, ${monthNamesShort[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function getTaskColor(task: Task, projects: { id: string; color: string }[]) {
    if (!task.projectId) return GRAY;
    const p = projects.find((pr) => pr.id === task.projectId);
    return p?.color ?? GRAY;
}

/* ---------- Styles ---------- */

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f4f4f7",
        paddingHorizontal: 20,
        paddingTop: 52,
    },
    headerRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    appName: {
        fontSize: 14,
        color: "#888",
        letterSpacing: 1,
        textTransform: "uppercase",
    },
    screenTitle: {
        fontSize: 26,
        fontWeight: "700",
        marginTop: 4,
    },
    segmentRow: {
        flexDirection: "row",
        backgroundColor: "#e5e7eb",
        borderRadius: 999,
        padding: 2,
        gap: 2,
    },
    segment: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
    },
    segmentActive: {
        backgroundColor: "#111",
    },
    segmentText: {
        fontSize: 12,
        color: "#555",
    },
    segmentTextActive: {
        color: "#fff",
        fontWeight: "500",
    },
    calendarHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 8,
        marginTop: 4,
    },
    navButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#ddd",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#fff",
    },
    navButtonText: {
        fontSize: 18,
        fontWeight: "600",
    },
    calendarHeaderText: {
        fontSize: 15,
        fontWeight: "600",
        color: "#111",
    },
    calendarCard: {
        backgroundColor: "#fff",
        borderRadius: 24,
        paddingVertical: 10,
        paddingHorizontal: 10,
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 8 },
        elevation: 4,
    },
    horizontalDaysRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 4,
    },
    dayCell: {
        flex: 1,
        borderRadius: 16,
        paddingVertical: 6,
        paddingHorizontal: 6,
        alignItems: "center",
    },
    dayCellSelected: {
        backgroundColor: "#111",
    },
    dayNameText: {
        fontSize: 11,
        color: "#888",
    },
    dayNumberText: {
        fontSize: 16,
        fontWeight: "600",
        marginTop: 2,
    },
    dayNumberSelected: {
        color: "#fff",
    },
    dotsRow: {
        flexDirection: "row",
        marginTop: 4,
        alignItems: "center",
        gap: 3,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    moreDotsText: {
        fontSize: 10,
        color: "#777",
        marginLeft: 2,
    },
    weekdayHeaderRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 4,
        paddingHorizontal: 4,
    },
    weekdayHeaderText: {
        flex: 1,
        textAlign: "center",
        fontSize: 11,
        color: "#999",
    },
    monthRow: {
        flexDirection: "row",
    },
    monthCell: {
        flex: 1,
        paddingVertical: 6,
        borderRadius: 10,
        alignItems: "center",
        marginVertical: 2,
    },
    monthCellSelected: {
        backgroundColor: "#111",
    },
    monthCellNumber: {
        fontSize: 13,
    },
    monthCellNumberDim: {
        color: "#bbb",
    },
    monthCellNumberSelected: {
        color: "#fff",
        fontWeight: "600",
    },
    dotsRowMonth: {
        flexDirection: "row",
        marginTop: 3,
        gap: 2,
    },
    dotSmall: {
        width: 4,
        height: 4,
        borderRadius: 2,
    },
    tasksCard: {
        backgroundColor: "#fff",
        borderRadius: 24,
        padding: 16,
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 8 },
        elevation: 4,
    },
    tasksTitle: {
        fontSize: 16,
        fontWeight: "600",
        marginBottom: 6,
    },
    noTasksText: {
        fontSize: 13,
        color: "#888",
    },
});
