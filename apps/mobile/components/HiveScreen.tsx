import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTasks, Task } from "../context/tasks";
import { useProjects } from "../context/projects";
import { useNotes, Note } from "../context/notes";
import AddTaskModal from "./AddTaskModal";
import HiveStatsView from "./HiveStatsView";
import TimeBlockingScreen from "./TimeBlockingScreen";
import NoteEditorScreen from "./NoteEditorScreen";

type HiveSection = "overview" | "stats" | "time-blocking" | "notes" | "note-editor";

type TimeBlock = {
  id: string;
  title: string;
  subtitle: string;
  hourLabel: string;
  tone: "indigo" | "amber" | "ghost";
};

type NotePreview = {
  id: string;
  title: string;
  subtitle: string;
  labels: NoteLabel[];
  color: string;
  note: Note;
};

type NoteLabel = {
  text: string;
  type?: "default" | "date";
};

const INDIGO = "#4152D9";
const INDIGO_SOFT = "#E8ECFF";
const AMBER = "#F59E0B";
const AMBER_SOFT = "#FFF5E6";
const EMERALD = "#10B981";
const SURFACE = "#F4F4F7";
const CARD = "#FFFFFF";
const TEXT = "#23243B";
const MUTED = "#A1A1AA";

function BeeIcon({ active = false }: { active?: boolean }) {
  return (
    <View style={[styles.beeIconWrap, active && styles.beeIconWrapActive]}>
      <View style={[styles.beeWing, styles.beeWingLeft]} />
      <View style={[styles.beeWing, styles.beeWingRight]} />
      <View style={styles.beeBody}>
        <View style={styles.beeStripe} />
        <View style={styles.beeStripe} />
      </View>
      <View style={styles.beeHead}>
        <View style={styles.beeEye} />
      </View>
    </View>
  );
}

const formatDayLabel = (date: Date) =>
  ["S", "M", "T", "W", "T", "F", "S"][date.getDay()];

const formatShortMonthDay = (raw: string) => {
  const normalized = raw.includes("T") ? raw : `${raw}T12:00:00`;
  const date = new Date(normalized);
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
};

const toLocalDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getLocalDateKey = (raw?: string | null) => {
  if (!raw) return "";
  const date = new Date(raw.includes("T") ? raw : `${raw}T12:00:00`);
  if (Number.isNaN(date.getTime())) return raw.slice(0, 10);
  return toLocalDateKey(date);
};

const formatHourLabel = (time?: string | null, fallbackIndex = 0) => {
  if (!time) {
    const hour = 9 + fallbackIndex;
    const suffix = hour >= 12 ? "PM" : "AM";
    const normalizedHour = hour > 12 ? hour - 12 : hour;
    return `${normalizedHour} ${suffix}`;
  }

  if (time.includes("T")) {
    const date = new Date(time);
    if (!Number.isNaN(date.getTime())) {
      const hours = date.getHours();
      const suffix = hours >= 12 ? "PM" : "AM";
      const normalizedHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
      return `${normalizedHour} ${suffix}`;
    }
  }

  const match = time
    .trim()
    .match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)?$/i);
  if (!match) return time;

  let hours = Number(match[1]);
  const meridiem = match[3]?.toLowerCase();

  if (!meridiem) {
    const suffix = hours >= 12 ? "PM" : "AM";
    const normalizedHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${normalizedHour} ${suffix}`;
  }

  return `${hours} ${meridiem.toUpperCase()}`;
};

const getDuration = (task: Task) => {
  if (task.priority === "high") return 90;
  if (task.priority === "medium") return 60;
  return 45;
};

const getStreak = (tasks: Task[]) => {
  const completedDays = new Set(
    tasks
      .filter((task) => task.done)
      .map((task) => (task.completedAt || task.createdAt).slice(0, 10))
  );

  let streak = 0;
  const cursor = new Date();
  cursor.setHours(12, 0, 0, 0);

  while (completedDays.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
};

const startOfWeek = (date: Date) => {
  const next = new Date(date);
  const day = next.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + mondayOffset);
  next.setHours(12, 0, 0, 0);
  return next;
};

function FullSectionLayout({
  title,
  subtitle,
  onBack,
  children,
}: {
  title: string;
  subtitle: string;
  onBack: () => void;
  children: React.ReactNode;
}) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.fullHeader}>
        <TouchableOpacity style={styles.backPill} onPress={onBack}>
          <Ionicons name="arrow-back" size={20} color={TEXT} />
        </TouchableOpacity>
        <View style={styles.fullHeaderText}>
          <Text style={styles.fullTitle}>{title}</Text>
          {subtitle ? <Text style={styles.fullSubtitle}>{subtitle}</Text> : null}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.fullContent}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

function NotesFullView({
  notes,
  onBack,
  onCreateNote,
  onOpenNote,
}: {
  notes: NotePreview[];
  onBack: () => void;
  onCreateNote: () => void;
  onOpenNote: (note: Note) => void;
}) {
  return (
    <FullSectionLayout
      title="Notes"
      subtitle=""
      onBack={onBack}
    >
      <View style={styles.fullCard}>
        <View style={styles.fullCardHeader}>
          <View style={styles.fullCardHeaderText}>
            <Text style={styles.fullCardTitle}>Recent Notes</Text>
          </View>
          <TouchableOpacity style={styles.smallHoneyButton} onPress={onCreateNote}>
            <Ionicons name="add" size={16} color={TEXT} />
            <Text style={styles.smallHoneyButtonText}>New</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.notesList}>
          {notes.length === 0 ? (
            <Text style={styles.emptyNotes}>
              Create your first note and it will show up here.
            </Text>
          ) : (
            notes.map((note) => (
              <TouchableOpacity
                key={note.id}
                style={styles.noteRow}
                onPress={() => onOpenNote(note.note)}
              >
                <View
                  style={[styles.noteDot, { backgroundColor: note.color }]}
                />
                <View style={styles.noteTextWrap}>
                  <Text style={styles.noteTitle}>{note.title}</Text>
                  <NoteLabelPills labels={note.labels} />
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </View>
    </FullSectionLayout>
  );
}

function NoteLabelPills({ labels }: { labels: NoteLabel[] }) {
  return (
    <View style={styles.notePillRow}>
      {labels.map((label) => (
        <View
          key={`${label.type || "default"}-${label.text}`}
          style={[
            styles.noteInfoPill,
            label.type === "date" && styles.noteDatePill,
          ]}
        >
          {label.type === "date" ? (
            <Text style={styles.noteDateIcon}>📅</Text>
          ) : null}
          <Text
            style={[
              styles.noteInfoPillText,
              label.type === "date" && styles.noteDatePillText,
            ]}
            numberOfLines={1}
          >
            {label.text}
          </Text>
        </View>
      ))}
    </View>
  );
}

export default function HiveScreen() {
  const { tasks, dailyGoal, updateTask } = useTasks();
  const { projects } = useProjects();
  const { notes, createNote, updateNote } = useNotes();
  const [activeSection, setActiveSection] = useState<HiveSection>("overview");
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  const todayKey = toLocalDateKey(now);
  const weekStart = startOfWeek(now);
  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + index);
    return day;
  });

  const completedTasks = useMemo(
    () => tasks.filter((task) => task.done),
    [tasks]
  );

  const completedToday = completedTasks.filter((task) =>
    getLocalDateKey(task.completedAt || task.createdAt) === todayKey
  ).length;

  const completedThisWeek = completedTasks.filter((task) => {
    const stamp = task.completedAt || task.createdAt;
    if (!stamp) return false;
    const date = new Date(stamp);
    return date >= weekStart;
  }).length;

  const weeklyJars = Math.floor(completedThisWeek / Math.max(dailyGoal, 1));
  const totalJars = Math.floor(completedTasks.length / Math.max(dailyGoal, 1));
  const streak = getStreak(tasks);
  const progressPercent = Math.min(
    100,
    Math.round((completedToday / Math.max(dailyGoal, 1)) * 100)
  );

  const weeklyCells = weekDays.map((day) => {
    const key = toLocalDateKey(day);
    const count = completedTasks.filter((task) =>
      getLocalDateKey(task.completedAt || task.createdAt) === key
    ).length;

    return {
      key,
      label: formatDayLabel(day),
      active: count > 0,
      isToday: key === todayKey,
    };
  });

  const todayTasks = useMemo(
    () => tasks.filter((task) => getLocalDateKey(task.doTime) === todayKey),
    [tasks, todayKey]
  );

  const timeBlocks: TimeBlock[] = useMemo(() => {
    const projectMap = new Map(projects.map((project) => [project.id, project]));
    const scheduled = [...todayTasks]
      .sort((a, b) => (a.doTime || "9999").localeCompare(b.doTime || "9999"))
      .slice(0, 4)
      .map((task, index) => {
        const project = task.projectId ? projectMap.get(task.projectId) : null;
        const duration = task.scheduledDuration ?? getDuration(task);
        const tone =
          task.priority === "high"
            ? "amber"
            : task.priority === "medium"
              ? "indigo"
              : index % 2 === 1
                ? "ghost"
                : "indigo";

        return {
          id: task.id,
          title: task.title,
          subtitle: `${project?.name || "Personal"} · ${duration} min`,
          hourLabel: formatHourLabel(task.doTime, index),
          tone,
        } satisfies TimeBlock;
      });

    if (scheduled.length === 0) {
      return [
        {
          id: "empty-1",
          title: "Add block",
          subtitle: "Use Do Time to shape your day",
          hourLabel: "9 AM",
          tone: "ghost",
        },
      ];
    }

    if (scheduled.length === 1) {
      scheduled.push({
        id: "empty-2",
        title: "Add block",
        subtitle: "Keep your next focus visible",
        hourLabel: "10 AM",
        tone: "ghost",
      });
    }

    return scheduled;
  }, [projects, todayTasks]);

  const notePreviews: NotePreview[] = useMemo(() => {
    const projectMap = new Map(projects.map((project) => [project.id, project]));
    const taskMap = new Map(tasks.map((task) => [task.id, task]));

    return [...notes]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 6)
      .map((note) => {
        const linkedTasks = note.taskIds
          .map((taskId) => taskMap.get(taskId))
          .filter((task): task is Task => Boolean(task));
        const linkedTask = linkedTasks[0] ?? null;
        const project = linkedTask?.projectId ? projectMap.get(linkedTask.projectId) : null;
        const taskLabel =
          linkedTasks.length === 0
            ? "No task"
            : linkedTasks.length === 1
              ? linkedTasks[0].title
              : `${linkedTasks.length} tasks`;

        return {
          id: note.id,
          title: note.title,
          subtitle: `${project?.name || "Personal"} · ${formatShortMonthDay(note.updatedAt)}`,
          labels: [
            { text: project?.name || "Personal" },
            { text: taskLabel },
            { text: formatShortMonthDay(note.updatedAt), type: "date" },
          ],
          color: project?.color || EMERALD,
          note,
        };
      });
  }, [notes, projects, tasks]);

  const noteCount = notes.length;
  const noteProjectCount = new Set(
    notes
      .flatMap((note) => note.taskIds)
      .map((taskId) => tasks.find((task) => task.id === taskId)?.projectId)
      .filter(Boolean)
  ).size;

  const blockCount = timeBlocks.filter(
    (block) => !block.id.startsWith("empty")
  ).length;

  if (activeSection === "stats") {
    return <HiveStatsView onBack={() => setActiveSection("overview")} />;
  }

  if (activeSection === "time-blocking") {
    return (
      <TimeBlockingScreen
        tasks={tasks}
        projects={projects}
        onScheduleTask={updateTask}
        onBack={() => setActiveSection("overview")}
      />
    );
  }

  if (activeSection === "notes") {
    return (
      <NotesFullView
        notes={notePreviews}
        onCreateNote={() => {
          setEditingNote(null);
          setActiveSection("note-editor");
        }}
        onOpenNote={(note) => {
          setEditingNote(note);
          setActiveSection("note-editor");
        }}
        onBack={() => setActiveSection("overview")}
      />
    );
  }

  if (activeSection === "note-editor") {
    return (
      <NoteEditorScreen
        initialTitle={editingNote?.title ?? ""}
        initialContent={editingNote?.content ?? ""}
        onBack={() => setActiveSection("notes")}
        onSave={async (title, content) => {
          if (editingNote) {
            await updateNote(editingNote.id, {
              title,
              content,
              taskIds: editingNote.taskIds,
            });
          } else {
            await createNote({ title, content });
          }
          setEditingNote(null);
          setActiveSection("notes");
        }}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>The Hive</Text>
          <BeeIcon active />
        </View>

        <TouchableOpacity
          activeOpacity={0.92}
          style={styles.card}
          onPress={() => setActiveSection("stats")}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.iconBadge, styles.iconHoney]}>
              <Text style={styles.iconText}>🍯</Text>
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>My Stats</Text>
              <Text style={styles.cardSubtitle}>
                {weeklyJars} jars earned this week
              </Text>
            </View>
          </View>

          <View style={styles.progressRow}>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${progressPercent}%` },
                ]}
              />
            </View>
            <Text style={styles.progressMeta}>
              {completedToday} / {dailyGoal} tasks
            </Text>
          </View>

          <View style={styles.weekRow}>
            {weeklyCells.map((cell) => (
              <View
                key={cell.key}
                style={[
                  styles.weekCell,
                  cell.active && styles.weekCellActive,
                  cell.isToday && styles.weekCellToday,
                ]}
              >
                <Text
                  style={[
                    styles.weekCellText,
                    cell.active && styles.weekCellTextActive,
                    cell.isToday && styles.weekCellTextToday,
                  ]}
                >
                  {cell.label}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statPill}>
              <Text style={styles.statValue}>{completedTasks.length}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
            <View style={styles.statPill}>
              <Text style={styles.statValue}>🍯 {totalJars}</Text>
              <Text style={styles.statLabel}>Jars total</Text>
            </View>
            <View style={styles.statPill}>
              <Text style={styles.statValue}>{streak}🔥</Text>
              <Text style={styles.statLabel}>Streak</Text>
            </View>
          </View>

          <View style={styles.linkRow}>
            <Text style={styles.linkText}>See full stats</Text>
            <Ionicons name="arrow-forward" size={16} color={INDIGO} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.92}
          style={styles.card}
          onPress={() => setActiveSection("time-blocking")}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.iconBadge, styles.iconClock]}>
              <Ionicons name="timer-outline" size={18} color={INDIGO} />
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>Time Blocking</Text>
              <Text style={styles.cardSubtitle}>
                {blockCount} blocks scheduled today
              </Text>
            </View>
          </View>

          <View style={styles.blocksList}>
            {timeBlocks.slice(0, 3).map((block) => (
              <View key={block.id} style={styles.blockRow}>
                <Text style={styles.blockHour}>{block.hourLabel}</Text>
                <View
                  style={[
                    styles.blockCard,
                    block.tone === "indigo" && styles.blockCardIndigo,
                    block.tone === "amber" && styles.blockCardAmber,
                    block.tone === "ghost" && styles.blockCardGhost,
                  ]}
                >
                  <Text
                    style={[
                      styles.blockTitle,
                      block.tone === "ghost" && styles.blockTitleGhost,
                    ]}
                  >
                    {block.title}
                  </Text>
                  <Text
                    style={[
                      styles.blockSubtitle,
                      block.tone === "indigo" && styles.blockSubtitleIndigo,
                      block.tone === "amber" && styles.blockSubtitleAmber,
                    ]}
                  >
                    {block.subtitle}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.linkRow}>
            <Text style={styles.linkText}>Open full schedule</Text>
            <Ionicons name="arrow-forward" size={16} color={INDIGO} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.92}
          style={styles.card}
          onPress={() => setActiveSection("notes")}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.iconBadge, styles.iconNotes]}>
              <Text style={styles.iconText}>📝</Text>
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>Notes</Text>
              <Text style={styles.cardSubtitle}>
                {noteCount} notes across {Math.max(noteProjectCount, noteCount ? 1 : 0)} projects
              </Text>
            </View>
          </View>

          <View style={styles.notesList}>
            {notePreviews.length === 0 ? (
              <Text style={styles.emptyNotes}>
                Create a note and it’ll surface here as a quick preview.
              </Text>
            ) : (
              notePreviews.slice(0, 3).map((note) => (
                <View key={note.id} style={styles.noteRow}>
                  <View
                    style={[styles.noteDot, { backgroundColor: note.color }]}
                  />
                  <View style={styles.noteTextWrap}>
                    <Text style={styles.noteTitle}>{note.title}</Text>
                    <NoteLabelPills labels={note.labels} />
                  </View>
                </View>
              ))
            )}
          </View>

          <View style={styles.linkRow}>
            <Text style={styles.linkText}>See all notes</Text>
            <Ionicons name="arrow-forward" size={16} color={INDIGO} />
          </View>
        </TouchableOpacity>
      </ScrollView>

      <AddTaskModal />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SURFACE,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 120,
    gap: 18,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: TEXT,
  },
  beeIconWrap: {
    width: 34,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: -4,
    borderRadius: 16,
  },
  beeIconWrapActive: {
    backgroundColor: "#FFF6DB",
    borderWidth: 1,
    borderColor: "#F1C84C",
  },
  beeWing: {
    position: "absolute",
    top: 4,
    width: 12,
    height: 15,
    borderRadius: 9,
    backgroundColor: "#E8ECFF",
    borderWidth: 1,
    borderColor: "#C9D2FF",
  },
  beeWingLeft: {
    left: 6,
    transform: [{ rotate: "-24deg" }],
  },
  beeWingRight: {
    right: 6,
    transform: [{ rotate: "24deg" }],
  },
  beeBody: {
    width: 19,
    height: 15,
    borderRadius: 10,
    backgroundColor: "#F1C84C",
    borderWidth: 1,
    borderColor: "#23243B",
    overflow: "hidden",
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "stretch",
    transform: [{ rotate: "-8deg" }],
  },
  beeStripe: {
    width: 3,
    backgroundColor: "#23243B",
  },
  beeHead: {
    position: "absolute",
    right: 7,
    top: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#23243B",
  },
  beeEye: {
    position: "absolute",
    right: 2,
    top: 2,
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: "#FFFFFF",
  },
  fullHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 6,
  },
  backPill: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#ECE8DF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  fullHeaderText: {
    flex: 1,
  },
  fullTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: TEXT,
  },
  fullSubtitle: {
    fontSize: 13,
    fontWeight: "600",
    color: MUTED,
    marginTop: 2,
  },
  fullContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },
  fullCard: {
    backgroundColor: CARD,
    borderRadius: 28,
    padding: 18,
    borderWidth: 1,
    borderColor: "#ECE8DF",
  },
  fullCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14,
  },
  fullCardHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  fullCardTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: TEXT,
    marginBottom: 4,
  },
  fullCardSubtitle: {
    fontSize: 12,
    fontWeight: "600",
    color: MUTED,
  },
  smallHoneyButton: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0,
    gap: 4,
    borderRadius: 999,
    backgroundColor: "#FFF6DB",
    borderWidth: 1,
    borderColor: "#F1C84C",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  smallHoneyButtonText: {
    fontSize: 12,
    fontWeight: "800",
    color: TEXT,
  },
  plannerHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  plannerSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "600",
    color: MUTED,
  },
  dropBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: INDIGO_SOFT,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  dropBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: INDIGO,
  },
  agendaDropZone: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E6E0D7",
    borderStyle: "dashed",
    backgroundColor: "#FBFAF7",
    padding: 12,
    gap: 10,
  },
  emptyAgenda: {
    minHeight: 140,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  emptyAgendaTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: TEXT,
    marginTop: 10,
    marginBottom: 4,
  },
  emptyAgendaText: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "600",
    color: MUTED,
    textAlign: "center",
  },
  agendaBlock: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EFEAE1",
    padding: 10,
  },
  agendaDragHandle: {
    width: 28,
    alignItems: "center",
  },
  agendaBlockText: {
    flex: 1,
    paddingHorizontal: 8,
  },
  agendaBlockTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: TEXT,
    marginBottom: 2,
  },
  agendaBlockMeta: {
    fontSize: 12,
    fontWeight: "600",
    color: MUTED,
  },
  agendaActions: {
    flexDirection: "row",
    gap: 4,
  },
  agendaIconButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F6F4EF",
    alignItems: "center",
    justifyContent: "center",
  },
  filterRow: {
    paddingTop: 12,
    gap: 8,
  },
  filterChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#F6F4EF",
    borderWidth: 1,
    borderColor: "#ECE8DF",
  },
  filterChipActive: {
    backgroundColor: TEXT,
    borderColor: TEXT,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#77716A",
    textTransform: "capitalize",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },
  taskPickerList: {
    marginTop: 16,
    gap: 12,
  },
  taskPlannerCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ECE8DF",
    backgroundColor: "#FBFAF7",
    padding: 12,
  },
  taskPlannerTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  taskPlannerText: {
    flex: 1,
  },
  taskPlannerTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: TEXT,
    marginBottom: 3,
  },
  taskPlannerMeta: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "600",
    color: MUTED,
    textTransform: "capitalize",
  },
  addBlockButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    backgroundColor: INDIGO,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  addBlockText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  durationRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 12,
  },
  durationChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E6E0D7",
  },
  durationChipActive: {
    backgroundColor: AMBER_SOFT,
    borderColor: AMBER,
  },
  durationText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#77716A",
  },
  durationTextActive: {
    color: "#C15A00",
  },
  card: {
    backgroundColor: CARD,
    borderRadius: 28,
    padding: 18,
    borderWidth: 1,
    borderColor: "#ECE8DF",
    shadowColor: "#221F38",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  iconBadge: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  iconHoney: {
    backgroundColor: "#FFF6DB",
  },
  iconClock: {
    backgroundColor: "#EEF1FF",
  },
  iconNotes: {
    backgroundColor: "#E8FBF4",
  },
  iconText: {
    fontSize: 22,
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: TEXT,
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 13,
    fontWeight: "600",
    color: MUTED,
  },
  callout: {
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: "#FFF8EA",
    marginBottom: 14,
  },
  calloutTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#C15A00",
    marginBottom: 3,
  },
  calloutSubtitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#D97706",
  },
  progressRow: {
    marginBottom: 14,
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "#E9E7E2",
    overflow: "hidden",
    marginBottom: 7,
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: INDIGO,
  },
  progressMeta: {
    fontSize: 13,
    fontWeight: "700",
    color: "#9A9690",
    textAlign: "right",
  },
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  weekCell: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F4F2EE",
  },
  weekCellActive: {
    backgroundColor: INDIGO,
  },
  weekCellToday: {
    borderWidth: 1.5,
    borderColor: INDIGO,
    backgroundColor: "#FFF6DB",
  },
  weekCellText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#C2BBB0",
  },
  weekCellTextActive: {
    color: "#FFFFFF",
  },
  weekCellTextToday: {
    color: TEXT,
    fontWeight: "900",
  },
  statsGrid: {
    flexDirection: "row",
    gap: 10,
  },
  statPill: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: "#F6F7FC",
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    fontSize: 19,
    fontWeight: "800",
    color: TEXT,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: MUTED,
  },
  blocksList: {
    gap: 10,
  },
  blockRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  blockHour: {
    width: 48,
    fontSize: 12,
    fontWeight: "700",
    color: "#B4AEA7",
    paddingTop: 10,
  },
  blockCard: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderLeftWidth: 3,
  },
  blockCardIndigo: {
    backgroundColor: INDIGO_SOFT,
    borderLeftColor: INDIGO,
  },
  blockCardAmber: {
    backgroundColor: AMBER_SOFT,
    borderLeftColor: AMBER,
  },
  blockCardGhost: {
    backgroundColor: "#FAF9F7",
    borderLeftColor: "#D6D3D1",
    borderStyle: "dashed",
    borderWidth: 1,
  },
  blockTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: TEXT,
    marginBottom: 2,
  },
  blockTitleGhost: {
    color: "#C0BBB4",
  },
  blockSubtitle: {
    fontSize: 12,
    fontWeight: "600",
    color: MUTED,
  },
  blockSubtitleIndigo: {
    color: INDIGO,
  },
  blockSubtitleAmber: {
    color: "#C15A00",
  },
  linkRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6,
  },
  linkText: {
    fontSize: 14,
    fontWeight: "700",
    color: INDIGO,
  },
  notesList: {
    gap: 14,
  },
  noteRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  noteDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    marginTop: 6,
    marginRight: 12,
  },
  noteTextWrap: {
    flex: 1,
  },
  noteTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: TEXT,
    marginBottom: 7,
  },
  notePillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  noteInfoPill: {
    flexDirection: "row",
    alignItems: "center",
    maxWidth: 120,
    borderRadius: 999,
    backgroundColor: "#F7F7FA",
    borderWidth: 1,
    borderColor: "#ECECF0",
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  noteInfoPillText: {
    fontSize: 11,
    fontWeight: "800",
    color: MUTED,
  },
  noteDatePill: {
    backgroundColor: "#e5e7eb",
    borderWidth: 0,
  },
  noteDateIcon: {
    fontSize: 11,
    marginRight: 2,
  },
  noteDatePillText: {
    fontSize: 11,
    color: "#4b5563",
    fontWeight: "500",
  },
  emptyNotes: {
    fontSize: 13,
    lineHeight: 20,
    color: MUTED,
  },
});
