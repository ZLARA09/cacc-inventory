-- Schema updates for supply request enhancements
-- Run this SQL in your Supabase SQL editor before deploying the updated App.jsx

-- Add owner columns to supply_requests table
ALTER TABLE supply_requests ADD COLUMN IF NOT EXISTS owner_review TEXT;
ALTER TABLE supply_requests ADD COLUMN IF NOT EXISTS owner_warehouse TEXT;
ALTER TABLE supply_requests ADD COLUMN IF NOT EXISTS owner_shipped TEXT;
ALTER TABLE supply_requests ADD COLUMN IF NOT EXISTS owner_completed TEXT;

-- Add sub-status columns for hold/delay functionality
ALTER TABLE supply_requests ADD COLUMN IF NOT EXISTS sub_status TEXT;
ALTER TABLE supply_requests ADD COLUMN IF NOT EXISTS hold_reason TEXT;

-- Create comments table
CREATE TABLE IF NOT EXISTS supply_request_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID REFERENCES supply_requests(id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add priority fields to battalions table
ALTER TABLE battalions ADD COLUMN IF NOT EXISTS supply_priority TEXT DEFAULT 'normal';
ALTER TABLE battalions ADD COLUMN IF NOT EXISTS priority_start_date DATE;
ALTER TABLE battalions ADD COLUMN IF NOT EXISTS priority_end_date DATE;

-- Reload schema
NOTIFY pgrst, 'reload schema';
