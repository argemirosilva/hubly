-- Make the audio-recordings bucket public so we can get public URLs
UPDATE storage.buckets SET public = true WHERE id = 'audio-recordings';