-- Memisahkan soal dan jawaban pretest dari posttest.
-- Soal yang sudah ada tetap dianggap posttest agar nilai historis tidak berubah.
ALTER TABLE `soal`
  ADD COLUMN `jenis_tes` ENUM('pretest','posttest') NOT NULL DEFAULT 'posttest' AFTER `day`,
  ADD KEY `idx_soal_jenis_tes_day` (`jenis_tes`,`day`);
