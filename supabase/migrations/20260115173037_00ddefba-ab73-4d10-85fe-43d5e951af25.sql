-- Add 'pausada' status to meeting_request_status enum
ALTER TYPE meeting_request_status ADD VALUE IF NOT EXISTS 'pausada';