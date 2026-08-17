import { generateHTML } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Toggle, ToggleSummary, ToggleContent } from "./tiptapToggle";

const NOTE_EXTENSIONS = [
  StarterKit.configure({
    heading: { levels: [2, 3] },
    link: {
      openOnClick: true,
      autolink: true,
      linkOnPaste: true,
      HTMLAttributes: { target: "_blank", rel: "noopener noreferrer nofollow" },
    },
  }),
  Toggle,
  ToggleSummary,
  ToggleContent,
];

// Old notes were saved as plain text. New notes are saved as a
// JSON string (Tiptap/ProseMirror document). This turns either form
// into the JSON the editor expects, so nothing written before is lost.
export function toDoc(raw) {
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

// Static HTML rendering of a saved note, for printing (no live editor needed).
export function noteToHtml(raw) {
  return generateHTML(toDoc(raw), NOTE_EXTENSIONS);
}
