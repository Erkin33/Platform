// app/c/[id]/page.tsx
"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  getSectionByIdOrSlug,
  upsertSection,
  SECTIONS_CHANGED,
  type SectionItem,
  type Block,
  addBlock,
  updateBlock,
  deleteBlock,
  reorderBlocks,
  readFileAsDataURL,
} from "@/lib/sections";
import { getUser } from "@/lib/user";
import {
  GripVertical,
  Plus,
  Trash2,
  Pencil,
  Check,
  Image as ImageIcon,
  Link as LinkIcon,
  List,
  Heading1,
  Type,
  Play,
} from "lucide-react";

/**
 * Блок для СОЗДАНИЯ: без id, с удобными опциональными полями.
 * Используется только при addBlock(..., payload).
 */
type NewBlock = Omit<Block, "id"> &
  Partial<{
    text: string;
    items: string[];
    src: string;
    alt: string;
    href: string;
    label: string;
    html: string;
  }>;

/**
 * Блок для ОТОБРАЖЕНИЯ/РЕДАКТИРОВАНИЯ: уже существует (есть id),
 * но добавляем опциональные поля контента для удобства.
 */
type ExtendedBlock = Block &
  Partial<{
    text: string;
    items: string[];
    src: string;
    alt: string;
    href: string;
    label: string;
    html: string;
  }>;

/**
 * Next.js 15 — params endi Promise bo‘ladi.
 * React.use() orqali ochamiz
 */
export default function CustomSectionPage(props: { params: Promise<{ id: string }> }) {
  // 1) Barcha hook-lar komponent yuqorisida
  const { id } = use(props.params);

  const textRef = useRef<HTMLDivElement>(null);
  const dragFrom = useRef<number | null>(null);

  const [section, setSection] = useState<SectionItem | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");

  const load = useCallback(() => {
    const u = getUser();
    setIsAdmin(u.role === "admin");

    const s = getSectionByIdOrSlug(id);
    if (s) {
      setSection(s);
      setTitleDraft(s.title);
      return;
    }

    // bo‘lim yo‘q — admin uchun darhol bo‘sh bo‘lim yaratamiz
    if (u.role === "admin") {
      upsertSection({ id, title: "Yangi bo‘lim" });
      const ns = getSectionByIdOrSlug(id) ?? null;
      setSection(ns);
      setTitleDraft(ns?.title ?? "");
    } else {
      setSection(null);
    }
  }, [id]);

  useEffect(() => {
    load();
    const on = () => load();
    window.addEventListener(SECTIONS_CHANGED, on);
    window.addEventListener("storage", on);
    return () => {
      window.removeEventListener(SECTIONS_CHANGED, on);
      window.removeEventListener("storage", on);
    };
  }, [load]);

  // ===== Blok qo‘shish =====
  async function add(type: Block["type"]) {
    if (!section) return;

    if (type === "image") {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = async () => {
        const f = input.files?.[0];
        if (!f) return;
        const src = await readFileAsDataURL(f);
        const payload: NewBlock = { type: "image", src, alt: "" };
        addBlock(section.id, payload);
      };
      input.click();
      return;
    }

    if (type === "heading") {
      const payload: NewBlock = { type: "heading", text: "Sarlavha" };
      addBlock(section.id, payload);
    }
    if (type === "paragraph") {
      const payload: NewBlock = { type: "paragraph", text: "Matn..." };
      addBlock(section.id, payload);
    }
    if (type === "list") {
      const payload: NewBlock = { type: "list", items: ["Band 1", "Band 2"] };
      addBlock(section.id, payload);
    }
    if (type === "link") {
      const payload: NewBlock = {
        type: "link",
        href: "https://example.com",
        label: "Havola",
      };
      addBlock(section.id, payload);
    }
    if (type === "embed") {
      const payload: NewBlock = {
        type: "embed",
        html: `<iframe width="560" height="315" src="https://www.youtube.com/embed/dQw4w9WgXcQ" allowfullscreen></iframe>`,
      };
      addBlock(section.id, payload);
    }
  }

  // ===== Drag & drop =====
  function onDragStart(idx: number) {
    dragFrom.current = idx;
  }
  function onDrop(toIdx: number) {
    const from = dragFrom.current;
    dragFrom.current = null;
    if (from === null || from === toIdx || !section) return;
    reorderBlocks(section.id, from, toIdx);
  }

  // ===== Sarlavhani saqlash =====
  function saveTitle() {
    if (!section) return;
    if (!titleDraft.trim()) {
      setEditingTitle(false);
      return;
    }
    upsertSection({ id: section.id, title: titleDraft.trim() });
    setEditingTitle(false);
  }

  // ===== Render =====
  if (!section) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="rounded-2xl border border-neutral-200 bg-white p-6">
          <div className="text-lg font-semibold">Bo‘lim topilmadi</div>
          <div className="mt-1 text-sm text-neutral-600">
            Noto‘g‘ri havola yoki bo‘lim o‘chirib tashlangan bo‘lishi mumkin.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        {!editingTitle ? (
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{section.title}</h1>
            {isAdmin && (
              <button
                onClick={() => setEditingTitle(true)}
                className="rounded-lg border px-2 py-1 text-xs hover:bg-neutral-50"
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input
              className="rounded-xl border px-3 py-2 text-sm"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              autoFocus
            />
            <button
              onClick={saveTitle}
              className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <Check className="h-4 w-4" />
            </button>
          </div>
        )}

        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2">
            <AddBtn onClick={() => add("heading")} icon={<Heading1 className="h-4 w-4" />} label="Sarlavha" />
            <AddBtn onClick={() => add("paragraph")} icon={<Type className="h-4 w-4" />} label="Matn" />
            <AddBtn onClick={() => add("list")} icon={<List className="h-4 w-4" />} label="Ro‘yxat" />
            <AddBtn onClick={() => add("image")} icon={<ImageIcon className="h-4 w-4" />} label="Rasm" />
            <AddBtn onClick={() => add("embed")} icon={<Play className="h-4 w-4" />} label="Embed" />
            <AddBtn onClick={() => add("link")} icon={<LinkIcon className="h-4 w-4" />} label="Havola" />
          </div>
        )}
      </header>

      {/* Kontent */}
      <div className="space-y-3">
        {section.blocks.map((b, i) => (
          <div
            key={b.id}
            draggable={isAdmin}
            onDragStart={() => onDragStart(i)}
            onDragOver={(e) => isAdmin && e.preventDefault()}
            onDrop={() => isAdmin && onDrop(i)}
            className="group relative rounded-2xl border border-neutral-200 bg-white p-4"
          >
            {isAdmin && (
              <div className="absolute left-2 top-2 hidden items-center gap-1 rounded-md border bg-white px-2 py-1 text-xs text-neutral-600 shadow-sm group-hover:flex">
                <GripVertical className="h-4 w-4" />
                {i + 1}
              </div>
            )}

            <BlockView
              block={b as ExtendedBlock}
              editable={isAdmin}
              onChange={(patch) => updateBlock(section.id, b.id, patch as Partial<Block>)}
              onDelete={() => deleteBlock(section.id, b.id)}
            />
          </div>
        ))}

        {section.blocks.length === 0 && (
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-neutral-500">
            Bu bo‘lim hozircha bo‘sh. {isAdmin ? "Paneldan blok qo‘shing." : "Tayyor emas."}
          </div>
        )}
      </div>

      {/* yashirin div — matn scroll-ni tiklash uchun */}
      <div ref={textRef} className="hidden" />
    </div>
  );
}

/* -------------------- Helpers -------------------- */

function AddBtn({
  onClick,
  icon,
  label,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 text-sm hover:bg-neutral-50"
    >
      <Plus className="h-4 w-4" />
      {icon}
      <span>{label}</span>
    </button>
  );
}

function BlockView({
  block,
  editable,
  onChange,
  onDelete,
}: {
  block: ExtendedBlock;
  editable: boolean;
  onChange: (patch: Partial<Block>) => void;
  onDelete: () => void;
}) {
  // heading
  if (block.type === "heading") {
    const value: string = block.text ?? "";
    return (
      <Editable
        tag="h2"
        className="text-xl font-semibold"
        value={value}
        editable={editable}
        onChange={(v) => onChange({ ...block, text: v })}
        onDelete={onDelete}
      />
    );
  }
  // paragraph
  if (block.type === "paragraph") {
    const value: string = block.text ?? "";
    return (
      <Editable
        tag="p"
        className="leading-7 text-[15px]"
        value={value}
        editable={editable}
        onChange={(v) => onChange({ ...block, text: v })}
        onDelete={onDelete}
      />
    );
  }
  // list
  if (block.type === "list") {
    const items: string[] = block.items ?? [];
    return (
      <ListEditor
        items={items}
        editable={editable}
        onChange={(items2) => onChange({ ...block, items: items2 })}
        onDelete={onDelete}
      />
    );
  }
  // image (next/image)
  if (block.type === "image") {
    const src: string = block.src || "";
    const alt: string = block.alt || "";
    return (
      <div className="flex flex-col items-start gap-2">
        <Image
          src={src}
          alt={alt}
          width={1200}
          height={800}
          className="h-auto max-h-[420px] w-auto rounded-xl border"
        />
        {editable && (
          <input
            className="w-full max-w-sm rounded-xl border px-3 py-1.5 text-sm"
            placeholder="Alt (ixtiyoriy)"
            value={alt}
            onChange={(e) => onChange({ ...block, alt: e.target.value })}
          />
        )}
        {editable && (
          <button
            onClick={onDelete}
            className="mt-1 inline-flex items-center gap-1 rounded-xl border border-rose-300 bg-rose-50 px-3 py-1.5 text-sm text-rose-700 hover:bg-rose-100"
          >
            <Trash2 className="h-4 w-4" /> O‘chirish
          </button>
        )}
      </div>
    );
  }
  // embed html
  if (block.type === "embed") {
    const html: string = block.html ?? "";
    return (
      <div className="w-full">
        <div
          className="rounded-xl border p-2 [&>iframe]:mx-auto [&>iframe]:block [&>iframe]:max-w-full"
          dangerouslySetInnerHTML={{ __html: html }}
        />
        {editable && (
          <>
            <textarea
              className="mt-2 w-full rounded-xl border px-3 py-2 text-sm"
              rows={4}
              placeholder="<iframe ...></iframe>"
              value={html}
              onChange={(e) => onChange({ ...block, html: e.target.value })}
            />
            <button
              onClick={onDelete}
              className="mt-2 inline-flex items-center gap-1 rounded-xl border border-rose-300 bg-rose-50 px-3 py-1.5 text-sm text-rose-700 hover:bg-rose-100"
            >
              <Trash2 className="h-4 w-4" /> O‘chirish
            </button>
          </>
        )}
      </div>
    );
  }
  // link
  if (block.type === "link") {
    const href: string = block.href ?? "";
    const label: string = block.label ?? "";
    return (
      <div className="flex items-center gap-2">
        <a className="text-indigo-600 underline" href={href} target="_blank" rel="noreferrer">
          {label || href}
        </a>
        {editable && (
          <div className="flex items-center gap-2">
            <input
              className="w-64 rounded-xl border px-3 py-1.5 text-sm"
              value={href}
              onChange={(e) => onChange({ ...block, href: e.target.value })}
            />
            <input
              className="w-48 rounded-xl border px-3 py-1.5 text-sm"
              value={label}
              onChange={(e) => onChange({ ...block, label: e.target.value })}
            />
            <button
              onClick={onDelete}
              className="inline-flex items-center gap-1 rounded-xl border border-rose-300 bg-rose-50 px-3 py-1.5 text-sm text-rose-700 hover:bg-rose-100"
            >
              <Trash2 className="h-4 w-4" /> O‘chirish
            </button>
          </div>
        )}
      </div>
    );
  }
  return null;
}

function Editable({
  tag,
  className,
  value,
  editable,
  onChange,
  onDelete,
}: {
  tag: "h2" | "p";
  className?: string;
  value: string;
  editable: boolean;
  onChange: (v: string) => void;
  onDelete: () => void;
}) {
  // Без динамического JSX-тега — никакого JSX/ElementType/JSX.IntrinsicElements
  return (
    <div>
      {editable ? (
        <>
          <textarea
            className="w-full rounded-xl border px-3 py-2 text-[15px]"
            rows={tag === "h2" ? 2 : 4}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
          <div className="mt-2">
            <button
              onClick={onDelete}
              className="inline-flex items-center gap-1 rounded-xl border border-rose-300 bg-rose-50 px-3 py-1.5 text-sm text-rose-700 hover:bg-rose-100"
            >
              <Trash2 className="h-4 w-4" /> O‘chirish
            </button>
          </div>
        </>
      ) : tag === "h2" ? (
        <h2 className={className}>{value}</h2>
      ) : (
        <p className={className}>{value}</p>
      )}
    </div>
  );
}

function ListEditor({
  items,
  editable,
  onChange,
  onDelete,
}: {
  items: string[];
  editable: boolean;
  onChange: (items: string[]) => void;
  onDelete: () => void;
}) {
  if (!editable) {
    return (
      <ul className="list-disc space-y-1 pl-6 text-[15px]">
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    );
  }
  const set = (idx: number, v: string) => {
    const arr = items.slice();
    arr[idx] = v;
    onChange(arr);
  };
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-sm text-neutral-500">{i + 1}.</span>
          <input
            className="w-full rounded-xl border px-3 py-1.5 text-sm"
            value={it}
            onChange={(e) => set(i, e.target.value)}
          />
          <button
            onClick={() => onChange(items.filter((_, j) => j !== i))}
            className="rounded-lg border border-rose-300 bg-rose-50 px-2 py-1 text-xs text-rose-700 hover:bg-rose-100"
          >
            O‘chirish
          </button>
        </div>
      ))}
      <button
        onClick={() => onChange([...items, "Yangi band"])}
        className="rounded-xl border px-3 py-1.5 text-sm hover:bg-neutral-50"
      >
        + Band
      </button>
      <div>
        <button
          onClick={onDelete}
          className="mt-2 inline-flex items-center gap-1 rounded-xl border border-rose-300 bg-rose-50 px-3 py-1.5 text-sm text-rose-700 hover:bg-rose-100"
        >
          <Trash2 className="h-4 w-4" /> Ro‘yxatni o‘chirish
        </button>
      </div>
    </div>
  );
}
