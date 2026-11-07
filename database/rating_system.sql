/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.20-13.0.2-MariaDB, for Linux (x86_64)
--
-- Host: localhost    Database: rating_system
-- ------------------------------------------------------
-- Server version	13.0.2-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*M!100616 SET @OLD_NOTE_VERBOSITY=@@NOTE_VERBOSITY, NOTE_VERBOSITY=0 */;

--
-- Current Database: `rating_system`
--

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `rating_system` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */;

USE `rating_system`;

--
-- Table structure for table `label_star_levels`
--

DROP TABLE IF EXISTS `label_star_levels`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `label_star_levels` (
  `label_id` bigint(20) unsigned NOT NULL,
  `stars` tinyint(3) unsigned NOT NULL,
  PRIMARY KEY (`label_id`,`stars`),
  CONSTRAINT `fk_label_star_label` FOREIGN KEY (`label_id`) REFERENCES `labels` (`label_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_label_stars` CHECK (`stars` between 1 and 3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `label_star_levels`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `label_star_levels` WRITE;
/*!40000 ALTER TABLE `label_star_levels` DISABLE KEYS */;
INSERT INTO `label_star_levels` (`label_id`, `stars`) VALUES (1,2),
(1,3),
(2,3),
(3,3),
(4,2),
(4,3),
(5,3),
(6,3),
(7,3),
(8,3),
(9,3),
(10,3),
(11,3),
(12,2),
(13,2),
(14,1),
(14,2),
(15,1),
(15,2),
(16,2),
(17,1),
(18,1),
(19,1),
(20,1),
(20,2),
(21,2),
(21,3),
(22,1),
(22,2),
(22,3),
(23,1),
(23,2),
(23,3),
(24,2),
(24,3);
/*!40000 ALTER TABLE `label_star_levels` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `labels`
--

DROP TABLE IF EXISTS `labels`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `labels` (
  `label_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `label_name` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_by` bigint(20) unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`label_id`),
  UNIQUE KEY `label_name` (`label_name`),
  KEY `fk_label_creator` (`created_by`),
  CONSTRAINT `fk_label_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `labels`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `labels` WRITE;
/*!40000 ALTER TABLE `labels` DISABLE KEYS */;
INSERT INTO `labels` (`label_id`, `label_name`, `description`, `is_active`, `created_by`, `created_at`, `updated_at`) VALUES (1,'Helpful','Provides useful help to others',1,4,'2026-11-04 09:20:26','2026-11-04 09:20:26'),
(2,'Good Teammate','Works well with other students',1,4,'2026-11-04 09:20:26','2026-11-04 09:20:26'),
(3,'Community Contributor','Contributes positively to the community',1,4,'2026-11-04 09:20:26','2026-11-04 09:20:26'),
(4,'Respectful','Treats others with respect',1,4,'2026-11-04 09:20:26','2026-11-04 09:20:26'),
(5,'Fair','Acts fairly during evaluations',1,4,'2026-11-04 09:20:26','2026-11-04 09:20:26'),
(6,'Thorough','Pays attention to details',1,4,'2026-11-04 09:20:26','2026-11-04 09:20:26'),
(7,'Clear Explainer','Explains ideas clearly',1,4,'2026-11-04 09:20:26','2026-11-04 09:20:26'),
(8,'Helpful Feedback','Provides constructive feedback',1,4,'2026-11-04 09:20:26','2026-11-04 09:20:26'),
(9,'Well Prepared','Comes prepared for evaluations',1,4,'2026-11-04 09:20:26','2026-11-07 11:39:51'),
(10,'Knows Their Code','Understands their own code',1,4,'2026-11-04 09:20:26','2026-11-04 09:20:26'),
(11,'Open to Feedback','Accepts feedback positively',1,4,'2026-11-04 09:20:26','2026-11-04 09:20:26'),
(12,'Unreliable Teammate','Does not reliably contribute',1,4,'2026-11-04 09:20:26','2026-11-04 09:20:26'),
(13,'Disruptive','Disrupts teamwork',1,4,'2026-11-04 09:20:26','2026-11-04 09:20:26'),
(14,'Rushed','Does not give enough time to the work',1,4,'2026-11-04 09:20:26','2026-11-04 09:20:26'),
(15,'Late','Frequently arrives late',1,4,'2026-11-04 09:20:26','2026-11-04 09:20:26'),
(16,'Defensive','Does not respond constructively to feedback',1,4,'2026-11-04 09:20:26','2026-11-04 09:20:26'),
(17,'Aggressive Behavior','Displays aggressive behavior',1,4,'2026-11-04 09:20:26','2026-11-07 11:40:10'),
(18,'Disrespectful','Shows disrespect towards others',1,4,'2026-11-04 09:20:26','2026-11-04 09:20:26'),
(19,'Bad Evaluator','Does not evaluate fairly',1,4,'2026-11-04 09:20:26','2026-11-04 09:20:26'),
(20,'Unprepared','Comes unprepared',1,4,'2026-11-04 09:20:26','2026-11-04 09:20:26'),
(21,'Teamwork (demo)','Works well with others',1,19,'2026-11-07 13:58:02','2026-11-07 13:58:02'),
(22,'Communication (demo)','Clear and respectful communication',1,19,'2026-11-07 13:58:02','2026-11-07 13:58:02'),
(23,'Reliability (demo)','Delivers on time',1,19,'2026-11-07 13:58:02','2026-11-07 13:58:02'),
(24,'Leadership (demo)','Guides and motivates the team',1,19,'2026-11-07 13:58:02','2026-11-07 13:58:02');
/*!40000 ALTER TABLE `labels` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `rating_audit_logs`
--

DROP TABLE IF EXISTS `rating_audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `rating_audit_logs` (
  `log_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `rating_id` bigint(20) unsigned DEFAULT NULL,
  `performed_by` bigint(20) unsigned DEFAULT NULL,
  `action_type` enum('rating_created','rating_invalidated','rating_restored','suspicious_activity','rating_weight_changed','moderation_status_changed','moderation_decision','credibility_updated') NOT NULL,
  `reason` varchar(500) NOT NULL,
  `details` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`details`)),
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`log_id`),
  KEY `fk_audit_rating` (`rating_id`),
  KEY `fk_audit_user` (`performed_by`),
  CONSTRAINT `fk_audit_rating` FOREIGN KEY (`rating_id`) REFERENCES `ratings` (`rating_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_audit_user` FOREIGN KEY (`performed_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rating_audit_logs`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `rating_audit_logs` WRITE;
/*!40000 ALTER TABLE `rating_audit_logs` DISABLE KEYS */;
INSERT INTO `rating_audit_logs` (`log_id`, `rating_id`, `performed_by`, `action_type`, `reason`, `details`, `created_at`) VALUES (1,4,6,'rating_created','Rating created successfully','{\"window_id\":1,\"rated_user_id\":2,\"stars\":3,\"feedback\":\"ddddhddh\",\"interaction_type\":\"other\",\"interaction_details\":null,\"labels\":[{\"label_id\":3,\"stars\":3},{\"label_id\":11,\"stars\":3}],\"weight\":1,\"moderation_status\":\"normal\"}','2026-11-06 13:17:35'),
(2,5,6,'rating_created','Rating created successfully','{\"window_id\":1,\"rated_user_id\":3,\"stars\":2,\"feedback\":null,\"interaction_type\":\"other\",\"interaction_details\":null,\"labels\":[],\"weight\":1,\"moderation_status\":\"normal\"}','2026-11-06 17:51:10'),
(3,29,19,'rating_invalidated','demo: confirmed coordinated abuse','{\"old_status\":\"valid\",\"new_status\":\"invalid\"}','2026-11-07 13:58:02'),
(4,21,19,'moderation_status_changed','demo: flagged for manual review','{\"old\":\"normal\",\"new\":\"suspicious\"}','2026-11-07 13:58:02'),
(5,NULL,19,'credibility_updated','demo: credibility recalculated','{\"user\":\"demo_s6\",\"new_score\":20.00}','2026-11-07 13:58:03');
/*!40000 ALTER TABLE `rating_audit_logs` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `rating_labels`
--

DROP TABLE IF EXISTS `rating_labels`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `rating_labels` (
  `rating_id` bigint(20) unsigned NOT NULL,
  `label_id` bigint(20) unsigned NOT NULL,
  `stars` tinyint(3) unsigned NOT NULL,
  PRIMARY KEY (`rating_id`,`label_id`),
  KEY `fk_rating_label_rating` (`rating_id`,`stars`),
  KEY `fk_rating_label_allowed` (`label_id`,`stars`),
  CONSTRAINT `fk_rating_label_allowed` FOREIGN KEY (`label_id`, `stars`) REFERENCES `label_star_levels` (`label_id`, `stars`) ON UPDATE CASCADE,
  CONSTRAINT `fk_rating_label_rating` FOREIGN KEY (`rating_id`, `stars`) REFERENCES `ratings` (`rating_id`, `stars`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rating_labels`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `rating_labels` WRITE;
/*!40000 ALTER TABLE `rating_labels` DISABLE KEYS */;
INSERT INTO `rating_labels` (`rating_id`, `label_id`, `stars`) VALUES (4,3,3),
(4,11,3),
(14,21,3),
(14,22,3),
(15,23,2),
(16,21,3),
(17,23,1),
(18,22,2),
(19,24,3),
(20,24,3),
(23,23,2),
(24,22,3);
/*!40000 ALTER TABLE `rating_labels` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `rating_participants`
--

DROP TABLE IF EXISTS `rating_participants`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `rating_participants` (
  `window_id` bigint(20) unsigned NOT NULL,
  `user_id` bigint(20) unsigned NOT NULL,
  `joined_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`window_id`,`user_id`),
  KEY `fk_participant_user` (`user_id`),
  CONSTRAINT `fk_participant_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_participant_window` FOREIGN KEY (`window_id`) REFERENCES `voting_windows` (`window_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rating_participants`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `rating_participants` WRITE;
/*!40000 ALTER TABLE `rating_participants` DISABLE KEYS */;
INSERT INTO `rating_participants` (`window_id`, `user_id`, `joined_at`) VALUES (1,1,'2026-11-06 09:06:42'),
(1,2,'2026-11-06 09:06:42'),
(1,3,'2026-11-06 09:06:42'),
(1,6,'2026-11-06 09:06:42'),
(1,15,'2026-11-07 14:09:48'),
(1,16,'2026-11-07 14:09:48'),
(1,17,'2026-11-07 14:09:48'),
(1,18,'2026-11-07 14:09:48'),
(1,20,'2026-11-07 14:09:48'),
(1,21,'2026-11-07 14:09:48'),
(1,22,'2026-11-07 14:09:48'),
(1,23,'2026-11-07 14:09:48'),
(1,24,'2026-11-07 14:09:48'),
(1,25,'2026-11-07 14:09:48'),
(1,26,'2026-11-07 14:09:48'),
(1,27,'2026-11-07 14:09:48'),
(2,15,'2026-11-06 20:00:12'),
(2,16,'2026-11-06 20:00:12'),
(2,17,'2026-11-06 20:00:12'),
(2,18,'2026-11-06 20:00:12'),
(3,20,'2026-11-07 13:58:02'),
(3,21,'2026-11-07 13:58:02'),
(3,22,'2026-11-07 13:58:02'),
(3,23,'2026-11-07 13:58:02'),
(3,24,'2026-11-07 13:58:02'),
(3,25,'2026-11-07 13:58:02'),
(3,26,'2026-11-07 13:58:02'),
(3,27,'2026-11-07 13:58:02');
/*!40000 ALTER TABLE `rating_participants` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `ratings`
--

DROP TABLE IF EXISTS `ratings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ratings` (
  `rating_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `window_id` bigint(20) unsigned NOT NULL,
  `voter_id` bigint(20) unsigned NOT NULL,
  `rated_user_id` bigint(20) unsigned NOT NULL,
  `stars` tinyint(3) unsigned NOT NULL,
  `status` enum('valid','invalid') NOT NULL DEFAULT 'valid',
  `invalidated_by` bigint(20) unsigned DEFAULT NULL,
  `invalidation_reason` varchar(500) DEFAULT NULL,
  `invalidated_at` datetime DEFAULT NULL,
  `weight` decimal(4,2) NOT NULL DEFAULT 1.00,
  `moderation_status` enum('normal','suspicious','under_review','confirmed_abuse') NOT NULL DEFAULT 'normal',
  `feedback` text DEFAULT NULL,
  `interaction_type` varchar(50) DEFAULT NULL,
  `interaction_details` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`rating_id`),
  UNIQUE KEY `uq_rating_id_stars` (`rating_id`,`stars`),
  UNIQUE KEY `uq_rating_per_window` (`voter_id`,`rated_user_id`,`window_id`),
  KEY `rated_user_id` (`rated_user_id`),
  KEY `fk_rating_invalidated_by` (`invalidated_by`),
  KEY `fk_rating_window` (`window_id`),
  CONSTRAINT `1` FOREIGN KEY (`voter_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `2` FOREIGN KEY (`rated_user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_rating_invalidated_by` FOREIGN KEY (`invalidated_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_rating_window` FOREIGN KEY (`window_id`) REFERENCES `voting_windows` (`window_id`) ON UPDATE CASCADE,
  CONSTRAINT `chk_rating_stars` CHECK (`stars` between 1 and 3),
  CONSTRAINT `chk_rating_weight` CHECK (`weight` between 0.00 and 1.00)
) ENGINE=InnoDB AUTO_INCREMENT=30 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ratings`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `ratings` WRITE;
/*!40000 ALTER TABLE `ratings` DISABLE KEYS */;
INSERT INTO `ratings` (`rating_id`, `window_id`, `voter_id`, `rated_user_id`, `stars`, `status`, `invalidated_by`, `invalidation_reason`, `invalidated_at`, `weight`, `moderation_status`, `feedback`, `interaction_type`, `interaction_details`, `created_at`) VALUES (1,1,1,6,3,'valid',NULL,NULL,NULL,1.00,'normal','Great teamwork and excellent problem-solving skills. Always willing to help others.','project','Worked together on a programming project','2026-11-06 12:43:15'),
(2,1,2,6,2,'valid',NULL,NULL,NULL,1.00,'normal','Good communication and a positive attitude. Could improve consistency when working under pressure.','cluster','Collaborated during a cluster session','2026-11-06 12:43:15'),
(3,1,3,6,3,'valid',NULL,NULL,NULL,1.00,'normal','Very helpful and creative. Shows strong technical skills and supports teammates.','campus_activity','Participated together in a campus activity','2026-11-06 12:43:15'),
(4,1,6,2,3,'valid',NULL,NULL,NULL,1.00,'normal','ddddhddh','other',NULL,'2026-11-06 13:17:35'),
(5,1,6,3,2,'valid',NULL,NULL,NULL,1.00,'normal',NULL,'other',NULL,'2026-11-06 17:51:10'),
(6,2,15,16,3,'valid',NULL,NULL,NULL,1.00,'normal','Excellent teamwork and communication.',NULL,NULL,'2026-11-06 18:00:47'),
(7,2,15,17,2,'valid',NULL,NULL,NULL,1.00,'normal','Good collaboration.',NULL,NULL,'2026-11-06 19:00:47'),
(8,2,16,15,1,'valid',NULL,NULL,NULL,1.00,'normal','Poor communication during the project.',NULL,NULL,'2026-11-06 19:10:47'),
(9,2,16,18,3,'valid',NULL,NULL,NULL,1.00,'normal','Very helpful and supportive.',NULL,NULL,'2026-11-06 19:20:47'),
(10,2,17,15,2,'valid',NULL,NULL,NULL,1.00,'normal','Good effort.',NULL,NULL,'2026-11-06 19:30:47'),
(11,2,17,16,1,'valid',NULL,NULL,NULL,1.00,'suspicious','Repeated unusual rating pattern.',NULL,NULL,'2026-11-06 19:40:47'),
(12,2,18,15,3,'valid',NULL,NULL,NULL,1.00,'normal','Great work.',NULL,NULL,'2026-11-06 19:50:47'),
(13,2,18,17,1,'valid',NULL,NULL,NULL,0.50,'under_review','Needs staff review.',NULL,NULL,'2026-11-06 19:55:47'),
(14,3,20,21,3,'valid',NULL,NULL,NULL,1.00,'normal','Great teammate, very creative','project','Final year project','2026-11-07 13:58:02'),
(15,3,20,22,2,'valid',NULL,NULL,NULL,1.00,'normal','Good work overall','lab','Database lab','2026-11-07 13:58:02'),
(16,3,21,20,3,'valid',NULL,NULL,NULL,1.00,'normal','Always helpful','project','Final year project','2026-11-07 13:58:02'),
(17,3,21,22,1,'valid',NULL,NULL,NULL,1.00,'normal','Missed several deadlines','project','Mobile app','2026-11-07 13:58:02'),
(18,3,22,23,2,'valid',NULL,NULL,NULL,1.00,'normal','Clear explanations','study','Study group','2026-11-07 13:58:02'),
(19,3,22,20,3,'valid',NULL,NULL,NULL,1.00,'normal','Strong technical skills','project','Backend API','2026-11-07 13:58:02'),
(20,3,23,24,3,'valid',NULL,NULL,NULL,1.00,'normal','Led the team really well','project','Data project','2026-11-07 13:58:02'),
(21,3,24,25,1,'valid',NULL,NULL,NULL,0.50,'suspicious','Not good',NULL,NULL,'2026-11-07 13:58:02'),
(22,3,25,24,1,'valid',NULL,NULL,NULL,0.50,'under_review','Bad experience',NULL,NULL,'2026-11-07 13:58:02'),
(23,3,26,27,2,'valid',NULL,NULL,NULL,1.00,'normal','Reliable and polite','lab','Networks lab','2026-11-07 13:58:02'),
(24,3,27,26,3,'valid',NULL,NULL,NULL,1.00,'normal','Excellent communication','project','AI project','2026-11-07 13:58:02'),
(29,3,25,23,1,'invalid',19,'Confirmed coordinated abuse','2026-11-07 16:58:02',0.00,'confirmed_abuse','Spam rating',NULL,NULL,'2026-11-07 13:58:02');
/*!40000 ALTER TABLE `ratings` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `skills`
--

DROP TABLE IF EXISTS `skills`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `skills` (
  `skill_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `skill_name` varchar(100) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`skill_id`),
  UNIQUE KEY `skill_name` (`skill_name`)
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `skills`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `skills` WRITE;
/*!40000 ALTER TABLE `skills` DISABLE KEYS */;
INSERT INTO `skills` (`skill_id`, `skill_name`, `created_at`) VALUES (1,'JavaScript','2026-11-06 12:15:59'),
(2,'React','2026-11-06 12:15:59'),
(3,'Node.js','2026-11-06 12:15:59'),
(4,'Python','2026-11-06 12:15:59'),
(5,'SQL','2026-11-06 12:15:59'),
(6,'C++','2026-11-06 12:15:59'),
(7,'HTML','2026-11-06 12:15:59'),
(8,'CSS','2026-11-06 12:15:59'),
(9,'Git','2026-11-06 12:15:59'),
(10,'Problem Solving','2026-11-06 12:15:59'),
(11,'UI/UX Design','2026-11-06 12:15:59'),
(12,'Express.js','2026-11-06 12:15:59'),
(13,'Java','2026-11-06 12:15:59'),
(14,'Linux','2026-11-06 12:15:59'),
(19,'c','2026-11-06 18:25:22'),
(20,'Demo - Public Speaking','2026-11-07 13:58:02'),
(21,'Demo - Project Management','2026-11-07 13:58:02'),
(22,'Demo - Backend Development','2026-11-07 13:58:02'),
(23,'Demo - UI Design','2026-11-07 13:58:02');
/*!40000 ALTER TABLE `skills` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `suspicious_activities`
--

DROP TABLE IF EXISTS `suspicious_activities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `suspicious_activities` (
  `activity_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `window_id` bigint(20) unsigned NOT NULL,
  `user_id` bigint(20) unsigned NOT NULL,
  `related_user_id` bigint(20) unsigned DEFAULT NULL,
  `rating_id` bigint(20) unsigned DEFAULT NULL,
  `activity_type` enum('bulk_voting','mutual_voting','group_voting','retaliation','rapid_voting','extreme_voting','repeated_targeting','group_retaliation','rating_coordination','historical_behavior','rating_anomaly','flag_abuse','closed_clique','other') NOT NULL,
  `severity` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
  `description` varchar(1000) NOT NULL,
  `status` enum('pending','reviewed','dismissed','confirmed') NOT NULL DEFAULT 'pending',
  `reviewed_by` bigint(20) unsigned DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `details` longtext DEFAULT NULL,
  PRIMARY KEY (`activity_id`),
  KEY `fk_activity_window` (`window_id`),
  KEY `fk_activity_user` (`user_id`),
  KEY `fk_activity_related_user` (`related_user_id`),
  KEY `fk_activity_rating` (`rating_id`),
  KEY `fk_activity_reviewer` (`reviewed_by`),
  CONSTRAINT `fk_activity_rating` FOREIGN KEY (`rating_id`) REFERENCES `ratings` (`rating_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_activity_related_user` FOREIGN KEY (`related_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_activity_reviewer` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_activity_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_activity_window` FOREIGN KEY (`window_id`) REFERENCES `voting_windows` (`window_id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `suspicious_activities`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `suspicious_activities` WRITE;
/*!40000 ALTER TABLE `suspicious_activities` DISABLE KEYS */;
INSERT INTO `suspicious_activities` (`activity_id`, `window_id`, `user_id`, `related_user_id`, `rating_id`, `activity_type`, `severity`, `description`, `status`, `reviewed_by`, `reviewed_at`, `created_at`, `details`) VALUES (1,2,17,16,11,'repeated_targeting','high','Repeated suspicious rating behavior detected.','pending',NULL,NULL,'2026-11-06 20:00:47','{\"source\":\"test\",\"reason\":\"repeated targeting\"}'),
(2,2,18,17,13,'rating_anomaly','medium','Unusual rating pattern requires review.','pending',NULL,NULL,'2026-11-06 20:00:47','{\"source\":\"test\",\"reason\":\"rating anomaly\"}'),
(3,2,15,18,NULL,'rating_coordination','critical','Possible coordinated rating activity.','pending',NULL,NULL,'2026-11-06 20:00:47','{\"source\":\"test\",\"reason\":\"possible coordination\"}'),
(4,3,24,25,21,'retaliation','high','demo: s5 and s6 gave each other 1 star within minutes','pending',NULL,NULL,'2026-11-07 13:58:02','{\"time_gap_seconds\":120,\"pattern\":\"mutual_low_rating\"}'),
(5,3,25,23,29,'repeated_targeting','critical','demo: s6 targeted s4 with a low rating without interaction','confirmed',19,'2026-11-07 16:58:02','2026-11-07 13:58:02','{\"has_interaction\":false}');
/*!40000 ALTER TABLE `suspicious_activities` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `user_credibility`
--

DROP TABLE IF EXISTS `user_credibility`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_credibility` (
  `user_id` bigint(20) unsigned NOT NULL,
  `credibility_score` decimal(5,2) NOT NULL DEFAULT 50.00,
  `current_weight` decimal(4,2) NOT NULL DEFAULT 1.00,
  `total_ratings` int(10) unsigned NOT NULL DEFAULT 0,
  `reviewed_ratings` int(10) unsigned NOT NULL DEFAULT 0,
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`user_id`),
  CONSTRAINT `fk_user_credibility_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `chk_credibility_score` CHECK (`credibility_score` between 0 and 100),
  CONSTRAINT `chk_credibility_weight` CHECK (`current_weight` between 0 and 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_credibility`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `user_credibility` WRITE;
/*!40000 ALTER TABLE `user_credibility` DISABLE KEYS */;
INSERT INTO `user_credibility` (`user_id`, `credibility_score`, `current_weight`, `total_ratings`, `reviewed_ratings`, `updated_at`) VALUES (1,50.00,1.00,0,0,'2026-11-07 14:07:12'),
(2,50.00,1.00,0,0,'2026-11-07 14:07:12'),
(3,50.00,1.00,0,0,'2026-11-07 14:07:12'),
(6,50.00,1.00,2,0,'2026-11-06 17:51:10'),
(15,50.00,1.00,0,0,'2026-11-07 14:07:12'),
(16,50.00,1.00,0,0,'2026-11-07 14:07:12'),
(17,50.00,1.00,0,0,'2026-11-07 14:07:12'),
(18,50.00,1.00,0,0,'2026-11-07 14:07:12'),
(20,85.00,1.00,2,2,'2026-11-07 13:58:02'),
(21,78.50,1.00,2,1,'2026-11-07 13:58:02'),
(22,70.00,1.00,2,1,'2026-11-07 13:58:02'),
(23,90.00,1.00,1,1,'2026-11-07 13:58:02'),
(24,45.00,0.50,1,1,'2026-11-07 13:58:02'),
(25,20.00,0.20,2,2,'2026-11-07 13:58:02'),
(26,80.00,1.00,1,0,'2026-11-07 13:58:02'),
(27,82.00,1.00,1,0,'2026-11-07 13:58:02');
/*!40000 ALTER TABLE `user_credibility` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `user_skills`
--

DROP TABLE IF EXISTS `user_skills`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_skills` (
  `user_id` bigint(20) unsigned NOT NULL,
  `skill_id` bigint(20) unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`user_id`,`skill_id`),
  KEY `skill_id` (`skill_id`),
  CONSTRAINT `1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `2` FOREIGN KEY (`skill_id`) REFERENCES `skills` (`skill_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_skills`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `user_skills` WRITE;
/*!40000 ALTER TABLE `user_skills` DISABLE KEYS */;
INSERT INTO `user_skills` (`user_id`, `skill_id`, `created_at`) VALUES (1,1,'2026-11-06 12:16:02'),
(1,2,'2026-11-06 12:16:02'),
(1,8,'2026-11-06 12:16:02'),
(1,10,'2026-11-06 12:16:02'),
(2,4,'2026-11-06 12:16:02'),
(2,5,'2026-11-06 12:16:02'),
(2,9,'2026-11-06 12:16:02'),
(2,14,'2026-11-06 12:16:02'),
(3,1,'2026-11-06 12:16:02'),
(3,7,'2026-11-06 12:16:02'),
(3,8,'2026-11-06 12:16:02'),
(3,11,'2026-11-06 12:16:02'),
(6,1,'2026-11-06 18:25:22'),
(6,3,'2026-11-06 18:25:22'),
(6,6,'2026-11-06 18:25:22'),
(6,12,'2026-11-06 18:25:22'),
(6,19,'2026-11-06 18:25:22'),
(20,21,'2026-11-07 13:58:02'),
(20,22,'2026-11-07 13:58:02'),
(21,23,'2026-11-07 13:58:02'),
(22,22,'2026-11-07 13:58:02'),
(23,20,'2026-11-07 13:58:02'),
(24,21,'2026-11-07 13:58:02'),
(25,23,'2026-11-07 13:58:02');
/*!40000 ALTER TABLE `user_skills` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `user_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `full_name` varchar(100) NOT NULL,
  `profile_picture` varchar(500) DEFAULT NULL,
  `bio` varchar(500) DEFAULT NULL,
  `email` varchar(150) NOT NULL,
  `password_hash` varchar(255) DEFAULT NULL,
  `role` enum('student','staff') NOT NULL DEFAULT 'student',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` (`user_id`, `username`, `full_name`, `profile_picture`, `bio`, `email`, `password_hash`, `role`, `is_active`, `created_at`, `updated_at`) VALUES (1,'student1','Ahmad Ali','https://i.pravatar.cc/300?img=12','Passionate about programming, problem solving, and building creative projects.','ahmad@example.com',NULL,'student',1,'2026-11-04 09:03:48','2026-11-06 12:40:02'),
(2,'student2','Omar Khaled','https://i.pravatar.cc/300?img=14','Full-stack developer interested in React, Node.js, and database design.','omar@example.com',NULL,'student',1,'2026-11-04 09:03:48','2026-11-06 12:40:02'),
(3,'student3','Sara Ahmad','https://i.pravatar.cc/300?img=47','Creative developer who enjoys UI/UX design and learning new technologies.','sara@example.com',NULL,'student',1,'2026-11-04 09:03:48','2026-11-06 12:40:02'),
(4,'staff1','Admin Staff',NULL,NULL,'staff@example.com',NULL,'staff',1,'2026-11-04 09:03:48','2026-11-04 09:03:48'),
(5,'staff_demo','Demo Staff',NULL,NULL,'staff_demo@rating42.local','$2b$10$o8W83v4/tRCHXHThmZaPm.7HIM56RJ8SQf9.AIArre1oOe9yQ4KLK','staff',1,'2026-11-06 06:07:13','2026-11-06 06:14:43'),
(6,'student_demo','Student Demo','https://i.pravatar.cc/300?img=13','Exploring software engineering, Linux, and open-source technologies..','student_demo@rating42.local','$2b$10$.f0N7R5fCdRl/sMCZkDQJeO6Wyx298p1d4MblYQ5XMkcygBUStnWe','student',1,'2026-11-06 06:40:00','2026-11-06 18:25:22'),
(15,'student11','Student One',NULL,NULL,'student1@test.com','$2b$10$830WBioAhbtvdh3YAFrDguHmsaiA28uPklbA81.cc8qNEzVnmPlNm','student',1,'2026-11-06 19:59:22','2026-11-06 19:59:22'),
(16,'student22','Student Two',NULL,NULL,'student2@test.com','$2b$10$830WBioAhbtvdh3YAFrDguHmsaiA28uPklbA81.cc8qNEzVnmPlNm','student',1,'2026-11-06 19:59:22','2026-11-06 19:59:22'),
(17,'student33','Student Three',NULL,NULL,'student3@test.com','$2b$10$830WBioAhbtvdh3YAFrDguHmsaiA28uPklbA81.cc8qNEzVnmPlNm','student',1,'2026-11-06 19:59:22','2026-11-06 19:59:22'),
(18,'student44','Student Four',NULL,NULL,'student4@test.com','$2b$10$830WBioAhbtvdh3YAFrDguHmsaiA28uPklbA81.cc8qNEzVnmPlNm','student',1,'2026-11-06 19:59:22','2026-11-06 19:59:22'),
(19,'demo_staff','Layla Haddad','https://randomuser.me/api/portraits/women/44.jpg','Moderation staff','demo_staff@example.com',NULL,'staff',1,'2026-11-07 13:58:02','2026-11-07 13:58:02'),
(20,'demo_s1','Omar Khalil','https://randomuser.me/api/portraits/men/32.jpg','Computer science student','demo_s1@example.com',NULL,'student',1,'2026-11-07 13:58:02','2026-11-07 13:58:02'),
(21,'demo_s2','Sara Nasser','https://randomuser.me/api/portraits/women/68.jpg','Design student','demo_s2@example.com',NULL,'student',1,'2026-11-07 13:58:02','2026-11-07 13:58:02'),
(22,'demo_s3','Yousef Al-Amin','https://randomuser.me/api/portraits/men/75.jpg','Software engineering','demo_s3@example.com',NULL,'student',1,'2026-11-07 13:58:02','2026-11-07 13:58:02'),
(23,'demo_s4','Dana Mansour','https://randomuser.me/api/portraits/women/12.jpg','Data science','demo_s4@example.com',NULL,'student',1,'2026-11-07 13:58:02','2026-11-07 13:58:02'),
(24,'demo_s5','Khaled Saleh','https://randomuser.me/api/portraits/men/46.jpg','Networks student','demo_s5@example.com',NULL,'student',1,'2026-11-07 13:58:02','2026-11-07 13:58:02'),
(25,'demo_s6','Rana Jaber','https://randomuser.me/api/portraits/women/90.jpg','Cybersecurity student','demo_s6@example.com',NULL,'student',1,'2026-11-07 13:58:02','2026-11-07 13:58:02'),
(26,'demo_s7','Tariq Obeidat','https://randomuser.me/api/portraits/men/22.jpg','AI student','demo_s7@example.com',NULL,'student',1,'2026-11-07 13:58:02','2026-11-07 13:58:02'),
(27,'demo_s8','Hala Qasem','https://randomuser.me/api/portraits/women/33.jpg','Information systems','demo_s8@example.com',NULL,'student',1,'2026-11-07 13:58:02','2026-11-07 13:58:02');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `voting_windows`
--

DROP TABLE IF EXISTS `voting_windows`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `voting_windows` (
  `window_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `window_name` varchar(100) NOT NULL,
  `starts_at` datetime NOT NULL,
  `ends_at` datetime NOT NULL,
  `min_votes` int(10) unsigned NOT NULL DEFAULT 1,
  `max_votes` int(10) unsigned NOT NULL DEFAULT 5,
  `status` enum('draft','published','cancelled') NOT NULL DEFAULT 'draft',
  `created_by` bigint(20) unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`window_id`),
  KEY `fk_window_creator` (`created_by`),
  CONSTRAINT `fk_window_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`) ON UPDATE CASCADE,
  CONSTRAINT `chk_voting_dates` CHECK (`ends_at` > `starts_at`),
  CONSTRAINT `chk_vote_limits` CHECK (`max_votes` >= `min_votes`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `voting_windows`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `voting_windows` WRITE;
/*!40000 ALTER TABLE `voting_windows` DISABLE KEYS */;
INSERT INTO `voting_windows` (`window_id`, `window_name`, `starts_at`, `ends_at`, `min_votes`, `max_votes`, `status`, `created_by`, `created_at`, `updated_at`) VALUES (1,'42 Amman - Test Voting Window','2026-11-06 12:06:42','2026-11-13 12:06:42',1,5,'published',4,'2026-11-06 09:06:42','2026-11-07 11:13:09'),
(2,'Testing Voting Window','2026-11-05 23:00:12','2026-11-13 23:00:12',1,5,'published',5,'2026-11-06 20:00:12','2026-11-06 20:00:12'),
(3,'Demo Window November 2026','2026-11-01 00:00:00','2026-11-30 23:59:59',1,5,'published',19,'2026-11-07 13:58:02','2026-11-07 13:58:02');
/*!40000 ALTER TABLE `voting_windows` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Dumping routines for database 'rating_system'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*M!100616 SET NOTE_VERBOSITY=@OLD_NOTE_VERBOSITY */;

-- Dump completed on 2026-11-07 17:36:41
