import { NextResponse } from "next/server";
export async function GET() {
  return NextResponse.json([
    { title: "Konstitutsiya huquqi testi", note: "tugatildi", timeAgo: "2 soat oldin" },
    { title: "Yuridik klub", note: "uchrashuvida qatnashding", timeAgo: "1 kun oldin" },
    { title: "Huquq asoslari", note: "kitobini o'qishni boshladingiz", timeAgo: "3 kun oldin" },
  ]);
}
