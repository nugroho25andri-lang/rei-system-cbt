import type { ReactNode } from "react";

export const inputClass =
  "w-full min-w-0 rounded-lg border border-rei-900/15 bg-white px-3 py-2.5 text-sm text-rei-900 outline-none transition placeholder:text-rei-900/35 focus:border-gold-500 focus:ring-2 focus:ring-gold-400/30";
export const selectClass = `${inputClass} pr-8`;
export const inputCompact =
  "min-w-0 rounded-lg border border-rei-900/15 bg-white px-2 py-1.5 text-xs text-rei-900 outline-none transition focus:border-gold-500 focus:ring-2 focus:ring-gold-400/30";
export const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-gold-500 px-4 py-2.5 text-sm font-bold text-rei-900 shadow-sm transition hover:bg-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-400/40 disabled:cursor-not-allowed disabled:opacity-50";
export const btnDark =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-rei-900 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-rei-800 focus:outline-none focus:ring-2 focus:ring-rei-900/30 disabled:cursor-not-allowed disabled:opacity-50";
export const btnGhost =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-rei-900/15 bg-white px-3.5 py-2 text-sm font-semibold text-rei-900 transition hover:border-gold-500 hover:bg-gold-200/40";
export const btnDanger =
  "inline-flex items-center justify-center rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 transition hover:bg-rose-100 hover:text-rose-800";
export const thClass = "whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-rei-900/55";
export const tdClass = "px-3 py-2.5 align-top text-sm text-rei-900/90";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-rei-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-rei-900/55">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, description, actions, children, className = "", bodyClassName = "" }: { title?: string; description?: string; actions?: ReactNode; children: ReactNode; className?: string; bodyClassName?: string }) {
  return (
    <section className={`rounded-2xl border border-rei-900/10 bg-white shadow-sm shadow-rei-900/5 ${className}`}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rei-900/10 px-5 py-4">
          <div>
            {title && <h2 className="text-[15px] font-bold text-rei-900">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-rei-900/50">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={`p-5 ${bodyClassName}`}>{children}</div>
    </section>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-2xl border border-rei-900/10 bg-white p-4 shadow-sm shadow-rei-900/5">
      <p className="text-[11px] font-bold uppercase tracking-wide text-rei-900/45">{label}</p>
      <p className="mt-1.5 text-2xl font-extrabold text-rei-900">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-rei-900/45">{hint}</p>}
    </div>
  );
}

export function Notice({ kind = "success", children }: { kind?: "success" | "error" | "info"; children: ReactNode }) {
  const styles = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    error: "border-rose-200 bg-rose-50 text-rose-700",
    info: "border-gold-300 bg-gold-200/50 text-rei-900",
  }[kind];
  return <p role="status" className={`mb-5 rounded-xl border px-4 py-3 text-sm font-medium ${styles}`}>{children}</p>;
}

export function TableWrap({ children }: { children: ReactNode }) {
  return <div className="-mx-5 overflow-x-auto px-5"><table className="w-full min-w-[640px] border-collapse">{children}</table></div>;
}
