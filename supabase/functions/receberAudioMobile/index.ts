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
  const requestId = crypto.randomUUID().substring(0, 8);
  const startTime = Date.now();
  
  console.log(`\n${'='.repeat(80)}`);
  console.log(`[${requestId}] ===== INÍCIO RECEBER ÁUDIO MOBILE =====`);
  console.log(`[${requestId}] Timestamp: ${new Date().toISOString()}`);
  console.log(`[${requestId}] Method: ${req.method}`);
  console.log(`[${requestId}] URL: ${req.url}`);
  console.log(`[${requestId}] Headers:`, Object.fromEntries(req.headers.entries()));

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log(`[${requestId}] Respondendo OPTIONS (CORS preflight)`);
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawBody = await req.text();
    console.log(`[${requestId}] Raw body length: ${rawBody.length} caracteres`);
    
    let payload;
    try {
      payload = JSON.parse(rawBody);
      console.log(`[${requestId}] JSON parseado com sucesso`);
    } catch (parseError) {
      console.error(`[${requestId}] ERRO ao parsear JSON:`, parseError);
      console.log(`[${requestId}] Primeiros 500 chars do body:`, rawBody.substring(0, 500));
      return new Response(
        JSON.stringify({ success: false, error: 'JSON inválido no body da requisição' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { file_base64, file_name, file_url, duracao_segundos, tamanho_mb, email_usuario } = payload;

    console.log(`[${requestId}] ===== PAYLOAD RECEBIDO =====`);
    console.log(`[${requestId}] email_usuario: ${email_usuario}`);
    console.log(`[${requestId}] file_name: ${file_name}`);
    console.log(`[${requestId}] file_url: ${file_url || 'NÃO INFORMADO'}`);
    console.log(`[${requestId}] duracao_segundos: ${duracao_segundos}`);
    console.log(`[${requestId}] tamanho_mb: ${tamanho_mb}`);
    console.log(`[${requestId}] file_base64 presente: ${!!file_base64}`);
    console.log(`[${requestId}] file_base64 length: ${file_base64?.length || 0} caracteres`);
    console.log(`[${requestId}] file_base64 primeiros 100 chars: ${file_base64?.substring(0, 100) || 'N/A'}`);

    if (!email_usuario) {
      console.error(`[${requestId}] ERRO: email_usuario ausente`);
      return new Response(
        JSON.stringify({ success: false, error: 'Email do usuário é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!file_base64) {
      console.error(`[${requestId}] ERRO: file_base64 ausente`);
      console.log(`[${requestId}] Campos presentes no payload:`, Object.keys(payload));
      return new Response(
        JSON.stringify({ success: false, error: 'Conteúdo do áudio (file_base64) é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with service role for storage access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    console.log(`[${requestId}] Supabase URL: ${supabaseUrl}`);
    console.log(`[${requestId}] Service Key presente: ${!!supabaseServiceKey}`);
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log(`[${requestId}] Cliente Supabase criado`);

    // Convert base64 to binary
    console.log(`[${requestId}] ===== CONVERTENDO BASE64 =====`);
    const conversionStart = Date.now();
    let audioBytes: Uint8Array;
    try {
      audioBytes = processBase64Chunks(file_base64);
      console.log(`[${requestId}] Conversão concluída em ${Date.now() - conversionStart}ms`);
      console.log(`[${requestId}] Bytes resultantes: ${audioBytes.length}`);
      console.log(`[${requestId}] Primeiros 20 bytes:`, Array.from(audioBytes.slice(0, 20)));
    } catch (convError) {
      console.error(`[${requestId}] ERRO na conversão base64:`, convError);
      return new Response(
        JSON.stringify({ success: false, error: `Erro ao converter base64: ${convError}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate unique file path
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const sanitizedEmail = email_usuario.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = file_name || `${timestamp}_audio.wav`;
    const filePath = `${sanitizedEmail}/${timestamp}_${fileName}`;

    console.log(`[${requestId}] ===== UPLOAD STORAGE =====`);
    console.log(`[${requestId}] Bucket: audio-recordings`);
    console.log(`[${requestId}] File path: ${filePath}`);
    console.log(`[${requestId}] Content type: audio/wav`);
    console.log(`[${requestId}] File size: ${audioBytes.length} bytes`);

    // Upload to storage
    const uploadStart = Date.now();
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('audio-recordings')
      .upload(filePath, audioBytes, {
        contentType: 'audio/wav',
        upsert: false,
      });

    console.log(`[${requestId}] Upload concluído em ${Date.now() - uploadStart}ms`);

    if (uploadError) {
      console.error(`[${requestId}] ERRO no upload storage:`, uploadError);
      console.error(`[${requestId}] Upload error details:`, JSON.stringify(uploadError, null, 2));
      return new Response(
        JSON.stringify({ success: false, error: `Erro ao salvar áudio: ${uploadError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[${requestId}] Upload SUCCESS! Path: ${uploadData.path}`);

    // Save record to database
    console.log(`[${requestId}] ===== SALVANDO NO BANCO =====`);
    const dbStart = Date.now();
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

    console.log(`[${requestId}] Insert concluído em ${Date.now() - dbStart}ms`);

    if (dbError) {
      console.error(`[${requestId}] ERRO no insert banco:`, dbError);
      console.error(`[${requestId}] DB error details:`, JSON.stringify(dbError, null, 2));
      // Try to delete uploaded file if DB insert fails
      console.log(`[${requestId}] Removendo arquivo do storage após erro...`);
      await supabase.storage.from('audio-recordings').remove([filePath]);
      return new Response(
        JSON.stringify({ success: false, error: `Erro ao registrar gravação: ${dbError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[${requestId}] Insert SUCCESS! ID: ${dbData.id}`);

    const response = {
      success: true,
      gravacao_id: dbData.id,
      file_path: uploadData.path,
      message: 'Áudio salvo com sucesso',
      request_id: requestId,
      processing_time_ms: Date.now() - startTime,
    };

    console.log(`[${requestId}] ===== RESPOSTA FINAL =====`);
    console.log(`[${requestId}] Response:`, JSON.stringify(response, null, 2));
    console.log(`[${requestId}] Tempo total: ${Date.now() - startTime}ms`);
    console.log(`[${requestId}] ===== FIM RECEBER ÁUDIO MOBILE =====`);
    console.log(`${'='.repeat(80)}\n`);

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    const errorStack = error instanceof Error ? error.stack : '';
    console.error(`[${requestId}] ===== ERRO CRÍTICO =====`);
    console.error(`[${requestId}] Message:`, errorMessage);
    console.error(`[${requestId}] Stack:`, errorStack);
    console.error(`[${requestId}] Full error:`, error);
    console.log(`[${requestId}] Tempo até erro: ${Date.now() - startTime}ms`);
    console.log(`${'='.repeat(80)}\n`);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage,
        request_id: requestId,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});