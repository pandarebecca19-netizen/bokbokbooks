"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect } from "react";
import { Toggle, ToggleSummary, ToggleContent } from "../../lib/tiptapToggle";

// Old notes were saved as plain text. New notes are saved as a
// JSON string (Tiptap/ProseMirror document). This turns either form
// into the JSON the editor expects, so nothing written before is lost.
function toDoc(raw) {
  if (!raw) return { type: "doc", content: [{ type: "paragraph" }] };
  try {
    const parsed = JSON.parse(raw);
    if (parsed && parsed.type === "doc") return parsed;
  } catch (e) {
    // not JSON — treat as legacy plain text
  }
  const paragraphs = String(raw)
    .split("\n")
    .map((line) => ({
      type: "paragraph",
      content: line ? [{ type: "text", text: line }] : [],
    }));
  return { type: "doc", content: paragraphs.length ? paragraphs : [{ type: "paragraph" }] };
}

function ToolbarButton({ onClick, active, label, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={`px-2.5 py-1.5 rounded-md text-sm transition ${
        active ? "bg-rose-100 text-ink" : "text-muted hover:bg-rose-50"
      }`}
    >
      {children}
    </button>
  );
}

export default function NoteEditor({ value, onChange }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Placeholder.configure({ placeholder: "책에 대해 정리해보세요" }),
      Toggle,
      ToggleSummary,
      ToggleContent,
    ],
    content: toDoc(value),
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "note-editor-content focus:outline-none",
      },
    },
    onUpdate: ({ editor }) => {
      onChange(JSON.stringify(editor.getJSON()));
    },
  });

  // keep the editor in sync if a different book's note is loaded
  useEffect(() => {
    if (!editor) return;
    const current = JSON.stringify(editor.getJSON());
    const next = JSON.stringify(toDoc(value));
    if (current !== next) {
      editor.commands.setContent(toDoc(value));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  if (!editor) return null;

  return (
    <div>
      <style>{`
        .note-editor-content { min-height: 50vh; font-size: 0.95rem; line-height: 1.9; color: #3A2E2B; }
        .note-editor-content p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          color: #B9ADA5;
          float: left;
          height: 0;
          pointer-events: none;
        }
        .note-editor-content ul { list-style: disc; padding-left: 1.4em; margin: 0.4em 0; }
        .note-editor-content p { margin: 0.35em 0; }
        .toggle-block { display: flex; align-items: flex-start; gap: 8px; margin: 0.85em 0; position: relative; }
        .toggle-arrow { background: transparent; border: none; color: #8B7873; cursor: pointer; font-size: 1.1rem; line-height: 1.9; padding: 0 3px; flex-shrink: 0; }
        .toggle-inner { flex: 1; min-width: 0; }
        [data-type="toggle-summary"] { font-weight: 700; font-size: 1.05em; }
        [data-type="toggle-content"] { margin-top: 4px; padding-left: 2px; }
        [data-type="toggle-content"] p { margin: 0.35em 0; }
        .toggle-block[data-open="false"] [data-type="toggle-content"] { display: none; }
        .toggle-delete { background: transparent; border: none; color: #C9B9B2; cursor: pointer; font-size: 0.8rem; padding: 2px 6px; flex-shrink: 0; opacity: 0; transition: opacity 0.15s ease; }
        .toggle-block:hover .toggle-delete { opacity: 1; }
        .toggle-delete:hover { color: #C97B77; }
      `}</style>

      <div className="flex gap-1 mb-3 border-b border-rose-100 pb-2 flex-wrap">
        <ToolbarButton
          label="굵게"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <strong>B</strong>
        </ToolbarButton>
        <ToolbarButton
          label="불릿 리스트"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          • 목록
        </ToolbarButton>
        <ToolbarButton label="토글" onClick={() => editor.chain().focus().setToggle().run()}>
          ▸ 토글
        </ToolbarButton>
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}
