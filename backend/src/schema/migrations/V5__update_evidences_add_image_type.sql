ALTER TABLE evidences MODIFY COLUMN type ENUM('link', 'text', 'image') NOT NULL DEFAULT 'link';
