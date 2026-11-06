-- Skema database CBT REI (tanpa data peserta/nilai)
-- Hasil ekspor dari db_cbt_rei, MySQL 8.4
-- Import: mysql -u root db_cbt_rei < database/schema.sql

CREATE DATABASE IF NOT EXISTS db_cbt_rei CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE db_cbt_rei;

-- MySQL dump 10.13  Distrib 8.4.3, for Win64 (x86_64)
--
-- Host: localhost    Database: db_cbt_rei
-- ------------------------------------------------------
-- Server version	8.4.3

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `admin_activity_log`
--

DROP TABLE IF EXISTS `admin_activity_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `admin_activity_log` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `username` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nama` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `role` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `action` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `entity_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `detail` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_activity_created` (`created_at`),
  KEY `idx_activity_user` (`username`),
  KEY `idx_activity_action` (`action`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `admins`
--

DROP TABLE IF EXISTS `admins`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `admins` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('superadmin','admin','hr_staff') NOT NULL DEFAULT 'admin',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `nama_trainer` varchar(100) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `cabang_wa`
--

DROP TABLE IF EXISTS `cabang_wa`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cabang_wa` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nama_cabang` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `no_wa` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_nama_cabang` (`nama_cabang`)
) ENGINE=InnoDB AUTO_INCREMENT=127 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `evaluasi_batch`
--

DROP TABLE IF EXISTS `evaluasi_batch`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `evaluasi_batch` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nama_batch` varchar(100) NOT NULL,
  `aktif` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `evaluasi_kode_akses`
--

DROP TABLE IF EXISTS `evaluasi_kode_akses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `evaluasi_kode_akses` (
  `id` int NOT NULL AUTO_INCREMENT,
  `batch_id` int NOT NULL,
  `kode_akses` varchar(100) NOT NULL,
  `aktif` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_kode_akses` (`kode_akses`),
  KEY `fk_kode_akses_batch` (`batch_id`),
  CONSTRAINT `fk_kode_akses_batch` FOREIGN KEY (`batch_id`) REFERENCES `evaluasi_batch` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `evaluasi_materi`
--

DROP TABLE IF EXISTS `evaluasi_materi`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `evaluasi_materi` (
  `id` int NOT NULL AUTO_INCREMENT,
  `batch_id` int NOT NULL,
  `day_ke` int NOT NULL,
  `tanggal` date DEFAULT NULL,
  `jam` varchar(50) DEFAULT NULL,
  `materi` varchar(255) NOT NULL,
  `trainer` varchar(100) NOT NULL,
  `tipe` enum('umum','komunikasi') NOT NULL DEFAULT 'umum',
  `aktif` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_batch` (`batch_id`),
  KEY `idx_day` (`day_ke`),
  CONSTRAINT `fk_evaluasi_materi_batch` FOREIGN KEY (`batch_id`) REFERENCES `evaluasi_batch` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=47 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `evaluasi_ruangan`
--

DROP TABLE IF EXISTS `evaluasi_ruangan`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `evaluasi_ruangan` (
  `id` int NOT NULL AUTO_INCREMENT,
  `batch_id` int NOT NULL,
  `kebersihan` tinyint NOT NULL,
  `kenyamanan` tinyint NOT NULL,
  `suhu_ac` tinyint NOT NULL,
  `pencahayaan` tinyint NOT NULL,
  `kursi_meja` tinyint NOT NULL,
  `ketenangan` tinyint NOT NULL,
  `fasilitas` tinyint NOT NULL,
  `perangkat_presentasi` tinyint NOT NULL,
  `audio` tinyint NOT NULL,
  `nilai_keseluruhan` tinyint NOT NULL,
  `catatan` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `batch_id` (`batch_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `evaluasi_rundown`
--

DROP TABLE IF EXISTS `evaluasi_rundown`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `evaluasi_rundown` (
  `id` int NOT NULL AUTO_INCREMENT,
  `batch_id` int NOT NULL,
  `day_ke` tinyint NOT NULL,
  `tanggal` date NOT NULL,
  `tipe` enum('materi','opening','break','isoma','test','closing','lainnya') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'materi',
  `jam_mulai` time NOT NULL,
  `jam_selesai` time NOT NULL,
  `materi` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `trainer` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_batch_day` (`batch_id`,`day_ke`),
  KEY `idx_tanggal` (`tanggal`)
) ENGINE=InnoDB AUTO_INCREMENT=68 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `evaluasi_rundown_trainer`
--

DROP TABLE IF EXISTS `evaluasi_rundown_trainer`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `evaluasi_rundown_trainer` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `rundown_id` int NOT NULL,
  `trainer` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_rundown` (`rundown_id`),
  CONSTRAINT `fk_rundown_trainer` FOREIGN KEY (`rundown_id`) REFERENCES `evaluasi_rundown` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `evaluasi_trainer`
--

DROP TABLE IF EXISTS `evaluasi_trainer`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `evaluasi_trainer` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `batch_id` int NOT NULL,
  `materi_id` int NOT NULL,
  `trainer` varchar(100) NOT NULL,
  `materi` varchar(255) NOT NULL,
  `day_ke` int NOT NULL,
  `nilai_1` tinyint NOT NULL,
  `nilai_2` tinyint NOT NULL,
  `nilai_3` tinyint NOT NULL,
  `nilai_4` tinyint NOT NULL,
  `nilai_5` tinyint NOT NULL,
  `nilai_6` tinyint NOT NULL,
  `nilai_7` tinyint NOT NULL,
  `nilai_8` tinyint NOT NULL,
  `nilai_9` tinyint NOT NULL,
  `nilai_10` tinyint NOT NULL,
  `nilai_keseluruhan` tinyint NOT NULL,
  `catatan` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_batch` (`batch_id`),
  KEY `idx_materi` (`materi_id`),
  KEY `idx_trainer` (`trainer`),
  CONSTRAINT `fk_evaluasi_trainer_batch` FOREIGN KEY (`batch_id`) REFERENCES `evaluasi_batch` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_evaluasi_trainer_materi` FOREIGN KEY (`materi_id`) REFERENCES `evaluasi_materi` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `jawaban_3month_review`
--

DROP TABLE IF EXISTS `jawaban_3month_review`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `jawaban_3month_review` (
  `id` int NOT NULL AUTO_INCREMENT,
  `review_id` int NOT NULL,
  `pertanyaan_id` int NOT NULL,
  `checklist` enum('DONE','UNDONE') NOT NULL,
  `nilai` tinyint NOT NULL,
  `catatan` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `review_id` (`review_id`),
  KEY `pertanyaan_id` (`pertanyaan_id`),
  CONSTRAINT `fk_jawaban_3month_pertanyaan` FOREIGN KEY (`pertanyaan_id`) REFERENCES `pertanyaan_3month_review` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_jawaban_3month_review` FOREIGN KEY (`review_id`) REFERENCES `review_3month` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=47 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `jawaban_5month_review`
--

DROP TABLE IF EXISTS `jawaban_5month_review`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `jawaban_5month_review` (
  `id` int NOT NULL AUTO_INCREMENT,
  `review_id` int NOT NULL,
  `pertanyaan_id` int NOT NULL,
  `checklist` enum('DONE','UNDONE') NOT NULL,
  `nilai` tinyint NOT NULL,
  `catatan` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_review_pertanyaan` (`review_id`,`pertanyaan_id`),
  KEY `idx_review_id` (`review_id`),
  KEY `idx_pertanyaan_id` (`pertanyaan_id`),
  CONSTRAINT `fk_5month_jawaban_pertanyaan` FOREIGN KEY (`pertanyaan_id`) REFERENCES `pertanyaan_5month_review` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_5month_jawaban_review` FOREIGN KEY (`review_id`) REFERENCES `review_5month` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `jawaban_peserta`
--

DROP TABLE IF EXISTS `jawaban_peserta`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `jawaban_peserta` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_peserta` int NOT NULL,
  `id_soal` int NOT NULL,
  `jawaban` text,
  `file_path` varchar(255) DEFAULT NULL,
  `no_faktur` varchar(100) DEFAULT NULL,
  `skor_auto` int DEFAULT '0',
  `ai_confidence` decimal(5,2) DEFAULT NULL,
  `nilai` decimal(5,2) DEFAULT '0.00',
  `is_koreksi` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `data_pembukuan` text,
  `catatan_koreksi` text,
  `is_dikoreksi` tinyint(1) NOT NULL DEFAULT '0',
  `skor_ai` decimal(10,2) DEFAULT NULL,
  `koreksi_ai` text,
  `ai_keyword_terpenuhi` text,
  `ai_keyword_belum_terpenuhi` text,
  `ai_alasan` text,
  `ai_saran` text,
  `ai_model` varchar(100) DEFAULT NULL,
  `ai_checked_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `id_soal` (`id_soal`),
  CONSTRAINT `jawaban_peserta_ibfk_1` FOREIGN KEY (`id_soal`) REFERENCES `soal` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5597 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `kategori_3month_review`
--

DROP TABLE IF EXISTS `kategori_3month_review`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kategori_3month_review` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nama_kategori` varchar(150) NOT NULL,
  `urutan` int NOT NULL DEFAULT '0',
  `status` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=165 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `kategori_5month_review`
--

DROP TABLE IF EXISTS `kategori_5month_review`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kategori_5month_review` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nama_kategori` varchar(150) NOT NULL,
  `urutan` int NOT NULL DEFAULT '0',
  `status` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_nama_kategori` (`nama_kategori`)
) ENGINE=InnoDB AUTO_INCREMENT=56 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `kkm`
--

DROP TABLE IF EXISTS `kkm`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kkm` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nilai_kkm` int NOT NULL DEFAULT '675',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `materi_pelatihan`
--

DROP TABLE IF EXISTS `materi_pelatihan`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `materi_pelatihan` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nomor_materi` int NOT NULL,
  `judul` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `jenis_materi` enum('video','ppt') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'video',
  `file_materi` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `file_pdf` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `video_url` varchar(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `aktif` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_nomor_materi` (`nomor_materi`),
  KEY `idx_aktif` (`aktif`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `materi_training`
--

DROP TABLE IF EXISTS `materi_training`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `materi_training` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `nama_materi` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `deskripsi` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `status` enum('Aktif','Nonaktif') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Aktif',
  `urutan` int NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_status` (`status`),
  KEY `idx_urutan` (`urutan`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `nilai`
--

DROP TABLE IF EXISTS `nilai`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `nilai` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_peserta` int NOT NULL,
  `tes1` decimal(10,2) DEFAULT '0.00',
  `tes2` decimal(10,2) DEFAULT '0.00',
  `tes3` decimal(10,2) DEFAULT '0.00',
  `tes4` decimal(10,2) DEFAULT '0.00',
  `tes5` decimal(10,2) DEFAULT '0.00',
  `tes6` decimal(10,2) DEFAULT '0.00',
  `catatan` text,
  PRIMARY KEY (`id`),
  KEY `id_peserta` (`id_peserta`),
  CONSTRAINT `nilai_ibfk_1` FOREIGN KEY (`id_peserta`) REFERENCES `peserta` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ojt_assessment`
--

DROP TABLE IF EXISTS `ojt_assessment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ojt_assessment` (
  `id` bigint unsigned NOT NULL,
  `id_peserta` bigint unsigned NOT NULL,
  `id_checkpoint` bigint unsigned NOT NULL,
  `id_template` bigint unsigned NOT NULL,
  `id_assessor` bigint unsigned DEFAULT NULL,
  `id_reviewer` bigint unsigned DEFAULT NULL,
  `assessment_date` date DEFAULT NULL,
  `due_date` date DEFAULT NULL,
  `status` enum('DRAFT','SUBMITTED','IN_REVIEW','REJECTED','APPROVED','FINAL','CANCELLED') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'DRAFT',
  `total_score` decimal(12,2) NOT NULL DEFAULT '0.00',
  `max_score` decimal(12,2) NOT NULL DEFAULT '0.00',
  `average_score` decimal(10,4) NOT NULL DEFAULT '0.0000',
  `percentage` decimal(7,2) NOT NULL DEFAULT '0.00',
  `status_hasil` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `catatan_umum` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `submitted_at` datetime DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `finalized_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_ojt_assessment_assignment` (`id_peserta`,`id_checkpoint`,`id_template`),
  KEY `idx_ojt_assessment_peserta` (`id_peserta`),
  KEY `idx_ojt_assessment_checkpoint` (`id_checkpoint`),
  KEY `idx_ojt_assessment_template` (`id_template`),
  KEY `idx_ojt_assessment_assessor` (`id_assessor`),
  KEY `idx_ojt_assessment_reviewer` (`id_reviewer`),
  KEY `idx_ojt_assessment_status` (`status`),
  KEY `idx_ojt_assessment_due` (`due_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ojt_assessment_item`
--

DROP TABLE IF EXISTS `ojt_assessment_item`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ojt_assessment_item` (
  `id` bigint unsigned NOT NULL,
  `id_assessment` bigint unsigned NOT NULL,
  `id_indikator` bigint unsigned NOT NULL,
  `checklist_status` enum('DONE','UNDONE','NA') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `score` tinyint unsigned DEFAULT NULL,
  `interpretation` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `weight_snapshot` decimal(10,2) NOT NULL DEFAULT '1.00',
  `is_valid` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_ojt_assessment_item` (`id_assessment`,`id_indikator`),
  KEY `idx_ojt_item_assessment` (`id_assessment`),
  KEY `idx_ojt_item_indikator` (`id_indikator`),
  KEY `idx_ojt_item_score` (`score`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ojt_attachment`
--

DROP TABLE IF EXISTS `ojt_attachment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ojt_attachment` (
  `id` bigint unsigned NOT NULL,
  `id_assessment` bigint unsigned NOT NULL,
  `id_assessment_item` bigint unsigned DEFAULT NULL,
  `original_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `stored_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `storage_path` varchar(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `mime_type` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `file_extension` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `file_size` bigint unsigned DEFAULT NULL,
  `file_hash` char(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `uploaded_by` bigint unsigned DEFAULT NULL,
  `uploaded_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `idx_ojt_attachment_assessment` (`id_assessment`),
  KEY `idx_ojt_attachment_item` (`id_assessment_item`),
  KEY `idx_ojt_attachment_hash` (`file_hash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ojt_audit_log`
--

DROP TABLE IF EXISTS `ojt_audit_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ojt_audit_log` (
  `id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned DEFAULT NULL,
  `entity_type` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_id` bigint unsigned NOT NULL,
  `action` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `old_value` json DEFAULT NULL,
  `new_value` json DEFAULT NULL,
  `ip_address` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ojt_audit_entity` (`entity_type`,`entity_id`),
  KEY `idx_ojt_audit_user` (`user_id`),
  KEY `idx_ojt_audit_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ojt_checkpoint`
--

DROP TABLE IF EXISTS `ojt_checkpoint`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ojt_checkpoint` (
  `id` bigint unsigned NOT NULL,
  `kode_checkpoint` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `nama_checkpoint` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `deskripsi` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `period_value` int DEFAULT NULL,
  `period_unit` enum('DAY','WEEK','MONTH','YEAR','CUSTOM') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sequence_no` int NOT NULL DEFAULT '1',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_ojt_checkpoint_kode` (`kode_checkpoint`),
  KEY `idx_ojt_checkpoint_active` (`is_active`,`sequence_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ojt_indikator`
--

DROP TABLE IF EXISTS `ojt_indikator`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ojt_indikator` (
  `id` bigint unsigned NOT NULL,
  `id_template` bigint unsigned NOT NULL,
  `id_kategori` bigint unsigned NOT NULL,
  `parent_id` bigint unsigned DEFAULT NULL,
  `kode_indikator` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `index_name` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `assessment_part` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `method` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `evidence_description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `evidence_required` tinyint(1) NOT NULL DEFAULT '0',
  `checklist_required` tinyint(1) NOT NULL DEFAULT '0',
  `score_required` tinyint(1) NOT NULL DEFAULT '1',
  `notes_required` tinyint(1) NOT NULL DEFAULT '0',
  `allowed_file_types` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `max_file_size_mb` decimal(8,2) DEFAULT NULL,
  `weight` decimal(10,2) NOT NULL DEFAULT '1.00',
  `sequence_no` int NOT NULL DEFAULT '1',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_ojt_indikator_kode` (`id_template`,`kode_indikator`),
  KEY `idx_ojt_indikator_template` (`id_template`,`sequence_no`),
  KEY `idx_ojt_indikator_kategori` (`id_kategori`,`sequence_no`),
  KEY `idx_ojt_indikator_parent` (`parent_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ojt_kategori`
--

DROP TABLE IF EXISTS `ojt_kategori`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ojt_kategori` (
  `id` bigint unsigned NOT NULL,
  `kode_kategori` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `nama_kategori` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `deskripsi` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `sequence_no` int NOT NULL DEFAULT '1',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_ojt_kategori_kode` (`kode_kategori`),
  KEY `idx_ojt_kategori_active` (`is_active`,`sequence_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ojt_notification`
--

DROP TABLE IF EXISTS `ojt_notification`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ojt_notification` (
  `id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `reference_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reference_id` bigint unsigned DEFAULT NULL,
  `read_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ojt_notification_user` (`user_id`,`read_at`),
  KEY `idx_ojt_notification_reference` (`reference_type`,`reference_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ojt_review`
--

DROP TABLE IF EXISTS `ojt_review`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ojt_review` (
  `id` bigint unsigned NOT NULL,
  `id_assessment` bigint unsigned NOT NULL,
  `id_reviewer` bigint unsigned NOT NULL,
  `action` enum('SUBMIT','START_REVIEW','APPROVE','REJECT','REQUEST_REVISION','FINALIZE','AMEND') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `comment` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ojt_review_assessment` (`id_assessment`),
  KEY `idx_ojt_review_reviewer` (`id_reviewer`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ojt_submission_details`
--

DROP TABLE IF EXISTS `ojt_submission_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ojt_submission_details` (
  `id` int NOT NULL AUTO_INCREMENT,
  `submission_id` int NOT NULL,
  `indikator_id` int NOT NULL,
  `file_path` text NOT NULL,
  `checklist_status` enum('Done','Undone') DEFAULT 'Undone',
  `nilai_skala` int DEFAULT '1',
  `catatan_assessor` text,
  `nilai_status` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ojt_submissions`
--

DROP TABLE IF EXISTS `ojt_submissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ojt_submissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `peserta_id` int NOT NULL,
  `checkpoint_id` int NOT NULL,
  `cabang` varchar(100) NOT NULL,
  `catatan` text,
  `file_evidence` text,
  `status_hr` varchar(30) DEFAULT 'Pending',
  `total_skor` decimal(5,2) DEFAULT '0.00',
  `catatan_hr` text,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ojt_template`
--

DROP TABLE IF EXISTS `ojt_template`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ojt_template` (
  `id` bigint unsigned NOT NULL,
  `id_checkpoint` bigint unsigned NOT NULL,
  `nama_template` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `versi` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '1.0',
  `effective_date` date DEFAULT NULL,
  `status` enum('DRAFT','ACTIVE','INACTIVE','ARCHIVED') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'DRAFT',
  `keterangan` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_by` bigint unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_ojt_template_version` (`id_checkpoint`,`versi`),
  KEY `idx_ojt_template_checkpoint` (`id_checkpoint`),
  KEY `idx_ojt_template_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `penilaian_day5`
--

DROP TABLE IF EXISTS `penilaian_day5`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `penilaian_day5` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_peserta` int NOT NULL,
  `smiling_voice` tinyint DEFAULT NULL,
  `smiling_voice_catatan` text,
  `intonasi` tinyint DEFAULT NULL,
  `intonasi_catatan` text,
  `artikulasi` tinyint DEFAULT NULL,
  `artikulasi_catatan` text,
  `senyum_eye_contact` tinyint DEFAULT NULL,
  `senyum_eye_contact_catatan` text,
  `body_language` tinyint DEFAULT NULL,
  `body_language_catatan` text,
  `penyambutan_customer` tinyint DEFAULT NULL,
  `penyambutan_customer_catatan` text,
  `menanyakan_kepemilikan` tinyint DEFAULT NULL,
  `menanyakan_kepemilikan_catatan` text,
  `identitas_usia` tinyint DEFAULT NULL,
  `identitas_usia_catatan` text,
  `rekening_pribadi` tinyint DEFAULT NULL,
  `rekening_pribadi_catatan` text,
  `pengecekan_barang` tinyint DEFAULT NULL,
  `pengecekan_barang_catatan` text,
  `pembuatan_invoice` tinyint DEFAULT NULL,
  `pembuatan_invoice_catatan` text,
  `surat_pernyataan` tinyint DEFAULT NULL,
  `surat_pernyataan_catatan` text,
  `penandatanganan_dokumen` tinyint DEFAULT NULL,
  `penandatanganan_dokumen_catatan` text,
  `payment` tinyint DEFAULT NULL,
  `payment_catatan` text,
  `closing` tinyint DEFAULT NULL,
  `closing_catatan` text,
  `total_nilai` decimal(5,2) DEFAULT '0.00',
  `nilai_akhir` decimal(6,2) DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_peserta_day5` (`id_peserta`),
  CONSTRAINT `fk_penilaian_day5_peserta` FOREIGN KEY (`id_peserta`) REFERENCES `peserta` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=113 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `penilaian_day6`
--

DROP TABLE IF EXISTS `penilaian_day6`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `penilaian_day6` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_peserta` int NOT NULL,
  `nilai` int NOT NULL DEFAULT '0',
  `catatan` text,
  `nilai_akhir` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_peserta_day6` (`id_peserta`)
) ENGINE=InnoDB AUTO_INCREMENT=112 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `penilaian_manual`
--

DROP TABLE IF EXISTS `penilaian_manual`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `penilaian_manual` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_peserta` int DEFAULT NULL,
  `attitude` int DEFAULT NULL,
  `antusiasme` int DEFAULT NULL,
  `disiplin` int DEFAULT NULL,
  `loyalitas` int DEFAULT NULL,
  `total_manual` decimal(10,2) DEFAULT NULL,
  `catatan` text,
  PRIMARY KEY (`id`),
  KEY `id_peserta` (`id_peserta`),
  CONSTRAINT `penilaian_manual_ibfk_1` FOREIGN KEY (`id_peserta`) REFERENCES `peserta` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=140 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `pertanyaan_3month_review`
--

DROP TABLE IF EXISTS `pertanyaan_3month_review`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pertanyaan_3month_review` (
  `id` int NOT NULL AUTO_INCREMENT,
  `kategori_id` int NOT NULL,
  `nomor` int NOT NULL DEFAULT '0',
  `indeks_penilaian` varchar(255) NOT NULL,
  `bagian_penilaian` text NOT NULL,
  `metode_penilaian` varchar(255) NOT NULL DEFAULT 'Penilaian Langsung',
  `urutan` int NOT NULL DEFAULT '0',
  `status` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `kategori_id` (`kategori_id`),
  CONSTRAINT `fk_pertanyaan_3month_kategori` FOREIGN KEY (`kategori_id`) REFERENCES `kategori_3month_review` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `pertanyaan_5month_review`
--

DROP TABLE IF EXISTS `pertanyaan_5month_review`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pertanyaan_5month_review` (
  `id` int NOT NULL AUTO_INCREMENT,
  `kategori_id` int NOT NULL,
  `nomor` int NOT NULL DEFAULT '0',
  `indeks_penilaian` varchar(255) NOT NULL,
  `bagian_penilaian` text NOT NULL,
  `metode_penilaian` varchar(255) NOT NULL DEFAULT 'Penilaian Langsung',
  `urutan` int NOT NULL DEFAULT '0',
  `status` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_kategori_id` (`kategori_id`),
  CONSTRAINT `fk_5month_pertanyaan_kategori` FOREIGN KEY (`kategori_id`) REFERENCES `kategori_5month_review` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=36 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `peserta`
--

DROP TABLE IF EXISTS `peserta`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `peserta` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nip` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `email` varchar(150) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `status` enum('Belum Aktivasi','Aktif','Sedang Mengerjakan','Selesai') NOT NULL DEFAULT 'Belum Aktivasi',
  `nama_peserta` varchar(100) NOT NULL,
  `jabatan` varchar(100) DEFAULT NULL,
  `batch` varchar(255) NOT NULL,
  `cabang` varchar(100) DEFAULT NULL,
  `tgl_training` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `penempatan` varchar(100) DEFAULT NULL,
  `catatan` text,
  `foto_verifikasi` varchar(255) DEFAULT NULL,
  `video1_selesai` tinyint(1) NOT NULL DEFAULT '0',
  `video1_selesai_at` datetime DEFAULT NULL,
  `video2_selesai` tinyint(1) NOT NULL DEFAULT '0',
  `video2_selesai_at` datetime DEFAULT NULL,
  `training_offline_selesai` tinyint(1) NOT NULL DEFAULT '0',
  `training_offline_selesai_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nip` (`nip`)
) ENGINE=InnoDB AUTO_INCREMENT=367 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `progres_materi_peserta`
--

DROP TABLE IF EXISTS `progres_materi_peserta`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `progres_materi_peserta` (
  `id` int NOT NULL AUTO_INCREMENT,
  `peserta_id` int NOT NULL,
  `materi_id` int NOT NULL,
  `materi_type` enum('video','ppt') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `progress_seconds` decimal(12,3) NOT NULL DEFAULT '0.000',
  `duration_seconds` decimal(12,3) NOT NULL DEFAULT '0.000',
  `progress_percent` decimal(6,2) NOT NULL DEFAULT '0.00',
  `last_page` int NOT NULL DEFAULT '0',
  `total_pages` int NOT NULL DEFAULT '0',
  `materi_selesai` tinyint(1) NOT NULL DEFAULT '0',
  `materi_selesai_at` datetime DEFAULT NULL,
  `quiz_selesai` tinyint(1) NOT NULL DEFAULT '0',
  `quiz_selesai_at` datetime DEFAULT NULL,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_peserta_materi` (`peserta_id`,`materi_id`),
  KEY `idx_peserta` (`peserta_id`)
) ENGINE=InnoDB AUTO_INCREMENT=70 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `progres_peserta`
--

DROP TABLE IF EXISTS `progres_peserta`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `progres_peserta` (
  `id` int NOT NULL AUTO_INCREMENT,
  `peserta_id` int NOT NULL,
  `video_number` int NOT NULL,
  `progress_seconds` decimal(12,3) NOT NULL DEFAULT '0.000',
  `duration_seconds` decimal(12,3) NOT NULL DEFAULT '0.000',
  `progress_percent` decimal(6,2) NOT NULL DEFAULT '0.00',
  `video_selesai` tinyint(1) NOT NULL DEFAULT '0',
  `video_selesai_at` datetime DEFAULT NULL,
  `quiz_selesai` tinyint(1) NOT NULL DEFAULT '0',
  `quiz_selesai_at` datetime DEFAULT NULL,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_peserta_video` (`peserta_id`,`video_number`),
  KEY `idx_peserta` (`peserta_id`),
  KEY `idx_video` (`video_number`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `quiz_after_training_questions`
--

DROP TABLE IF EXISTS `quiz_after_training_questions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `quiz_after_training_questions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `video_slot` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Video 1',
  `nomor_soal` int NOT NULL,
  `pertanyaan` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `pilihan_a` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `pilihan_b` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `pilihan_c` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `pilihan_d` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `jawaban_benar` enum('A','B','C','D') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `bobot` int NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_video_nomor` (`video_slot`,`nomor_soal`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `quiz_berfore_training_questions`
--

DROP TABLE IF EXISTS `quiz_berfore_training_questions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `quiz_berfore_training_questions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `video_slot` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Video 1',
  `nomor_soal` int NOT NULL,
  `pertanyaan` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `pilihan_a` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `pilihan_b` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `pilihan_c` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `pilihan_d` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `jawaban_benar` enum('A','B','C','D') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `bobot` int NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_video_nomor` (`video_slot`,`nomor_soal`),
  KEY `idx_quiz_video` (`video_slot`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `quiz_materi_questions`
--

DROP TABLE IF EXISTS `quiz_materi_questions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `quiz_materi_questions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `materi_id` int NOT NULL,
  `nomor_soal` int NOT NULL,
  `pertanyaan` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `pilihan_a` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `pilihan_b` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `pilihan_c` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `pilihan_d` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `jawaban_benar` char(1) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bobot` int NOT NULL DEFAULT '1',
  `aktif` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_materi_soal` (`materi_id`,`nomor_soal`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `quiz_video_questions`
--

DROP TABLE IF EXISTS `quiz_video_questions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `quiz_video_questions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `video_number` int NOT NULL,
  `nomor_soal` int NOT NULL,
  `pertanyaan` text NOT NULL,
  `pilihan_a` varchar(500) NOT NULL,
  `pilihan_b` varchar(500) NOT NULL,
  `pilihan_c` varchar(500) NOT NULL,
  `pilihan_d` varchar(500) NOT NULL,
  `jawaban_benar` enum('A','B','C','D') NOT NULL,
  `bobot` int NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_video_quiz` (`video_number`,`nomor_soal`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `review_3month`
--

DROP TABLE IF EXISTS `review_3month`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `review_3month` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_peserta` int NOT NULL,
  `tanggal_penilaian` date NOT NULL,
  `trainer_id` int DEFAULT NULL,
  `trainer_nama` varchar(255) DEFAULT NULL,
  `catatan_umum` text NOT NULL,
  `total_indikator` int NOT NULL DEFAULT '0',
  `total_nilai` decimal(10,2) NOT NULL DEFAULT '0.00',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `id_peserta` (`id_peserta`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `review_5month`
--

DROP TABLE IF EXISTS `review_5month`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `review_5month` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_peserta` int NOT NULL,
  `tanggal_penilaian` date NOT NULL,
  `trainer_id` int DEFAULT NULL,
  `trainer_nama` varchar(255) DEFAULT NULL,
  `catatan_umum` text NOT NULL,
  `total_indikator` int NOT NULL DEFAULT '0',
  `total_nilai` decimal(10,2) NOT NULL DEFAULT '0.00',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_id_peserta` (`id_peserta`),
  KEY `idx_tanggal_penilaian` (`tanggal_penilaian`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `soal`
--

DROP TABLE IF EXISTS `soal`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `soal` (
  `id` int NOT NULL AUTO_INCREMENT,
  `day` varchar(50) NOT NULL,
  `no_soal` int NOT NULL,
  `pertanyaan` text NOT NULL,
  `kata_kunci` text NOT NULL,
  `bobot` int DEFAULT '1',
  `waktu_soal` int NOT NULL DEFAULT '0',
  `jenis_soal` enum('esai','pilihan_ganda') NOT NULL DEFAULT 'esai',
  `pilihan_a` text,
  `pilihan_b` text,
  `pilihan_c` text,
  `pilihan_d` text,
  `jawaban_benar` enum('A','B','C','D') DEFAULT NULL,
  `gambar` varchar(255) DEFAULT NULL,
  `video` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=115 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `soal_day5_aspek`
--

DROP TABLE IF EXISTS `soal_day5_aspek`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `soal_day5_aspek` (
  `id` int NOT NULL AUTO_INCREMENT,
  `kategori` varchar(100) NOT NULL,
  `nomor` int NOT NULL,
  `aspek_penilaian` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_kategori_nomor` (`kategori`,`nomor`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `soal_day6_aspek`
--

DROP TABLE IF EXISTS `soal_day6_aspek`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `soal_day6_aspek` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nomor` int NOT NULL,
  `aspek_penilaian` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `status_training_peserta`
--

DROP TABLE IF EXISTS `status_training_peserta`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `status_training_peserta` (
  `peserta_id` int NOT NULL,
  `training_submitted` tinyint(1) NOT NULL DEFAULT '0',
  `training_submitted_at` datetime DEFAULT NULL,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`peserta_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `system_logs`
--

DROP TABLE IF EXISTS `system_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `system_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nama_peserta` varchar(255) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text,
  `last_activity` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tokens`
--

DROP TABLE IF EXISTS `tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tokens` (
  `id` int NOT NULL AUTO_INCREMENT,
  `day` varchar(20) NOT NULL,
  `token_code` varchar(20) NOT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `day` (`day`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `training_malam`
--

DROP TABLE IF EXISTS `training_malam`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `training_malam` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `peserta_id` int unsigned NOT NULL,
  `nip` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `nama_peserta` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `jabatan` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cabang` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `materi` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tanggal_daftar` date NOT NULL,
  `waktu_daftar` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `status` enum('Menunggu','Disetujui','Ditolak') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Menunggu',
  PRIMARY KEY (`id`),
  KEY `idx_peserta` (`peserta_id`),
  KEY `idx_nip` (`nip`),
  KEY `idx_tanggal` (`tanggal_daftar`),
  KEY `idx_materi` (`materi`)
) ENGINE=InnoDB AUTO_INCREMENT=47 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ujian_peserta`
--

DROP TABLE IF EXISTS `ujian_peserta`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ujian_peserta` (
  `id` int NOT NULL AUTO_INCREMENT,
  `peserta_id` int DEFAULT NULL,
  `nama_peserta` varchar(100) NOT NULL,
  `nip` varchar(30) NOT NULL,
  `jabatan` varchar(100) DEFAULT NULL,
  `batch` varchar(20) DEFAULT NULL,
  `cabang` varchar(100) DEFAULT NULL,
  `day` varchar(20) NOT NULL,
  `total_skor` decimal(5,2) DEFAULT '0.00',
  `tgl_ujian` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `peserta_id` (`peserta_id`),
  CONSTRAINT `ujian_peserta_ibfk_1` FOREIGN KEY (`peserta_id`) REFERENCES `peserta` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `video_pelatihan`
--

DROP TABLE IF EXISTS `video_pelatihan`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `video_pelatihan` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nomor_video` int DEFAULT NULL,
  `day` varchar(20) NOT NULL,
  `jenis_materi` enum('video','ppt') NOT NULL DEFAULT 'video',
  `judul` varchar(255) NOT NULL,
  `deskripsi` text,
  `url_video` text,
  `file_video` varchar(255) DEFAULT NULL,
  `file_ppt` varchar(255) DEFAULT NULL,
  `file_pdf` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `video_url` text,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_nomor_video` (`nomor_video`),
  KEY `idx_video_day` (`day`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `video_progress`
--

DROP TABLE IF EXISTS `video_progress`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `video_progress` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_peserta` int NOT NULL,
  `video_id` int NOT NULL,
  `progress_percent` decimal(5,2) DEFAULT '0.00',
  `watched` tinyint(1) DEFAULT '0',
  `last_position` decimal(10,2) DEFAULT '0.00',
  `started_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_peserta_video` (`id_peserta`,`video_id`),
  KEY `idx_peserta` (`id_peserta`),
  KEY `idx_video` (`video_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `wa_otp_sessions`
--

DROP TABLE IF EXISTS `wa_otp_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `wa_otp_sessions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `no_wa` varchar(20) NOT NULL,
  `cabang` varchar(100) NOT NULL,
  `otp_code` varchar(6) NOT NULL,
  `expired_at` datetime NOT NULL,
  `is_used` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping routines for database 'db_cbt_rei'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-11-06 22:54:51
