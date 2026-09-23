# mcp-maker

MCP que **ensina o que é MCP** e **gera outro servidor** a partir de uma ideia.

O modelo no chat não tem mãos: não lê seu Gmail, não consulta uma API, não monta um projeto sozinho. MCP (Model Context Protocol) é o padrão que entrega essas mãos — ferramentas, documentos e fluxos prontos — para qualquer host (VS Code, Cursor, Claude).

Este repositório é o estudo: o próprio servidor é um MCP que sabe desenhar e gerar MCPs.

## Para que serve

- **Dado vivo** — e-mail, wiki, tickets, clima, arquivos locais.
- **Ação** — criar issue, buscar, gerar um projeto.
- **Domínio empacotado** — em vez de reexplicar as regras, o servidor já sabe o ofício.

Analogia curta: **USB para IAs**. Você escreve o servidor uma vez; o host só pluga.

## O que este servidor expõe

| Tipo | Nome | Função |
|---|---|---|
| tool | `explain_mcp` | Explica um tópico (para que serve, analogia, Cursor…) |
| tool | `evaluate_idea` | Diz se a ideia merece MCP ou outra coisa |
| tool | `design_mcp` | Desenha tools / resources / prompts |
| tool | `generate_mcp` | Gera o projeto TypeScript (texto dos arquivos) |
| tool | `generate_cursor_config` | Gera `mcp.json` para Cursor e VS Code |
| tool | `list_examples` | Catálogo de ideias que valem a pena |
| tool | `next_steps` | Checklist para ligar o servidor |
| resource | `mcp-maker://o-que-e` | Guia do protocolo |
| prompt | `criar-mcp` | Fluxo completo a partir de uma ideia |
| prompt | `explicar-mcp` | Explicação no nível pedido |

## Requisitos

- Node.js 20+
- npm
- VS Code com GitHub Copilot Chat (ou Cursor)

```bash
npm install
```

Não use `console.log` no servidor: `stdout` é o protocolo. Logue com `console.error`.

## Abrir no VS Code e ligar o MCP

1. **File → Open Folder** e escolha `Documents/estudos/mcp` (esta pasta, não o home do Windows).
2. Aceite as extensões sugeridas (`.vscode/extensions.json`): Copilot / Copilot Chat, que hospedam MCP.
3. Rode `npm install` no terminal integrado se ainda não rodou.
4. Abra o painel de MCP do VS Code (**Chat / Agent → MCP** ou Command Palette: `MCP: List Servers`).
5. Ligue **mcp-maker**. A config está em [`.vscode/mcp.json`](.vscode/mcp.json).
6. No chat, peça por exemplo: *“para que serve um MCP?”* ou *“desenha um MCP de notas locais”*.
7. Aprove a primeira chamada de ferramenta.

Para testar sem o chat: **Run and Debug → MCP: inspector** (abre o Inspector no navegador) ou:

```bash
npm run inspect
```

**Run and Debug → MCP: start (stdio)** sobe o processo e espera o host na stdin — útil só para ver se inicia sem erro.

## Cursor

A mesma pasta tem [`.cursor/mcp.json`](.cursor/mcp.json). Em Customize → MCP o servidor **mcp-maker** deve aparecer. Recarregue se acabou de clonar.

## Inspecionar no terminal

```bash
npx tsx src/index.ts
```

O processo fica à espera de JSON-RPC na stdin. `Ctrl+C` para sair.

## Ideia de uso

1. `evaluate_idea` — vale a pena?
2. `design_mcp` — quais tools?
3. `generate_mcp` — arquivos do projeto novo
4. Grave os arquivos numa pasta, `npm install`, ligue no `.vscode/mcp.json`

## Licença

Estudo pessoal. Use e copie à vontade.
