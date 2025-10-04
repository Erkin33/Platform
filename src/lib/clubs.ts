export type ClubCategory = "Professional" | "Takvim" | "Boshqaruv" | "Sport" | "Fan";
export type ClubStatus = "active" | "archived";

export type MemberRole = "member" | "coordinator" | "volunteer";
export type MemberStatus = "pending" | "approved" | "invited" | "rejected";

export type ClubMember = {
  userId: string;
  role: MemberRole;
  status: MemberStatus;
  profile?: {
    fullName?: string;
    phone?: string;
    faculty?: string;
    course?: string;
    note?: string;
  };
  checkins: string[]; // ISO date[]
};

export type AttendanceState = {
  code: string;
  date: string; // ISO
  present: string[]; // userId[]
};

export type ClubItem = {
  id: string;
  slug: string;
  title: string;
  category: ClubCategory;
  description?: string;
  nextMeeting?: string;
  members: ClubMember[];
  status: ClubStatus;
  createdAt: number;
  currentAttendance?: AttendanceState | null;
};

const KEY = "uniplatform_clubs_v2";

export const CLUBS_CHANGED = "uniplatform_clubs_changed";
export const MEMBERSHIP_CHANGED = "uniplatform_membership_changed";

const isBrowser = () => typeof window !== "undefined";
const uid = () => Math.random().toString(36).slice(2, 10);
export const slugify = (s: string) =>
  s.toLowerCase().replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-");

function emit(ev: string) {
  try { window.dispatchEvent(new Event(ev)); } catch {}
}

function lsGet<T>(key: string, fb: T): T {
  if (!isBrowser()) return fb;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fb;
  } catch {
    return fb;
  }
}
function lsSet<T>(key: string, val: T) {
  if (!isBrowser()) return;
  window.localStorage.setItem(key, JSON.stringify(val));
  try {
    window.dispatchEvent(new StorageEvent("storage", { key, newValue: JSON.stringify(val) }));
  } catch {}
}

function fakeUsers(n: number): ClubMember[] {
  const first = ["Akmal","Mahmud","Dilshod","Aziza","Madina","Sardor","Javlon","Shahnoza","Baxtiyor","Islom","Lola","Muhammad","Ilyos","Kamola","Zuhra","Rustam","Temur","Azamat","Nigora","Shoxrux","Muxlisa","Bobur"];
  const last = ["Karimov","Tursunov","Abdullayev","Nazarov","Eshonova","Raximov","Qodirov","Soliyev","Sattorov","Aliyeva","Bekmurodov","Sheraliyev","Yusupov","Qobilov","Sodiqov"];
  const arr: ClubMember[] = [];
  for (let i = 0; i < n; i++) {
    const u = `u_${uid()}`;
    arr.push({
      userId: u,
      role: "member",
      status: "approved",
      profile: {
        fullName: `${first[Math.floor(Math.random()*first.length)]} ${last[Math.floor(Math.random()*last.length)]}`,
        phone: `+998 9${Math.floor(Math.random()*10)} ${100+Math.floor(Math.random()*900)} ${10+Math.floor(Math.random()*90)} ${10+Math.floor(Math.random()*90)}`,
        faculty: ["IT","Huquq","Iqtisod","Filologiya"][Math.floor(Math.random()*4)],
        course: `${1+Math.floor(Math.random()*4)}-kurs`,
      },
      checkins: [],
    });
  }
  return arr;
}

/** Приводим legacy-форматы members к типу ClubMember[] без any */
function normalizeMembers(m: unknown): ClubMember[] {
  if (!Array.isArray(m)) return [];
  if (m.length === 0) return [];
  const first = m[0];
  // Старый формат: string[] userId
  if (typeof first === "string") {
    return (m as string[]).map((userId) => ({
      userId,
      role: "member",
      status: "approved",
      checkins: [],
    }));
  }
  // Современный формат
  return (m as ClubMember[]).map((x) => ({
    userId: x.userId,
    role: x.role ?? "member",
    status: x.status ?? "approved",
    profile: x.profile,
    checkins: Array.isArray(x.checkins) ? x.checkins : [],
  }));
}

export function seedClubs() {
  if (!isBrowser()) return;
  if (!window.localStorage.getItem(KEY)) {
    const list: ClubItem[] = [
      {
        id: uid(),
        slug: "yuridik-klub",
        title: "Yuridik klub",
        category: "Professional",
        description: "Huquqiy munozaralar, moot-sud tayyorgarligi va seminarlar.",
        nextMeeting: "2025-09-08",
        members: fakeUsers(20),
        status: "active",
        createdAt: Date.now(),
        currentAttendance: null,
      },
      {
        id: uid(),
        slug: "moot-court-jamoasi",
        title: "Moot Court jamoasi",
        category: "Takvim",
        description: "Taklifnomalar, sparringlar, milliy va xalqaro musobaqalar.",
        nextMeeting: "2025-09-06",
        members: fakeUsers(12),
        status: "active",
        createdAt: Date.now() - 1000,
        currentAttendance: null,
      },
      {
        id: uid(),
        slug: "student-kengashi",
        title: "Student kengashi",
        category: "Boshqaruv",
        description: "Talabalar tashabbuslari, tadbirlar va boshqaruv.",
        nextMeeting: "2025-09-10",
        members: fakeUsers(10),
        status: "active",
        createdAt: Date.now() - 2000,
        currentAttendance: null,
      },
    ];
    lsSet(KEY, list);
  }
}

export function getClubs(): ClubItem[] {
  seedClubs();
  const list = lsGet<ClubItem[]>(KEY, []);
  list.forEach((c) => {
    c.members = normalizeMembers(c.members);
    if (typeof c.currentAttendance === "undefined") c.currentAttendance = null;
  });
  return list;
}
export function saveClubs(list: ClubItem[]) { lsSet(KEY, list); emit(CLUBS_CHANGED); }

export function addClub(
  data: Omit<ClubItem,"id"|"slug"|"members"|"createdAt"|"status"|"currentAttendance"> & { slug?: string; status?: ClubStatus }
) {
  const item: ClubItem = {
    id: uid(),
    slug: data.slug ? slugify(data.slug) : slugify(data.title),
    title: data.title,
    category: data.category,
    description: data.description,
    nextMeeting: data.nextMeeting,
    members: [],
    status: data.status ?? "active",
    createdAt: Date.now(),
    currentAttendance: null,
  };
  const list = getClubs();
  list.unshift(item);
  saveClubs(list);
  return item;
}
export function updateClub(id: string, patch: Partial<ClubItem>) {
  const list = getClubs();
  const i = list.findIndex(c => c.id === id);
  if (i >= 0) {
    const prev = list[i];
    list[i] = { ...prev, ...patch, slug: patch.title ? slugify(patch.title) : prev.slug };
    saveClubs(list);
  }
}
export function removeClub(id: string) {
  const list = getClubs().filter(c => c.id !== id);
  saveClubs(list);
}
export function getClubBySlug(slug: string) {
  return getClubs().find(c => c.slug === slug || c.id === slug);
}

export function isApprovedMember(c: ClubItem, userId: string) {
  return c.members.some(m => m.userId === userId && m.status === "approved");
}
export function isMemberAny(c: ClubItem, userId: string) {
  return c.members.some(m => m.userId === userId);
}

export function requestJoinClub(id: string, userId: string, profile?: ClubMember["profile"]) {
  const list = getClubs();
  const i = list.findIndex(c => c.id === id);
  if (i < 0) return;
  const c = list[i];
  if (c.members.some(m => m.userId === userId)) return;
  c.members.push({ userId, role: "member", status: "pending", profile, checkins: [] });
  saveClubs(list);
  emit(MEMBERSHIP_CHANGED);
}

export function reviewJoin(clubId: string, userId: string, action: "approve" | "reject" | "freeze") {
  const list = getClubs();
  const i = list.findIndex(c => c.id === clubId);
  if (i < 0) return;
  const m = list[i].members.find(x => x.userId === userId);
  if (!m) return;
  if (action === "approve") m.status = "approved";
  else if (action === "reject") m.status = "rejected";
  else m.status = "pending";
  saveClubs(list);
  emit(MEMBERSHIP_CHANGED);
}

export function setMemberRole(clubId: string, userId: string, role: MemberRole) {
  const list = getClubs();
  const i = list.findIndex(c => c.id === clubId);
  if (i < 0) return;
  const m = list[i].members.find(x => x.userId === userId);
  if (!m) return;
  m.role = role;
  saveClubs(list);
  emit(MEMBERSHIP_CHANGED);
}

export function inviteToClub(clubId: string, userId: string, profile?: ClubMember["profile"]) {
  const list = getClubs();
  const i = list.findIndex(c => c.id === clubId);
  if (i < 0) return;
  const c = list[i];
  if (c.members.some(m => m.userId === userId)) return;
  c.members.push({ userId, role: "member", status: "invited", profile, checkins: [] });
  saveClubs(list);
  emit(MEMBERSHIP_CHANGED);
}
export function acceptInvite(clubId: string, userId: string) {
  const list = getClubs();
  const i = list.findIndex(c => c.id === clubId);
  if (i < 0) return false;
  const m = list[i].members.find(x => x.userId === userId && x.status === "invited");
  if (!m) return false;
  m.status = "approved";
  saveClubs(list);
  emit(MEMBERSHIP_CHANGED);
  return true;
}

export function joinClubDirect(id: string, userId: string) {
  const list = getClubs();
  const i = list.findIndex(c => c.id === id);
  if (i < 0) return;
  if (!list[i].members.some(m => m.userId === userId)) {
    list[i].members.push({ userId, role: "member", status: "approved", checkins: [] });
    saveClubs(list); emit(MEMBERSHIP_CHANGED);
  }
}
export function leaveClub(id: string, userId: string) {
  const list = getClubs();
  const i = list.findIndex(c => c.id === id);
  if (i < 0) return;
  list[i].members = list[i].members.filter(u => u.userId !== userId);
  saveClubs(list); emit(MEMBERSHIP_CHANGED);
}
export function myClubs(userId: string) {
  return getClubs().filter(c => c.members.some(m => m.userId === userId && m.status === "approved"));
}

export function startAttendance(clubId: string, code?: string, dateISO?: string) {
  const list = getClubs();
  const i = list.findIndex(c => c.id === clubId);
  if (i < 0) return;
  const codeVal = code || Math.floor(100000 + Math.random() * 900000).toString();
  const dt = dateISO || new Date().toISOString().slice(0, 10);
  list[i].currentAttendance = { code: codeVal, date: dt, present: [] };
  saveClubs(list);
}
export function stopAttendance(clubId: string) {
  const list = getClubs();
  const i = list.findIndex(c => c.id === clubId);
  if (i < 0) return;
  list[i].currentAttendance = null;
  saveClubs(list);
}
export function checkInByCode(clubId: string, userId: string, code: string) {
  const list = getClubs();
  const i = list.findIndex(c => c.id === clubId);
  if (i < 0) return false;
  const c = list[i];
  if (!c.currentAttendance || c.currentAttendance.code !== code) return false;
  if (!c.currentAttendance.present.includes(userId)) c.currentAttendance.present.push(userId);
  const m = c.members.find(x => x.userId === userId);
  if (m && !m.checkins.includes(c.currentAttendance.date)) m.checkins.push(c.currentAttendance.date);
  saveClubs(list);
  return true;
}

export function exportMembersCSV(clubId: string): string {
  const c = getClubs().find(x => x.id === clubId);
  if (!c) return "";
  const header = ["userId","fullName","phone","faculty","course","role","status","checkins"].join(",");
  const rows = c.members.map(m => [
    m.userId,
    m.profile?.fullName ?? "",
    m.profile?.phone ?? "",
    m.profile?.faculty ?? "",
    m.profile?.course ?? "",
    m.role,
    m.status,
    (m.checkins || []).join("|"),
  ].map(v => `"${String(v).replace(/"/g,'""')}"`).join(","));
  return [header, ...rows].join("\n");
}

export function importMembersCSV(clubId: string, csv: string) {
  const list = getClubs();
  const i = list.findIndex(c => c.id === clubId);
  if (i < 0) return;
  const lines = csv.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  if (lines.length <= 1) return;

  const rows: ClubMember[] = lines.slice(1).map((l) => {
    const cols = l.match(/("([^"]|"")*"|[^,]+)/g) ?? [];
    const unq = cols.map(c => c.replace(/^"|"$/g,"").replace(/""/g,'"'));
    const [userId,fullName,phone,faculty,course,role,status,checkins] = unq;

    const ch = (checkins || "").split("|").filter(Boolean);
    const r: MemberRole = role === "coordinator" ? "coordinator" : role === "volunteer" ? "volunteer" : "member";
    const s: MemberStatus = status === "approved" || status === "invited" || status === "rejected" ? (status as MemberStatus) : "pending";

    return {
      userId: userId || uid(),
      role: r,
      status: s,
      profile: { fullName, phone, faculty, course },
      checkins: ch,
    };
  });

  list[i].members = rows;
  saveClubs(list);
  emit(MEMBERSHIP_CHANGED);
}
