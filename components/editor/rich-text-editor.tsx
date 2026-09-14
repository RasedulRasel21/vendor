"use client";

import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { TableKit } from "@tiptap/extension-table";
import TextAlign from "@tiptap/extension-text-align";
import { Color, TextStyle } from "@tiptap/extension-text-style";
import Youtube, { isValidYoutubeUrl } from "@tiptap/extension-youtube";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useRef, useState } from "react";
import { errorClass, inputClass, labelClass, secondaryButtonClass } from "@/lib/ui";
import {
  AlignIcon,
  ChevronDownIcon,
  CodeIcon,
  ImageIcon,
  LinkIcon,
  MoreIcon,
  TableIcon,
  VideoIcon,
} from "./editor-icons";
import { MediaLibraryModal } from "./media-library-modal";
import { Modal } from "./modal";

const BLOCK_TYPES = [
  { value: "paragraph", label: "Paragraph" },
  { value: "h1", label: "Heading 1" },
  { value: "h2", label: "Heading 2" },
  { value: "h3", label: "Heading 3" },
  { value: "h4", label: "Heading 4" },
  { value: "h5", label: "Heading 5" },
  { value: "h6", label: "Heading 6" },
  { value: "blockquote", label: "Blockquote" },
] as const;

type BlockType = (typeof BLOCK_TYPES)[number]["value"];
type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

const ALIGNMENTS = [
  { value: "left", label: "Align left" },
  { value: "center", label: "Align center" },
  { value: "right", label: "Align right" },
  { value: "justify", label: "Justify" },
] as const;

const TEXT_COLORS = [
  "#000000", "#434343", "#666666", "#999999", "#b7b7b7",
  "#cc0000", "#e69138", "#f1c232", "#6aa84f", "#3d85c6",
  "#674ea7", "#a61c00", "#0b5394", "#38761d", "#741b47",
];

const primaryButtonClass =
  "rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-40";

const toolButtonClass = (active?: boolean) =>
  `flex h-8 min-w-8 items-center justify-center gap-0.5 rounded-md px-1.5 text-sm text-zinc-800 disabled:pointer-events-none disabled:opacity-40 ${
    active ? "bg-zinc-200" : "hover:bg-zinc-100"
  }`;

// Keeps the text selection while the toolbar is clicked.
const keepSelection = (event: React.MouseEvent) => event.preventDefault();

function ToolButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={keepSelection}
      onClick={onClick}
      className={toolButtonClass(active)}
    >
      {children}
    </button>
  );
}

function Dropdown({
  label,
  trigger,
  disabled,
  active,
  align = "left",
  children,
}: {
  label: string;
  trigger: React.ReactNode;
  disabled?: boolean;
  active?: boolean;
  align?: "left" | "right";
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        title={label}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled}
        onMouseDown={keepSelection}
        onClick={() => setOpen(!open)}
        className={toolButtonClass(active || open)}
      >
        {trigger}
        <ChevronDownIcon />
      </button>
      {open && (
        <div
          role="menu"
          onClick={() => setOpen(false)}
          className={`absolute top-full z-30 mt-1 min-w-44 rounded-lg border border-zinc-200 bg-white p-1 shadow-lg ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function MenuItem({
  onSelect,
  active,
  disabled,
  children,
}: {
  onSelect: () => void;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onMouseDown={keepSelection}
      onClick={onSelect}
      className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm text-zinc-800 disabled:pointer-events-none disabled:opacity-40 ${
        active ? "bg-zinc-100 font-medium" : "hover:bg-zinc-100"
      }`}
    >
      {children}
    </button>
  );
}

const MenuDivider = () => <div role="separator" className="my-1 h-px bg-zinc-200" />;

const Divider = () => <span aria-hidden className="mx-1 h-5 w-px bg-zinc-200" />;

function normalizeUrl(value: string) {
  const url = value.trim();
  if (!url) return "";
  if (/^(https?:|mailto:|tel:|\/|#)/i.test(url)) return url;
  return `https://${url}`;
}

function LinkModal({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const current = editor.getAttributes("link") as { href?: string; target?: string | null };
  const hasSelection = !editor.state.selection.empty;
  const [url, setUrl] = useState(current.href ?? "");
  const [text, setText] = useState("");
  const [newWindow, setNewWindow] = useState(current.target === "_blank");
  const [error, setError] = useState("");
  const editing = Boolean(current.href);

  const save = () => {
    const href = normalizeUrl(url);
    try {
      if (!/^(mailto:|tel:|\/|#)/i.test(href)) new URL(href);
    } catch {
      setError("Enter a valid link, for example https://example.com");
      return;
    }
    const attrs = { href, target: newWindow ? "_blank" : null };
    const chain = editor.chain().focus();
    if (editing || hasSelection) {
      chain.extendMarkRange("link").setLink(attrs).run();
    } else {
      chain
        .insertContent({ type: "text", text: text.trim() || href, marks: [{ type: "link", attrs }] })
        .run();
    }
    onClose();
  };

  return (
    <Modal
      title={editing ? "Edit link" : "Insert link"}
      onClose={onClose}
      footer={
        <>
          {editing && (
            <button
              type="button"
              onClick={() => {
                editor.chain().focus().extendMarkRange("link").unsetLink().run();
                onClose();
              }}
              className="mr-auto rounded-lg px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
            >
              Remove link
            </button>
          )}
          <button type="button" onClick={onClose} className={secondaryButtonClass}>
            Cancel
          </button>
          <button type="button" onClick={save} disabled={!url.trim()} className={primaryButtonClass}>
            {editing ? "Save" : "Insert link"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label htmlFor="editor-link-url" className={labelClass}>
            Link to
          </label>
          <input
            id="editor-link-url"
            autoFocus
            value={url}
            onChange={(event) => {
              setUrl(event.target.value);
              setError("");
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                save();
              }
            }}
            placeholder="https://"
            className={inputClass}
          />
          {error && <p className={errorClass}>{error}</p>}
        </div>
        {!editing && !hasSelection && (
          <div>
            <label htmlFor="editor-link-text" className={labelClass}>
              Link text
            </label>
            <input
              id="editor-link-text"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Shown instead of the link address"
              className={inputClass}
            />
          </div>
        )}
        <label className="flex items-center gap-2 text-sm text-zinc-800">
          <input
            type="checkbox"
            checked={newWindow}
            onChange={(event) => setNewWindow(event.target.checked)}
            className="size-4 accent-zinc-900"
          />
          Open this link in a new window
        </label>
      </div>
    </Modal>
  );
}

function VideoModal({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  const insert = () => {
    const src = url.trim();
    if (!isValidYoutubeUrl(src)) {
      setError("Paste a YouTube video link, for example https://www.youtube.com/watch?v=…");
      return;
    }
    editor.chain().focus().setYoutubeVideo({ src }).run();
    onClose();
  };

  return (
    <Modal
      title="Insert video"
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={secondaryButtonClass}>
            Cancel
          </button>
          <button type="button" onClick={insert} disabled={!url.trim()} className={primaryButtonClass}>
            Insert video
          </button>
        </>
      }
    >
      <label htmlFor="editor-video-url" className={labelClass}>
        YouTube link
      </label>
      <input
        id="editor-video-url"
        autoFocus
        value={url}
        onChange={(event) => {
          setUrl(event.target.value);
          setError("");
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            insert();
          }
        }}
        placeholder="https://www.youtube.com/watch?v=…"
        className={inputClass}
      />
      {error ? (
        <p className={errorClass}>{error}</p>
      ) : (
        <p className="mt-1 text-xs text-zinc-500">The video plays inside the product description.</p>
      )}
    </Modal>
  );
}

// Puts each block on its own line so the HTML is readable.
function formatHtml(html: string) {
  return html
    .replace(/(<\/(p|h[1-6]|ul|ol|li|blockquote|table|thead|tbody|tr|div)>)/g, "$1\n")
    .replace(/(<(ul|ol|table|thead|tbody|tr|colgroup)[^>]*>)/g, "$1\n")
    .replace(/\n+/g, "\n")
    .trim();
}

type Dialog = "link" | "image" | "video" | null;

function Toolbar({
  editor,
  htmlMode,
  onToggleHtml,
  onOpen,
}: {
  editor: Editor | null;
  htmlMode: boolean;
  onToggleHtml: () => void;
  onOpen: (dialog: Dialog) => void;
}) {
  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => {
      if (!current) return null;
      const level = ([1, 2, 3, 4, 5, 6] as HeadingLevel[]).find((value) =>
        current.isActive("heading", { level: value }),
      );
      const block: BlockType = level ? (`h${level}` as BlockType) : current.isActive("blockquote") ? "blockquote" : "paragraph";
      return {
        block,
        bold: current.isActive("bold"),
        italic: current.isActive("italic"),
        underline: current.isActive("underline"),
        strike: current.isActive("strike"),
        color: (current.getAttributes("textStyle").color as string | undefined) ?? null,
        align: ALIGNMENTS.find((item) => item.value !== "left" && current.isActive({ textAlign: item.value }))?.value ?? "left",
        link: current.isActive("link"),
        bulletList: current.isActive("bulletList"),
        orderedList: current.isActive("orderedList"),
        inTable: current.isActive("table"),
        canIndent: current.can().sinkListItem("listItem"),
        canOutdent: current.can().liftListItem("listItem"),
      };
    },
  });

  const off = !editor || htmlMode;
  const run = (action: (chain: ReturnType<Editor["chain"]>) => ReturnType<Editor["chain"]>) => {
    if (editor) action(editor.chain().focus()).run();
  };

  const setBlock = (value: BlockType) => {
    if (value === "paragraph") run((chain) => chain.setParagraph());
    else if (value === "blockquote") {
      if (!editor?.isActive("blockquote")) run((chain) => chain.setParagraph().toggleBlockquote());
    } else run((chain) => chain.setHeading({ level: Number(value.slice(1)) as HeadingLevel }));
  };

  const blockLabel = BLOCK_TYPES.find((item) => item.value === state?.block)?.label ?? "Paragraph";

  return (
    <div className="flex flex-wrap items-center gap-0.5 rounded-t-lg border-b border-zinc-200 bg-zinc-50 px-1.5 py-1">
      <Dropdown label="Text style" disabled={off} trigger={<span className="min-w-20 px-1 text-left">{blockLabel}</span>}>
        {BLOCK_TYPES.map((item) => (
          <MenuItem key={item.value} active={state?.block === item.value} onSelect={() => setBlock(item.value)}>
            <span
              className={
                item.value === "paragraph"
                  ? ""
                  : item.value === "blockquote"
                    ? "border-l-2 border-zinc-300 pl-2 text-zinc-600"
                    : `font-semibold ${{ h1: "text-xl", h2: "text-lg", h3: "text-base", h4: "text-sm", h5: "text-xs", h6: "text-xs uppercase" }[item.value]}`
              }
            >
              {item.label}
            </span>
          </MenuItem>
        ))}
      </Dropdown>

      <Divider />

      <ToolButton label="Bold" active={state?.bold} disabled={off} onClick={() => run((chain) => chain.toggleBold())}>
        <span className="w-4 text-center font-bold">B</span>
      </ToolButton>
      <ToolButton label="Italic" active={state?.italic} disabled={off} onClick={() => run((chain) => chain.toggleItalic())}>
        <span className="w-4 text-center font-serif italic">I</span>
      </ToolButton>
      <ToolButton label="Underline" active={state?.underline} disabled={off} onClick={() => run((chain) => chain.toggleUnderline())}>
        <span className="w-4 text-center underline">U</span>
      </ToolButton>
      <Dropdown
        label="Text color"
        disabled={off}
        trigger={
          <span className="flex w-4 flex-col items-center leading-none">
            <span className="font-semibold">A</span>
            <span className="mt-0.5 h-0.5 w-3.5 rounded" style={{ background: state?.color ?? "#18181b" }} />
          </span>
        }
      >
        <div className="grid grid-cols-5 gap-1.5 p-1.5">
          {TEXT_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              role="menuitem"
              title={color}
              aria-label={`Text color ${color}`}
              onMouseDown={keepSelection}
              onClick={() => run((chain) => chain.setColor(color))}
              className={`size-6 rounded-md border ${
                state?.color?.toLowerCase() === color ? "border-zinc-900 ring-2 ring-zinc-900/20" : "border-zinc-200"
              }`}
              style={{ background: color }}
            />
          ))}
        </div>
        <label onClick={(event) => event.stopPropagation()} className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-zinc-800 hover:bg-zinc-100">
          <input
            type="color"
            value={state?.color && /^#[0-9a-f]{6}$/i.test(state.color) ? state.color : "#000000"}
            onChange={(event) => run((chain) => chain.setColor(event.target.value))}
            className="size-5 cursor-pointer rounded border-0 bg-transparent p-0"
          />
          Custom color
        </label>
        <MenuDivider />
        <MenuItem onSelect={() => run((chain) => chain.unsetColor())}>Remove color</MenuItem>
      </Dropdown>

      <Divider />

      <Dropdown label="Alignment" disabled={off} trigger={<AlignIcon align={state?.align ?? "left"} />}>
        {ALIGNMENTS.map((item) => (
          <MenuItem key={item.value} active={state?.align === item.value} onSelect={() => run((chain) => chain.setTextAlign(item.value))}>
            <AlignIcon align={item.value} />
            {item.label}
          </MenuItem>
        ))}
      </Dropdown>

      <Divider />

      <ToolButton label={state?.link ? "Edit link" : "Insert link"} active={state?.link} disabled={off} onClick={() => onOpen("link")}>
        <LinkIcon />
      </ToolButton>
      <ToolButton label="Insert image" disabled={off} onClick={() => onOpen("image")}>
        <ImageIcon />
      </ToolButton>
      <ToolButton label="Insert video" disabled={off} onClick={() => onOpen("video")}>
        <VideoIcon />
      </ToolButton>
      <Dropdown label="Table" active={state?.inTable} disabled={off} trigger={<TableIcon />}>
        <MenuItem disabled={state?.inTable} onSelect={() => run((chain) => chain.insertTable({ rows: 3, cols: 3, withHeaderRow: true }))}>
          Insert table
        </MenuItem>
        <MenuDivider />
        <MenuItem disabled={!state?.inTable} onSelect={() => run((chain) => chain.addRowBefore())}>Insert row above</MenuItem>
        <MenuItem disabled={!state?.inTable} onSelect={() => run((chain) => chain.addRowAfter())}>Insert row below</MenuItem>
        <MenuItem disabled={!state?.inTable} onSelect={() => run((chain) => chain.addColumnBefore())}>Insert column left</MenuItem>
        <MenuItem disabled={!state?.inTable} onSelect={() => run((chain) => chain.addColumnAfter())}>Insert column right</MenuItem>
        <MenuDivider />
        <MenuItem disabled={!state?.inTable} onSelect={() => run((chain) => chain.toggleHeaderRow())}>Toggle header row</MenuItem>
        <MenuItem disabled={!state?.inTable} onSelect={() => run((chain) => chain.deleteRow())}>Delete row</MenuItem>
        <MenuItem disabled={!state?.inTable} onSelect={() => run((chain) => chain.deleteColumn())}>Delete column</MenuItem>
        <MenuItem disabled={!state?.inTable} onSelect={() => run((chain) => chain.deleteTable())}>
          <span className="text-red-700">Delete table</span>
        </MenuItem>
      </Dropdown>

      <Divider />

      <Dropdown label="More formatting" disabled={off} active={state?.strike || state?.bulletList || state?.orderedList} trigger={<MoreIcon />}>
        <MenuItem active={state?.strike} onSelect={() => run((chain) => chain.toggleStrike())}>
          <span className="w-5 text-center line-through">S</span>
          Strikethrough
        </MenuItem>
        <MenuItem active={state?.bulletList} onSelect={() => run((chain) => chain.toggleBulletList())}>
          <span className="w-5 text-center">•</span>
          Bulleted list
        </MenuItem>
        <MenuItem active={state?.orderedList} onSelect={() => run((chain) => chain.toggleOrderedList())}>
          <span className="w-5 text-center text-xs">1.</span>
          Numbered list
        </MenuItem>
        <MenuItem disabled={!state?.canOutdent} onSelect={() => run((chain) => chain.liftListItem("listItem"))}>
          <span className="w-5 text-center">⇤</span>
          Outdent
        </MenuItem>
        <MenuItem disabled={!state?.canIndent} onSelect={() => run((chain) => chain.sinkListItem("listItem"))}>
          <span className="w-5 text-center">⇥</span>
          Indent
        </MenuItem>
        <MenuDivider />
        <MenuItem onSelect={() => run((chain) => chain.setHorizontalRule())}>
          <span className="w-5 text-center">―</span>
          Horizontal line
        </MenuItem>
        <MenuItem onSelect={() => run((chain) => chain.unsetAllMarks().clearNodes())}>
          <span className="w-5 text-center">⌫</span>
          Clear formatting
        </MenuItem>
      </Dropdown>

      <div className="ml-auto">
        <ToolButton label={htmlMode ? "Show editor" : "Show HTML"} active={htmlMode} disabled={!editor} onClick={onToggleHtml}>
          <CodeIcon />
        </ToolButton>
      </div>
    </div>
  );
}

export function RichTextEditor({
  value,
  onChange,
  vendorId,
  placeholder,
  labelledBy,
  invalid,
}: {
  value: string;
  onChange: (html: string) => void;
  vendorId: string;
  placeholder?: string;
  labelledBy?: string;
  invalid?: boolean;
}) {
  const [htmlMode, setHtmlMode] = useState(false);
  const [source, setSource] = useState("");
  const [dialog, setDialog] = useState<Dialog>(null);

  const editor = useEditor({
    // Render on the client only, so server and browser HTML match.
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        link: {
          openOnClick: false,
          autolink: true,
          defaultProtocol: "https",
          HTMLAttributes: { target: null, rel: "noopener noreferrer" },
        },
      }),
      Placeholder.configure({ placeholder }),
      TextStyle,
      Color,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Image.configure({ allowBase64: false }),
      Youtube.configure({ nocookie: true, width: 640, height: 360 }),
      TableKit.configure({ table: { resizable: false } }),
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

  const toggleHtml = () => {
    if (!editor) return;
    if (htmlMode) {
      editor.commands.setContent(source, { emitUpdate: true });
      setHtmlMode(false);
    } else {
      setSource(formatHtml(editor.isEmpty ? "" : editor.getHTML()));
      setHtmlMode(true);
    }
  };

  return (
    <div
      className={`rounded-lg border bg-white shadow-sm focus-within:border-zinc-900 focus-within:ring-2 focus-within:ring-zinc-900/10 ${
        invalid ? "border-red-500" : "border-zinc-300"
      }`}
    >
      <Toolbar editor={editor} htmlMode={htmlMode} onToggleHtml={toggleHtml} onOpen={setDialog} />

      {htmlMode ? (
        <textarea
          aria-label="Description HTML"
          value={source}
          onChange={(event) => {
            setSource(event.target.value);
            onChange(event.target.value.trim());
          }}
          spellCheck={false}
          className="block min-h-44 w-full resize-y rounded-b-lg px-3 py-2 font-mono text-xs leading-5 text-zinc-900 outline-none"
          rows={10}
        />
      ) : (
        <div className="overflow-x-auto">
          <EditorContent editor={editor} />
        </div>
      )}

      {editor && dialog === "link" && <LinkModal editor={editor} onClose={() => setDialog(null)} />}
      {editor && dialog === "video" && <VideoModal editor={editor} onClose={() => setDialog(null)} />}
      {editor && dialog === "image" && (
        <MediaLibraryModal
          vendorId={vendorId}
          selectedUrls={[]}
          maxSelection={1}
          onClose={() => setDialog(null)}
          onDone={([src]) => {
            if (src) editor.chain().focus().setImage({ src, alt: "" }).run();
            setDialog(null);
          }}
        />
      )}
    </div>
  );
}
