# Preparação mobile — 2026-09-10

Base: commit `1f33e26`, alterações locais não publicadas.

## Alterações

- `package.json`: comandos build web, sync, abertura nativa e testes de links.
- `client/src/hooks/useMobileApp.ts`: links no lançamento e em execução, cleanup
  assíncrono; retirado registro push em endpoint inexistente e logs de tokens.
- `client/src/lib/mobile-links.ts` e `tests/mobile-links.test.ts`: interpretação
  do host no esquema Hubly, rota real de cliente, filtro de origens e casos inválidos.
- `ios/App/App/Info.plist`: removida chave duplicada de orientação; mantido portrait
  para iPhone e as orientações existentes para iPad.
- `android/capacitor.settings.gradle`, `ios/App/CapApp-SPM/Package.swift` e
  `ios/App/App.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/Package.resolved`:
  sincronização com dependências instaladas e Capacitor 8.3.0 do lockfile.
- `.gitignore`: proteção de arquivos locais de assinatura/configuração.
- Documentação: `MOBILE_BUILD_GUIDE.md`, `ios/APNS_SETUP_GUIDE.md` e este relatório.

## Evidências

- Instalação com lockfile congelado concluída, sem alteração do lockfile.
- 4 testes de links passaram; `tsc --noEmit` passou.
- Vite compilou; avisa sobre chunks grandes preexistentes.
- Capacitor sync Android/iOS concluído.
- `plutil -lint` e `git diff --check` passaram.
- iOS: `xcodebuild` Debug para simulador, sem assinatura, **BUILD SUCCEEDED**.
  Saída: `/tmp/hubly-ios-build/Build/Products/Debug-iphonesimulator/App.app`.
- Android: Java 25 falhou com major version 69. Reexecutado com Temurin 21
  temporário em `/tmp/hubly-jdk21/Contents/Home`: **BUILD SUCCESSFUL**.
  APK: `android/app/build/outputs/apk/debug/app-debug.apk`.
  Identificador inspecionado: `com.orizontech.hubly`, versão 1.0/1, target SDK 36.
  SHA-256: `8fdcfa6f7cd1d8256b716226735bdb3856095ca7aabf02aebf5b1048371d586f`.
- Domínio remoto respondeu HTTP 200; isso não valida sessão nem operação autenticada.

## Limitações e próxima etapa

Na preparação inicial não foram feitos instalação em aparelho, QA autenticado, deploy web, commit/push,
assinatura de distribuição, AAB/IPA de loja nem upload. As correções do cliente
não estão no site remoto carregado pelos aplicativos.

O público foi definido pelo usuário: gestão somente. A arquitetura atual usa
`server.url`; a decisão de interface empacotada exige análise do acesso ao backend.
Push nativo, associações de domínio, assinatura, pagamentos digitais, exclusão de
conta, privacidade e materiais de loja seguem pendentes conforme o guia principal.

O Xcode avisou sobre imagem extra não atribuída no catálogo; o ícone de 1024 px
possui canal alfa. Builds de debug aprovados não equivalem a artefatos aceitos pelas lojas.

## Direcionamento para gestão

- `capacitor.config.ts`: entrada remota em `/admin`, com login/painel já existentes.
- `client/src/App.tsx`: rotas públicas redirecionam para gestão apenas no Capacitor;
  convite PWA oculto no app nativo. Site web preservado.
- `client/src/lib/mobile-links.ts` e `tests/mobile-links.test.ts`: links HTTPS
  filtrados pelo escopo de gestão e teste dos caminhos públicos/administrativos.
- Cadastro empresarial, onboarding, documentos legais e controles de acesso preservados.

A entrada `/admin` fica no pacote nativo; o filtro de rotas e o banner dependem
do deploy do cliente web enquanto `server.url` estiver ativo.

## Instalação física — 2026-09-10 17:02

- Build Debug assinado para iPhone concluído (`BUILD SUCCEEDED`).
- `devicectl` confirmou instalação e abertura de `com.orizontech.hubly` no
  iPhone Argemiro (iPhone 17 Pro Max).
- Artefato: `/tmp/hubly-ios-physical/Build/Products/Debug-iphoneos/App.app`.
- Entrada configurada: `https://hubly.orizontech.com.br/admin`.
- Login e QA visual/funcional no aparelho ainda não verificados. Não houve deploy web.

## Splash claro e marca do login

- `ios/App/App/Base.lproj/LaunchScreen.storyboard`: fundo `#fdf7ee`, logo
  centralizado em 204 × 64 pontos com aspect fit, sem ampliação para preencher a tela.
- `ios/App/App/Assets.xcassets/HublyLaunchLogo.imageset/`: imagem renderizada
  do componente `HublyLogo` real, com símbolo dourado, Poppins Light e texto `#45291a`.
- `scripts/render-splash-logo.tsx`: reprodução pelo React/Playwright (Chrome),
  recebendo `PLAYWRIGHT_MODULE` e `POPPINS_FONT` do ambiente. A fonte usada foi
  Poppins 300 da mesma família Google Fonts carregada pelo login.
- `capacitor.config.ts`: fundos claros para splash/status bar/WebView.
- `client/src/components/AdminLayout.tsx`, `AppOpeningMotion.tsx` e
  `client/src/index.css`: carregamento inicial e animação alinhados ao login.
- TypeScript, build web e build assinado iOS passaram; `git diff --check` passou.
- Autenticação, permissões e lógica de negócio não foram alteradas.
- O novo splash iOS é nativo. As alterações nos componentes web precisam de deploy
  para aparecer no app remoto. Não houve deploy nem push. Android visual não validado.

## Zoom ao focar login

- Novo `ios/App/App/HublyBridgeViewController.swift`, registrado em
  `ios/App/App.xcodeproj/project.pbxproj` e `Base.lproj/Main.storyboard`.
- Escala fixa 1 no documento principal do domínio Hubly via WKUserScript e
  `ignoresViewportScaleLimits = false`; navegação e bridge Capacitor preservados.
- `capacitor.config.ts`: `zoomEnabled: false` explícito.
- `AdminLayout.tsx`: campos do login/cadastro em 16 px.
- TypeScript, Vite, build iOS assinado e verificação de whitespace passaram.
- Fluxos de autenticação, APIs e rolagem para o teclado não alterados.
- Teste interativo do teclado e gestos no iPhone ainda precisa ser confirmado.

## Logo do formulário de login

`client/src/components/AdminLayout.tsx`: altura do logo acima do formulário
reduzida de 96 para 64 px, mantendo o componente e a proporção. Alteração
visual local; depende de deploy web para aparecer no iPhone com interface remota.

## Responsividade após login

- `AdminLayout.tsx`: shell com altura limitada à viewport; coluna de conteúdo e
  navegação com `min-height: 0`; cabeçalhos sem encolhimento; nome da empresa
  e plano acomodados em telas estreitas. Rolagem/pull-to-refresh permanecem no main.
- `client/src/index.css`: classe de documento ativa apenas na gestão autenticada,
  remove padding global duplicado de safe area; documento sem rolagem; main
  reserva espaço para navegação inferior e safe area. Login e site público preservados.
- `Dashboard.tsx`: estado de empresa não configurada deixa de exigir uma segunda
  tela completa abaixo do cabeçalho.
- TypeScript, build Vite e `git diff --check` passaram.
- Verificação com Playwright/Chrome no build local, respostas API fictícias e
  45 clientes: Dashboard e Clientes sem overflow do documento em 320, 390, 430
  e 1280 px de largura, com altura 844 px. Conteúdo longo continua acessível
  por rolagem; header permanece parado e scrollY da página em zero.
- Sem dados reais de produção, deploy ou validação interativa no iPhone nesta etapa.
  O usuário informou hospedagem em servidor próprio. O pacote nativo carrega a
  interface remota, portanto reinstalar o IPA não aplica essas mudanças de CSS.
