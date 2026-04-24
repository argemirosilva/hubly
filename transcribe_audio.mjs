import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
require('dotenv').config({ path: '.env' });

const apiUrl = process.env.BUILT_IN_FORGE_API_URL?.replace(/\/$/, '');
const apiKey = process.env.BUILT_IN_FORGE_API_KEY;

const audioBuffer = readFileSync('/home/ubuntu/upload/audio_novo.mp3');
const b64 = audioBuffer.toString('base64');

// Usar a API de transcrição via JSON com base64
const resp = await fetch(`${apiUrl}/v1/audio/transcriptions`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'whisper-1',
    language: 'pt',
    file: b64,
    file_name: 'audio.mp3',
  }),
});

const text = await resp.text();
console.log('STATUS:', resp.status);
try {
  const json = JSON.parse(text);
  console.log('TRANSCRIÇÃO:', json.text || JSON.stringify(json));
} catch {
  console.log('RAW:', text.slice(0, 500));
}
