-- Menambahkan tipe soal "upload" (peserta mengunggah berkas Excel/PDF/PNG)
ALTER TABLE soal
  MODIFY COLUMN jenis_soal ENUM('esai','pilihan_ganda','upload') NOT NULL DEFAULT 'esai';
