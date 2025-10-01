import { NextRequest, NextResponse } from "next/server";
const EVENTS = [
  { slug: "moot-court",        title: "Moot Court takmimi",  datetime: "2025-09-20 14:00", location: "Aula zali",      capacity: 24,  description: "Simulyatsion sud majlisi — talabalar uchun amaliy mashg'ulot." },
  { slug: "yuridik-seminar",   title: "Yuridik seminar",     datetime: "2025-09-22 10:00", location: "201-xona",       capacity: 15,  description: "Huquqiy tadqiqot usullari va yozma ishlanmalar." },
  { slug: "bahorgi-imtihonlar",title: "Bahorgi imtihonlar",  datetime: "2025-09-26 09:00", location: "Barcha xonalar", capacity: 120, description: "Semestr yakuniy nazoratlari." },
];
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");
  if (slug) return NextResponse.json(EVENTS.find((e) => e.slug === slug) ?? null);
  return NextResponse.json(EVENTS);
}
