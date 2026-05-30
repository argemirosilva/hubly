import { Link } from "wouter";
import { ArrowLeft, FileText } from "lucide-react";

export default function TermosDeUso() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-10">
        {/* Cabeçalho */}
        <div className="flex items-center gap-3 mb-8">
          <Link href="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Link>
        </div>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Termos de Uso</h1>
            <p className="text-sm text-muted-foreground">Última atualização: 30 de maio de 2026</p>
          </div>
        </div>

        <div className="prose prose-sm max-w-none space-y-6 text-foreground">

          {/* 1 */}
          <section>
            <h2 className="text-lg font-semibold mb-2">1. Aceitação dos Termos</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Ao acessar ou utilizar o <strong>Hubly</strong> ("Plataforma"), você ("Usuário") concorda com estes Termos de Uso e com nossa{" "}
              <Link href="/politica-de-privacidade" className="text-primary underline underline-offset-2">Política de Privacidade</Link>.
              Se você não concordar com qualquer parte destes termos, não utilize a Plataforma.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed mt-2">
              A Plataforma é operada pela <strong>Orizontech Tecnologia Ltda.</strong>, inscrita no CNPJ sob o nº 00.000.000/0001-00,
              com sede em São Paulo — SP, Brasil. Para contato: <a href="mailto:contato@orizontech.com.br" className="text-primary underline underline-offset-2">contato@orizontech.com.br</a>.
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="text-lg font-semibold mb-2">2. Descrição do Serviço</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              O Hubly é uma plataforma de gestão de agendamentos destinada a empresas de serviços (salões de beleza, clínicas, barbearias e similares).
              A Plataforma oferece funcionalidades de agendamento online, gestão de clientes, controle financeiro, automações de mensagens e relatórios.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed mt-2">
              O acesso à Plataforma é fornecido no modelo SaaS (Software as a Service), podendo incluir planos gratuitos e pagos.
              As funcionalidades disponíveis variam conforme o plano contratado.
            </p>
          </section>

          {/* 3 */}
          <section>
            <h2 className="text-lg font-semibold mb-2">3. Cadastro e Conta</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Para utilizar a Plataforma, é necessário criar uma conta fornecendo informações verdadeiras, precisas e atualizadas.
              O Usuário é responsável por manter a confidencialidade de suas credenciais de acesso e por todas as atividades realizadas em sua conta.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed mt-2">
              A Plataforma é destinada exclusivamente a pessoas jurídicas ou profissionais autônomos maiores de 18 anos.
              É vedado o uso da Plataforma por menores de 18 anos.
            </p>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-lg font-semibold mb-2">4. Pagamentos e Assinaturas</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Os planos pagos são cobrados de forma recorrente (mensal ou anual) conforme o plano escolhido.
              Os pagamentos são processados de forma segura pela plataforma <strong>Stripe</strong>.
              Ao contratar um plano pago, o Usuário autoriza a cobrança automática nas datas de renovação.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed mt-2">
              O cancelamento da assinatura pode ser realizado a qualquer momento através das configurações da conta ou pelo suporte.
              Após o cancelamento, o acesso às funcionalidades do plano pago permanece ativo até o final do período já pago.
              Não há reembolso proporcional por períodos não utilizados, salvo disposição legal em contrário.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed mt-2">
              Os preços podem ser alterados mediante aviso prévio de 30 dias. A continuidade do uso após a alteração implica aceitação dos novos valores.
            </p>
          </section>

          {/* 5 */}
          <section>
            <h2 className="text-lg font-semibold mb-2">5. Uso Aceitável</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              O Usuário compromete-se a utilizar a Plataforma apenas para fins lícitos e de acordo com estes Termos. É expressamente proibido:
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mt-2 ml-2">
              <li>Utilizar a Plataforma para fins ilegais, fraudulentos ou prejudiciais a terceiros;</li>
              <li>Tentar acessar sistemas ou dados de outros usuários sem autorização;</li>
              <li>Realizar engenharia reversa, descompilar ou tentar extrair o código-fonte da Plataforma;</li>
              <li>Enviar spam, vírus ou qualquer conteúdo malicioso através da Plataforma;</li>
              <li>Revender, sublicenciar ou transferir o acesso à Plataforma a terceiros sem autorização prévia;</li>
              <li>Utilizar a Plataforma para armazenar ou transmitir dados de cartão de crédito ou informações financeiras sensíveis.</li>
            </ul>
          </section>

          {/* 6 */}
          <section>
            <h2 className="text-lg font-semibold mb-2">6. Propriedade Intelectual</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Todo o conteúdo, código, design, marcas, logotipos e demais elementos da Plataforma são de propriedade exclusiva da Orizontech Tecnologia Ltda.
              ou de seus licenciantes, protegidos pela legislação brasileira de propriedade intelectual.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed mt-2">
              Os dados inseridos pelo Usuário na Plataforma (clientes, agendamentos, etc.) permanecem de propriedade do Usuário.
              A Orizontech não reivindica propriedade sobre esses dados.
            </p>
          </section>

          {/* 7 */}
          <section>
            <h2 className="text-lg font-semibold mb-2">7. Privacidade e Proteção de Dados</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              O tratamento de dados pessoais é regido pela nossa{" "}
              <Link href="/politica-de-privacidade" className="text-primary underline underline-offset-2">Política de Privacidade</Link>,
              em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018).
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed mt-2">
              O Usuário, ao utilizar a Plataforma para gerenciar dados de seus próprios clientes, assume a responsabilidade de
              obter os consentimentos necessários e cumprir as obrigações de controlador de dados conforme a LGPD.
            </p>
          </section>

          {/* 8 */}
          <section>
            <h2 className="text-lg font-semibold mb-2">8. Exclusão de Conta</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              O Usuário pode excluir sua conta a qualquer momento diretamente na Plataforma, acessando{" "}
              <strong>Configurações &gt; Zona de Perigo &gt; Excluir minha conta</strong>.
              A exclusão é permanente e remove todos os dados associados à empresa, incluindo agendamentos, clientes, profissionais e histórico financeiro.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed mt-2">
              Assinaturas ativas serão canceladas automaticamente no momento da exclusão.
              Após a exclusão, não é possível recuperar os dados removidos.
            </p>
          </section>

          {/* 9 */}
          <section>
            <h2 className="text-lg font-semibold mb-2">9. Limitação de Responsabilidade</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              A Plataforma é fornecida "no estado em que se encontra" ("as is"). A Orizontech não garante que a Plataforma estará
              disponível ininterruptamente ou livre de erros. Em nenhuma circunstância a Orizontech será responsável por danos
              indiretos, incidentais, especiais ou consequenciais decorrentes do uso ou da impossibilidade de uso da Plataforma.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed mt-2">
              A responsabilidade total da Orizontech, em qualquer hipótese, fica limitada ao valor pago pelo Usuário nos
              últimos 3 meses de assinatura.
            </p>
          </section>

          {/* 10 */}
          <section>
            <h2 className="text-lg font-semibold mb-2">10. Modificações dos Termos</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              A Orizontech reserva-se o direito de modificar estes Termos a qualquer momento, mediante aviso prévio de 15 dias
              por e-mail ou notificação na Plataforma. A continuidade do uso após o prazo implica aceitação das alterações.
            </p>
          </section>

          {/* 11 */}
          <section>
            <h2 className="text-lg font-semibold mb-2">11. Rescisão</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              A Orizontech pode suspender ou encerrar o acesso do Usuário à Plataforma, sem aviso prévio, em caso de violação
              destes Termos ou por determinação legal. O Usuário pode encerrar sua conta a qualquer momento conforme descrito
              na seção 8.
            </p>
          </section>

          {/* 12 */}
          <section>
            <h2 className="text-lg font-semibold mb-2">12. Lei Aplicável e Foro</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da Comarca de
              São Paulo — SP para dirimir quaisquer controvérsias decorrentes destes Termos, com renúncia a qualquer outro,
              por mais privilegiado que seja.
            </p>
          </section>

          {/* 13 */}
          <section>
            <h2 className="text-lg font-semibold mb-2">13. Contato</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Para dúvidas sobre estes Termos, entre em contato:
            </p>
            <ul className="text-sm text-muted-foreground space-y-1 mt-2 ml-2">
              <li><strong>E-mail:</strong> <a href="mailto:contato@orizontech.com.br" className="text-primary underline underline-offset-2">contato@orizontech.com.br</a></li>
              <li><strong>Suporte:</strong> <a href="mailto:suporte@orizontech.com.br" className="text-primary underline underline-offset-2">suporte@orizontech.com.br</a></li>
            </ul>
          </section>

        </div>

        {/* Rodapé com links legais */}
        <div className="mt-12 pt-6 border-t border-border flex flex-wrap gap-4 text-xs text-muted-foreground">
          <Link href="/politica-de-privacidade" className="hover:text-foreground transition-colors">Política de Privacidade</Link>
          <Link href="/termos-de-uso" className="hover:text-foreground transition-colors font-medium text-foreground">Termos de Uso</Link>
          <span>© {new Date().getFullYear()} Orizontech Tecnologia Ltda.</span>
        </div>
      </div>
    </div>
  );
}
