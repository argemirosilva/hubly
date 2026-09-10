# Hubly — preparação Android e iOS

Atualizado em 2026-09-10. Este guia descreve o checkout real; não atesta publicação.

## Arquitetura atual

A raiz do repositório contém o cliente React/Vite (`client/`), o servidor Node/tRPC
(`server/`) e os projetos Capacitor (`android/`, `ios/`). A pasta `hubly/` interna
é outra árvore de código: os comandos abaixo devem ser executados na raiz.

Identificador das duas plataformas: `com.orizontech.hubly`. Versão nativa: 1.0,
build/versionCode 1. O projeto Xcode tem uma equipe já configurada; confirmar sua
propriedade e o registro desse identificador antes da assinatura de distribuição.

`capacitor.config.ts` carrega `https://hubly.orizontech.com.br/admin` remotamente.
O aplicativo é exclusivamente para gestão: sem sessão, abre o login existente;
com sessão, abre o painel administrativo. O roteador nativo mantém rotas de gestão,
cadastro/onboarding empresarial, atendimento, suporte e documentos legais. As telas
públicas e o portal de agendamento continuam disponíveis na web; dentro do app,
essas rotas redirecionam para `/admin`. O convite PWA não aparece no app nativo.
Essa seleção de telas não concede permissões: a autorização continua no backend. O
backend, os cookies de sessão e as APIs continuam na mesma origem. **Alterações
em `client/` só chegam ao app remoto depois do deploy web; gerar APK/IPA não
publica essas alterações.** Não remover `server.url` sem adaptar e testar URLs
relativas, cookies, CORS, OAuth, uploads e isolamento entre empresas.

A documentação do Capacitor destina `server.url` a live reload, não a produção.
Para a versão definitiva das lojas, avaliar empacotar a interface localmente
com acesso explícito ao backend existente. O shell atual serve para validação
inicial e não deve ser tratado como produto pronto para revisão.

## Ambiente

- Node 22 ou superior e pnpm compatível com o `packageManager`/lockfile.
- Xcode 26 ou superior, macOS e Swift Package Manager.
- Android Studio 2025.2.1 ou superior, JDK 21 (o Gradle 8.14.3 deste projeto falhou com Java 25) e SDK 36.
- Android configurado com minSdk 24 e target/compileSdk 36.

## Preparar e sincronizar

```bash
cd /Users/argemironogueira/orizontech/hubly
pnpm install --frozen-lockfile
pnpm run test:mobile
pnpm run mobile:sync
```

`mobile:sync` gera `dist/public` antes de `cap sync`. Não gera bundle do servidor
nem executa migrações. `pnpm build` continua disponível para o build web/servidor.

```bash
pnpm run mobile:open:android
pnpm run mobile:open:ios
```

Se os shims não tiverem permissão de execução, usar os entrypoints com Node:

```bash
node node_modules/vite/bin/vite.js build
node node_modules/@capacitor/cli/bin/capacitor sync
```

## Validar sem publicação

```bash
cd /Users/argemironogueira/orizontech/hubly/android
./gradlew assembleDebug

cd /Users/argemironogueira/orizontech/hubly
xcodebuild -project ios/App/App.xcodeproj -scheme App \
  -configuration Debug -sdk iphonesimulator \
  -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath /tmp/hubly-ios-build CODE_SIGNING_ALLOWED=NO build
```

No Android, definir `ANDROID_HOME` para o SDK local e `JAVA_HOME` para o JDK
compatível quando necessário. APK: `android/app/build/outputs/apk/debug/app-debug.apk`.
A compilação não valida login, comportamento em celular nem entrega de push.

## Links e notificações

`useMobileApp` atende links com o app aberto e na inicialização. Aceita HTTPS
somente em `hubly.orizontech.com.br` e os esquemas `hubly://cliente/42` e
`hubly://agendamento/123`. As rotas protegidas mantêm a autorização existente.
A seleção do agendamento pelo parâmetro `id` precisa ser validada na interface.

O registro automático de push nativo foi retirado: chamava
`notificacoes.registrarToken`, inexistente no servidor deste checkout, e registrava
tokens no console. **Push nativo não está operacional.** O push web não foi alterado.
Plugins nativos permanecem instalados para integração posterior. Antes de ativar:

- implementar armazenamento de tokens autenticado e separado por usuário/empresa;
- tratar logout, rotação/revogação e envio APNs/FCM HTTP v1;
- configurar Firebase Android e capabilities, assinatura e callbacks iOS;
- testar foreground, background, app encerrado, permissão negada e troca de conta.

`App.entitlements` existe mas não está ligado ao target por `CODE_SIGN_ENTITLEMENTS`.
Não declarar Universal Links ou push como operacionais sem configurar as
associações de domínio e a assinatura. Consultar `ios/APNS_SETUP_GUIDE.md`.

## Assinatura e publicação

Android: usar a chave de upload do Hubly, nunca de outro aplicativo. O Gradle lê
`android/keystore.properties` com `storeFile`, `storePassword`, `keyAlias` e
`keyPassword`. O caminho `storeFile` é relativo à pasta `android/`. Esses dados
ficam fora do Git. Sem configuração, um release pode sair sem assinatura.
Gerar o AAB com `./gradlew bundleRelease` somente após configurar a assinatura;
verificar o certificado e versionCode antes de enviar ao teste interno do Play.

Apple: validar equipe, Bundle ID, certificado e perfil de distribuição no Xcode;
executar Product → Archive e validar o archive antes de exportar/upload. Primeiro
validar no TestFlight. Incrementar build para novos envios conforme estado real
da loja; não reutilizar números sem consultar as versões existentes.

## Pendências para submissão

- Público definido: gestão somente. Validar login, painel e perfis de funcionários;
  confirmar que o portal do cliente não abre dentro do aplicativo.
- Resolver estratégia do conteúdo remoto/local e indisponibilidade de rede.
- Validar login/logout, sessão após reinício, tenant, teclado, safe areas, botão voltar,
  uploads/downloads, links externos, orientação e acessibilidade em aparelhos reais.
- Revisar cadastro e exclusão de conta/dados conforme os fluxos disponíveis.
- Revisar assinatura SaaS/Stripe e regras de pagamento das lojas antes de expor
  contratação no aplicativo; não assumir que pagamentos de serviços presenciais
  e assinaturas digitais têm o mesmo enquadramento.
- Conferir política de privacidade publicada, suporte, formulários de dados Apple/Google,
  SDKs incluídos e privacy manifests com base na coleta real.
- Preparar conta de revisão, screenshots reais, ícones, descrição e classificação etária.
  O ícone `Icon-1024.png` tem canal alfa; preparar versão sem alfa para a App Store.
- Configurar assinatura, gerar AAB/IPA e validar em teste interno/TestFlight.

Nenhum prazo de aprovação é garantido. Separar build, assinatura, upload,
processamento, revisão e disponibilidade pública.

## Referências oficiais

- [Ambiente Capacitor](https://capacitorjs.com/docs/getting-started/environment-setup)
- [Configuração e server.url](https://capacitorjs.com/docs/config)
- [Regras Apple, incluindo 4.2](https://developer.apple.com/app-store/review/guidelines/)
- [Target API Google Play](https://developer.android.com/google/play/requirements/target-sdk)

## Reversão

As mudanças de preparação não migram banco nem alteram APIs. Para reverter, restaurar
os arquivos da preparação e repetir build/sync. Alterações web exigem o processo de
deploy/rollback do servidor, que não foi executado nesta preparação.

## Aparência do splash iOS

O storyboard de lançamento usa `HublyLaunchLogo` em 204 × 64 pontos sobre
`#fdf7ee`, o mesmo creme do login. O asset é renderizado a partir do componente
real `HublyLogo` por `scripts/render-splash-logo.tsx`, com Poppins Light.
Para regenerar, disponibilizar Chrome, Playwright e a fonte Poppins 300 TTF,
configurar `PLAYWRIGHT_MODULE` e `POPPINS_FONT`, e executar:

```bash
node node_modules/tsx/dist/cli.mjs scripts/render-splash-logo.tsx
```

Depois executar build web, sync iOS e build nativo. Regeneração do asset e
compilação nativa não publicam mudanças na animação de abertura web.

## Escala fixa no iPhone

`HublyBridgeViewController.swift`, registrado no storyboard principal, configura
WKWebView para respeitar os limites de escala e aplica viewport com escala
mínima/máxima 1, sem zoom, no documento principal do Hubly. `zoomEnabled: false`
também está explícito no Capacitor. A política vale para a interface remota
sem deploy web e preserva a rolagem/acomodação do teclado pelo WebKit.
Não há bloqueio da rolagem nem alteração manual das dimensões da WebView.

Os campos de login/cadastro usam `text-base` (16 px); essa alteração de CSS
ainda depende de deploy web no modelo remoto.

Validação manual no iPhone: tocar em e-mail e senha, alternar campos, fechar e
reabrir teclado, tentar pinça/duplo toque e confirmar que a escala permanece
estável e que todos os campos/botões continuam acessíveis por rolagem.
A compilação não substitui esse teste físico.

Referência: [WebKit — limites de escala](https://developer.apple.com/documentation/webkit/wkwebviewconfiguration/ignoresviewportscalelimits).

## Rolagem da gestão

A gestão autenticada utiliza `.hubly-admin-shell` limitada à altura da viewport,
com rolagem em `.hubly-admin-content` e na navegação lateral. A classe
`hubly-admin-root` é removida ao sair desse layout. Safe area superior fica no
cabeçalho/sidebar e a inferior é reservada no conteúdo para não encobrir ações.
Listas/tabelas mantêm suas rolagens existentes. Testar conteúdo extenso, menu,
modais e teclado no dispositivo após publicar o cliente no servidor.

A injeção de viewport deve permanecer em `webView(with:configuration:)`. Não
mover para `webViewConfiguration`: o Capacitor substitui o userContentController
entre esses dois pontos e descartaria o script de bloqueio de zoom.
