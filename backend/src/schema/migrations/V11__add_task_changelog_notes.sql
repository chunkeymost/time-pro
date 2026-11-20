-- V11: Add notes column to task_changelog for hold/change notes audit trail
ALTER TABLE task_changelog
  ADD COLUMN notes TEXT NULL AFTER action;
