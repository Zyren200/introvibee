SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) NOT NULL,
  username VARCHAR(50) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  avatar_id TINYINT UNSIGNED NOT NULL DEFAULT 1,
  predicted_personality ENUM('Introvert', 'Ambivert', 'Extrovert') DEFAULT NULL,
  personality_type ENUM('Introvert', 'Ambivert', 'Extrovert') DEFAULT NULL,
  assessment_completed TINYINT(1) NOT NULL DEFAULT 0,
  sudoku_completed TINYINT(1) NOT NULL DEFAULT 0,
  presence_status ENUM('online', 'away', 'offline') NOT NULL DEFAULT 'offline',
  last_active_at DATETIME NULL,
  last_logout_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_username (username),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_personality_type (personality_type),
  KEY idx_users_presence_status (presence_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS interests (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  personality_affinity ENUM('Introvert', 'Ambivert', 'Extrovert', 'Mixed') NOT NULL DEFAULT 'Mixed',
  is_system_defined TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_interests_name (name),
  KEY idx_interests_personality_affinity (personality_affinity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_interests (
  user_id CHAR(36) NOT NULL,
  interest_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, interest_id),
  KEY idx_user_interests_interest_id (interest_id),
  CONSTRAINT fk_user_interests_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_user_interests_interest
    FOREIGN KEY (interest_id) REFERENCES interests (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS healthy_tips (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  personality_type ENUM('Introvert', 'Ambivert', 'Extrovert') NOT NULL,
  sort_order TINYINT UNSIGNED NOT NULL,
  tip_text VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_healthy_tips_personality_order (personality_type, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS personality_questions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  question_code VARCHAR(50) NOT NULL,
  question_text TEXT NOT NULL,
  display_order TINYINT UNSIGNED NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_personality_questions_code (question_code),
  UNIQUE KEY uq_personality_questions_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS personality_question_options (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  question_id BIGINT UNSIGNED NOT NULL,
  option_code ENUM('A', 'B', 'C') NOT NULL,
  option_text TEXT NOT NULL,
  mapped_personality ENUM('Introvert', 'Ambivert', 'Extrovert') NOT NULL,
  display_order TINYINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_personality_question_option (question_id, option_code),
  KEY idx_personality_question_options_personality (mapped_personality),
  CONSTRAINT fk_personality_question_options_question
    FOREIGN KEY (question_id) REFERENCES personality_questions (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS personality_assessments (
  id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  predicted_personality ENUM('Introvert', 'Ambivert', 'Extrovert') DEFAULT NULL,
  final_personality ENUM('Introvert', 'Ambivert', 'Extrovert') NOT NULL,
  total_questions TINYINT UNSIGNED NOT NULL DEFAULT 5,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_personality_assessments_user (user_id),
  KEY idx_personality_assessments_completed (completed_at),
  CONSTRAINT fk_personality_assessments_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS personality_assessment_answers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  assessment_id CHAR(36) NOT NULL,
  question_id BIGINT UNSIGNED NOT NULL,
  answer_code ENUM('A', 'B', 'C') NOT NULL,
  mapped_personality ENUM('Introvert', 'Ambivert', 'Extrovert') NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_assessment_question_answer (assessment_id, question_id),
  KEY idx_assessment_answers_question (question_id),
  CONSTRAINT fk_assessment_answers_assessment
    FOREIGN KEY (assessment_id) REFERENCES personality_assessments (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_assessment_answers_question
    FOREIGN KEY (question_id) REFERENCES personality_questions (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_sessions (
  id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  last_used_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_sessions_token_hash (token_hash),
  KEY idx_user_sessions_user (user_id),
  KEY idx_user_sessions_expires (expires_at),
  CONSTRAINT fk_user_sessions_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sudoku_progress (
  user_id CHAR(36) NOT NULL,
  status ENUM('not_started', 'in_progress', 'completed') NOT NULL DEFAULT 'not_started',
  board_state JSON NULL,
  moves_count SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  started_at DATETIME NULL,
  completed_at DATETIME NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_sudoku_progress_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_settings (
  user_id CHAR(36) NOT NULL,
  theme_mode ENUM('light', 'dark', 'system') NOT NULL DEFAULT 'light',
  quiet_mode_enabled TINYINT(1) NOT NULL DEFAULT 0,
  quiet_mode_start TIME NOT NULL DEFAULT '22:00:00',
  quiet_mode_end TIME NOT NULL DEFAULT '07:00:00',
  quiet_mode_days JSON NULL,
  session_duration_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 30,
  break_reminder_enabled TINYINT(1) NOT NULL DEFAULT 1,
  break_duration_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 5,
  auto_start_timer TINYINT(1) NOT NULL DEFAULT 0,
  sound_enabled TINYINT(1) NOT NULL DEFAULT 1,
  message_alerts TINYINT(1) NOT NULL DEFAULT 1,
  match_suggestions TINYINT(1) NOT NULL DEFAULT 1,
  system_updates TINYINT(1) NOT NULL DEFAULT 0,
  email_notifications TINYINT(1) NOT NULL DEFAULT 0,
  quiet_hours_respect TINYINT(1) NOT NULL DEFAULT 1,
  two_factor_enabled TINYINT(1) NOT NULL DEFAULT 0,
  data_export_requested TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_user_settings_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_app_state (
  user_id CHAR(36) NOT NULL,
  stats_json JSON NULL,
  quiet_state_json JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_user_app_state_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS match_recommendations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id CHAR(36) NOT NULL,
  matched_user_id CHAR(36) NOT NULL,
  compatibility_score DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  shared_interest_count TINYINT UNSIGNED NOT NULL DEFAULT 0,
  same_personality TINYINT(1) NOT NULL DEFAULT 0,
  status ENUM('suggested', 'saved', 'messaged', 'dismissed') NOT NULL DEFAULT 'suggested',
  generated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_match_recommendations_pair (user_id, matched_user_id),
  KEY idx_match_recommendations_user_status (user_id, status),
  CONSTRAINT fk_match_recommendations_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_match_recommendations_matched_user
    FOREIGN KEY (matched_user_id) REFERENCES users (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS direct_conversations (
  id CHAR(36) NOT NULL,
  conversation_key VARCHAR(73) NOT NULL,
  user_one_id CHAR(36) NOT NULL,
  user_two_id CHAR(36) NOT NULL,
  status ENUM('active', 'archived', 'blocked', 'restricted') NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_message_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_direct_conversations_key (conversation_key),
  KEY idx_direct_conversations_user_one (user_one_id),
  KEY idx_direct_conversations_user_two (user_two_id),
  CONSTRAINT fk_direct_conversations_user_one
    FOREIGN KEY (user_one_id) REFERENCES users (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_direct_conversations_user_two
    FOREIGN KEY (user_two_id) REFERENCES users (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS direct_messages (
  id CHAR(36) NOT NULL,
  conversation_id CHAR(36) NOT NULL,
  sender_id CHAR(36) NOT NULL,
  message_type ENUM('text', 'image', 'system') NOT NULL DEFAULT 'text',
  content TEXT NULL,
  image_url LONGTEXT NULL,
  used_prompt TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  edited_at DATETIME NULL,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_direct_messages_conversation_created (conversation_id, created_at),
  KEY idx_direct_messages_sender (sender_id),
  CONSTRAINT fk_direct_messages_conversation
    FOREIGN KEY (conversation_id) REFERENCES direct_conversations (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_direct_messages_sender
    FOREIGN KEY (sender_id) REFERENCES users (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS direct_message_reads (
  message_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  read_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (message_id, user_id),
  KEY idx_direct_message_reads_user (user_id),
  CONSTRAINT fk_direct_message_reads_message
    FOREIGN KEY (message_id) REFERENCES direct_messages (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_direct_message_reads_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS direct_conversation_clears (
  conversation_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  cleared_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (conversation_id, user_id),
  KEY idx_direct_conversation_clears_user (user_id),
  CONSTRAINT fk_direct_conversation_clears_conversation
    FOREIGN KEY (conversation_id) REFERENCES direct_conversations (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_direct_conversation_clears_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS group_chats (
  id CHAR(36) NOT NULL,
  name VARCHAR(120) NOT NULL,
  created_by CHAR(36) NOT NULL,
  is_archived TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_message_at DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_group_chats_created_by (created_by),
  CONSTRAINT fk_group_chats_created_by
    FOREIGN KEY (created_by) REFERENCES users (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS group_chat_members (
  group_chat_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  role ENUM('owner', 'member') NOT NULL DEFAULT 'member',
  is_muted TINYINT(1) NOT NULL DEFAULT 0,
  joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (group_chat_id, user_id),
  KEY idx_group_chat_members_user (user_id),
  CONSTRAINT fk_group_chat_members_group
    FOREIGN KEY (group_chat_id) REFERENCES group_chats (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_group_chat_members_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS group_messages (
  id CHAR(36) NOT NULL,
  group_chat_id CHAR(36) NOT NULL,
  sender_id CHAR(36) NOT NULL,
  message_type ENUM('text', 'image', 'system') NOT NULL DEFAULT 'text',
  content TEXT NULL,
  image_url LONGTEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  edited_at DATETIME NULL,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_group_messages_group_created (group_chat_id, created_at),
  KEY idx_group_messages_sender (sender_id),
  CONSTRAINT fk_group_messages_group
    FOREIGN KEY (group_chat_id) REFERENCES group_chats (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_group_messages_sender
    FOREIGN KEY (sender_id) REFERENCES users (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS group_message_reads (
  message_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  read_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (message_id, user_id),
  KEY idx_group_message_reads_user (user_id),
  CONSTRAINT fk_group_message_reads_message
    FOREIGN KEY (message_id) REFERENCES group_messages (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_group_message_reads_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS group_chat_clears (
  group_chat_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  cleared_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (group_chat_id, user_id),
  KEY idx_group_chat_clears_user (user_id),
  CONSTRAINT fk_group_chat_clears_group
    FOREIGN KEY (group_chat_id) REFERENCES group_chats (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_group_chat_clears_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


