// lib/social.ts
export type Criterion = {
  id: number;
  title: string;
  /** необязательные поля — если захотите показывать подзаголовок/примечание в UI */
  subtitle?: string;
  note?: string;
  /** тип действия: "upload" | "test" | "auto" — в UI можно использовать как бейдж */
  action?: "upload" | "test" | "auto";
  maxScore: number;
};

export type FileRef = {
  id: string;
  name: string;
  size: number;
  type: string;
  dataUrl: string;
};

export type SocialStatus =
  | "submitted"
  | "tutor_approved"
  | "deputy_approved"
  | "dean_approved"
  | "rejected";

export type SocialSubmission = {
  id: string;
  studentId: string;
  criterionId: number;
  note?: string;
  files: FileRef[];
  status: SocialStatus;
  tutorScore?: number;
  tutorComment?: string;
  tutorAt?: number;
  deputyComment?: string;
  deputyAt?: number;
  deanComment?: string;
  deanAt?: number;
  createdAt: number;
  updatedAt: number;
};

export type SocialAdjustment = {
  id: string;
  studentId: string;
  delta: number;
  comment?: string;
  actorId: string;
  createdAt: number;
};

const K = {
  CRITERIA: "uniplatform_social_criteria_v2",
  SUBS: "uniplatform_social_submissions_v2",
  ADJ: "uniplatform_social_adjustments_v1",
} as const;

export const SOCIAL_CHANGED = "uniplatform_social_changed";

const isBrowser = () => typeof window !== "undefined";
export const uid = () => Math.random().toString(36).slice(2, 10);

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
    window.dispatchEvent(new Event(SOCIAL_CHANGED));
  } catch {}
}

function seed() {
  if (!isBrowser()) return;

  // ВАЖНО: тут была опечатка CRRITERIA — исправлено на CRITERIA
  if (!window.localStorage.getItem(K.CRITERIA)) {
    const base: Criterion[] = [
      {
        id: 1,
        title: "Kitobxonlik madaniyati",
        subtitle: "100 ta eng sara badiiy adabiyotlar mutolaa qilish",
        note: "O‘quv yili davomida 8 ta kitob o‘qildi",
        action: "test",
        maxScore: 20,
      },
      {
        id: 2,
        title:
          "5 muhim tashabbus doirasidagi to‘garaklarda faol ishtiroki",
        subtitle:
          "Madaniyat, sport, IT, kitobxonlik va bandlik yo‘nalishlari",
        note: "IT to‘garakda faol ishtirok",
        action: "upload",
        maxScore: 20,
      },
      {
        id: 3,
        title: "Talabaning akademik o‘zlashtirishi",
        subtitle: "GPA ko‘rsatkichi asosida baholash",
        note: "GPA: 4.5",
        action: "auto",
        maxScore: 10,
      },
      {
        id: 4,
        title:
          "OTM ichki tartib qoidalari va Odob-axloq kodeksiga rioya etishi",
        subtitle: "Dress-kod va odob-axloq talablari",
        note: "Barcha talablarga rioya qilindi",
        action: "auto",
        maxScore: 5,
      },
      {
        id: 5,
        title:
          "Xalqaro/Respublika miqyosidagi tanlov va olimpiadalar",
        subtitle: "Fan olimpiadalari va sport musobaqalari",
        note: "Viloyat bosqichida 1-o‘rin",
        action: "upload",
        maxScore: 10,
      },
      {
        id: 6,
        title: "Darslarga to‘liq, kechikmasdan kelishi",
        subtitle: "Darslar davomati",
        note: "10 soatgacha dars qoldirish",
        action: "auto",
        maxScore: 5,
      },
      {
        id: 7,
        title: "“Ma’rifat” darsidagi faol ishtiroki",
        subtitle: "Ma’rifat darslaridagi davomat va faollik",
        note: "85% ishtirok, faol",
        action: "auto",
        maxScore: 10,
      },
      {
        id: 8,
        title: "Volontyorlik va jamoat ishlaridagi faolligi",
        subtitle: "Ma’naviy-ma’rifiy tadbirlar va hasharlar",
        note: "4 ta jamoat ishida ishtirok",
        action: "upload",
        maxScore: 5,
      },
      {
        id: 9,
        title:
          "Teatr, muzey, xiyobon, kino, tarixiy qadamjolarga tashriflar",
        subtitle: "Madaniy va tarixiy joylarga tashrif",
        note: "Har ikki oyda 1 marotaba",
        action: "upload",
        maxScore: 5,
      },
      {
        id: 10,
        title:
          "Sport bilan shug‘ullanishi va sog‘lom turmush tarzi",
        subtitle: "Sport faolligi va sog‘lom turmush tarzi",
        note: "Sport seksiyasida muntazam",
        action: "upload",
        maxScore: 5,
      },
      {
        id: 11,
        title:
          "Boshqa yo‘nalishlardagi faollik",
        subtitle: "Ijtimoiy tarmoqlar va targ‘ibot ishlari",
        note: "1 ta tadbirda tashkilotchi sifatida ishtirok",
        action: "upload",
        maxScore: 5,
      },
    ];
    lsSet(K.CRITERIA, base);
  }

  if (!window.localStorage.getItem(K.SUBS)) {
    lsSet<SocialSubmission[]>(K.SUBS, []);
  }
  if (!window.localStorage.getItem(K.ADJ)) {
    lsSet<SocialAdjustment[]>(K.ADJ, []);
  }
}
seed();

/* --------- getters / setters --------- */

export function getCriteria(): Criterion[] {
  seed();
  return lsGet<Criterion[]>(K.CRITERIA, []).slice();
}
export function getSubmissions(): SocialSubmission[] {
  seed();
  return lsGet<SocialSubmission[]>(K.SUBS, [])
    .slice()
    .sort((a, b) => b.updatedAt - a.updatedAt);
}
export function getStudentSubmissions(studentId: string) {
  return getSubmissions().filter((s) => s.studentId === studentId);
}
export function getStudentCriterionSubmission(
  studentId: string,
  criterionId: number
) {
  return (
    getSubmissions().find(
      (s) => s.studentId === studentId && s.criterionId === criterionId
    ) || null
  );
}
function saveSubs(list: SocialSubmission[]) {
  lsSet(K.SUBS, list);
}

/* --------- submit / review --------- */

export async function createOrUpdateSubmission(payload: {
  studentId: string;
  criterionId: number;
  note?: string;
  files: File[];
}) {
  const read = (f: File) =>
    new Promise<FileRef>((resolve) => {
      const r = new FileReader();
      r.onload = () =>
        resolve({
          id: uid(),
          name: f.name,
          size: f.size,
          type: f.type,
          dataUrl: String(r.result || ""),
        });
      r.readAsDataURL(f);
    });

  const converted: FileRef[] = [];
  for (const f of payload.files) converted.push(await read(f));

  const list = getSubmissions();
  const idx = list.findIndex(
    (s) =>
      s.studentId === payload.studentId &&
      s.criterionId === payload.criterionId
  );

  const base: SocialSubmission = {
    id: idx >= 0 ? list[idx].id : uid(),
    studentId: payload.studentId,
    criterionId: payload.criterionId,
    note: payload.note?.trim(),
    files: converted,
    status: "submitted",
    createdAt: idx >= 0 ? list[idx].createdAt : Date.now(),
    updatedAt: Date.now(),
  };

  if (idx >= 0) {
    // обновление с обнулением модераторских полей
    list[idx] = {
      ...list[idx],
      ...base,
      tutorScore: undefined,
      tutorComment: undefined,
      tutorAt: undefined,
      deputyAt: undefined,
      deputyComment: undefined,
      deanAt: undefined,
      deanComment: undefined,
    };
  } else list.unshift(base);

  saveSubs(list);
  return base;
}

export function reviewSubmission(params: {
  id: string;
  actorRole: "student" | "tutor" | "deputy" | "dean" | "admin";
  decision: "approve" | "reject";
  score?: number;
  comment?: string;
}) {
  const list = getSubmissions();
  const i = list.findIndex((s) => s.id === params.id);
  if (i < 0) return;
  const s = list[i];
  const now = Date.now();

  if (params.decision === "reject") {
    s.status = "rejected";
    if (params.actorRole === "tutor" || params.actorRole === "admin")
      s.tutorComment = params.comment;
    if (params.actorRole === "deputy" || params.actorRole === "admin")
      s.deputyComment = params.comment;
    if (params.actorRole === "dean" || params.actorRole === "admin")
      s.deanComment = params.comment;
    s.updatedAt = now;
    list[i] = s;
    saveSubs(list);
    return;
  }

  if (params.actorRole === "tutor") {
    s.tutorAt = now;
    s.tutorComment = params.comment;
    if (typeof params.score === "number")
      s.tutorScore = Math.max(0, params.score);
    s.status = "tutor_approved";
  } else if (params.actorRole === "deputy") {
    s.deputyAt = now;
    s.deputyComment = params.comment;
    s.status = "deputy_approved";
  } else if (params.actorRole === "dean") {
    s.deanAt = now;
    s.deanComment = params.comment;
    s.status = "dean_approved";
  } else if (params.actorRole === "admin") {
    s.tutorAt = s.tutorAt || now;
    s.deputyAt = s.deputyAt || now;
    s.deanAt = now;
    if (typeof params.score === "number")
      s.tutorScore = Math.max(0, params.score);
    s.tutorComment = s.tutorComment ?? params.comment;
    s.deputyComment = s.deputyComment ?? params.comment;
    s.deanComment = params.comment;
    s.status = "dean_approved";
  }

  s.updatedAt = now;
  list[i] = s;
  saveSubs(list);
}

/* --------- scoring --------- */

export function criterionScoreFor(
  studentId: string,
  criterionId: number
): number {
  const sub = getStudentCriterionSubmission(studentId, criterionId);
  if (!sub || sub.status !== "dean_approved") return 0;
  const max =
    getCriteria().find((c) => c.id === criterionId)?.maxScore ?? 0;
  return Math.max(0, Math.min(sub.tutorScore ?? 0, max));
}

export function totalSocialScoreFor(studentId: string): number {
  const crits = getCriteria();
  return crits.reduce(
    (sum, c) => sum + criterionScoreFor(studentId, c.id),
    0
  );
}

export function socialBreakdownFor(studentId: string) {
  const crits = getCriteria();
  return crits.map((c) => {
    const s = getStudentCriterionSubmission(studentId, c.id);
    return {
      criterion: c,
      submission: s,
      score: criterionScoreFor(studentId, c.id),
    };
  });
}

/* --- optional adjustments api (если понадобится админам докручивать баллы) --- */
export function getAdjustments(): SocialAdjustment[] {
  seed();
  return lsGet<SocialAdjustment[]>(K.ADJ, [])
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt);
}
export function adjustmentsFor(studentId: string) {
  return getAdjustments().filter((a) => a.studentId === studentId);
}
export function addAdjustment(data: {
  studentId: string;
  delta: number;
  comment?: string;
  actorId: string;
}) {
  const list = getAdjustments();
  const item: SocialAdjustment = {
    id: uid(),
    studentId: data.studentId,
    delta: Number(data.delta) || 0,
    comment: data.comment?.trim(),
    actorId: data.actorId,
    createdAt: Date.now(),
  };
  list.unshift(item);
  lsSet(K.ADJ, list);
  return item;
}
export function removeAdjustment(id: string) {
  const list = getAdjustments().filter((a) => a.id !== id);
  lsSet(K.ADJ, list);
}
export function totalSocialScoreWithAdjustments(studentId: string) {
  const base = totalSocialScoreFor(studentId);
  const extra = adjustmentsFor(studentId).reduce((s, a) => s + a.delta, 0);
  return { base, extra, total: base + extra };
}
