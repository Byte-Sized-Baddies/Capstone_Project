-- Notes table
CREATE TABLE IF NOT EXISTS notes_v2 (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL DEFAULT 'Untitled',
  content JSONB DEFAULT '{}',
  task_id INTEGER REFERENCES tasks_v2(id) ON DELETE SET NULL,
  linked_note_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notes_v2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own notes"
  ON notes_v2 FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notes_updated_at
  BEFORE UPDATE ON notes_v2
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Integrations table (stores connected service tokens/config per user)
CREATE TABLE IF NOT EXISTS integrations_v2 (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  service TEXT NOT NULL, -- 'google_calendar' | 'slack' | 'outlook' etc.
  config JSONB DEFAULT '{}', -- webhook_url, access_token, calendar_id, etc.
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, service)
);

ALTER TABLE integrations_v2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own integrations"
  ON integrations_v2 FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER integrations_updated_at
  BEFORE UPDATE ON integrations_v2
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
