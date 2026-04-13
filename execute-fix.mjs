import fetch from 'node-fetch';

const API_URL = 'http://localhost:3000/api/trpc/admin.fixAgendamentos';

async function executeFix() {
  try {
    console.log('🔄 Executando correção de agendamentos...');
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      console.error(`❌ Erro HTTP ${response.status}`);
      const text = await response.text();
      console.error(text);
      return;
    }

    const data = await response.json();
    console.log('✅ Resultado:', data);
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

executeFix();
