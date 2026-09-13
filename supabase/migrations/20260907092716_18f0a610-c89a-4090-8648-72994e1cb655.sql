CREATE TABLE public.recordings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  creator TEXT NOT NULL DEFAULT '',
  start_time TEXT NOT NULL DEFAULT '',
  end_time TEXT NOT NULL DEFAULT '',
  players TEXT NOT NULL DEFAULT '',
  assigned_to TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.recordings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recordings TO authenticated;
GRANT ALL ON public.recordings TO service_role;

ALTER TABLE public.recordings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view recordings" ON public.recordings FOR SELECT USING (true);
CREATE POLICY "Anyone can add recordings" ON public.recordings FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can edit recordings" ON public.recordings FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete recordings" ON public.recordings FOR DELETE USING (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_recordings_updated_at BEFORE UPDATE ON public.recordings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();