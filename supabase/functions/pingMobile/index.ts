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
    const { email_usuario, dispositivo_info, bateria_percentual, versao_app } = payload;

    console.log(`[pingMobile] Ping recebido de: ${email_usuario}`);
    console.log(`[pingMobile] Dispositivo: ${dispositivo_info}, Bateria: ${bateria_percentual}%, Versão: ${versao_app}`);

    // TODO: Salvar ping no banco de dados para monitoramento

    const response = {
      success: true,
      message: 'Ping recebido',
      servidor_timestamp: new Date().toISOString(),
      status: 'online',
    };

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[pingMobile] Erro:', errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
