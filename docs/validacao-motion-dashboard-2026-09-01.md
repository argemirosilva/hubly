# Validação visual — Motion Graphics no Dashboard

Data: 01/09/2026

Foram realizadas capturas da rota `/admin` em desktop (1280×720) e celular (390×844). Como a sessão de validação não estava autenticada, ambas exibiram a tela de acesso, sem erros visuais de carregamento. A compilação TypeScript e os testes de Motion Graphics foram aprovados antes das capturas.

A implementação no Dashboard usa apenas animações curtas de opacidade e transformação nos indicadores e widgets, com desativação global para a preferência `prefers-reduced-motion`.
