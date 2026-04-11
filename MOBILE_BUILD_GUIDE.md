# Hubly — Guia de Build para iOS e Android

Este guia explica como gerar os arquivos `.apk`/`.aab` (Android) e `.ipa` (iOS) do Hubly usando o Capacitor.

---

## Pré-requisitos

### Para Android
- [Android Studio](https://developer.android.com/studio) instalado
- JDK 17 ou superior
- Conta no [Google Play Console](https://play.google.com/console) (US$25 taxa única)

### Para iOS
- Mac com macOS 13 ou superior
- [Xcode 15+](https://developer.apple.com/xcode/) instalado
- Conta no [Apple Developer Program](https://developer.apple.com/programs/) (US$99/ano)

---

## Fluxo de Atualização (toda vez que o código mudar)

Sempre que o código do Hubly for atualizado e publicado em `https://hubly.orizontech.com.br`, **não é necessário gerar um novo APK** — o app já carrega a versão mais recente automaticamente, pois aponta para o servidor remoto.

Só é necessário gerar um novo build quando:
- Mudar configurações nativas (ícones, splash screen, permissões)
- Adicionar novos plugins Capacitor
- Atualizar a versão do app nas lojas

---

## Android

### 1. Clonar o repositório no seu computador

```bash
git clone https://github.com/seu-usuario/agendei.git
cd agendei
pnpm install
```

### 2. Sincronizar o Capacitor

```bash
npx cap sync android
```

### 3. Abrir no Android Studio

```bash
npx cap open android
```

### 4. Configurar o app no Android Studio

No Android Studio, abra `android/app/build.gradle` e verifique:

```gradle
android {
    defaultConfig {
        applicationId "com.orizontech.hubly"
        minSdkVersion 23
        targetSdkVersion 34
        versionCode 1
        versionName "1.0.0"
    }
}
```

### 5. Adicionar ícones do app

Substitua os ícones em `android/app/src/main/res/`:
- `mipmap-mdpi/ic_launcher.png` — 48x48px
- `mipmap-hdpi/ic_launcher.png` — 72x72px
- `mipmap-xhdpi/ic_launcher.png` — 96x96px
- `mipmap-xxhdpi/ic_launcher.png` — 144x144px
- `mipmap-xxxhdpi/ic_launcher.png` — 192x192px

> Dica: use o [Android Asset Studio](https://romannurik.github.io/AndroidAssetStudio/icons-launcher.html) para gerar todos os tamanhos automaticamente.

### 6. Gerar APK de debug (para testar)

No Android Studio: **Build → Build Bundle(s) / APK(s) → Build APK(s)**

O arquivo será gerado em: `android/app/build/outputs/apk/debug/app-debug.apk`

**Para instalar no celular:**
```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

> ⚠️ Se já tiver uma versão instalada, **desinstale o app do celular antes** de instalar a nova versão de debug.

### 7. Gerar AAB para o Play Store (produção)

No Android Studio: **Build → Generate Signed Bundle / APK → Android App Bundle**

- Crie ou use um keystore existente
- Preencha as informações de assinatura
- O arquivo `.aab` será gerado em `android/app/release/`

---

## iOS

> ⚠️ **Requer Mac com Xcode instalado.** Não é possível gerar builds iOS no Windows ou Linux.

### 1. Clonar o repositório no Mac

```bash
git clone https://github.com/seu-usuario/agendei.git
cd agendei
pnpm install
```

### 2. Sincronizar o Capacitor

```bash
npx cap sync ios
```

### 3. Abrir no Xcode

```bash
npx cap open ios
```

### 4. Configurar o projeto no Xcode

No Xcode, selecione o target **App** e configure:
- **Bundle Identifier**: `com.orizontech.hubly`
- **Version**: `1.0.0`
- **Build**: `1`
- **Team**: selecione sua conta Apple Developer

### 5. Adicionar ícones do app

No Xcode, abra `ios/App/App/Assets.xcassets/AppIcon.appiconset/` e substitua os ícones.

> Dica: use o [AppIcon Generator](https://www.appicon.co/) para gerar todos os tamanhos necessários para iOS.

### 6. Testar no simulador

No Xcode, selecione um simulador (ex: iPhone 15) e clique em **Run (▶)**.

### 7. Gerar IPA para a App Store (produção)

1. Selecione **Any iOS Device (arm64)** como destino
2. Menu: **Product → Archive**
3. Na janela de Organizer, clique em **Distribute App**
4. Selecione **App Store Connect** e siga o wizard

---

## Configurações de Permissões

### Android (`android/app/src/main/AndroidManifest.xml`)

As seguintes permissões já estão configuradas pelo Capacitor:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

### iOS (`ios/App/App/Info.plist`)

Adicione as seguintes chaves para notificações push:

```xml
<key>NSUserNotificationUsageDescription</key>
<string>O Hubly usa notificações para alertar sobre novos agendamentos.</string>
```

---

## Atualizar o App nas Lojas

Quando precisar publicar uma nova versão nativa:

1. Incremente `versionCode` (Android) ou `Build` (iOS)
2. Rode `npx cap sync` para sincronizar plugins
3. Gere o novo build assinado
4. Faça upload no Google Play Console ou App Store Connect

---

## Estrutura de Arquivos Gerados

```
agendei/
├── android/          ← Projeto Android Studio (abrir com Android Studio)
├── ios/              ← Projeto Xcode (abrir com Xcode no Mac)
├── capacitor.config.ts  ← Configuração principal do Capacitor
└── client/dist/      ← Build do frontend (gerado por pnpm build)
```

---

## Suporte

Para dúvidas sobre o Capacitor: [https://capacitorjs.com/docs](https://capacitorjs.com/docs)
