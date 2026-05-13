import fs from 'fs';

const forgeApiUrl = process.env.BUILT_IN_FORGE_API_URL;
const forgeApiKey = process.env.BUILT_IN_FORGE_API_KEY;

console.log('Forge URL:', forgeApiUrl ? forgeApiUrl.substring(0, 40) + '...' : 'NÃO DEFINIDO');
console.log('Forge Key:', forgeApiKey ? 'SIM' : 'NÃO');

const files = [
  '/home/ubuntu/upload/pasted_file_4whzCE_WhatsAppPtt2026-05-13at09.01.42.mp3',
  '/home/ubuntu/upload/pasted_file_I0S60j_WhatsAppPtt2026-05-13at09.02.26.mp3',
  '/home/ubuntu/upload/pasted_file_Oiogrl_WhatsAppPtt2026-05-13at09.03.00.mp3',
  '/home/ubuntu/upload/pasted_file_fcLXbp_WhatsAppPtt2026-05-13at09.05.11.mp3',
  '/home/ubuntu/upload/pasted_file_sHW8aC_WhatsAppPtt2026-05-13at09.16.24.mp3',
];

const baseUrl = forgeApiUrl.endsWith('/') ? forgeApiUrl : `${forgeApiUrl}/`;
const endpoint = `${baseUrl}v1/audio/transcriptions`;

for (let i = 0; i < files.length; i++) {
  console.log(`\n=== ÁUDIO ${i + 1} ===`);
  try {
    const audioBuffer = fs.readFileSync(files[i]);
    const formData = new FormData();
    const audioBlob = new Blob([new Uint8Array(audioBuffer)], { type: 'audio/mpeg' });
    formData.append('file', audioBlob, 'audio.mp3');
    formData.append('model', 'whisper-1');
    formData.append('language', 'pt');

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { authorization: `Bearer ${forgeApiKey}` },
      body: formData,
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`Erro ${response.status}:`, text);
      continue;
    }

    const result = await response.json();
    console.log(result.text);
  } catch (e) {
    console.error('Erro:', e.message);
  }
}
