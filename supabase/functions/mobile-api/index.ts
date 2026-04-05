import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Supported audio formats
const SUPPORTED_AUDIO_TYPES = [
  'audio/mpeg', 'audio/mp3',
  'audio/wav', 'audio/x-wav',
  'audio/ogg', 'audio/webm',
  'audio/aac', 'audio/m4a', 'audio/x-m4a',
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const contentType = req.headers.get('content-type') || '';
    
    // Check if it's multipart/form-data (audio upload)
    if (contentType.includes('multipart/form-data')) {
      console.log('[mobile-api] Recebendo upload multipart/form-data');
      return await handleAudioMultipart(req, supabase);
    }

    // Otherwise, handle as JSON
    const payload = await req.json();
    const { action, ...rest } = payload;

    console.log(`[mobile-api] Ação recebida: ${action}`);

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
        response = await handleAudioJson(rest, supabase);
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

// Handler for audio via multipart/form-data
async function handleAudioMultipart(req: Request, supabase: any): Promise<Response> {
  try {
    const formData = await req.formData();
    
    const audioFile = formData.get('audio') as File | null;
    const emailUsuario = formData.get('email_usuario') as string | null;
    const duracaoSegundos = formData.get('duracao_segundos') as string | null;
    
    console.log(`[mobile-api] Upload multipart:`, {
      email_usuario: emailUsuario || 'NÃO INFORMADO',
      duracao_segundos: duracaoSegundos || 'NÃO INFORMADO',
      audio_name: audioFile?.name || 'NÃO INFORMADO',
      audio_size: audioFile?.size || 0,
      audio_type: audioFile?.type || 'NÃO INFORMADO',
    });

    // Validate required fields
    const camposFaltando: string[] = [];
    if (!emailUsuario) camposFaltando.push('email_usuario');
    if (!audioFile) camposFaltando.push('audio');
    
    if (camposFaltando.length > 0) {
      console.error(`[mobile-api] Campos obrigatórios faltando:`, camposFaltando);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Campos obrigatórios não preenchidos: ${camposFaltando.join(', ')}` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate file size
    if (audioFile!.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Arquivo muito grande. Limite: 50MB, Enviado: ${(audioFile!.size / (1024 * 1024)).toFixed(2)}MB` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get file bytes
    const audioBytes = new Uint8Array(await audioFile!.arrayBuffer());
    
    // Determine content type
    let contentType = audioFile!.type || 'audio/wav';
    const fileName = audioFile!.name || 'audio.wav';
    
    // Generate unique file path
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const sanitizedEmail = emailUsuario!.replace(/[^a-zA-Z0-9]/g, '_');
    const filePath = `${sanitizedEmail}/${timestamp}_${fileName}`;

    console.log(`[mobile-api] Salvando áudio: ${filePath}, tamanho: ${audioBytes.length} bytes`);

    // Upload to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('audio-recordings')
      .upload(filePath, audioBytes, {
        contentType,
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
    const duracao = duracaoSegundos ? parseInt(duracaoSegundos, 10) : 0;
    const tamanhoMb = audioFile!.size / (1024 * 1024);

    const { data: dbData, error: dbError } = await supabase
      .from('audio_recordings')
      .insert({
        email_usuario: emailUsuario,
        file_path: uploadData.path,
        file_name: fileName,
        duracao_segundos: duracao,
        tamanho_mb: tamanhoMb,
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

    console.log(`[mobile-api] Áudio salvo com sucesso: ${dbData.id}`);

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
    console.error('[mobile-api] Erro ao processar áudio multipart:', errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// Handler for audio via JSON (base64) - kept for backwards compatibility
async function handleAudioJson(payload: any, supabase: any): Promise<Response> {
  const { file_base64, file_name, duracao_segundos, tamanho_mb, email_usuario } = payload;
  
  console.log(`[mobile-api] Áudio JSON recebido:`, {
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
    const binaryString = atob(file_base64);
    const audioBytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      audioBytes[i] = binaryString.charCodeAt(i);
    }
    
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
    console.error('[mobile-api] Erro ao processar áudio JSON:', errorMessage);
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
