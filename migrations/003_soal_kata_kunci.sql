-- Kata kunci esai dengan bobot per kata kunci untuk penilaian otomatis.
CREATE TABLE IF NOT EXISTS soal_kata_kunci (
  id int NOT NULL AUTO_INCREMENT,
  id_soal int NOT NULL,
  kata_kunci varchar(191) NOT NULL,
  bobot decimal(10,2) NOT NULL DEFAULT '1.00',
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_soal_kata_kunci (id_soal),
  CONSTRAINT fk_soal_kata_kunci_soal FOREIGN KEY (id_soal) REFERENCES soal (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Pecah kata_kunci lama yang dipisahkan koma menjadi baris berbobot.
-- Bobot soal dibagi rata ke seluruh kata kunci pada soal tersebut.
INSERT INTO soal_kata_kunci (id_soal, kata_kunci, bobot)
WITH RECURSIVE split AS (
  SELECT id, bobot,
         TRIM(SUBSTRING_INDEX(kata_kunci, ',', 1)) AS kw,
         SUBSTRING(kata_kunci, CHAR_LENGTH(SUBSTRING_INDEX(kata_kunci, ',', 1)) + 2) AS rest
  FROM soal
  WHERE jenis_soal = 'esai' AND TRIM(kata_kunci) <> ''
  UNION ALL
  SELECT id, bobot,
         TRIM(SUBSTRING_INDEX(rest, ',', 1)),
         SUBSTRING(rest, CHAR_LENGTH(SUBSTRING_INDEX(rest, ',', 1)) + 2)
  FROM split
  WHERE rest <> ''
)
SELECT id, kw, ROUND(bobot / COUNT(*) OVER (PARTITION BY id), 2)
FROM split
WHERE kw <> ''
  AND NOT EXISTS (SELECT 1 FROM soal_kata_kunci k WHERE k.id_soal = split.id AND k.kata_kunci = split.kw);
