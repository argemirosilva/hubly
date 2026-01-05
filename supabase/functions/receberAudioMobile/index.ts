import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const { file_url, duracao_segundos, tamanho_mb, email_usuario } = payload;

    console.log(`[receberAudioMobile] Áudio recebido de: ${email_usuario}`);
    console.log(`[receberAudioMobile] URL: ${file_url}`);
    console.log(`[receberAudioMobile] Duração: ${duracao_segundos}s, Tamanho: ${tamanho_mb}MB`);

    if (!email_usuario) {
      return new Response(
        JSON.stringify({ success: false, error: 'Email do usuário é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // TODO: Salvar referência do áudio no banco de dados
    
    const gravacao_id = crypto.randomUUID();

    const response = {
      success: true,
      gravacao_id,
      message: 'Áudio recebido com sucesso',
    };

    console.log(`[receberAudioMobile] Gravação salva com ID: ${gravacao_id}`);

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
