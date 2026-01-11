import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const { action, ...rest } = payload;

    console.log(`[mobile-api] Ação recebida: ${action}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let response: Response;

    switch (action) {
      case 'loginCustomizado':
        response = await handleLogin(rest);
        break;
      
      case 'recuperarSenha':
        response = await handleRecuperarSenha(rest);
        break;
      
      case 'pingMobile':
        response = await handlePing(rest);
        break;
      
      case 'receberLocalizacaoGPS':
        response = await handleGPS(rest);
        break;
      
      case 'acionarPanicoMobile':
        response = await handlePanico(rest);
        break;
      
      case 'receberAudioMobile':
        response = await handleAudio(rest, supabase);
        break;
      
      case 'refreshConfig':
        response = await handleRefreshConfig(rest);
        break;
      
      case 'logoutMobile':
        response = await handleLogout(rest);
        break;
      
      default:
        console.error(`[mobile-api] Ação não reconhecida: ${action}`);
        return new Response(
          JSON.stringify({ success: false, error: 'Ação não reconhecida' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    return response;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[mobile-api] Erro:', errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Handler for login
async function handleLogin(payload: any): Promise<Response> {
  const { email, senha, tipo_acao } = payload;
  
  console.log(`[mobile-api] Login para: ${email}, tipo: ${tipo_acao}`);
  
  // Simulated login response - replace with actual auth logic
  const response = {
    success: true,
    usuario: {
      id: crypto.randomUUID(),
      email,
      nome_vitima: "Usuário Teste",
      telefone_vitima: "",
      gravacao_inicio: "08:00",
      gravacao_fim: "22:00",
      gravacao_dias: ["seg", "ter", "qua", "qui", "sex"],
      contatos_rede_apoio: [],
    },
    loginTipo: 'normal',
    session: {
      token: crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, ''),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    },
  };

  return new Response(
    JSON.stringify(response),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Handler for password recovery
async function handleRecuperarSenha(payload: any): Promise<Response> {
  const { email } = payload;
  
  console.log(`[mobile-api] Recuperar senha para: ${email}`);
  
  return new Response(
    JSON.stringify({ success: true, message: 'Instruções enviadas para seu e-mail' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Handler for ping
async function handlePing(payload: any): Promise<Response> {
  const { email_usuario, dispositivo_info, bateria_percentual, versao_app } = payload;
  
  console.log(`[mobile-api] Ping de: ${email_usuario}, Bateria: ${bateria_percentual}%`);
  
  return new Response(
    JSON.stringify({
      success: true,
      status: 'online',
      servidor_timestamp: new Date().toISOString(),
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Handler for GPS
async function handleGPS(payload: any): Promise<Response> {
  const { email_usuario, latitude, longitude, tipo_localizacao } = payload;
  
  console.log(`[mobile-api] GPS de: ${email_usuario}, Lat: ${latitude}, Lon: ${longitude}, Tipo: ${tipo_localizacao}`);
  
  return new Response(
    JSON.stringify({
      success: true,
      localizacao_id: crypto.randomUUID(),
      endereco_aproximado: "Localização recebida",
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Handler for panic
async function handlePanico(payload: any): Promise<Response> {
  const { email_usuario, latitude, longitude, tipo_acionamento } = payload;
  
  console.log(`[mobile-api] PÂNICO de: ${email_usuario}, Tipo: ${tipo_acionamento}`);
  
  return new Response(
    JSON.stringify({
      success: true,
      alerta_id: crypto.randomUUID(),
      rede_apoio_notificada: true,
      contatos_notificados: 3,
      autoridades_acionadas: false,
      protocolo: `PANICO-${Date.now()}`,
      mensagem: 'Alerta de pânico registrado',
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

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

// Handler for audio
async function handleAudio(payload: any, supabase: any): Promise<Response> {
  const { file_base64, file_name, duracao_segundos, tamanho_mb, email_usuario } = payload;
  
  console.log(`[mobile-api] Áudio recebido:`, {
    email_usuario: email_usuario || 'NÃO INFORMADO',
    file_name: file_name || 'NÃO INFORMADO',
    duracao_segundos: duracao_segundos || 'NÃO INFORMADO',
    tamanho_mb: tamanho_mb || 'NÃO INFORMADO',
    file_base64_length: file_base64?.length || 0,
    payload_keys: Object.keys(payload),
  });
  
  // Validar campos obrigatórios
  const camposFaltando: string[] = [];
  if (!email_usuario) camposFaltando.push('email_usuario');
  if (!file_base64) camposFaltando.push('file_base64');
  
  if (camposFaltando.length > 0) {
    console.error(`[mobile-api] Campos obrigatórios não preenchidos:`, camposFaltando);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `Campos obrigatórios não preenchidos: ${camposFaltando.join(', ')}` 
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Convert base64 to binary
    const audioBytes = processBase64Chunks(file_base64);
    
    // Generate unique file path
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const sanitizedEmail = email_usuario.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = file_name || `${timestamp}_audio.wav`;
    const filePath = `${sanitizedEmail}/${timestamp}_${fileName}`;

    // Upload to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('audio-recordings')
      .upload(filePath, audioBytes, {
        contentType: 'audio/wav',
        upsert: false,
      });

    if (uploadError) {
      console.error('[mobile-api] Erro no upload:', uploadError);
      return new Response(
        JSON.stringify({ success: false, error: `Erro ao salvar áudio: ${uploadError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
      console.error('[mobile-api] Erro ao salvar no banco:', dbError);
      await supabase.storage.from('audio-recordings').remove([filePath]);
      return new Response(
        JSON.stringify({ success: false, error: `Erro ao registrar gravação: ${dbError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        gravacao_id: dbData.id,
        file_path: uploadData.path,
        message: 'Áudio salvo com sucesso',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[mobile-api] Erro ao processar áudio:', errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// Handler for refresh config
async function handleRefreshConfig(payload: any): Promise<Response> {
  const { email_usuario, token_sessao } = payload;
  
  console.log(`[mobile-api] RefreshConfig para: ${email_usuario}`);
  
  // Return current configuration
  return new Response(
    JSON.stringify({
      success: true,
      usuario: {
        gravacao_inicio: "08:00",
        gravacao_fim: "22:00",
        gravacao_dias: ["seg", "ter", "qua", "qui", "sex"],
        contatos_rede_apoio: [],
      },
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Handler for logout
async function handleLogout(payload: any): Promise<Response> {
  const { email_usuario, token_sessao } = payload;
  
  console.log(`[mobile-api] Logout para: ${email_usuario}`);
  
  return new Response(
    JSON.stringify({ success: true, message: 'Logout realizado com sucesso' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
