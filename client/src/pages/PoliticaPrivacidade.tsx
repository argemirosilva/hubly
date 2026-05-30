import { useEffect } from "react";
import { Link } from "wouter";

export default function PoliticaPrivacidade() {
  useEffect(() => {
    document.title = "Política de Privacidade — Hubly";
    window.scrollTo(0, 0);
  }, []);

  const dataAtualizacao = "30 de abril de 2025";

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Header */}
      <header className="border-b border-gray-100 py-4 px-6 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-sm z-10">
        <Link href="/">
          <span className="text-xl font-bold text-[#1a1a2e] cursor-pointer">Hubly</span>
        </Link>
        <span className="text-xs text-gray-400">Política de Privacidade</span>
      </header>

      {/* Conteúdo */}
      <main className="max-w-3xl mx-auto px-6 py-12">
        {/* Título */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-[#1a1a2e] mb-2">Política de Privacidade</h1>
          <p className="text-sm text-gray-500">Última atualização: {dataAtualizacao}</p>
        </div>

        <div className="space-y-8 text-gray-700 leading-relaxed text-[15px]">

          {/* 1 */}
          <section>
            <h2 className="text-lg font-semibold text-[#1a1a2e] mb-2">1. Quem somos</h2>
            <p>
              A <strong>Hubly</strong> é uma plataforma de gestão de agendamentos e clientes desenvolvida pela
              <strong> Orizontech</strong>. Nosso objetivo é facilitar o dia a dia de profissionais e salões de beleza,
              clínicas e outros prestadores de serviço, oferecendo ferramentas para agendamento, comunicação com
              clientes e gestão financeira.
            </p>
            <p className="mt-2">
              Esta Política de Privacidade explica, de forma clara e transparente, quais dados coletamos, como os
              utilizamos e quais são os seus direitos.
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="text-lg font-semibold text-[#1a1a2e] mb-2">2. Quais dados coletamos</h2>
            <p>Coletamos os seguintes tipos de dados:</p>
            <ul className="mt-3 space-y-2 list-none">
              {[
                { titulo: "Dados de cadastro", desc: "Nome, e-mail, telefone e WhatsApp fornecidos no momento do cadastro ou agendamento." },
                { titulo: "Dados de uso", desc: "Informações sobre como você utiliza a plataforma, como páginas visitadas, ações realizadas e horários de acesso." },
                { titulo: "Dados de agendamentos", desc: "Serviços agendados, datas, horários, profissional responsável e histórico de atendimentos." },
                { titulo: "Dados financeiros", desc: "Valores de serviços, formas de pagamento e registros de comissões. Não armazenamos dados de cartão de crédito — pagamentos são processados por plataformas certificadas (Stripe)." },
                { titulo: "Dados de dispositivo", desc: "Endereço IP, tipo de navegador e sistema operacional, coletados automaticamente para fins de segurança e diagnóstico." },
              ].map(item => (
                <li key={item.titulo} className="flex gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-[#1a1a2e] flex-shrink-0" />
                  <span><strong>{item.titulo}:</strong> {item.desc}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* 3 */}
          <section>
            <h2 className="text-lg font-semibold text-[#1a1a2e] mb-2">3. Como usamos seus dados</h2>
            <p>Utilizamos seus dados para:</p>
            <ul className="mt-3 space-y-2 list-none">
              {[
                "Criar e gerenciar sua conta na plataforma.",
                "Realizar e confirmar agendamentos.",
                "Enviar lembretes e notificações via WhatsApp ou e-mail.",
                "Processar pagamentos e emitir registros financeiros.",
                "Melhorar continuamente os recursos e a experiência da plataforma.",
                "Cumprir obrigações legais e regulatórias.",
              ].map(item => (
                <li key={item} className="flex gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-[#1a1a2e] flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-lg font-semibold text-[#1a1a2e] mb-2">4. Compartilhamento de dados</h2>
            <p>
              Seus dados <strong>não são vendidos</strong> a terceiros. Podemos compartilhá-los apenas nas seguintes
              situações:
            </p>
            <ul className="mt-3 space-y-2 list-none">
              {[
                { titulo: "Prestadores de serviço", desc: "Empresas que nos auxiliam na operação da plataforma (ex: hospedagem em nuvem, envio de mensagens), sempre sob contrato de confidencialidade." },
                { titulo: "Processadores de pagamento", desc: "Stripe, para processar transações financeiras de forma segura." },
                { titulo: "Obrigações legais", desc: "Quando exigido por lei, ordem judicial ou autoridade competente." },
              ].map(item => (
                <li key={item.titulo} className="flex gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-[#1a1a2e] flex-shrink-0" />
                  <span><strong>{item.titulo}:</strong> {item.desc}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* 5 */}
          <section>
            <h2 className="text-lg font-semibold text-[#1a1a2e] mb-2">5. Armazenamento e segurança</h2>
            <p>
              Seus dados são armazenados em servidores seguros com criptografia em trânsito (TLS/HTTPS) e em repouso.
              Adotamos práticas de segurança alinhadas ao estado da arte para proteger suas informações contra acesso
              não autorizado, alteração, divulgação ou destruição.
            </p>
            <p className="mt-2">
              Mantemos seus dados pelo tempo necessário para a prestação dos serviços ou pelo prazo exigido por lei,
              o que for maior.
            </p>
          </section>

          {/* 6 */}
          <section>
            <h2 className="text-lg font-semibold text-[#1a1a2e] mb-2">6. Seus direitos (LGPD)</h2>
            <p>
              De acordo com a <strong>Lei Geral de Proteção de Dados (Lei nº 13.709/2018)</strong>, você tem os
              seguintes direitos:
            </p>
            <ul className="mt-3 space-y-2 list-none">
              {[
                { titulo: "Acesso", desc: "Solicitar uma cópia dos dados que temos sobre você." },
                { titulo: "Correção", desc: "Pedir a atualização de dados incorretos ou desatualizados." },
                { titulo: "Exclusão", desc: "Solicitar a exclusão dos seus dados, observados os prazos legais." },
                { titulo: "Portabilidade", desc: "Receber seus dados em formato estruturado para transferência a outro serviço." },
                { titulo: "Revogação do consentimento", desc: "Retirar o consentimento para uso dos seus dados a qualquer momento." },
                { titulo: "Oposição", desc: "Opor-se ao tratamento de dados em determinadas situações." },
              ].map(item => (
                <li key={item.titulo} className="flex gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-[#1a1a2e] flex-shrink-0" />
                  <span><strong>{item.titulo}:</strong> {item.desc}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3">
              Para exercer qualquer um desses direitos, entre em contato pelo e-mail:{" "}
              <a href="mailto:privacidade@orizontech.com.br" className="text-[#1a1a2e] underline font-medium">
                privacidade@orizontech.com.br
              </a>
            </p>
          </section>

          {/* 7 */}
          <section>
            <h2 className="text-lg font-semibold text-[#1a1a2e] mb-2">7. Cookies</h2>
            <p>
              Utilizamos cookies e tecnologias similares para manter sua sessão ativa, lembrar suas preferências e
              analisar o uso da plataforma. Você pode configurar seu navegador para recusar cookies, mas isso pode
              afetar o funcionamento de algumas funcionalidades.
            </p>
          </section>

          {/* 8 */}
          <section>
            <h2 className="text-lg font-semibold text-[#1a1a2e] mb-2">8. Menores de idade</h2>
            <p>
              A plataforma Hubly não é destinada a menores de 18 anos. Não coletamos intencionalmente dados de
              crianças ou adolescentes. Caso identifique que um menor forneceu dados sem autorização, entre em
              contato conosco para que possamos removê-los.
            </p>
          </section>

          {/* 9 */}
          <section>
            <h2 className="text-lg font-semibold text-[#1a1a2e] mb-2">9. Alterações nesta política</h2>
            <p>
              Podemos atualizar esta Política de Privacidade periodicamente. Quando isso ocorrer, publicaremos a
              versão atualizada nesta página com a nova data de atualização. Recomendamos que você revise esta
              política regularmente.
            </p>
          </section>

          {/* 10 */}
          <section>
            <h2 className="text-lg font-semibold text-[#1a1a2e] mb-2">10. Contato</h2>
            <p>
              Em caso de dúvidas sobre esta Política de Privacidade ou sobre o tratamento dos seus dados, entre em
              contato com nosso Encarregado de Proteção de Dados (DPO):
            </p>
            <div className="mt-3 rounded-xl border border-gray-100 bg-stone-50 p-4 text-sm space-y-1">
              <p><strong>Orizontech</strong></p>
              <p>E-mail: <a href="mailto:privacidade@orizontech.com.br" className="text-[#1a1a2e] underline">privacidade@orizontech.com.br</a></p>
              <p>Site: <a href="https://hubly.orizontech.com.br" className="text-[#1a1a2e] underline" target="_blank" rel="noopener noreferrer">hubly.orizontech.com.br</a></p>
            </div>
          </section>

        </div>

        {/* Rodapé */}
        <div className="mt-14 pt-8 border-t border-gray-100 text-center text-xs text-gray-400">
          <div className="flex flex-wrap justify-center gap-4 mb-3">
            <a href="/politica-de-privacidade" className="text-gray-600 hover:text-gray-800 font-medium">Política de Privacidade</a>
            <a href="/termos-de-uso" className="text-gray-500 hover:text-gray-700">Termos de Uso</a>
          </div>
          <p>© {new Date().getFullYear()} Hubly — Orizontech. Todos os direitos reservados.</p>
          <p className="mt-1">Esta política está em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018).</p>
        </div>
      </main>
    </div>
  );
}
