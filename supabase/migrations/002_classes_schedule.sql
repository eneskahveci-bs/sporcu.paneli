-- 002_classes_schedule.sql
-- Sınıflara haftalık program alanları ekleniyor
ALTER TABLE classes ADD COLUMN IF NOT EXISTS schedule_days jsonb DEFAULT '[]';
ALTER TABLE classes ADD COLUMN IF NOT EXISTS schedule_time text DEFAULT '';
ALTER TABLE classes ADD COLUMN IF NOT EXISTS schedule_time_end text DEFAULT '';
