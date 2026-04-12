# Hubly — Guia Completo de Build e Publicação nas Lojas

O Hubly usa **Capacitor** para empacotar o web app como app nativo iOS e Android.
O app carrega `https://hubly.orizontech.com.br` dentro de um WebView nativo.

> **Quando atualizar o código do Hubly:** se apenas o código web mudou (sem alterações nativas), **não é necessário gerar novo build** — o app já carrega a versão mais recente automaticamente. Só gere novo build quando mudar ícones, permissões, plugins Capacitor ou a versão nas lojas.

---

## Pré-requisitos

| Ferramenta | Versão | Download |
|---|---|---|
| Node.js | 18+ | https://nodejs.org |
| pnpm | 8+ | `npm i -g pnpm` |
| Android Studio | Hedgehog+ | https://developer.android.com/studio |
| JDK | 17+ | https://adoptium.net |
| Xcode (Mac) | 15+ | Mac App Store |

---

## Passo inicial (ambas as plataformas)

```bash
# Clonar o repositório
git clone <URL_DO_REPO> && cd agendei

# Instalar dependências
pnpm install

# Sincronizar Capacitor (sempre antes de abrir Android Studio / Xcode)
npx cap sync
```

---

## Android

### Build de debug (para testar no celular)

```bash
npx cap open android
```

No Android Studio:
1. Aguarde o Gradle sync terminar (2–5 min na primeira vez)
2. Conecte um dispositivo físico via USB ou inicie um emulador
3. Clique em **Run ▶** (`Shift+F10`)

> **Atualização:** ao instalar uma nova versão de debug em dispositivo que já tem o app, **não é necessário desinstalar** — o Android Studio substitui automaticamente.

### Build de produção (AAB para Play Store)

```bash
npx cap open android
```

No Android Studio:
1. **Build → Generate Signed Bundle / APK**
2. Selecione **Android App Bundle (.aab)**
3. Crie ou selecione um **Keystore** (`.jks`) — guarde o arquivo e as senhas em local seguro!
4. Preencha Key alias, Key password, Store password
5. Selecione **release** como Build Variant → **Finish**
6. Arquivo gerado em `android/app/release/app-release.aab`

> **CRÍTICO:** O Keystore é necessário para **todas as atualizações futuras**. Se perdê-lo, não poderá atualizar o app na Play Store.

### Publicar na Google Play Store

1. Acesse https://play.google.com/console
2. Crie conta de desenvolvedor (US$25 — pagamento único)
3. **Criar app** → preencha nome, idioma, categoria (Negócios)
4. Complete o **Formulário de conteúdo** (classificação etária, política de privacidade)
5. Em **Produção → Criar nova versão**, faça upload do `.aab`
6. Preencha **Notas da versão**
7. Adicione **screenshots** (mínimo 2 por dispositivo):
   - Telefone: mínimo 1080×1920px
   - Tablet 7": mínimo 1200×1920px
8. **Ícone da loja:** 512×512px PNG (já gerado em `android/app/src/main/res/`)
9. **Enviar para revisão** (aprovação: 1–3 dias úteis)

### Atualizar versão no Android

Em `android/app/build.gradle`:
```gradle
defaultConfig {
    versionCode 2        // Incrementar +1 a cada publicação
    versionName "1.1"    // Versão visível ao usuário
}
```

---

## iOS

> **Requisito obrigatório:** Mac com Xcode 15+. Build iOS não é possível no Windows ou Linux.

### Configurar notificações push (APNs) — antes do primeiro build

Siga o guia detalhado em `ios/APNS_SETUP_GUIDE.md`.

### Build de desenvolvimento (simulador)

```bash
npx cap open ios
```

No Xcode:
1. Selecione simulador (ex: iPhone 15) na barra superior
2. Clique em **Run ▶** (`Cmd+R`)

### Build para dispositivo físico

1. Conecte o iPhone via USB e desbloqueie
2. No Xcode, selecione o dispositivo na barra superior
3. Em **Signing & Capabilities → Team**, selecione sua conta Apple Developer
4. Clique em **Run ▶**

> **Atualização:** ao instalar nova versão via Xcode em dispositivo que já tem o app, **não é necessário desinstalar** — o Xcode substitui automaticamente.

### Build de produção (IPA para App Store)

No Xcode:
1. Selecione **Any iOS Device (arm64)** como destino
2. **Product → Archive** (5–10 minutos)
3. Na janela **Organizer**, selecione o archive
4. **Distribute App → App Store Connect → Upload**
5. Aguarde o processamento no App Store Connect (10–30 min)

### Publicar na Apple App Store

1. Acesse https://appstoreconnect.apple.com
2. **Meus Apps → +** → preencha nome, bundle ID (`com.orizontech.hubly`), SKU
3. **TestFlight:** distribua para testadores internos antes de publicar
4. Em **App Store → Versão iOS**, preencha:
   - **Descrição** (até 4000 caracteres)
   - **Palavras-chave** (até 100 caracteres)
   - **Screenshots obrigatórios:**
     - iPhone 6.5": 1284×2778px
     - iPhone 5.5": 1242×2208px
   - **Ícone da App Store:** 1024×1024px PNG sem transparência
5. Selecione o build enviado pelo Xcode
6. **Enviar para revisão** (aprovação: 1–3 dias úteis)

### Atualizar versão no iOS

No Xcode → target **App** → aba **General**:
- **Version:** 1.1 (visível ao usuário)
- **Build:** 2 (deve incrementar a cada envio para App Store Connect)

---

## Firebase Cloud Messaging (Push Notifications)

### Android

1. Acesse https://console.firebase.google.com → Criar projeto **Hubly**
2. **Adicionar app → Android** → package: `com.orizontech.hubly`
3. Baixe `google-services.json` e coloque em `android/app/`
4. Execute: `npx cap sync android`
5. No Firebase Console → **Cloud Messaging → Server Key** → copie a chave
6. Adicione como `FIREBASE_SERVER_KEY` nas variáveis do projeto Hubly

### iOS

Siga o guia completo em `ios/APNS_SETUP_GUIDE.md`.

---

## Checklist de Publicação

### Android (Play Store)
- [ ] `versionCode` incrementado em `android/app/build.gradle`
- [ ] `versionName` atualizado
- [ ] Keystore disponível (arquivo `.jks` + senhas)
- [ ] `google-services.json` em `android/app/` (para push)
- [ ] `npx cap sync android` executado
- [ ] Build `.aab` gerado em modo **release** com assinatura
- [ ] Screenshots preparados (1080×1920px mínimo)
- [ ] Ícone 512×512px pronto
- [ ] Notas da versão escritas

### iOS (App Store)
- [ ] Version e Build incrementados no Xcode
- [ ] Certificado de distribuição válido no Apple Developer Portal
- [ ] `App.entitlements` com `aps-environment: production`
- [ ] `npx cap sync ios` executado
- [ ] Archive gerado e enviado para App Store Connect
- [ ] Screenshots preparados (1284×2778px e 1242×2208px)
- [ ] Ícone 1024×1024px PNG sem transparência
- [ ] Notas da versão escritas

---

## Comandos de Referência

```bash
npx cap sync                    # Sincronizar código web com projetos nativos
npx cap sync android            # Sincronizar apenas Android
npx cap sync ios                # Sincronizar apenas iOS
npx cap open android            # Abrir Android Studio
npx cap open ios                # Abrir Xcode
adb devices                     # Listar dispositivos Android conectados
adb install app-debug.apk       # Instalar APK via linha de comando
```

---

## Estrutura de Arquivos

```
agendei/
├── android/                    ← Projeto Android Studio
│   └── app/
│       ├── google-services.json.example  ← Renomear para .json após configurar Firebase
│       └── src/main/res/       ← Ícones gerados automaticamente
├── ios/
│   ├── App/App/
│   │   ├── App.entitlements    ← Permissões APNs
│   │   └── Info.plist          ← Configurações iOS
│   └── APNS_SETUP_GUIDE.md     ← Guia de configuração APNs
├── capacitor.config.ts         ← Configuração principal do Capacitor
└── MOBILE_BUILD_GUIDE.md       ← Este arquivo
```

---

## Suporte

- Capacitor: https://capacitorjs.com/docs
- Google Play Console: https://support.google.com/googleplay/android-developer
- App Store Connect: https://developer.apple.com/support/app-store-connect/
- Firebase Console: https://console.firebase.google.com
