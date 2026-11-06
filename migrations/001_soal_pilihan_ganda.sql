-- Menambahkan dukungan soal pilihan ganda pada tabel soal
ALTER TABLE soal
  ADD COLUMN jenis_soal ENUM('esai','pilihan_ganda') NOT NULL DEFAULT 'esai' AFTER bobot,
  ADD COLUMN pilihan_a TEXT NULL AFTER jenis_soal,
  ADD COLUMN pilihan_b TEXT NULL AFTER pilihan_a,
  ADD COLUMN pilihan_c TEXT NULL AFTER pilihan_b,
  ADD COLUMN pilihan_d TEXT NULL AFTER pilihan_c,
  ADD COLUMN jawaban_benar ENUM('A','B','C','D') NULL AFTER pilihan_d;
