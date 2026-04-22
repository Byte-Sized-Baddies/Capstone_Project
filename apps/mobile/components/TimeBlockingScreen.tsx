import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useRef, useState } from "react";
import {
  Animated,
  Modal,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Task } from "../context/tasks";

type ProjectLike = {
  id: string;
  name: string;
  color?: string | null;
};

type TimeBlockingScreenProps = {
  tasks: Task[];
  projects: ProjectLike[];
  onScheduleTask: (
    id: string,
    updates: { doTime?: string | null; scheduledDuration?: number | null }
  ) => Promise<void>;
  onBack: () => void;
};

type DateFilter = "all" | "selected" | "no-date";
type PriorityFilter = Task["priority"] | "all";

type ScheduledBlock = {
  id: string;
  task: Task;
  hour: number;
  minutes: number;
  color: string;
};

const CREAM = "#F4F4F7";
const CARD = "#FFFFFF";
const INK = "#1A1A24";
const MUTED = "#8A8D96";
const LINE = "#E5E0D8";
const HONEY = "#F1C84C";
const HONEY_SOFT = "#FFF6DB";

const HOURS = Array.from({ length: 24 }, (_, index) => index);
const BLOCK_COLORS = [
  "#F1C84C",
  "#10B981",
  "#3B82F6",
  "#8B5CF6",
  "#EF4444",
  "#F97316",
  "#EC4899",
  "#14B8A6",
];

const toDateKey = (date: Date) => date.toISOString().slice(0, 10);

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const startOfMonth = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), 1);

const formatDatePill = (date: Date) => {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${month}/${day}/${date.getFullYear()}`;
};

const formatMonthYear = (date: Date) =>
  date.toLocaleDateString([], { month: "long", year: "numeric" });

const formatRelativeDay = (date: Date) => {
  const today = toDateKey(new Date());
  const selected = toDateKey(date);
  const tomorrow = toDateKey(addDays(new Date(), 1));
  const yesterday = toDateKey(addDays(new Date(), -1));

  if (selected === today) return "TODAY";
  if (selected === tomorrow) return "TOMORROW";
  if (selected === yesterday) return "YESTERDAY";

  return date.toLocaleDateString([], { weekday: "short" }).toUpperCase();
};

const formatHour = (hour: number) => {
  if (hour === 0) return "12 AM";
  if (hour === 12) return "12 PM";
  const suffix = hour > 12 ? "PM" : "AM";
  const normalized = hour > 12 ? hour - 12 : hour;
  return `${normalized} ${suffix}`;
};

const formatTaskDate = (raw?: string | null) => {
  if (!raw) return "No date";
  const date = new Date(raw.includes("T") ? raw : `${raw}T12:00:00`);
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
};

const getTaskDateKey = (raw?: string | null) => {
  if (!raw) return null;
  return raw.includes("T") ? toDateKey(new Date(raw)) : raw;
};

const getPriorityColor = (priority: Task["priority"]) => {
  if (priority === "high") return "#EF4444";
  if (priority === "medium") return "#F59E0B";
  return "#10B981";
};

const getDefaultDuration = (priority: Task["priority"]) => {
  if (priority === "high") return 90;
  if (priority === "medium") return 60;
  return 45;
};

const getDoTimeDateKey = (raw?: string | null) => {
  if (!raw) return null;
  return toDateKey(new Date(raw));
};

const getDoTimeHour = (raw?: string | null) => {
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date.getHours();
};

const createDoTimeValue = (date: Date, hour: number) => {
  const next = new Date(date);
  next.setHours(hour, 0, 0, 0);
  return next.toISOString();
};

function buildCalendarDays(monthDate: Date) {
  const first = startOfMonth(monthDate);
  const start = addDays(first, -first.getDay());
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}

function DraggableTaskCard({
  task,
  projectName,
  color,
  isScheduled,
  onDrop,
  onDragStateChange,
}: {
  task: Task;
  projectName: string;
  color: string;
  isScheduled: boolean;
  onDrop: (task: Task, pageX: number, pageY: number) => void;
  onDragStateChange: (isDragging: boolean) => void;
}) {
  const pan = useRef(new Animated.ValueXY()).current;
  const [isDragging, setIsDragging] = useState(false);

  const resetDragState = () => {
    setIsDragging(false);
    onDragStateChange(false);
    Animated.spring(pan, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: false,
    }).start();
  };

  const responder = useRef(
    PanResponder.create({
      // Only capture the touch if the user is pulling horizontally.
      // This allows vertical scrolls to pass straight through to the ScrollView seamlessly.
      onMoveShouldSetPanResponder: (_, gesture) => {
        const isHorizontalDrag = Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5;
        const hasMovedEnough = Math.abs(gesture.dx) > 10;
        return isHorizontalDrag && hasMovedEnough;
      },
      onPanResponderGrant: () => {
        setIsDragging(true);
        onDragStateChange(true); // Locks the ScrollView
        pan.setValue({ x: 0, y: 0 });
        Vibration.vibrate(15);
      },
      onPanResponderMove: (_, gesture) => {
        pan.setValue({ x: gesture.dx, y: gesture.dy });
      },
      onPanResponderRelease: (_, gesture) => {
        onDrop(task, gesture.moveX, gesture.moveY);
        resetDragState();
      },
      onPanResponderTerminate: () => {
        resetDragState();
      },
    })
  ).current;

  return (
    <Animated.View
      {...responder.panHandlers}
      style={[
        styles.taskCard,
        isScheduled && styles.taskCardScheduled,
        isDragging && styles.taskCardDragging,
        {
          transform: pan.getTranslateTransform(),
          zIndex: isDragging ? 9999 : 1, // Crucial to float over the schedule side
        },
      ]}
    >
      <View style={styles.taskHeader}>
        <View
          style={[
            styles.taskAccent,
            { backgroundColor: isScheduled ? MUTED : color },
          ]}
        />
        <Text
          style={[styles.taskMeta, isScheduled && styles.taskTextScheduled]}
          numberOfLines={1}
        >
          {projectName}
        </Text>
      </View>
      <Text
        style={[styles.taskTitle, isScheduled && styles.taskTextScheduled]}
        numberOfLines={2}
      >
        {task.title}
      </Text>
      <View style={styles.taskFooter}>
        <Text
          style={[styles.taskDate, isScheduled && styles.taskTextScheduled]}
          numberOfLines={1}
        >
          {isScheduled ? "Scheduled" : formatTaskDate(task.dueDate)}
        </Text>
        <Ionicons
          name={isDragging ? "hand-left-outline" : "swap-horizontal-outline"}
          size={14}
          color={isDragging ? INK : MUTED}
        />
      </View>
    </Animated.View>
  );
}

export default function TimeBlockingScreen({
  tasks,
  projects,
  onScheduleTask,
  onBack,
}: TimeBlockingScreenProps) {
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [showFilters, setShowFilters] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [isDraggingTask, setIsDraggingTask] = useState(false);
  const [pendingTask, setPendingTask] = useState<Task | null>(null);
  const [pendingHour, setPendingHour] = useState(9);
  const [durationHours, setDurationHours] = useState(1);
  const [durationMinutes, setDurationMinutes] = useState(0);
  const [blockColor, setBlockColor] = useState(BLOCK_COLORS[0]);

  const slotRefs = useRef<Record<number, View | null>>({});
  const selectedKey = toDateKey(selectedDate);
  const projectMap = useMemo(
    () => new Map(projects.map((project) => [project.id, project])),
    [projects]
  );

  const filteredTasks = useMemo(() => {
    return tasks
      .filter((task) => !task.done)
      .filter((task) => {
        const taskDateKey = getTaskDateKey(task.dueDate);
        if (dateFilter === "selected") {
          return !taskDateKey || taskDateKey === selectedKey;
        }
        if (dateFilter === "no-date") return !taskDateKey;
        return true;
      })
      .filter((task) =>
        priorityFilter === "all" ? true : task.priority === priorityFilter
      )
      .sort((a, b) => {
        const dateCompare = (a.dueDate || "9999-12-31").localeCompare(
          b.dueDate || "9999-12-31"
        );
        if (dateCompare !== 0) return dateCompare;
        return a.title.localeCompare(b.title);
      });
  }, [dateFilter, priorityFilter, selectedKey, tasks]);

  const blocksByHour = useMemo(() => {
    const map = new Map<number, ScheduledBlock[]>();
    tasks
      .filter((task) => !task.done && getDoTimeDateKey(task.doTime) === selectedKey)
      .forEach((task) => {
        const hour = getDoTimeHour(task.doTime);
        if (hour === null) return;
        const project = task.projectId ? projectMap.get(task.projectId) : null;
        const block: ScheduledBlock = {
          id: task.id,
          task,
          hour,
          minutes: task.scheduledDuration ?? getDefaultDuration(task.priority),
          color: project?.color || getPriorityColor(task.priority),
        };
        const list = map.get(hour) ?? [];
        list.push(block);
        map.set(hour, list);
      });
    return map;
  }, [projectMap, selectedKey, tasks]);

  const calendarDays = useMemo(
    () => buildCalendarDays(calendarMonth),
    [calendarMonth]
  );

  const openDurationForTask = (task: Task, hour: number) => {
    const defaultDuration = getDefaultDuration(task.priority);
    setPendingTask(task);
    setPendingHour(hour);
    setDurationHours(Math.floor(defaultDuration / 60));
    setDurationMinutes(defaultDuration % 60);
    setBlockColor(
      projectMap.get(task.projectId || "")?.color || getPriorityColor(task.priority)
    );
  };

  const handleTaskDrop = (task: Task, pageX: number, pageY: number) => {
    let matchedHour: number | null = null;
    let pendingMeasurements = HOURS.length;

    HOURS.forEach((hour) => {
      const ref = slotRefs.current[hour];
      if (!ref) {
        pendingMeasurements -= 1;
        return;
      }

      ref.measureInWindow((x, y, width, height) => {
        const isInsideRow =
          pageX >= x && pageX <= x + width && pageY >= y && pageY <= y + height;
        if (isInsideRow) matchedHour = hour;

        pendingMeasurements -= 1;
        if (pendingMeasurements === 0 && matchedHour !== null) {
          openDurationForTask(task, matchedHour);
        }
      });
    });
  };

  const addScheduledBlock = async () => {
    if (!pendingTask) return;
    const minutes = durationHours * 60 + durationMinutes || 15;

    await onScheduleTask(pendingTask.id, {
      doTime: createDoTimeValue(selectedDate, pendingHour),
      scheduledDuration: minutes,
    });
    setPendingTask(null);
  };

  const removeBlock = async (id: string) => {
    await onScheduleTask(id, {
      doTime: null,
      scheduledDuration: null,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.phoneShell}>
        <View style={styles.titleRow}>
          <TouchableOpacity style={styles.roundButton} onPress={onBack}>
            <Ionicons name="arrow-back" size={20} color={INK} />
          </TouchableOpacity>
          <Text style={styles.screenTitle}>Time Blocking</Text>
          <View style={styles.roundButtonPlaceholder} />
        </View>

        <View style={styles.dateControls}>
          <TouchableOpacity
            style={styles.dateArrow}
            onPress={() => setSelectedDate((prev) => addDays(prev, -1))}
          >
            <Ionicons name="chevron-back" size={16} color={INK} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.todayButton}
            onPress={() => setSelectedDate(new Date())}
          >
            <Text style={styles.todayText}>{formatRelativeDay(selectedDate)}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dateArrow}
            onPress={() => setSelectedDate((prev) => addDays(prev, 1))}
          >
            <Ionicons name="chevron-forward" size={16} color={INK} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.datePill}
            onPress={() => {
              setCalendarMonth(selectedDate);
              setShowCalendar(true);
            }}
          >
            <Text style={styles.datePillText}>{formatDatePill(selectedDate)}</Text>
            <Ionicons name="calendar-outline" size={14} color={INK} />
          </TouchableOpacity>
        </View>

        <View style={styles.splitHeader}>
          <Text style={[styles.columnTitle, styles.leftTitle]}>Tasks</Text>
          <Text style={[styles.columnTitle, styles.rightTitle]}>Schedule</Text>
        </View>

        <View style={styles.workspace}>
          <View style={styles.tasksColumn}>
            <View style={{ zIndex: 100 }}>
              <TouchableOpacity
                style={styles.filterButton}
                onPress={() => setShowFilters((prev) => !prev)}
              >
                <Ionicons name="filter" size={14} color={INK} />
                <Text style={styles.filterText}>Filters</Text>
                <Ionicons name={showFilters ? "chevron-up" : "chevron-down"} size={14} color={MUTED} />
              </TouchableOpacity>

              {showFilters && (
                <View style={styles.compactFilterDropdown}>
                  <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
                    <Text style={styles.filterSectionTitle}>Due Date</Text>
                    <View style={styles.filterRow}>
                      {([
                        ["all", "All"],
                        ["selected", "Today"],
                        ["no-date", "None"],
                      ] as const).map(([value, label]) => (
                        <TouchableOpacity
                          key={value}
                          style={[styles.filterChip, dateFilter === value && styles.filterChipActive]}
                          onPress={() => { setDateFilter(value); setShowFilters(false); }}
                        >
                          <Text style={[styles.filterChipText, dateFilter === value && styles.filterChipTextActive]}>
                            {label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Text style={styles.filterSectionTitle}>Priority</Text>
                    <View style={styles.filterRow}>
                      {(["all", "high", "medium", "low"] as const).map((value) => (
                        <TouchableOpacity
                          key={value}
                          style={[styles.filterChip, priorityFilter === value && styles.filterChipActive]}
                          onPress={() => { setPriorityFilter(value); setShowFilters(false); }}
                        >
                          <Text style={[styles.filterChipText, priorityFilter === value && styles.filterChipTextActive]}>
                            {value === "all" ? "All" : value}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              )}
            </View>

            <ScrollView
              scrollEnabled={!isDraggingTask}
              showsVerticalScrollIndicator={false}
              removeClippedSubviews={false}
              style={{ overflow: "visible" }}
              contentContainerStyle={styles.taskList}
            >
              {filteredTasks.length === 0 ? (
                <Text style={styles.emptyText}>No tasks found.</Text>
              ) : (
                filteredTasks.map((task) => {
                  const project = task.projectId
                    ? projectMap.get(task.projectId)
                    : null;
                  const color = project?.color || getPriorityColor(task.priority);
                  return (
                    <DraggableTaskCard
                      key={task.id}
                      task={task}
                      projectName={project?.name || "Other"}
                      color={color}
                      isScheduled={!!task.doTime}
                      onDrop={handleTaskDrop}
                      onDragStateChange={setIsDraggingTask}
                    />
                  );
                })
              )}
            </ScrollView>
          </View>

          <View style={styles.scheduleColumn}>
            <ScrollView
              scrollEnabled={!isDraggingTask}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scheduleList}
            >
              {HOURS.map((hour) => {
                const blocks = blocksByHour.get(hour) ?? [];
                return (
                  <View
                    key={hour}
                    ref={(ref) => {
                      slotRefs.current[hour] = ref;
                    }}
                    style={styles.hourRow}
                  >
                    <Text style={styles.hourText}>{formatHour(hour)}</Text>
                    <View style={styles.hourLines}>
                      <View style={styles.solidLine} />
                      {blocks.map((block) => (
                        <View
                          key={block.id}
                          style={[
                            styles.scheduledBlock,
                            {
                              borderLeftColor: block.color,
                              backgroundColor: `${block.color}1A`,
                              minHeight: Math.max(38, block.minutes * 0.7),
                            },
                          ]}
                        >
                          <View style={styles.scheduledText}>
                            <Text style={styles.scheduledTitle} numberOfLines={1}>
                              {block.task.title}
                            </Text>
                            <Text style={styles.scheduledMeta}>{block.minutes} min</Text>
                          </View>
                          <TouchableOpacity onPress={() => removeBlock(block.id)}>
                            <Ionicons name="close" size={14} color={INK} />
                          </TouchableOpacity>
                        </View>
                      ))}
                      <View style={styles.dashedLine} />
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </View>

      <Modal transparent visible={showCalendar} animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.calendarModal}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                style={styles.modalIconButton}
                onPress={() => setCalendarMonth((prev) => addDays(startOfMonth(prev), -1))}
              >
                <Ionicons name="chevron-back" size={18} color={INK} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>{formatMonthYear(calendarMonth)}</Text>
              <TouchableOpacity
                style={styles.modalIconButton}
                onPress={() => {
                  const next = new Date(calendarMonth);
                  next.setMonth(next.getMonth() + 1);
                  setCalendarMonth(next);
                }}
              >
                <Ionicons name="chevron-forward" size={18} color={INK} />
              </TouchableOpacity>
            </View>
            <View style={styles.weekdayRow}>
              {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
                <Text key={`${day}-${index}`} style={styles.weekdayText}>
                  {day}
                </Text>
              ))}
            </View>
            <View style={styles.calendarGrid}>
              {calendarDays.map((day) => {
                const key = toDateKey(day);
                const selected = key === selectedKey;
                const dimmed = day.getMonth() !== calendarMonth.getMonth();
                return (
                  <TouchableOpacity
                    key={key}
                    style={[styles.calendarDay, selected && styles.calendarDaySelected]}
                    onPress={() => {
                      setSelectedDate(day);
                      setCalendarMonth(day);
                      setShowCalendar(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.calendarDayText,
                        dimmed && styles.calendarDayTextDimmed,
                        selected && styles.calendarDayTextSelected,
                      ]}
                    >
                      {day.getDate()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowCalendar(false)}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={!!pendingTask} animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.durationModal}>
            <Text style={styles.modalTitle}>Set Duration</Text>
            <Text style={styles.modalSubtitle}>
              How long will <Text style={styles.modalBold}>{pendingTask?.title}</Text> take?
            </Text>
            <View style={styles.startTimePill}>
              <Ionicons name="time-outline" size={16} color={MUTED} />
              <Text style={styles.startTimeText}>Starting at {formatHour(pendingHour)}</Text>
            </View>

            <View style={styles.durationGrid}>
              <View style={styles.durationColumn}>
                <Text style={styles.durationLabel}>HOURS</Text>
                <View style={styles.stepperRow}>
                  <TouchableOpacity
                    style={styles.stepButton}
                    onPress={() => setDurationHours((prev) => Math.max(0, prev - 1))}
                  >
                    <Text style={styles.stepText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.durationValue}>{durationHours}</Text>
                  <TouchableOpacity
                    style={styles.stepButton}
                    onPress={() => setDurationHours((prev) => Math.min(8, prev + 1))}
                  >
                    <Text style={styles.stepText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.durationColumn}>
                <Text style={styles.durationLabel}>MINUTES</Text>
                <View style={styles.stepperRow}>
                  <TouchableOpacity
                    style={styles.stepButton}
                    onPress={() => setDurationMinutes((prev) => Math.max(0, prev - 15))}
                  >
                    <Text style={styles.stepText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.durationValue}>
                    {String(durationMinutes).padStart(2, "0")}
                  </Text>
                  <TouchableOpacity
                    style={styles.stepButton}
                    onPress={() => setDurationMinutes((prev) => Math.min(45, prev + 15))}
                  >
                    <Text style={styles.stepText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <Text style={styles.blockSummary}>
              {durationHours}h {durationMinutes ? `${durationMinutes}m` : ""} block
            </Text>

            <Text style={styles.durationLabel}>BLOCK COLOR</Text>
            <View style={styles.colorRow}>
              {BLOCK_COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorDot,
                    { backgroundColor: color },
                    blockColor === color && styles.colorDotActive,
                  ]}
                  onPress={() => setBlockColor(color)}
                />
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setPendingTask(null)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.addButton} onPress={addScheduledBlock}>
                <Text style={styles.addButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CREAM,
  },
  phoneShell: {
    flex: 1,
    backgroundColor: CREAM,
    paddingHorizontal: 16,
    overflow: "visible",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 10,
    paddingBottom: 6,
  },
  roundButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: LINE,
  },
  roundButtonPlaceholder: {
    width: 36,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: INK,
  },
  dateControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
  },
  dateArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: LINE,
  },
  todayButton: {
    height: 28,
    borderRadius: 8,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: HONEY_SOFT,
    borderWidth: 1,
    borderColor: HONEY,
  },
  todayText: {
    fontSize: 10,
    fontWeight: "800",
    color: INK,
  },
  datePill: {
    height: 28,
    borderRadius: 8,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: LINE,
  },
  datePillText: {
    fontSize: 11,
    fontWeight: "700",
    color: INK,
  },
  splitHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: LINE,
    marginTop: 4,
    paddingBottom: 6,
  },
  columnTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: INK,
  },
  leftTitle: {
    width: "42%",
  },
  rightTitle: {
    width: "58%",
    paddingLeft: 14,
  },
  workspace: {
    flex: 1,
    flexDirection: "row",
    overflow: "visible",
  },
  tasksColumn: {
    width: "42%",
    borderRightWidth: 1,
    borderRightColor: LINE,
    paddingRight: 10,
    paddingTop: 12,
    zIndex: 20, // Must be higher than right column
    overflow: "visible",
  },
  scheduleColumn: {
    width: "58%",
    paddingLeft: 12,
    paddingTop: 12,
    zIndex: 10,
  },
  filterButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 8,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: LINE,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
  },
  filterText: {
    fontSize: 11,
    fontWeight: "700",
    color: INK,
  },
  compactFilterDropdown: {
    position: "absolute",
    top: 34,
    left: 0,
    width: "120%",
    maxHeight: 250,
    backgroundColor: CARD,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: LINE,
    padding: 10,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
    zIndex: 100,
  },
  filterSectionTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: MUTED,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 12,
  },
  filterChip: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: CREAM,
  },
  filterChipActive: {
    backgroundColor: INK,
    borderColor: INK,
  },
  filterChipText: {
    fontSize: 10,
    fontWeight: "700",
    color: INK,
  },
  filterChipTextActive: {
    color: CARD,
  },
  taskList: {
    paddingBottom: 96,
    gap: 10,
  },
  taskCard: {
    minHeight: 64,
    borderRadius: 12,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: LINE,
    padding: 10,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  taskCardScheduled: {
    backgroundColor: "#EFEDE8",
    borderColor: "#D7D2C8",
    opacity: 0.62,
  },
  taskCardDragging: {
    opacity: 0.9,
    borderColor: HONEY,
    shadowOpacity: 0.15,
    elevation: 20, // Forces card above other components on Android
    backgroundColor: HONEY_SOFT,
  },
  taskHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  taskAccent: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  taskTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: INK,
    marginBottom: 6,
    lineHeight: 16,
  },
  taskFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "auto",
  },
  taskMeta: {
    fontSize: 9,
    fontWeight: "600",
    color: MUTED,
  },
  taskDate: {
    fontSize: 9,
    fontWeight: "700",
    color: MUTED,
  },
  taskTextScheduled: {
    color: "#8F8F96",
  },
  emptyText: {
    fontSize: 12,
    fontWeight: "600",
    color: MUTED,
    paddingTop: 12,
    textAlign: "center",
  },
  scheduleList: {
    paddingBottom: 96,
  },
  hourRow: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  hourText: {
    width: 40,
    fontSize: 11,
    fontWeight: "700",
    color: MUTED,
    paddingTop: 1,
  },
  hourLines: {
    flex: 1,
    paddingTop: 8,
    minHeight: 56,
  },
  solidLine: {
    borderTopWidth: 1,
    borderTopColor: LINE,
  },
  dashedLine: {
    marginTop: 20,
    borderTopWidth: 1,
    borderStyle: "dashed",
    borderTopColor: LINE,
  },
  scheduledBlock: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    borderRadius: 8,
    borderLeftWidth: 3,
    padding: 8,
    marginTop: 6,
  },
  scheduledText: {
    flex: 1,
    paddingRight: 6,
  },
  scheduledTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: INK,
    marginBottom: 2,
  },
  scheduledMeta: {
    fontSize: 9,
    fontWeight: "600",
    color: MUTED,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  calendarModal: {
    width: "100%",
    borderRadius: 20,
    backgroundColor: CARD,
    padding: 16,
    borderWidth: 1,
    borderColor: LINE,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  modalIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: CREAM,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: INK,
  },
  weekdayRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  weekdayText: {
    flex: 1,
    textAlign: "center",
    fontSize: 10,
    fontWeight: "800",
    color: MUTED,
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  calendarDay: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  calendarDaySelected: {
    backgroundColor: INK,
  },
  calendarDayText: {
    fontSize: 12,
    fontWeight: "700",
    color: INK,
  },
  calendarDayTextDimmed: {
    color: "#D0CDC6",
  },
  calendarDayTextSelected: {
    color: CARD,
  },
  modalCloseButton: {
    marginTop: 12,
    borderRadius: 10,
    backgroundColor: HONEY_SOFT,
    borderWidth: 1,
    borderColor: HONEY,
    paddingVertical: 10,
    alignItems: "center",
  },
  modalCloseText: {
    color: INK,
    fontSize: 13,
    fontWeight: "800",
  },
  durationModal: {
    width: "100%",
    borderRadius: 20,
    backgroundColor: CARD,
    padding: 20,
    borderWidth: 1,
    borderColor: LINE,
  },
  modalSubtitle: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "600",
    marginTop: 6,
    marginBottom: 14,
  },
  modalBold: {
    color: INK,
    fontWeight: "800",
  },
  startTimePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 10,
    backgroundColor: HONEY_SOFT,
    padding: 10,
    marginBottom: 16,
  },
  startTimeText: {
    color: INK,
    fontSize: 12,
    fontWeight: "800",
  },
  durationGrid: {
    flexDirection: "row",
    gap: 12,
  },
  durationColumn: {
    flex: 1,
  },
  durationLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: MUTED,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stepButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: CREAM,
  },
  stepText: {
    fontSize: 16,
    fontWeight: "800",
    color: INK,
  },
  durationValue: {
    minWidth: 34,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "800",
    color: INK,
  },
  blockSummary: {
    color: "#D4A800",
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 16,
    marginBottom: 16,
  },
  colorRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  colorDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  colorDotActive: {
    borderWidth: 2,
    borderColor: INK,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: CREAM,
    paddingVertical: 12,
    alignItems: "center",
  },
  cancelText: {
    fontSize: 13,
    fontWeight: "800",
    color: MUTED,
  },
  addButton: {
    flex: 1.5,
    borderRadius: 12,
    backgroundColor: HONEY,
    paddingVertical: 12,
    alignItems: "center",
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: "800",
    color: INK,
  },
});
