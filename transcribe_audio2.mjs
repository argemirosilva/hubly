import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
require('dotenv').config({ path: '.env' });

const apiUrl = process.env.BUILT_IN_FORGE_API_URL?.replace(/\/$/, '');
const apiKey = process.env.BUILT_IN_FORGE_API_KEY;

const audioBuffer = readFileSync('/home/ubuntu/upload/audio_maguie2.mp3');

// Construir multipart/form-data manualmente
const boundary = '----FormBoundary' + Math.random().toString(36).slice(2);

const parts = [];

// Campo model
parts.push(
  `--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\nwhisper-1`
);

// Campo language
parts.push(
  `--${boundary}\r\nContent-Disposition: form-data; name="language"\r\n\r\npt`
);

// Campo file (binário)
const fileHeader = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="audio.mp3"\r\nContent-Type: audio/mpeg\r\n\r\n`;
const fileFooter = `\r\n--${boundary}--\r\n`;

const textParts = parts.join('\r\n') + '\r\n' + fileHeader;
const textBuf = Buffer.from(textParts, 'utf-8');
const footerBuf = Buffer.from(fileFooter, 'utf-8');
const body = Buffer.concat([textBuf, audioBuffer, footerBuf]);

const resp = await fetch(`${apiUrl}/v1/audio/transcriptions`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': `multipart/form-data; boundary=${boundary}`,
    'Content-Length': body.length.toString(),
  },
  body,
});

const text = await resp.text();
console.log('STATUS:', resp.status);
try {
  const json = JSON.parse(text);
  console.log('TRANSCRIÇÃO:', json.text || JSON.stringify(json));
} catch {
  console.log('RAW:', text.slice(0, 500));
}
