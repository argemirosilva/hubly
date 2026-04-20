import "dotenv/config";

const instanceId = process.env.ZAPI_INSTANCE_ID;
const token = process.env.ZAPI_TOKEN;
const clientToken = process.env.ZAPI_CLIENT_TOKEN;
const phone = "5514997406686";

console.log("Instance ID:", instanceId ? instanceId.substring(0, 8) + "..." : "MISSING");
console.log("Token:", token ? token.substring(0, 8) + "..." : "MISSING");
console.log("Client-Token:", clientToken ? clientToken.substring(0, 8) + "..." : "MISSING");

if (!instanceId || !token || !clientToken) {
  console.error("Credenciais Z-API não encontradas!");
  process.exit(1);
}

const url = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`;

const body = {
  phone,
  message: "🤖 Mensagem de teste do Hubly! A integração Z-API está funcionando corretamente. ✅",
};

console.log(`\nEnviando para ${phone}...`);
console.log("URL:", url.substring(0, 60) + "...");

const response = await fetch(url, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Client-Token": clientToken,
  },
  body: JSON.stringify(body),
});

const data = await response.json();
console.log("\nResposta Z-API:", JSON.stringify(data, null, 2));

if (response.ok && data.zaapId) {
  console.log("\n✅ Mensagem enviada com sucesso! ID:", data.zaapId);
} else {
  console.error("\n❌ Falha ao enviar:", data);
}
