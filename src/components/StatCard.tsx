export default function StatCard({ color, value, title }: { color: "indigo" | "emerald" | "violet" | "orange"; value: string; title: string }) {
  const colorMap: Record<string, string> = { indigo: "bg-indigo-600", emerald: "bg-emerald-600", violet: "bg-violet-600", orange: "bg-orange-600" };
  return (
    <div className="rounded-2xl border bg-white">
      <div className="flex items-center gap-4 p-5">
        <div className={`grid h-11 w-11 place-content-center rounded-xl text-white ${colorMap[color]}`}>{value}</div>
        <div className="text-neutral-700 font-medium">{title}</div>
      </div>
    </div>
  );
}