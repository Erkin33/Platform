export type EventKind = "Takvim" | "Seminar" | "Imtihon";
export type EventStatus = "open" | "waitlist" | "closed";

export type EventDetails = {
  about?: string;
  agenda?: string;
  speakers?: string;
  materials?: string;
};

export type RegistrationStatus = "pending" | "approved" | "rejected" | "frozen";
export type RegistrationMode = "individual" | "team";

export type RegistrationForm = {
  fullName: string;
  phone: string;
  email: string;
  faculty: string;
  course: string;
  group?: string;
  note?: string;
};

export type Team = {
  id: string;
  name: string;
  ownerId: string;
  members: string[];
  invites: string[];
};

export type Registration = {
  id: string;
  eventId: string;
  userId: string;
  mode: RegistrationMode;
  status: RegistrationStatus;
  teamId?: string;
  form: RegistrationForm;
  createdAt: number;
};

export type EventItem = {
  id: string;
  slug: string;
  title: string;
  kind: EventKind;
  start: string;
  end: string;
  location: string;
  capacity: number;
  status: EventStatus;
  description?: string;
  details?: EventDetails;
  participants: string[];
  registrations: Registration[];
  teams: Team[];
  createdAt: number;
};

const KEYS = { EVENTS: "uniplatform_events_v2" } as const;
export const EVENTS_CHANGED = "uniplatform_events_changed";

const isBrowser = () => typeof window !== "undefined";
export const uid = () => Math.random().toString(36).slice(2, 10);
export const slugify = (s: string) => s.toLowerCase().replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-");

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
  try { window.dispatchEvent(new Event(EVENTS_CHANGED)); } catch {}
}

function seed() {
  if (!isBrowser()) return;
  if (!window.localStorage.getItem(KEYS.EVENTS)) {
    const now = new Date();
    const add = (d: number, h = 10, durMin = 120) => {
      const s = new Date(now);
      s.setDate(s.getDate() + d);
      s.setHours(h, 0, 0, 0);
      const e = new Date(s);
      e.setMinutes(e.getMinutes() + durMin);
      return { start: s.toISOString(), end: e.toISOString() };
    };
    const base: EventItem[] = [
      {
        id: uid(),
        slug: "moot-court-takmimi",
        title: "Moot Court takmimi",
        kind: "Takvim",
        ...add(3),
        location: "Aula zali",
        capacity: 30,
        status: "open",
        description: "Amaliy musobaqa.",
        details: {},
        participants: [],
        registrations: [],
        teams: [],
        createdAt: Date.now()
      },
      {
        id: uid(),
        slug: "yuridik-seminar",
        title: "Yuridik seminar",
        kind: "Seminar",
        ...add(7),
        location: "201-xona",
        capacity: 50,
        status: "open",
        description: "Huquq bo‘yicha seminar.",
        details: {},
        participants: [],
        registrations: [],
        teams: [],
        createdAt: Date.now()
      },
      {
        id: uid(),
        slug: "bahorgi-imtihonlar",
        title: "Bahorgi imtihonlar",
        kind: "Imtihon",
        ...add(12),
        location: "Barcha xonalar",
        capacity: 120,
        status: "waitlist",
        description: "Yakuniy nazorat.",
        details: {},
        participants: [],
        registrations: [],
        teams: [],
        createdAt: Date.now()
      }
    ];
    lsSet(KEYS.EVENTS, base);
  }
}
seed();

export function getEvents(): EventItem[] {
  seed();
  return lsGet<EventItem[]>(KEYS.EVENTS, []).sort((a, b) => b.createdAt - a.createdAt);
}
export function saveEvents(list: EventItem[]) { lsSet(KEYS.EVENTS, list); }
export function addEvent(data: Omit<EventItem, "id"|"slug"|"participants"|"registrations"|"teams"|"createdAt">) {
  const list = getEvents();
  const ev: EventItem = { id: uid(), slug: slugify(data.title), participants: [], registrations: [], teams: [], createdAt: Date.now(), ...data };
  list.unshift(ev); saveEvents(list); return ev;
}
export function updateEvent(id: string, patch: Partial<EventItem>) {
  const list = getEvents();
  const i = list.findIndex(x => x.id === id);
  if (i >= 0) { list[i] = { ...list[i], ...patch }; saveEvents(list); }
}
export function removeEvent(id: string) { saveEvents(getEvents().filter(x => x.id !== id)); }
export function getEventBySlug(slug: string) { return getEvents().find(x => x.slug === slug); }
export function updateEventBySlug(slug: string, patch: Partial<EventItem>) {
  const list = getEvents();
  const i = list.findIndex(x => x.slug === slug);
  if (i >= 0) { list[i] = { ...list[i], ...patch }; saveEvents(list); }
}

export function getUserRegistration(ev: EventItem, userId: string) {
  return ev.registrations.find(r => r.userId === userId);
}
export function myRegStatus(ev: EventItem, userId: string): RegistrationStatus | null {
  return getUserRegistration(ev, userId)?.status ?? null;
}
export function isRegistered(ev: EventItem, userId: string) {
  return ev.participants.includes(userId);
}
export function spotsLeft(ev: EventItem) {
  const count = ev.participants.length;
  return Math.max(0, ev.capacity - count);
}
export function userTeamId(ev: EventItem, userId: string) {
  const t = ev.teams.find(t => t.ownerId === userId || t.members.includes(userId) || t.invites.includes(userId));
  return t?.id;
}
export function hasInvite(ev: EventItem, userId: string) {
  return !!ev.teams.find(t => t.invites.includes(userId));
}

export function requestRegistration(params: {
  eventId: string;
  userId: string;
  mode: RegistrationMode;
  form: RegistrationForm;
  teamName?: string;
  inviteUserIds?: string[];
}) {
  const list = getEvents();
  const i = list.findIndex(x => x.id === params.eventId);
  if (i < 0) throw new Error("Event not found");
  const ev = list[i];
  if (params.mode === "team") {
    const has = userTeamId(ev, params.userId);
    if (has) throw new Error("Siz ushbu tadbir uchun boshqa jamoaga bog‘langansiz.");
  }
  const reg: Registration = {
    id: uid(),
    eventId: ev.id,
    userId: params.userId,
    mode: params.mode,
    status: "pending",
    form: params.form,
    createdAt: Date.now()
  };
  if (params.mode === "team") {
    const team: Team = {
      id: uid(),
      name: params.teamName?.trim() || "Jamoa",
      ownerId: params.userId,
      members: [params.userId],
      invites: (params.inviteUserIds || []).filter(Boolean)
    };
    ev.teams.push(team);
    reg.teamId = team.id;
  }
  ev.registrations.unshift(reg);
  list[i] = ev; saveEvents(list);
  return reg;
}

export function acceptInvite(eventId: string, userId: string) {
  const list = getEvents();
  const i = list.findIndex(x => x.id === eventId);
  if (i < 0) return false;
  const ev = list[i];
  if (userTeamId(ev, userId)) return false;
  const team = ev.teams.find(t => t.invites.includes(userId));
  if (!team) return false;
  team.invites = team.invites.filter(x => x !== userId);
  team.members.push(userId);
  saveEvents(list);
  return true;
}

export function reviewRegistration(eventId: string, regId: string, action: "approve" | "reject" | "freeze") {
  const list = getEvents();
  const i = list.findIndex(x => x.id === eventId); if (i < 0) return;
  const ev = list[i];
  const r = ev.registrations.find(x => x.id === regId); if (!r) return;
  if (action === "approve") {
    r.status = "approved";
    if (r.mode === "team" && r.teamId) {
      const t = ev.teams.find(t => t.id === r.teamId);
      const add = t ? t.members : [r.userId];
      add.forEach(u => {
        if (!ev.participants.includes(u) && ev.participants.length < ev.capacity) ev.participants.push(u);
      });
    } else {
      if (!ev.participants.includes(r.userId) && ev.participants.length < ev.capacity) ev.participants.push(r.userId);
    }
  } else if (action === "reject") {
    r.status = "rejected";
  } else {
    r.status = "frozen";
  }
  saveEvents(list);
}

export function unregisterFromEvent(eventId: string, userId: string) {
  const list = getEvents(); const i = list.findIndex(x => x.id === eventId); if (i < 0) return;
  const ev = list[i];
  ev.participants = ev.participants.filter(x => x !== userId);
  const r = ev.registrations.find(r => r.userId === userId && r.status === "approved");
  if (r) r.status = "rejected";
  saveEvents(list);
}

export function registerToEvent(eventId: string, userId: string) {
  const list = getEvents(); const i = list.findIndex(x => x.id === eventId); if (i < 0) return;
  const ev = list[i];
  if (!ev.participants.includes(userId) && ev.participants.length < ev.capacity) {
    ev.participants.push(userId);
    saveEvents(list);
  }
}
