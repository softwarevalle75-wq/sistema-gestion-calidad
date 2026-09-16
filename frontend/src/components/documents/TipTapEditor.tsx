import { useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { toast } from "sonner";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Table as TableIcon,
  Image as ImageIcon,
  Link as LinkIcon,
  Undo,
  Redo,
  Heading1,
  Heading2,
  Heading3,
  X,
} from "lucide-react";

interface TipTapEditorProps {
  content: string;
  onChange: (content: string) => void;
  editable?: boolean;
}

export const TipTapEditor: React.FC<TipTapEditorProps> = ({
  content,
  onChange,
  editable = true,
}) => {
  const [showImageModal, setShowImageModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Image,
      Link.configure({
        openOnClick: false,
      }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  if (!editor) {
    return null;
  }

  const addImage = () => {
    setShowImageModal(true);
  };

  const handleImageSubmit = () => {
    if (imageUrl.trim()) {
      if (!editor) return;
      editor.chain().focus().setImage({ src: imageUrl }).run();
      setImageUrl("");
      setShowImageModal(false);
      toast.success("Imagen agregada");
    } else {
      toast.error("Por favor ingresa una URL válida");
    }
  };

  const setLink = () => {
    const selectedText = editor?.state.doc.textBetween(
      editor.state.selection.from,
      editor.state.selection.to,
      "",
    );
    setLinkText(selectedText || "");
    setShowLinkModal(true);
  };

  const handleLinkSubmit = () => {
    if (linkUrl.trim()) {
      if (!editor) return;

      if (linkText.trim() && !editor.state.selection.empty) {
        // Si hay texto seleccionado, solo agregar el enlace
        editor.chain().focus().setLink({ href: linkUrl }).run();
      } else if (linkText.trim()) {
        // Si hay texto pero no hay selección, insertar texto con enlace
        editor
          .chain()
          .focus()
          .insertContent(`<a href="${linkUrl}">${linkText}</a>`)
          .run();
      } else {
        // Solo URL
        editor.chain().focus().setLink({ href: linkUrl }).run();
      }

      setLinkUrl("");
      setLinkText("");
      setShowLinkModal(false);
      toast.success("Enlace agregado");
    } else {
      toast.error("Por favor ingresa una URL válida");
    }
  };

  const insertTable = () => {
    editor
      .chain()
      .focus()
      .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
      .run();
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {editable && (
        <div className="bg-muted border-b border-border p-2 flex flex-wrap gap-1">
          {/* Toolbar buttons */}
          <div className="flex gap-1 border-r border-border pr-2">
            <button
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              className="p-2 hover:bg-accent rounded disabled:opacity-50"
              title="Deshacer"
            >
              <Undo className="w-4 h-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              className="p-2 hover:bg-accent rounded disabled:opacity-50"
              title="Rehacer"
            >
              <Redo className="w-4 h-4" />
            </button>
          </div>

          <div className="flex gap-1 border-r border-border pr-2">
            <button
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 1 }).run()
              }
              className={`p-2 hover:bg-accent rounded ${
                editor.isActive("heading", { level: 1 }) ? "bg-accent" : ""
              }`}
            >
              <Heading1 className="w-4 h-4" />
            </button>
            <button
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 2 }).run()
              }
              className={`p-2 hover:bg-accent rounded ${
                editor.isActive("heading", { level: 2 }) ? "bg-accent" : ""
              }`}
            >
              <Heading2 className="w-4 h-4" />
            </button>
            <button
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 3 }).run()
              }
              className={`p-2 hover:bg-accent rounded ${
                editor.isActive("heading", { level: 3 }) ? "bg-accent" : ""
              }`}
            >
              <Heading3 className="w-4 h-4" />
            </button>
          </div>

          <div className="flex gap-1 border-r border-border pr-2">
            <button
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`p-2 hover:bg-accent rounded ${
                editor.isActive("bold") ? "bg-accent" : ""
              }`}
            >
              <Bold className="w-4 h-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`p-2 hover:bg-accent rounded ${
                editor.isActive("italic") ? "bg-accent" : ""
              }`}
            >
              <Italic className="w-4 h-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              className={`p-2 hover:bg-accent rounded ${
                editor.isActive("underline") ? "bg-accent" : ""
              }`}
            >
              <UnderlineIcon className="w-4 h-4" />
            </button>
          </div>

          <div className="flex gap-1 border-r border-border pr-2">
            <button
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={`p-2 hover:bg-accent rounded ${
                editor.isActive("bulletList") ? "bg-accent" : ""
              }`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={`p-2 hover:bg-accent rounded ${
                editor.isActive("orderedList") ? "bg-accent" : ""
              }`}
            >
              <ListOrdered className="w-4 h-4" />
            </button>
          </div>

          <div className="flex gap-1 border-r border-border pr-2">
            <button
              onClick={() => editor.chain().focus().setTextAlign("left").run()}
              className="p-2 hover:bg-accent rounded"
            >
              <AlignLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() =>
                editor.chain().focus().setTextAlign("center").run()
              }
              className="p-2 hover:bg-accent rounded"
            >
              <AlignCenter className="w-4 h-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().setTextAlign("right").run()}
              className="p-2 hover:bg-accent rounded"
            >
              <AlignRight className="w-4 h-4" />
            </button>
            <button
              onClick={() =>
                editor.chain().focus().setTextAlign("justify").run()
              }
              className="p-2 hover:bg-accent rounded"
            >
              <AlignJustify className="w-4 h-4" />
            </button>
          </div>

          <div className="flex gap-1 border-r border-border pr-2">
            <button
              onClick={insertTable}
              className="p-2 hover:bg-accent rounded"
            >
              <TableIcon className="w-4 h-4" />
            </button>
          </div>

          <div className="flex gap-1 border-r border-border pr-2">
            <button onClick={addImage} className="p-2 hover:bg-accent rounded">
              <ImageIcon className="w-4 h-4" />
            </button>
          </div>

          <div className="flex gap-1">
            <button onClick={setLink} className="p-2 hover:bg-accent rounded">
              <LinkIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none p-4 min-h-[500px] focus:outline-none"
      />

      {/* Modal para agregar imagen */}
      {showImageModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Agregar Imagen</h3>
              <button
                onClick={() => {
                  setShowImageModal(false);
                  setImageUrl("");
                }}
                className="p-1 hover:bg-accent rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  URL de la imagen
                </label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleImageSubmit();
                    }
                  }}
                  placeholder="https://ejemplo.com/imagen.jpg"
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                  autoFocus
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setShowImageModal(false);
                    setImageUrl("");
                  }}
                  className="px-4 py-2 border border-border rounded-md hover:bg-accent"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleImageSubmit}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                >
                  Agregar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para agregar enlace */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Agregar Enlace</h3>
              <button
                onClick={() => {
                  setShowLinkModal(false);
                  setLinkUrl("");
                  setLinkText("");
                }}
                className="p-1 hover:bg-accent rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Texto del enlace
                </label>
                <input
                  type="text"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  placeholder="Texto visible del enlace"
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  URL del enlace
                </label>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleLinkSubmit();
                    }
                  }}
                  placeholder="https://ejemplo.com"
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                  autoFocus
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setShowLinkModal(false);
                    setLinkUrl("");
                    setLinkText("");
                  }}
                  className="px-4 py-2 border border-border rounded-md hover:bg-accent"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleLinkSubmit}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                >
                  Agregar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
