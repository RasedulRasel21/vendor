"use client";

import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

type ToolbarButtonProps = {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
};

function ToolbarButton({ label, active, disabled, onClick, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      // Keep the text selection while clicking the toolbar.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={`flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm font-medium disabled:opacity-40 ${
        active ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-100"
      }`}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor | null }) {
  const state = useEditorState({
    editor,
    selector: ({ editor: current }) =>
      current
        ? {
            bold: current.isActive("bold"),
            italic: current.isActive("italic"),
            underline: current.isActive("underline"),
            heading2: current.isActive("heading", { level: 2 }),
            heading3: current.isActive("heading", { level: 3 }),
            bulletList: current.isActive("bulletList"),
            orderedList: current.isActive("orderedList"),
            blockquote: current.isActive("blockquote"),
            link: current.isActive("link"),
            canUndo: current.can().undo(),
            canRedo: current.can().redo(),
          }
        : null,
  });

  const setLink = () => {
    if (!editor) return;
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link address", previous ?? "https://");
    if (url === null) return;

    const chain = editor.chain().focus().extendMarkRange("link");
    if (url.trim()) chain.setLink({ href: url.trim() }).run();
    else chain.unsetLink().run();
  };

  const disabled = !editor;

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-zinc-200 px-1.5 py-1">
      <ToolbarButton label="Bold" active={state?.bold} disabled={disabled} onClick={() => editor?.chain().focus().toggleBold().run()}>
        <span className="font-bold">B</span>
      </ToolbarButton>
      <ToolbarButton label="Italic" active={state?.italic} disabled={disabled} onClick={() => editor?.chain().focus().toggleItalic().run()}>
        <span className="italic">I</span>
      </ToolbarButton>
      <ToolbarButton label="Underline" active={state?.underline} disabled={disabled} onClick={() => editor?.chain().focus().toggleUnderline().run()}>
        <span className="underline">U</span>
      </ToolbarButton>
      <span className="mx-1 h-5 w-px bg-zinc-200" />
      <ToolbarButton label="Heading" active={state?.heading2} disabled={disabled} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}>
        H2
      </ToolbarButton>
      <ToolbarButton label="Subheading" active={state?.heading3} disabled={disabled} onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}>
        H3
      </ToolbarButton>
      <ToolbarButton label="Bulleted list" active={state?.bulletList} disabled={disabled} onClick={() => editor?.chain().focus().toggleBulletList().run()}>
        • List
      </ToolbarButton>
      <ToolbarButton label="Numbered list" active={state?.orderedList} disabled={disabled} onClick={() => editor?.chain().focus().toggleOrderedList().run()}>
        1. List
      </ToolbarButton>
      <ToolbarButton label="Quote" active={state?.blockquote} disabled={disabled} onClick={() => editor?.chain().focus().toggleBlockquote().run()}>
        Quote
      </ToolbarButton>
      <ToolbarButton label="Link" active={state?.link} disabled={disabled} onClick={setLink}>
        Link
      </ToolbarButton>
      <span className="mx-1 h-5 w-px bg-zinc-200" />
      <ToolbarButton label="Undo" disabled={disabled || !state?.canUndo} onClick={() => editor?.chain().focus().undo().run()}>
        ↶
      </ToolbarButton>
      <ToolbarButton label="Redo" disabled={disabled || !state?.canRedo} onClick={() => editor?.chain().focus().redo().run()}>
        ↷
      </ToolbarButton>
    </div>
  );
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  labelledBy,
  invalid,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  labelledBy?: string;
  invalid?: boolean;
}) {
  const editor = useEditor({
    // Render on the client only, so server and browser HTML match.
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: { openOnClick: false, autolink: true, defaultProtocol: "https" },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: "product-description min-h-44 px-3 py-2 text-sm text-zinc-900 outline-none",
        ...(labelledBy ? { "aria-labelledby": labelledBy } : {}),
      },
    },
    onUpdate: ({ editor: current }) => onChange(current.isEmpty ? "" : current.getHTML()),
  });

  return (
    <div
      className={`overflow-hidden rounded-lg border bg-white shadow-sm focus-within:border-zinc-900 focus-within:ring-2 focus-within:ring-zinc-900/10 ${
        invalid ? "border-red-500" : "border-zinc-300"
      }`}
    >
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
