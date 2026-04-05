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
    const { email, senha, tipo_acao } = await req.json();

    console.log(`[loginCustomizado] Tentativa de login para: ${email}, tipo_acao: ${tipo_acao}`);

    if (!email || !senha) {
      return new Response(
        JSON.stringify({ success: false, error: 'Email e senha são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // TODO: Implementar validação real contra banco de dados
    // Por enquanto, simulando resposta de sucesso para testes
    
    // Verificar se é senha de coação (exemplo: termina com "!")
    const isCoercion = senha.endsWith('!') && senha.length > 1;
    
    const response = {
      success: true,
      usuario: {
        id: crypto.randomUUID(),
        email: email,
        nome_vitima: email.split('@')[0],
        telefone_vitima: '',
        gravacao_inicio: '08:00',
        gravacao_fim: '22:00',
        gravacao_dias: ['seg', 'ter', 'qua', 'qui', 'sex'],
        contatos_rede_apoio: [],
      },
      loginTipo: isCoercion ? 'coacao' : 'normal',
      acaoTipo: tipo_acao || 'login',
    };

    console.log(`[loginCustomizado] Login bem-sucedido para: ${email}`);

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[loginCustomizado] Erro:', errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
