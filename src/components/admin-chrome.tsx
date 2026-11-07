"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const icons = {
  dashboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></svg>
  ),
  answers: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.9 8.9 0 0 1-3.6-.7L3 21l1.8-5.4A8.4 8.4 0 1 1 21 11.5Z" /></svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
  ),
  questions: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5h11M9 12h11M9 19h11" /><path d="m3 5 1.2 1.2L6.5 3.9M3 12l1.2 1.2 2.3-2.3M3 19l1.2 1.2 2.3-2.3" /></svg>
  ),
  participants: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" /></svg>
  ),
  recap: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18" /><path d="m7 15 4-4 3 3 5-6" /></svg>
  ),
  trainer: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2 9.2 4.5H5.5v4.3L3 12l2.5 3.2v4.3h3.7L12 22l2.8-2.5h3.7v-4.3L21 12l-2.5-3.2V4.5h-3.7Z" /><path d="m9 12 2 2 4-4" /></svg>
  ),
  aadl: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
  ),
  day6: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6M8 13h8M8 17h5" /></svg>
  ),
  accounts: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="m9 12 2 2 4-4" /></svg>
  ),
  activity: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h4l2.5-7 4 14L16 12h5" /></svg>
  ),
  database: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5" /><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" /></svg>
  ),
  logout: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5M21 12H9" /></svg>
  ),
  menu: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
  ),
  close: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
  ),
};

type Role = "superadmin" | "admin" | "hr_staff";
type NavItem = { label: string; href: string; icon: keyof typeof icons; roles: Role[] };
const ALL_ROLES: Role[] = ["superadmin", "admin", "hr_staff"];

const ROLE_LABELS: Record<Role, string> = { superadmin: "Super Admin", admin: "Admin", hr_staff: "HR Staff" };

const SECTIONS: { heading: string; items: NavItem[] }[] = [
  {
    heading: "Navigasi Utama",
    items: [
      { label: "Dashboard", href: "/admin", icon: "dashboard", roles: ALL_ROLES },
      { label: "Jawaban Peserta", href: "/jawaban-peserta", icon: "answers", roles: ALL_ROLES },
      { label: "Koreksi Jawaban", href: "/koreksi", icon: "check", roles: ALL_ROLES },
      { label: "Kelola Soal Ujian", href: "/kelola-soal", icon: "questions", roles: ALL_ROLES },
      { label: "Data Peserta", href: "/peserta", icon: "participants", roles: ["superadmin", "admin"] },
    ],
  },
  {
    heading: "Rekap & Penilaian",
    items: [
      { label: "Rekapitulasi Nilai", href: "/rekapitulasi", icon: "recap", roles: ALL_ROLES },
      { label: "Input Nilai AADL", href: "/input-nilai", icon: "aadl", roles: ALL_ROLES },
      { label: "Penilaian Day 6", href: "/test-day6", icon: "day6", roles: ALL_ROLES },
      { label: "Analisis Penilaian Trainer", href: "/analisis-trainer", icon: "trainer", roles: ["superadmin", "admin"] },
    ],
  },
  {
    heading: "Pengaturan",
    items: [
      { label: "Log Aktivitas", href: "/aktivitas", icon: "activity", roles: ["superadmin"] },
      { label: "Database", href: "/database", icon: "database", roles: ["superadmin"] },
      { label: "Manajemen Akun", href: "/akun", icon: "accounts", roles: ["superadmin", "admin"] },
    ],
  },
];

const TITLES: Record<string, string> = {
  "/admin": "Dashboard",
  "/jawaban-peserta": "Jawaban Peserta",
  "/koreksi": "Koreksi Jawaban",
  "/kelola-soal": "Kelola Soal Ujian",
  "/peserta": "Data Peserta",
  "/rekapitulasi": "Rekapitulasi Nilai",
  "/input-nilai": "Input Nilai AADL",
  "/test-day6": "Penilaian Day 6",
  "/analisis-trainer": "Analisis Penilaian Trainer",
  "/akun": "Manajemen Akun",
  "/aktivitas": "Log Aktivitas",
  "/database": "Database",
};

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin" || pathname === "/admin/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Icon({ name, className }: { name: keyof typeof icons; className?: string }) {
  return <span className={className ?? "h-5 w-5 shrink-0"} aria-hidden="true">{icons[name]}</span>;
}

export default function AdminChrome({ nama, username, role, children }: { nama: string; username: string; role: Role; children: React.ReactNode }) {
  const pathname = usePathname() || "/admin";
  const [open, setOpen] = useState(false);
  const displayName = nama || username;
  const initial = displayName.charAt(0).toUpperCase();
  const roleLabel = ROLE_LABELS[role];
  const sections = SECTIONS.map((section) => ({ ...section, items: section.items.filter((item) => item.roles.includes(role)) })).filter((section) => section.items.length > 0);
  const title = Object.entries(TITLES).find(([href]) => pathname === href || pathname.startsWith(`${href}/`))?.[1] ?? "Dashboard";

  useEffect(() => { setOpen(false); }, [pathname]);

  return (
    <div className="min-h-screen bg-[#f6f3f6]">
      <div
        className={`fixed inset-0 z-40 bg-rei-950/60 backdrop-blur-[1px] transition-opacity lg:hidden ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[272px] flex-col bg-gradient-to-b from-rei-900 via-rei-800 to-rei-900 text-gold-200 shadow-2xl shadow-rei-950/40 transition-transform duration-200 lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="relative border-b border-white/10 px-6 pb-5 pt-6">
          <a href="/admin" className="block" aria-label="Raja Emas Indonesia">
            <img src="/logo-rei.png" alt="Raja Emas Indonesia" className="h-auto w-[196px] max-w-full" />
          </a>
          <span className="mt-3 block text-[11px] font-bold uppercase tracking-[0.24em] text-gold-500">Training Assessment</span>
          <button type="button" className="absolute right-3 top-3 rounded-lg bg-white/10 p-2 text-gold-200 hover:bg-white/20 lg:hidden" onClick={() => setOpen(false)} aria-label="Tutup menu">
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>

        <nav className="sidebar-scroll flex-1 overflow-y-auto px-3.5 py-5" aria-label="Navigasi admin">
          {sections.map((section) => (
            <div key={section.heading} className="mb-5 last:mb-0">
              <div className="px-3 pb-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-gold-500/90">{section.heading}</div>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const active = isActive(pathname, item.href);
                  return (
                    <a
                      key={item.href}
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] font-semibold transition ${active ? "bg-gold-500/15 text-gold-200" : "text-gold-200/80 hover:bg-white/5 hover:text-white"}`}
                    >
                      {active && <span className="absolute inset-y-2 left-0 w-[3px] rounded-r bg-gold-500" />}
                      <Icon name={item.icon} className={`h-[18px] w-[18px] shrink-0 ${active ? "text-gold-400" : "text-gold-200/60 group-hover:text-gold-300"}`} />
                      <span>{item.label}</span>
                    </a>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 px-5 pb-5 pt-4">
          <div className="mb-3 flex items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gold-500 text-sm font-extrabold text-rei-900">{initial}</span>
            <span className="min-w-0">
              <strong className="block truncate text-sm text-white">{displayName}</strong>
              <small className="block text-[11px] text-gold-500">{roleLabel}</small>
            </span>
          </div>
          <form action="/api/auth/logout" method="post">
            <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-xs font-bold text-rose-100 transition hover:border-rose-400/60 hover:bg-rose-500/15 hover:text-white">
              <Icon name="logout" className="h-4 w-4" /> Logout
            </button>
          </form>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col lg:pl-[272px]">
        <header className="sticky top-0 z-30 flex h-[68px] items-center gap-3 border-b border-rei-900/10 bg-white/90 px-4 backdrop-blur-md sm:px-6 lg:px-8">
          <button type="button" className="rounded-lg border border-rei-900/15 bg-white p-2 text-rei-900 hover:bg-rei-100 lg:hidden" onClick={() => setOpen(true)} aria-label="Buka menu">
            <Icon name="menu" className="h-4 w-4" />
          </button>
          <div className="grid leading-tight">
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-gold-600">CBT Raja Emas Indonesia</span>
            <strong className="text-[15px] text-rei-900">{title}</strong>
          </div>
          <div className="ml-auto flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-rei-900 text-sm font-extrabold text-gold-400">{initial}</span>
            <div className="hidden leading-tight sm:grid">
              <strong className="text-[13px] text-rei-900">{displayName}</strong>
              <small className="text-[11px] text-rei-900/50">{roleLabel}</small>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
