-- Penanda kode akses yang dibuat manual oleh admin.
-- Kode otomatis harian hanya dibuat untuk batch terbaru; batch lain
-- diaktifkan manual dan berlaku sampai akhir hari.
ALTER TABLE `evaluasi_kode_akses`
  ADD COLUMN `manual` tinyint(1) NOT NULL DEFAULT '0' AFTER `aktif`;
