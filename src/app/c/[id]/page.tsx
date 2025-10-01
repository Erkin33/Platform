// app/c/[id]/page.tsx
"use client";

import { use, useEffect, useRef, useState } from "react";
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
 * Next.js 15 — params теперь Promise.
 * Обязательно распаковываем через React.use()
 */
export default function CustomSectionPage(props: { params: Promise<{ id: string }> }) {
  // 1) ВСЕ хуки — СТРОГО ВВЕРХУ КОМПОНЕНТА
  const { id } = use(props.params);

  const textRef = useRef<HTMLDivElement>(null);
  const dragFrom = useRef<number | null>(null);

  const [section, setSection] = useState<SectionItem | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");

  function load() {
    const u = getUser();
    setIsAdmin(u.role === "admin");

    const s = getSectionByIdOrSlug(id);
    if (s) {
      setSection(s);
      setTitleDraft(s.title);
      return;
    }

    // если раздела нет — создаём пустой для админа (чтобы можно было сразу наполнять)
    if (u.role === "admin") {
      upsertSection({ id, title: "Yangi bo‘lim" });
      const ns = getSectionByIdOrSlug(id) ?? null;
      setSection(ns);
      setTitleDraft(ns?.title ?? "");
    } else {
      setSection(null);
    }
  }

  useEffect(() => {
    load();
    const on = () => load();
    window.addEventListener(SECTIONS_CHANGED, on);
    window.addEventListener("storage", on);
    return () => {
      window.removeEventListener(SECTIONS_CHANGED, on);
      window.removeEventListener("storage", on);
    };
  }, [id]);

  // ===== Добавление блоков =====
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
        // В вашей модели Block поля могут отличаться — отдаём как any
        addBlock(section.id, { type: "image", src, alt: "" } as any);
      };
      input.click();
      return;
    }

    // Ниже — те же комментарии: отдаём shape через any, чтобы не спорить с типом Omit<Block,"id">
    if (type === "heading") addBlock(section.id, { type: "heading", text: "Sarlavha" } as any);
    if (type === "paragraph") addBlock(section.id, { type: "paragraph", text: "Matn..." } as any);
    if (type === "list") addBlock(section.id, { type: "list", items: ["Band 1", "Band 2"] } as any);
    if (type === "link")
      addBlock(
        section.id,
        { type: "link", href: "https://example.com", label: "Havola" } as any
      );
    if (type === "embed")
      addBlock(
        section.id,
        {
          type: "embed",
          html:
            `<iframe width="560" height="315" src="https://www.youtube.com/embed/dQw4w9WgXcQ" allowfullscreen></iframe>`,
        } as any
      );
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

  // ===== Сохранение заголовка =====
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

      {/* Контент секции */}
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
              block={b}
              editable={isAdmin}
              onChange={(patch) => updateBlock(section.id, b.id, patch as any)}
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

      {/* Скрытый div только для восстановления скролла текста */}
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
  block: Block;
  editable: boolean;
  onChange: (patch: Partial<Block>) => void;
  onDelete: () => void;
}) {
  if (block.type === "heading") {
    return (
      <Editable
        tag="h2"
        className="text-xl font-semibold"
        value={(block as any).text ?? ""}
        editable={editable}
        onChange={(v) => onChange({ ...(block as any), text: v } as any)}
        onDelete={onDelete}
      />
    );
  }
  if (block.type === "paragraph") {
    return (
      <Editable
        tag="p"
        className="leading-7 text-[15px]"
        value={(block as any).text ?? ""}
        editable={editable}
        onChange={(v) => onChange({ ...(block as any), text: v } as any)}
        onDelete={onDelete}
      />
    );
  }
  if (block.type === "list") {
    const items = (block as any).items as string[] | undefined;
    return (
      <ListEditor
        items={items ?? []}
        editable={editable}
        onChange={(items2) => onChange({ ...(block as any), items: items2 } as any)}
        onDelete={onDelete}
      />
    );
  }
  if (block.type === "image") {
    const b = block as any;
    return (
      <div className="flex flex-col items-start gap-2">
        <img src={b.src} alt={b.alt || ""} className="max-h-[420px] rounded-xl border" />
        {editable && (
          <input
            className="w-full max-w-sm rounded-xl border px-3 py-1.5 text-sm"
            placeholder="Alt (ixtiyoriy)"
            value={b.alt ?? ""}
            onChange={(e) => onChange({ ...b, alt: e.target.value } as any)}
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
  if (block.type === "embed") {
    const b = block as any;
    return (
      <div className="w-full">
        <div
          className="rounded-xl border p-2 [&>iframe]:mx-auto [&>iframe]:block [&>iframe]:max-w-full"
          dangerouslySetInnerHTML={{ __html: b.html }}
        />
        {editable && (
          <>
            <textarea
              className="mt-2 w-full rounded-xl border px-3 py-2 text-sm"
              rows={4}
              placeholder="<iframe ...></iframe>"
              value={b.html ?? ""}
              onChange={(e) => onChange({ ...b, html: e.target.value } as any)}
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
  if (block.type === "link") {
    const b = block as any;
    return (
      <div className="flex items-center gap-2">
        <a className="text-indigo-600 underline" href={b.href} target="_blank" rel="noreferrer">
          {b.label || b.href}
        </a>
        {editable && (
          <div className="flex items-center gap-2">
            <input
              className="w-64 rounded-xl border px-3 py-1.5 text-sm"
              value={b.href ?? ""}
              onChange={(e) => onChange({ ...b, href: e.target.value } as any)}
            />
            <input
              className="w-48 rounded-xl border px-3 py-1.5 text-sm"
              value={b.label ?? ""}
              onChange={(e) => onChange({ ...b, label: e.target.value } as any)}
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
  const Tag: any = tag;
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
      ) : (
        <Tag className={className}>{value}</Tag>
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
