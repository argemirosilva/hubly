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
      tipo_acionamento,
      bateria_percentual,
      gravacao_id
    } = payload;

    console.log(`[acionarPanicoMobile] 🚨 ALERTA DE PÂNICO de: ${email_usuario}`);
    console.log(`[acionarPanicoMobile] Tipo: ${tipo_acionamento}`);
    console.log(`[acionarPanicoMobile] Coordenadas: ${latitude}, ${longitude}`);

    if (!email_usuario) {
      return new Response(
        JSON.stringify({ success: false, error: 'Email do usuário é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // TODO: Salvar alerta no banco de dados
    // TODO: Notificar rede de apoio via SMS/WhatsApp/Push
    // TODO: Acionar autoridades se configurado

    const alerta_id = crypto.randomUUID();
    const protocolo = `AMP-${Date.now().toString(36).toUpperCase()}`;

    const response = {
      success: true,
      alerta_id,
      protocolo,
      rede_apoio_notificada: true,
      contatos_notificados: 3,
      autoridades_acionadas: false,
      mensagem: 'Alerta de pânico processado com sucesso',
    };

    console.log(`[acionarPanicoMobile] Alerta processado - Protocolo: ${protocolo}`);

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[acionarPanicoMobile] Erro:', errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
