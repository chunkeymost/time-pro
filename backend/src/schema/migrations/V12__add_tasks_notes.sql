-- V12: Add notes column to tasks for task-level notes (hold notes)
ALTER TABLE tasks
  ADD COLUMN notes TEXT NULL DEFAULT '' AFTER progress;
