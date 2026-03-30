-- Migration: Add recurring fields to tasks_v2 table
-- Date: 2026-03-30
-- Purpose: Support recurring tasks with configurable frequency

ALTER TABLE tasks_v2
ADD COLUMN is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN recurring_frequency TEXT CHECK (recurring_frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
ADD COLUMN recurring_days TEXT[] NOT NULL DEFAULT '{}';
