# Guia de Configuração APNs (Push Notifications iOS)

## Pré-requisitos
- Conta Apple Developer ativa (US$99/ano): https://developer.apple.com/programs/
- Mac com Xcode instalado
- App ID registrado: `com.orizontech.hubly`

---

## Passo 1 — Habilitar Push Notifications no Apple Developer Portal

1. Acesse https://developer.apple.com/account
2. Vá em **Certificates, Identifiers & Profiles → Identifiers**
3. Selecione `com.orizontech.hubly` (ou crie se não existir)
4. Em **Capabilities**, ative **Push Notifications**
5. Salve as alterações

---

## Passo 2 — Criar Certificado APNs (para servidor)

1. Em **Certificates**, clique em **+**
2. Selecione **Apple Push Notification service SSL (Sandbox & Production)**
3. Selecione o App ID `com.orizontech.hubly`
4. Siga as instruções para gerar o CSR no Keychain Access do Mac
5. Faça upload do CSR e baixe o certificado `.cer`
6. Dê duplo clique no `.cer` para importar no Keychain
7. Exporte como `.p12` (com senha) — este arquivo vai para o servidor Hubly

---

## Passo 3 — Configurar no Xcode

1. Abra o projeto: `npx cap open ios`
2. Selecione o target **App** → aba **Signing & Capabilities**
3. Clique em **+ Capability** → adicione **Push Notifications**
4. Adicione também **Background Modes** → marque **Remote notifications**
5. Certifique-se que o arquivo `App.entitlements` está vinculado ao target

---

## Passo 4 — Configurar no AppDelegate.swift

O Capacitor já configura o AppDelegate automaticamente. Verifique se o arquivo
`ios/App/App/AppDelegate.swift` contém a importação do Capacitor:

```swift
import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {
    // ... código gerado pelo Capacitor
}
```

---

## Passo 5 — Enviar Push pelo Servidor Hubly

Para enviar notificações push iOS do backend, use a biblioteca `node-apn` ou
o serviço Firebase Cloud Messaging (que suporta tanto Android quanto iOS).

**Recomendação:** Use o Firebase para unificar Android e iOS em um único serviço.
No Firebase Console → Project Settings → Cloud Messaging → iOS app:
- Faça upload do arquivo `.p12` exportado no Passo 2
- O FCM cuidará do envio para ambas as plataformas

---

## Passo 6 — Testar

1. Rode o app em um dispositivo físico (push não funciona no simulador)
2. Aceite a permissão de notificações quando solicitado
3. O token do dispositivo será registrado automaticamente pelo `useMobileApp.ts`
4. Envie uma notificação de teste pelo Firebase Console → Cloud Messaging

---

## Observações Importantes

- O arquivo `App.entitlements` já foi criado com `aps-environment: development`
- Para produção, mude para `aps-environment: production` antes de publicar na App Store
- Ao atualizar o app, **não é necessário desinstalar** — instale por cima via TestFlight ou Xcode
- Tokens APNs mudam periodicamente; o app re-registra automaticamente a cada abertura
