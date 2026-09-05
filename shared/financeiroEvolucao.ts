export type RecebimentoParaEvolucao = {
  data?: string | Date | null;
  valor?: number | string | null;
};

export type PontoEvolucaoRecebimentos = {
  chave: string;
  rotulo: string;
  recebido: number;
  quantidade: number;
};

const mesesAbreviados = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function chaveDeData(valor: string | Date | null | undefined): string | null {
  if (typeof valor === "string") {
    const correspondencia = /^(\d{4}-\d{2}-\d{2})/.exec(valor);
    return correspondencia?.[1] ?? null;
  }

  if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
    const ano = valor.getFullYear();
    const mes = String(valor.getMonth() + 1).padStart(2, "0");
    const dia = String(valor.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
  }

  return null;
}

function adicionarDias(chave: string, quantidade: number) {
  const data = new Date(`${chave}T12:00:00.000Z`);
  data.setUTCDate(data.getUTCDate() + quantidade);
  return data.toISOString().slice(0, 10);
}

function proximoMes(chave: string) {
  const [ano, mes] = chave.split("-").map(Number);
  const data = new Date(Date.UTC(ano, mes, 1));
  return `${data.getUTCFullYear()}-${String(data.getUTCMonth() + 1).padStart(2, "0")}`;
}

function rotuloDeDia(chave: string) {
  const [, mes, dia] = chave.split("-");
  return `${dia}/${mes}`;
}

function rotuloDeMes(chave: string) {
  const [ano, mes] = chave.split("-");
  return `${mesesAbreviados[Number(mes) - 1]}/${ano.slice(2)}`;
}

/**
 * Agrupa baixas reais por dia em intervalos curtos e por mês em intervalos longos.
 * As chaves de data são tratadas como datas locais de negócio para evitar deslocamento de fuso.
 */
export function criarSerieEvolucaoRecebimentos(
  recebimentos: RecebimentoParaEvolucao[],
  dataInicio: string,
  dataFim: string,
): PontoEvolucaoRecebimentos[] {
  const inicio = chaveDeData(dataInicio);
  const fim = chaveDeData(dataFim);
  if (!inicio || !fim || inicio > fim) return [];

  const diasNoPeriodo = Math.floor((Date.parse(`${fim}T00:00:00.000Z`) - Date.parse(`${inicio}T00:00:00.000Z`)) / 86_400_000) + 1;
  const agruparPorMes = diasNoPeriodo > 45;
  const acumulados = new Map<string, PontoEvolucaoRecebimentos>();

  if (agruparPorMes) {
    let chave = inicio.slice(0, 7);
    const fimDoMes = fim.slice(0, 7);
    while (chave <= fimDoMes) {
      acumulados.set(chave, { chave, rotulo: rotuloDeMes(chave), recebido: 0, quantidade: 0 });
      chave = proximoMes(chave);
    }
  } else {
    for (let chave = inicio; chave <= fim; chave = adicionarDias(chave, 1)) {
      acumulados.set(chave, { chave, rotulo: rotuloDeDia(chave), recebido: 0, quantidade: 0 });
    }
  }

  recebimentos.forEach(recebimento => {
    const data = chaveDeData(recebimento.data);
    if (!data || data < inicio || data > fim) return;
    const chave = agruparPorMes ? data.slice(0, 7) : data;
    const ponto = acumulados.get(chave);
    if (!ponto) return;
    const valor = Number(recebimento.valor ?? 0);
    ponto.recebido += Number.isFinite(valor) ? valor : 0;
    ponto.quantidade += 1;
  });

  return Array.from(acumulados.values());
}
