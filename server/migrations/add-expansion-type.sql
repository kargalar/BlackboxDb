-- Add type column to expansion table for distinguishing DLC and Remake
-- Default value is 'dlc' for backward compatibility

ALTER TABLE expansion 
ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'dlc' NOT NULL;

-- Add index for type column
CREATE INDEX IF NOT EXISTS expansion_type_idx ON expansion(type);

-- Update existing records to have 'dlc' type (should already be set by default)
UPDATE expansion SET type = 'dlc' WHERE type IS NULL;
