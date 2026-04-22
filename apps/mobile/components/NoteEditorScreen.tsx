import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView, WebViewMessageEvent } from "react-native-webview";

const CREAM = "#F4F4F7";
const CARD = "#FFFFFF";
const INK = "#1A1A24";
const MUTED = "#8A8D96";
const LINE = "#E5E0D8";
const HONEY = "#F1C84C";

const COLOR_CHOICES = ["#FACC15", "#4ADE80", "#60A5FA", "#FB7185", "#A855F7", "#F97316"];

type FormatAction =
  | "bold"
  | "italic"
  | "underline"
  | "strikeThrough"
  | "h1"
  | "h2"
  | "unorderedList"
  | "orderedList"
  | "quote";

type NoteEditorProps = {
  initialTitle?: string;
  initialContent?: string;
  initialColor?: string;
  initialCategory?: string;
  onBack: () => void;
  onSave: (title: string, content: string) => Promise<void> | void;
  onDelete?: () => void;
  onColorChange?: (color: string) => void;
  onCategoryChange?: (category: string) => void;
};

const createEditorHtml = (initialContent: string) => {
  const serializedContent = JSON.stringify(initialContent);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <style>
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      min-height: 100%;
      background: ${CARD};
      color: ${INK};
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      -webkit-text-size-adjust: none;
    }
    #editor {
      min-height: 100vh;
      padding: 16px;
      outline: none;
      font-size: 16px;
      line-height: 1.55;
      caret-color: ${HONEY};
      word-break: break-word;
    }
    #editor:empty:before {
      content: attr(data-placeholder);
      color: ${MUTED};
      pointer-events: none;
    }
    h1 { font-size: 26px; line-height: 1.2; margin: 8px 0 12px; }
    h2 { font-size: 22px; line-height: 1.25; margin: 8px 0 10px; }
    ul, ol { padding-left: 24px; }
    blockquote {
      margin: 10px 0;
      padding: 10px 12px;
      border-left: 4px solid ${HONEY};
      background: #FFF6DB;
      border-radius: 10px;
    }
  </style>
</head>
<body>
  <div id="editor" contenteditable="true" data-placeholder="Start typing your note..."></div>
  <script>
    const editor = document.getElementById('editor');
    const initialContent = ${serializedContent};
    editor.innerHTML = initialContent || '';
    let sendTimer = null;

    function post(type, data) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type, data }));
    }

    function sendContentSoon() {
      clearTimeout(sendTimer);
      sendTimer = setTimeout(() => post('content', editor.innerHTML), 250);
    }

    function focusEditor() {
      editor.focus();
      const range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    }

    function runCommand(command) {
      editor.focus();
      if (command === 'h1') document.execCommand('formatBlock', false, '<h1>');
      else if (command === 'h2') document.execCommand('formatBlock', false, '<h2>');
      else if (command === 'quote') document.execCommand('formatBlock', false, '<blockquote>');
      else if (command === 'unorderedList') document.execCommand('insertUnorderedList', false, null);
      else if (command === 'orderedList') document.execCommand('insertOrderedList', false, null);
      else document.execCommand(command, false, null);
      sendContentSoon();
    }

    document.addEventListener('message', event => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'command') runCommand(message.command);
        if (message.type === 'getContent') post('saveContent', editor.innerHTML);
      } catch (error) {}
    });
    window.addEventListener('message', event => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'command') runCommand(message.command);
        if (message.type === 'getContent') post('saveContent', editor.innerHTML);
      } catch (error) {}
    });

    editor.addEventListener('input', sendContentSoon);
    setTimeout(() => post('ready', editor.innerHTML), 50);
  </script>
</body>
</html>
`;
};

export default function NoteEditorScreen({
  initialTitle = "",
  initialContent = "",
  initialColor,
  initialCategory = "",
  onBack,
  onSave,
  onDelete,
  onColorChange,
  onCategoryChange,
}: NoteEditorProps) {
  const webViewRef = useRef<WebView>(null);
  const contentRef = useRef(initialContent);
  const pendingSaveRef = useRef(false);
  const [title, setTitle] = useState(initialTitle);
  const [saving, setSaving] = useState(false);
  const editorHtml = useMemo(() => createEditorHtml(initialContent), [initialContent]);

  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showColorModal, setShowColorModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [noteColor, setNoteColor] = useState(initialColor ?? COLOR_CHOICES[0]);
  const [category, setCategory] = useState(initialCategory);
  const [categoryDraft, setCategoryDraft] = useState(initialCategory);

  const handleColorSelect = (color: string) => {
    setNoteColor(color);
    onColorChange?.(color);
    setShowColorModal(false);
  };

  const handleCategorySave = () => {
    setCategory(categoryDraft.trim());
    onCategoryChange?.(categoryDraft.trim());
    setShowCategoryModal(false);
  };

  const handleDelete = () => {
    setShowActionsMenu(false);
    Alert.alert(
      "Delete note?",
      "This will permanently delete this note. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => onDelete?.() },
      ]
    );
  };

  const postToEditor = (message: Record<string, unknown>) => {
    webViewRef.current?.postMessage(JSON.stringify(message));
  };

  const runFormat = (command: FormatAction) => {
    postToEditor({ type: "command", command });
  };

  const persistNote = async (content: string) => {
    try {
      await onSave(title.trim(), content);
    } catch (error) {
      console.error("Failed to save note:", error);
    } finally {
      pendingSaveRef.current = false;
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim() || saving) return;
    setSaving(true);
    pendingSaveRef.current = true;
    postToEditor({ type: "getContent" });

    setTimeout(() => {
      if (pendingSaveRef.current) {
        persistNote(contentRef.current);
      }
    }, 500);
  };

  const handleEditorMessage = (event: WebViewMessageEvent) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      if (message.type === "content" || message.type === "ready") {
        contentRef.current = message.data ?? "";
      }
      if (message.type === "saveContent") {
        contentRef.current = message.data ?? "";
        persistNote(contentRef.current);
      }
    } catch (error) {
      console.error("Note editor message error:", error);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconButton} onPress={onBack}>
            <Ionicons name="arrow-back" size={20} color={INK} />
          </TouchableOpacity>

          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Notes</Text>
            {category ? (
              <Text style={styles.categoryTag}>{category}</Text>
            ) : null}
          </View>

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>{saving ? "Saving" : "Save"}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuPill}
            onPress={() => setShowActionsMenu(true)}
          >
            <Text style={styles.menuPillText}>•••</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.editorShell}>
          <TextInput
            style={styles.titleInput}
            placeholder="Note Title"
            placeholderTextColor={MUTED}
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />

          <View style={styles.webEditorCard}>
            <WebView
              ref={webViewRef}
              originWhitelist={["*"]}
              source={{ html: editorHtml }}
              onMessage={handleEditorMessage}
              javaScriptEnabled
              domStorageEnabled
              keyboardDisplayRequiresUserAction={false}
              hideKeyboardAccessoryView
              scrollEnabled
              androidLayerType="software"
              style={styles.webEditor}
            />
          </View>

          <Text style={styles.editorHint}>
            Format your notes with headings, lists, quotes, and emphasis.
          </Text>
        </View>

        <View style={styles.toolbar}>
          <ToolbarButton label="B" onPress={() => runFormat("bold")} />
          <ToolbarButton label="I" onPress={() => runFormat("italic")} italic />
          <ToolbarButton label="U" onPress={() => runFormat("underline")} underline />
          <ToolbarButton label="S" onPress={() => runFormat("strikeThrough")} strike />
          <ToolbarButton label="H1" onPress={() => runFormat("h1")} />
          <ToolbarButton label="H2" onPress={() => runFormat("h2")} />
          <ToolbarButton icon="list" onPress={() => runFormat("unorderedList")} />
          <ToolbarButton icon="list-outline" onPress={() => runFormat("orderedList")} />
          <ToolbarButton icon="chatbox-ellipses-outline" onPress={() => runFormat("quote")} />
        </View>
      </KeyboardAvoidingView>

      {/* ACTIONS MENU (popover) */}
      <Modal transparent visible={showActionsMenu} animationType="fade">
        <TouchableOpacity
          style={styles.popoverBackdrop}
          activeOpacity={1}
          onPress={() => setShowActionsMenu(false)}
        >
          <View style={styles.popoverCard}>
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => { setShowActionsMenu(false); setShowColorModal(true); }}
            >
              <View style={[styles.colorDot, { backgroundColor: noteColor }]} />
              <Text style={styles.actionRowText}>Change Color</Text>
            </TouchableOpacity>

            <View style={styles.actionSeparator} />

            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => { setShowActionsMenu(false); setCategoryDraft(category); setShowCategoryModal(true); }}
            >
              <Ionicons name="pricetag-outline" size={15} color={INK} style={{ marginRight: 8 }} />
              <Text style={styles.actionRowText}>Category</Text>
            </TouchableOpacity>

            <View style={styles.actionSeparator} />

            <TouchableOpacity style={styles.actionRow} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={15} color="#ef4444" style={{ marginRight: 8 }} />
              <Text style={[styles.actionRowText, { color: "#ef4444" }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* COLOR PICKER MODAL */}
      <Modal transparent visible={showColorModal} animationType="fade">
        <View style={styles.modalOuter}>
          <TouchableOpacity style={styles.modalDismiss} onPress={() => setShowColorModal(false)} />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Note Color</Text>
            <View style={styles.colorRow}>
              {COLOR_CHOICES.map((color) => (
                <TouchableOpacity
                  key={color}
                  onPress={() => handleColorSelect(color)}
                  style={[
                    styles.colorCircle,
                    { backgroundColor: color },
                    noteColor === color && styles.colorCircleActive,
                  ]}
                />
              ))}
            </View>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setShowColorModal(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* CATEGORY MODAL */}
      <Modal transparent visible={showCategoryModal} animationType="fade">
        <View style={styles.modalOuter}>
          <TouchableOpacity style={styles.modalDismiss} onPress={() => setShowCategoryModal(false)} />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Category</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. personal, work, ideas"
              placeholderTextColor={MUTED}
              value={categoryDraft}
              onChangeText={setCategoryDraft}
              autoFocus
              maxLength={40}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowCategoryModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmButton} onPress={handleCategorySave}>
                <Text style={styles.confirmText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function ToolbarButton({
  label,
  icon,
  italic,
  underline,
  strike,
  onPress,
}: {
  label?: string;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.toolbarButton} onPress={onPress}>
      {icon ? (
        <Ionicons name={icon} size={17} color={INK} />
      ) : (
        <Text
          style={[
            styles.toolbarButtonText,
            italic && styles.italicText,
            underline && styles.underlineText,
            strike && styles.strikeText,
          ]}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: CREAM,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: LINE,
  },
  headerText: {
    flex: 1,
    paddingHorizontal: 12,
  },
  appName: {
    fontSize: 13,
    fontWeight: "600",
    color: MUTED,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: INK,
  },
  saveButton: {
    height: 38,
    backgroundColor: HONEY,
    paddingHorizontal: 16,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: INK,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 13,
    fontWeight: "800",
    color: INK,
  },
  editorShell: {
    flex: 1,
    paddingHorizontal: 16,
  },
  titleInput: {
    fontSize: 28,
    fontWeight: "900",
    color: INK,
    marginTop: 16,
    marginBottom: 12,
    paddingVertical: 10,
  },
  webEditorCard: {
    flex: 1,
    minHeight: 420,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 22,
    overflow: "hidden",
  },
  webEditor: {
    flex: 1,
    backgroundColor: CARD,
  },
  editorHint: {
    fontSize: 12,
    fontWeight: "600",
    color: MUTED,
    marginTop: 8,
    marginBottom: 10,
  },
  toolbar: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: CARD,
    borderTopWidth: 1,
    borderTopColor: LINE,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  toolbarButton: {
    minWidth: 33,
    height: 34,
    borderRadius: 12,
    backgroundColor: "#FFF6DB",
    borderWidth: 1,
    borderColor: "#F1C84C",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  toolbarButtonText: {
    fontSize: 13,
    fontWeight: "900",
    color: INK,
  },
  italicText: {
    fontStyle: "italic",
  },
  underlineText: {
    textDecorationLine: "underline",
  },
  strikeText: {
    textDecorationLine: "line-through",
  },
  categoryTag: {
    fontSize: 11,
    fontWeight: "600",
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 2,
  },
  menuPill: {
    marginLeft: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: INK,
    minWidth: 48,
    alignItems: "center",
  },
  menuPillText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginTop: -2,
  },
  popoverBackdrop: {
    flex: 1,
  },
  popoverCard: {
    position: "absolute",
    top: 90,
    right: 16,
    width: 180,
    backgroundColor: CARD,
    borderRadius: 16,
    paddingVertical: 6,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  actionRowText: {
    fontSize: 15,
    fontWeight: "600",
    color: INK,
  },
  actionSeparator: {
    height: 1,
    backgroundColor: LINE,
    marginHorizontal: 12,
  },
  colorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 8,
  },
  modalOuter: {
    flex: 1,
    backgroundColor: "rgba(15,15,20,0.35)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  modalDismiss: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    backgroundColor: CARD,
    borderRadius: 24,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: INK,
    marginBottom: 14,
  },
  colorRow: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
    marginBottom: 16,
  },
  colorCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  colorCircleActive: {
    borderWidth: 3,
    borderColor: INK,
  },
  modalInput: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: LINE,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: CREAM,
    fontSize: 15,
    color: INK,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: "#f3f3f5",
  },
  cancelText: {
    fontSize: 14,
    color: "#555",
  },
  confirmButton: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: HONEY,
  },
  confirmText: {
    fontSize: 14,
    fontWeight: "700",
    color: INK,
  },
});
