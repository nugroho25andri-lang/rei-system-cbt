"use client";

import { useState } from "react";
import { btnGhost, btnPrimary, Card, thClass, tdClass } from "@/components/ui";
import { manageTrainerAccessCodeAction } from "@/lib/trainer-evaluation-actions";

type BatchRow = { id: number; label: string; code: string | null; evaluations: number };

export default function AccessCodeCard({ batches }: { batches: BatchRow[] }) {
  const [codes, setCodes] = useState<Record<number, string | null>>(() => Object.fromEntries(batches.map((batch) => [batch.id, batch.code])));
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  async function run(batch: BatchRow, mode: "ensure" | "regenerate") {
    if (mode === "regenerate" && !window.confirm(`Buat kode baru untuk ${batch.label}? Kode lama tidak akan berlaku lagi.`)) return;
    setPendingId(batch.id);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.set("batch_id", String(batch.id));
      formData.set("mode", mode);
      const result = await manageTrainerAccessCodeAction(null, formData);
      if (result?.ok && result.code) {
        setCodes((current) => ({ ...current, [batch.id]: result.code! }));
        setMessage({ kind: "success", text: mode === "regenerate" ? `Kode baru ${batch.label} berhasil dibuat.` : `Kode akses ${batch.label} berhasil dibuat.` });
      } else {
        setMessage({ kind: "error", text: result?.error ?? "Kode akses gagal dibuat." });
      }
    } catch {
      setMessage({ kind: "error", text: "Kode akses gagal dibuat. Periksa koneksi lalu coba lagi." });
    } finally {
      setPendingId(null);
    }
  }

  async function copy(batch: BatchRow, code: string) {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const area = document.createElement("textarea");
      area.value = code;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      document.body.removeChild(area);
    }
    setCopiedId(batch.id);
    window.setTimeout(() => setCopiedId((current) => (current === batch.id ? null : current)), 1800);
  }

  return (
    <Card
      title="Kode Akses Form Penilaian"
      description="Kode ini dipakai peserta pada halaman /evaluasi-trainer. Peserta yang login portal tidak memerlukan kode."
      className="mb-6"
      bodyClassName="px-5 pb-4 pt-2"
    >
      {message && (
        <p role="status" className={`mx-1 mb-3 rounded-xl border px-4 py-2.5 text-sm font-medium ${message.kind === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
          {message.text}
        </p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse">
          <thead>
            <tr className="border-b border-rei-900/10">
              <th className={thClass}>Batch</th>
              <th className={thClass}>Kode akses aktif</th>
              <th className={`${thClass} text-right`}>Penilaian masuk</th>
              <th className={thClass}>Tindakan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rei-900/10">
            {batches.map((batch) => {
              const code = codes[batch.id] ?? null;
              return (
                <tr key={batch.id} className="hover:bg-gold-200/15">
                  <td className={`${tdClass} font-semibold`}>{batch.label}</td>
                  <td className={tdClass}>
                    {code ? (
                      <span className="rounded-lg border border-rei-900/15 bg-rei-100/50 px-3 py-1.5 font-mono text-sm font-extrabold tracking-wide text-rei-900">{code}</span>
                    ) : (
                      <span className="text-xs font-semibold text-rose-600">Belum ada kode</span>
                    )}
                  </td>
                  <td className={`${tdClass} text-right font-bold`}>{batch.evaluations}</td>
                  <td className={tdClass}>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {code ? (
                        <>
                          <button type="button" className={btnGhost} onClick={() => void copy(batch, code)} disabled={copiedId === batch.id}>
                            {copiedId === batch.id ? "Tersalin" : "Salin"}
                          </button>
                          <a className={btnGhost} href={`/evaluasi-trainer?kode=${encodeURIComponent(code)}`} target="_blank" rel="noreferrer">Buka form</a>
                          <button type="button" className={btnGhost} onClick={() => void run(batch, "regenerate")} disabled={pendingId === batch.id}>
                            {pendingId === batch.id ? "Memproses…" : "Ganti kode"}
                          </button>
                        </>
                      ) : (
                        <button type="button" className={btnPrimary} onClick={() => void run(batch, "ensure")} disabled={pendingId === batch.id}>
                          {pendingId === batch.id ? "Membuat…" : "Buat kode"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {!batches.length && (
              <tr><td colSpan={4} className="px-3 py-8 text-center text-sm text-rei-900/50">Belum ada batch evaluasi. Tambahkan batch pada data evaluasi terlebih dahulu.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[11px] text-rei-900/45">Kode hanya ditampilkan di dashboard admin. Membagikan tautan <b>Buka form</b> akan langsung membuka form dengan kode terisi.</p>
    </Card>
  );
}
