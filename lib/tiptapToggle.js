"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { Plugin, TextSelection } from "@tiptap/pm/state";

// Deleting a node that is the ENTIRE document leaves the doc empty,
// which the schema forbids — ProseMirror would otherwise just silently
// ignore that transaction. So instead of a plain delete, we replace the
// toggle with an empty paragraph whenever it's the only content,
// guaranteeing the deletion always visibly succeeds.
function removeToggleSafely(editor, from, to) {
  editor.view.dispatch(
    (() => {
      const { state } = editor;
      const tr = state.tr;
      const wouldEmptyDoc = from === 0 && to === state.doc.content.size;
      if (wouldEmptyDoc) {
        tr.replaceWith(from, to, state.schema.nodes.paragraph.create());
      } else {
        tr.delete(from, to);
      }
      return tr;
    })()
  );
}

// Handles Backspace at two special spots. Returns true if it handled
// (and already dispatched) something, false if normal Backspace should
// proceed as usual.
function tryBackspaceEscape(editor) {
  const { state } = editor;
  const { selection } = state;
  const { $from, empty } = selection;
  if (!empty) return false;

  // cursor at the very start of the toggle's title -> delete the whole toggle
  if ($from.parent.type.name === "toggleSummary" && $from.parentOffset === 0) {
    const toggleDepth = $from.depth - 1;
    if (toggleDepth < 0) return false;
    const toggleNode = $from.node(toggleDepth);
    if (!toggleNode || toggleNode.type.name !== "toggle") return false;

    const from = $from.before(toggleDepth);
    const to = from + toggleNode.nodeSize;
    removeToggleSafely(editor, from, to);
    return true;
  }

  // cursor at the very start of the first line inside the toggle's
  // (indented) content -> un-indent that line out, exiting the toggle
  if ($from.parent.type.name === "paragraph" && $from.parentOffset === 0) {
    const paraDepth = $from.depth;
    const contentDepth = paraDepth - 1;
    if (contentDepth < 0) return false;
    const contentNode = $from.node(contentDepth);
    if (!contentNode || contentNode.type.name !== "toggleContent") return false;
    if ($from.index(contentDepth) !== 0) return false; // only the first line

    const toggleDepth = contentDepth - 1;
    if (toggleDepth < 0) return false;
    const toggleNode = $from.node(toggleDepth);
    if (!toggleNode || toggleNode.type.name !== "toggle") return false;

    const paragraph = $from.parent;
    const paraStart = $from.before(paraDepth);
    const paraEnd = paraStart + paragraph.nodeSize;
    const afterTogglePos = $from.after(toggleDepth);
    const isOnlyLine = contentNode.childCount === 1;

    const tr = state.tr;
    const placeholder = state.schema.nodes.paragraph.create();
    if (isOnlyLine) {
      tr.replaceWith(paraStart, paraEnd, placeholder);
    } else {
      tr.delete(paraStart, paraEnd);
    }
    const sizeDelta = isOnlyLine ? placeholder.nodeSize - paragraph.nodeSize : -paragraph.nodeSize;
    const insertPos = afterTogglePos + sizeDelta;
    const lifted = paragraph.type.create(paragraph.attrs, paragraph.content, paragraph.marks);
    tr.insert(insertPos, lifted);
    tr.setSelection(TextSelection.near(tr.doc.resolve(insertPos + 1)));
    editor.view.dispatch(tr);
    return true;
  }

  return false;
}

// The line always visible, even when collapsed (the toggle's "title")
export const ToggleSummary = Node.create({
  name: "toggleSummary",
  content: "inline*",
  defining: true,
  isolating: true,
  parseHTML() {
    return [{ tag: 'div[data-type="toggle-summary"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "toggle-summary" }), 0];
  },
});

// The part that hides/shows when the toggle is collapsed/expanded
export const ToggleContent = Node.create({
  name: "toggleContent",
  content: "block+",
  defining: true,
  isolating: true,
  parseHTML() {
    return [{ tag: 'div[data-type="toggle-content"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "toggle-content" }), 0];
  },
});

export const Toggle = Node.create({
  name: "toggle",
  group: "block",
  content: "toggleSummary toggleContent",
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      open: {
        default: true,
        parseHTML: (el) => el.getAttribute("data-open") !== "false",
        renderHTML: (attrs) => ({ "data-open": attrs.open ? "true" : "false" }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="toggle"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "toggle" }), 0];
  },

  // Plain DOM node view — no React involved, so clicks/edits/keys inside
  // the toggle behave predictably instead of fighting ProseMirror's own
  // event handling.
  addNodeView() {
    return ({ node, editor, getPos }) => {
      const dom = document.createElement("div");
      dom.className = "toggle-block";
      dom.setAttribute("data-open", node.attrs.open ? "true" : "false");

      const arrow = document.createElement("button");
      arrow.type = "button";
      arrow.contentEditable = "false";
      arrow.className = "toggle-arrow";
      arrow.setAttribute("aria-label", "토글 접기/펼치기");
      arrow.textContent = node.attrs.open ? "▾" : "▸";

      arrow.addEventListener("mousedown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const pos = typeof getPos === "function" ? getPos() : null;
        if (pos == null) return;
        const currentNode = editor.state.doc.nodeAt(pos);
        if (!currentNode) return;
        editor.view.dispatch(
          editor.state.tr.setNodeMarkup(pos, undefined, {
            ...currentNode.attrs,
            open: !currentNode.attrs.open,
          })
        );
      });

      const inner = document.createElement("div");
      inner.className = "toggle-inner";

      // Capture phase so this runs before ProseMirror's own keydown
      // handling on the editor root — this is what makes Backspace
      // reliably escape the toggle instead of doing nothing.
      inner.addEventListener(
        "keydown",
        (e) => {
          if (e.key !== "Backspace") return;
          const handled = tryBackspaceEscape(editor);
          if (handled) {
            e.preventDefault();
            e.stopPropagation();
          }
        },
        true
      );

      const del = document.createElement("button");
      del.type = "button";
      del.contentEditable = "false";
      del.className = "toggle-delete";
      del.title = "토글 삭제";
      del.setAttribute("aria-label", "토글 삭제");
      del.textContent = "✕";
      del.addEventListener("mousedown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const pos = typeof getPos === "function" ? getPos() : null;
        if (pos == null) return;
        const currentNode = editor.state.doc.nodeAt(pos);
        if (!currentNode) return;
        removeToggleSafely(editor, pos, pos + currentNode.nodeSize);
      });

      dom.append(arrow, inner, del);

      return {
        dom,
        contentDOM: inner,
        update: (updatedNode) => {
          if (updatedNode.type.name !== "toggle") return false;
          dom.setAttribute("data-open", updatedNode.attrs.open ? "true" : "false");
          arrow.textContent = updatedNode.attrs.open ? "▾" : "▸";
          return true;
        },
      };
    };
  },

  addKeyboardShortcuts() {
    return {
      Backspace: ({ editor }) => tryBackspaceEscape(editor),
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        appendTransaction: (transactions, oldState, newState) => {
          const changed = transactions.some((tr) => tr.docChanged);
          if (!changed) return null;
          if (newState.doc.lastChild?.type.name !== "toggle") return null;
          return newState.tr.insert(newState.doc.content.size, newState.schema.nodes.paragraph.create());
        },
      }),
    ];
  },

  addCommands() {
    return {
      // Inserts a toggle as a sibling right after whatever block the cursor
      // is currently in — at the doc root, or (crucially) inside another
      // toggle's content, so toggles can nest more than one level deep.
      // Uses an explicit tr.insert at a position we compute ourselves,
      // rather than the generic insertContent command, since that command's
      // "find a valid spot" fallback can misjudge the depth once there are
      // two isolating toggle/toggleContent boundaries stacked on top of
      // each other (nested toggles) and silently insert in the wrong place.
      setToggle:
        () =>
        ({ tr, state, dispatch }) => {
          const { schema, selection } = state;
          const $from = selection.$from;

          let depth = $from.depth;
          while (depth > 0 && $from.node(depth).type.name !== "toggleContent") {
            depth -= 1;
          }
          const insertPos = depth === 0 ? $from.after(1) : $from.after(depth + 1);

          const toggleNode = schema.nodes.toggle.create({ open: true }, [
            schema.nodes.toggleSummary.create(null, schema.text("토글 제목")),
            schema.nodes.toggleContent.create(null, schema.nodes.paragraph.create()),
          ]);

          if (dispatch) {
            tr.insert(insertPos, toggleNode);
            dispatch(tr);
          }
          return true;
        },
    };
  },
});
