-- Menambahkan tipe soal "tabel" (kolom/tabel seperti Excel yang diisi langsung oleh peserta)
ALTER TABLE `soal`
  MODIFY COLUMN `jenis_soal` ENUM('esai','pilihan_ganda','upload','tabel') NOT NULL DEFAULT 'esai',
  ADD COLUMN `tabel_config` LONGTEXT NULL AFTER `jawaban_benar`;
