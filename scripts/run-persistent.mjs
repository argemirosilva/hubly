import "dotenv/config";

// A tarefa do Windows deve executar com C:\orizontech\hubly como diretorio.
// Recusa configuracoes divergentes sem modificar ambiente ou credenciais.
if (Number(process.env.PORT || "3010") !== 3010) {
  throw new Error("A instalacao persistente do Hubly exige a porta 3010.");
}
if (process.env.NODE_ENV === "development") {
  throw new Error("A execucao persistente exige o build, nao o modo development.");
}

await import("../dist/index.js");
