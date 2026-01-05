-- Create storage bucket for audio files
INSERT INTO storage.buckets (id, name, public)
VALUES ('audio-recordings', 'audio-recordings', false);

-- Create table for audio recordings
CREATE TABLE public.audio_recordings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email_usuario TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT,
  duracao_segundos INTEGER,
  tamanho_mb NUMERIC(10,4),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audio_recordings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own recordings
CREATE POLICY "Users can view their own recordings"
ON public.audio_recordings
FOR SELECT
USING (email_usuario = current_setting('request.jwt.claims', true)::json->>'email');

-- Policy: Service role can insert recordings (from edge function)
CREATE POLICY "Service role can insert recordings"
ON public.audio_recordings
FOR INSERT
WITH CHECK (true);

-- Storage policies for audio-recordings bucket
CREATE POLICY "Service role can upload audio files"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'audio-recordings');

CREATE POLICY "Users can view their own audio files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'audio-recordings' AND auth.uid()::text = (storage.foldername(name))[1]);