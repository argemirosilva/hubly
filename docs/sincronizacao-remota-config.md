# Configuração da sincronização remota

No aplicativo que consome os dados do Hubly, configure as variáveis abaixo apenas no ambiente seguro de servidor:

```env
HUBLY_REMOTE_BASE_URL=https://hubly.orizontech.com.br
HUBLY_REMOTE_INTEGRATION_KEY=<clientId.secret-fornecido-pelo-Hubly>
```

> A variável anterior `REMOTE_INTEGRATION_KEY` não deve mais ser usada. A automação horária deve ler `HUBLY_REMOTE_INTEGRATION_KEY`.

O valor da chave deve ser mantido fora do repositório e nunca exposto ao frontend. Para cada chamada, o consumidor deve enviar o token Bearer e assinar a requisição com HMAC SHA-256, conforme o contrato da API de sincronização.
