export type Student = {
  id: string;
  name: string;
  group: string;
};

const KEY = "uniplatform_students_v1";
const isBrowser = () => typeof window !== "undefined";

const SEED: Student[] = [
  { id: "u_akramov",   name: "Akramov Doston",      group: "3-kurs IT-1" },
  { id: "u_jurayev",   name: "Juraev Umid",         group: "2-kurs YUR-2" },
  { id: "u_sobirov",   name: "Sobirov Davron",      group: "1-kurs YUR-1" },
  { id: "u_norboyeva", name: "Norboyeva Laylo",     group: "4-kurs IT-2" },
  { id: "u_qodirov",   name: "Qodirov Sanjar",      group: "2-kurs YUR-3" },
  { id: "u_tursunov",  name: "Tursunov Bekmirzo",   group: "3-kurs IT-3" },
  { id: "u_olimova",   name: "Olimova Mohinur",     group: "1-kurs YUR-1" },
  { id: "u_safarov",   name: "Safarov Aziz",        group: "2-kurs IT-1" },
  { id: "u_erkinova",  name: "Erkinova Dilnoza",    group: "3-kurs YUR-2" },
  { id: "u_karimov",   name: "Karimov Islom",       group: "4-kurs IT-1" },
  { id: "u_rasulova",  name: "Rasulova Shakhnoza",  group: "2-kurs YUR-1" },
  { id: "u_khidoyat",  name: "Xidoyatov Abduaziz",  group: "1-kurs IT-2" },
  { id: "u_murodov",   name: "Murodov Sherzod",     group: "3-kurs YUR-3" },
  { id: "u_muminova",  name: "Muminova Zilola",     group: "4-kurs IT-2" },
  { id: "u_hakimov",   name: "Hakimov Sardor",      group: "2-kurs IT-2" },
  { id: "u_saidova",   name: "Saidova Maftuna",     group: "1-kurs YUR-2" },
  { id: "u_abdullay",  name: "Abdullaev Diyor",     group: "3-kurs IT-4" },
  { id: "u_yusupov",   name: "Yusupov Eldor",       group: "4-kurs YUR-1" },
  { id: "u_orifjon",   name: "Orifjonov Jasur",     group: "2-kurs IT-3" },
  { id: "u_rahimov",   name: "Rahimov Abror",       group: "1-kurs IT-1" },
];

export function getStudents(): Student[] {
  if (!isBrowser()) return SEED;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      localStorage.setItem(KEY, JSON.stringify(SEED));
      return SEED;
    }
    return JSON.parse(raw) as Student[];
  } catch {
    return SEED;
  }
}

export function findStudent(id: string): Student | undefined {
  return getStudents().find((s) => s.id === id);
}
