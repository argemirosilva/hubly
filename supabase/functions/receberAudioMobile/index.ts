import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Process base64 in chunks to prevent memory issues
function processBase64Chunks(base64String: string, chunkSize = 32768): Uint8Array {
  const chunks: Uint8Array[] = [];
  let position = 0;
  
  while (position < base64String.length) {
    const chunk = base64String.slice(position, position + chunkSize);
    const binaryChunk = atob(chunk);
    const bytes = new Uint8Array(binaryChunk.length);
    
    for (let i = 0; i < binaryChunk.length; i++) {
      bytes[i] = binaryChunk.charCodeAt(i);
    }
    
    chunks.push(bytes);
    position += chunkSize;
  }

  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const { file_base64, file_name, file_url, duracao_segundos, tamanho_mb, email_usuario } = payload;

    console.log(`[receberAudioMobile] Áudio recebido de: ${email_usuario}`);
    console.log(`[receberAudioMobile] File name: ${file_name}`);
    console.log(`[receberAudioMobile] Duração: ${duracao_segundos}s, Tamanho: ${tamanho_mb}MB`);
    console.log(`[receberAudioMobile] Base64 length: ${file_base64?.length || 0}`);

    if (!email_usuario) {
      return new Response(
        JSON.stringify({ success: false, error: 'Email do usuário é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!file_base64) {
      return new Response(
        JSON.stringify({ success: false, error: 'Conteúdo do áudio (file_base64) é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with service role for storage access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Convert base64 to binary
    console.log('[receberAudioMobile] Convertendo base64 para binário...');
    const audioBytes = processBase64Chunks(file_base64);
    console.log(`[receberAudioMobile] Bytes convertidos: ${audioBytes.length}`);

    // Generate unique file path
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const sanitizedEmail = email_usuario.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = file_name || `${timestamp}_audio.wav`;
    const filePath = `${sanitizedEmail}/${timestamp}_${fileName}`;

    console.log(`[receberAudioMobile] Salvando no storage: ${filePath}`);

    // Upload to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('audio-recordings')
      .upload(filePath, audioBytes, {
        contentType: 'audio/wav',
        upsert: false,
      });

    if (uploadError) {
      console.error('[receberAudioMobile] Erro no upload:', uploadError);
      return new Response(
        JSON.stringify({ success: false, error: `Erro ao salvar áudio: ${uploadError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[receberAudioMobile] Upload concluído:', uploadData.path);

    // Save record to database
    const { data: dbData, error: dbError } = await supabase
      .from('audio_recordings')
      .insert({
        email_usuario,
        file_path: uploadData.path,
        file_name: fileName,
        duracao_segundos: duracao_segundos || 0,
        tamanho_mb: tamanho_mb || 0,
      })
      .select('id')
      .single();

    if (dbError) {
      console.error('[receberAudioMobile] Erro ao salvar no banco:', dbError);
      // Try to delete uploaded file if DB insert fails
      await supabase.storage.from('audio-recordings').remove([filePath]);
      return new Response(
        JSON.stringify({ success: false, error: `Erro ao registrar gravação: ${dbError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const response = {
      success: true,
      gravacao_id: dbData.id,
      file_path: uploadData.path,
      message: 'Áudio salvo com sucesso',
    };

    console.log(`[receberAudioMobile] Gravação salva com ID: ${dbData.id}`);

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[receberAudioMobile] Erro:', errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
