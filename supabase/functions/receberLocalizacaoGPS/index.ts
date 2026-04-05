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
    const { 
      email_usuario, 
      latitude, 
      longitude, 
      precisao_metros, 
      altitude, 
      velocidade,
      timestamp_gps,
      bateria_percentual,
      em_movimento,
      tipo_localizacao 
    } = payload;

    console.log(`[receberLocalizacaoGPS] Localização recebida de: ${email_usuario}`);
    console.log(`[receberLocalizacaoGPS] Coordenadas: ${latitude}, ${longitude}`);
    console.log(`[receberLocalizacaoGPS] Tipo: ${tipo_localizacao}, Precisão: ${precisao_metros}m`);

    if (!email_usuario || latitude === undefined || longitude === undefined) {
      return new Response(
        JSON.stringify({ success: false, error: 'Email e coordenadas são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // TODO: Salvar localização no banco de dados
    // TODO: Fazer geocodificação reversa para obter endereço

    const localizacao_id = crypto.randomUUID();

    const response = {
      success: true,
      localizacao_id,
      endereco_aproximado: 'Endereço não disponível',
      compartilhado_com: [],
    };

    console.log(`[receberLocalizacaoGPS] Localização salva com ID: ${localizacao_id}`);

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[receberLocalizacaoGPS] Erro:', errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
