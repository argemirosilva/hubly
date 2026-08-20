#!/usr/bin/env bash
# Atualiza o projeto local (Mac/Linux) para coincidir com origin/main no GitHub.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

BRANCH="${1:-main}"

echo "==> Repositório: $ROOT"
echo "==> Buscando atualizações do remoto..."
git fetch origin

CURRENT="$(git branch --show-current)"
if [[ "$CURRENT" != "$BRANCH" ]]; then
  echo "==> Mudando para a branch $BRANCH..."
  git checkout "$BRANCH"
fi

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo ""
  echo "AVISO: há alterações locais não commitadas."
  echo "Para descartá-las e ficar idêntico ao Git remoto, execute:"
  echo "  git reset --hard origin/$BRANCH"
  echo ""
  read -r -p "Continuar com git pull mesmo assim? [s/N] " CONFIRM
  [[ "${CONFIRM,,}" == "s" ]] || exit 1
fi

echo "==> Atualizando código (git pull)..."
git pull origin "$BRANCH"

echo "==> Instalando dependências (pnpm)..."
pnpm install

if [[ -f capacitor.config.ts ]]; then
  echo "==> Sincronizando projetos nativos (Capacitor)..."
  npx cap sync
fi

echo ""
echo "Pronto. Versão atual:"
git log -1 --oneline
