"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect, useRef, useState } from "react";
import { Toggle, ToggleSummary, ToggleContent } from "../../lib/tiptapToggle";
import { toDoc } from "../../lib/noteContent";

// 브라우저 자체 음성인식(Web Speech API) — 크롬 계열에서 잘 되고, 사파리/인앱
// 브라우저 등 지원하지 않는 곳에서는 버튼 자체를 숨긴다.
function useSpeechRecognition(editor) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);
  const supported =
    typeof window !== "undefined" && !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  const toggleListening = () => {
    if (!supported || !editor) return;

    if (listening) {
      recognitionRef.current?.stop();
      return;
    }

    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "ko-KR";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let finalTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
        editor.chain().focus().insertContent(`${finalTranscript} `).run();
      }
    };

    recognition.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        alert("마이크 권한을 허용해주세요.");
      }
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  };

  useEffect(() => {
    return () => recognitionRef.current?.stop();
  }, []);

  return { supported, listening, toggleListening };
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
      StarterKit.configure({
        heading: { levels: [2, 3] },
        // links auto-detect on paste/typing, open in a new tab on click
        link: {
          openOnClick: true,
          autolink: true,
          linkOnPaste: true,
          HTMLAttributes: { target: "_blank", rel: "noopener noreferrer nofollow" },
        },
      }),
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
        spellcheck: "false",
      },
    },
    // 맞춤법 빨간 줄은 실제로 입력 중일 때만 보이고, 다른 곳을 누르면(포커스를
    // 벗어나면) 바로 사라지도록 — 안 쓰는 부분까지 빨간 줄 투성이로 보이지 않게.
    onFocus: ({ editor }) => {
      editor.view.dom.setAttribute("spellcheck", "true");
    },
    onBlur: ({ editor }) => {
      editor.view.dom.setAttribute("spellcheck", "false");
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

  const { supported: speechSupported, listening, toggleListening } = useSpeechRecognition(editor);

  if (!editor) return null;

  const setLink = () => {
    const previous = editor.getAttributes("link").href;
    const url = window.prompt("링크 주소를 입력하세요", previous || "https://");
    if (url === null) return; // cancelled
    if (url.trim() === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    const href = url.trim();
    if (editor.state.selection.empty) {
      editor
        .chain()
        .focus()
        .insertContent({ type: "text", text: href, marks: [{ type: "link", attrs: { href } }] })
        .run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    }
  };

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
        /* show links as a compact "🔗 링크" chip instead of the full URL */
        .note-editor-content a { font-size: 0; text-decoration: none; cursor: pointer; }
        .note-editor-content a::before {
          content: "🔗 링크";
          font-size: 0.82rem;
          background: #F9E3DF;
          color: #B36560;
          padding: 1px 9px;
          border-radius: 9999px;
          white-space: nowrap;
        }
        .note-editor-content a:hover::before { background: #F3C3AC; }
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
        <ToolbarButton label="링크" active={editor.isActive("link")} onClick={setLink}>
          🔗 링크
        </ToolbarButton>
        {speechSupported && (
          <ToolbarButton
            label={listening ? "음성 입력 중지" : "음성으로 입력"}
            active={listening}
            onClick={toggleListening}
          >
            {listening ? "🔴 듣는 중…" : "🎤 음성 입력"}
          </ToolbarButton>
        )}
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}
