import { isHarmfulIdea } from "./knowledge.js";

export function slugify(name: string): string {
  const slug = name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || "meu-mcp";
}

export type DesignedTool = {
  name: string;
  description: string;
  args: { name: string; type: "string" | "number" | "boolean"; optional?: boolean; describe: string }[];
};

export type Design = {
  name: string;
  idea: string;
  why: string;
  tools: DesignedTool[];
  resources: { uri: string; title: string; description: string }[];
  prompts: { name: string; description: string }[];
  transport: "stdio";
};

function inferTools(idea: string): DesignedTool[] {
  const text = idea.toLowerCase();
  const tools: DesignedTool[] = [];

  if (/nota|anota/.test(text)) {
    tools.push(
      {
        name: "adicionar-nota",
        description: "Acrescenta uma nota com título e texto.",
        args: [
          { name: "titulo", type: "string", describe: "Título curto da nota" },
          { name: "texto", type: "string", describe: "Conteúdo da nota" },
        ],
      },
      {
        name: "buscar-notas",
        description: "Busca notas por termo.",
        args: [{ name: "termo", type: "string", describe: "Texto a procurar" }],
      },
    );
  }

  if (/tarefa|todo|card|issue|ticket/.test(text)) {
    tools.push(
      {
        name: "criar-tarefa",
        description: "Cria uma tarefa com título e descrição.",
        args: [
          { name: "titulo", type: "string", describe: "Título da tarefa" },
          { name: "descricao", type: "string", optional: true, describe: "Detalhes" },
        ],
      },
      {
        name: "listar-tarefas",
        description: "Lista tarefas abertas.",
        args: [{ name: "filtro", type: "string", optional: true, describe: "Filtro opcional" }],
      },
    );
  }

  if (/clima|tempo|alerta/.test(text)) {
    tools.push({
      name: "get-alerts",
      description: "Alertas meteorológicos ativos para um código de região.",
      args: [{ name: "regiao", type: "string", describe: "Código da região, ex. SP" }],
    });
  }

  if (/wiki|doc|conhecimento|buscar/.test(text) && tools.length === 0) {
    tools.push({
      name: "buscar",
      description: `Busca informação relacionada a: ${idea}`,
      args: [{ name: "pergunta", type: "string", describe: "O que o modelo quer saber" }],
    });
  }

  if (tools.length === 0) {
    tools.push({
      name: "executar",
      description: `Executa a ação principal do servidor: ${idea}`,
      args: [
        { name: "pedido", type: "string", describe: "O que o modelo quer fazer" },
      ],
    });
  }

  return tools.slice(0, 5);
}

export function designMcp(idea: string, name?: string): Design | { error: string } {
  if (isHarmfulIdea(idea)) {
    return { error: "Essa ideia não é um MCP que eu ajudo a construir." };
  }
  const trimmed = idea.trim();
  if (trimmed.length < 8) {
    return { error: "Descreva o sistema e a ação (ex.: 'notas locais: adicionar e buscar')." };
  }

  const slug = slugify(name ?? trimmed.split(/[:.—–-]/)[0] ?? "meu-mcp");
  const tools = inferTools(trimmed);

  return {
    name: slug,
    idea: trimmed,
    why: "O modelo precisa de uma ação ou de um dado que não vive no chat. MCP entrega isso de forma reutilizável.",
    tools,
    resources: [
      {
        uri: `${slug}://sobre`,
        title: "Sobre",
        description: `O que este servidor faz: ${trimmed}`,
      },
    ],
    prompts: [
      {
        name: "comecar",
        description: `Inicia um fluxo usando ${slug} a partir de um pedido da pessoa.`,
      },
    ],
    transport: "stdio",
  };
}

export function formatDesign(design: Design): string {
  const tools = design.tools
    .map((t) => {
      const args = t.args
        .map((a) => `    - ${a.name}${a.optional ? "?" : ""}: ${a.type} — ${a.describe}`)
        .join("\n");
      return `- \`${t.name}\` — ${t.description}\n${args}`;
    })
    .join("\n");
  const resources = design.resources
    .map((r) => `- \`${r.uri}\` — ${r.title}: ${r.description}`)
    .join("\n");
  const prompts = design.prompts
    .map((p) => `- \`${p.name}\` — ${p.description}`)
    .join("\n");

  return `# Desenho: ${design.name}

**Ideia:** ${design.idea}

**Por que MCP:** ${design.why}

**Transporte:** ${design.transport} (local no Cursor / VS Code)

## Ferramentas
${tools}

## Recursos
${resources}

## Prompts
${prompts}

Próximo passo: chame \`generate_mcp\` com o mesmo nome e ideia para receber os arquivos.
`;
}

function zodField(arg: DesignedTool["args"][number]): string {
  const base =
    arg.type === "number"
      ? "z.number()"
      : arg.type === "boolean"
        ? "z.boolean()"
        : "z.string()";
  const described = `${base}.describe(${JSON.stringify(arg.describe)})`;
  return arg.optional ? `${described}.optional()` : described;
}

function toolHandler(tool: DesignedTool): string {
  const names = tool.args.map((a) => a.name).join(", ");
  const destructure = names ? `{ ${names} }` : "_args";
  const parts = tool.args.map((a) => `${a.name}: \${${a.name}}`);
  return `    server.registerTool(
        ${JSON.stringify(tool.name)},
        {
            description: ${JSON.stringify(tool.description)},
            inputSchema: z.object({
${tool.args.map((a) => `                ${a.name}: ${zodField(a)},`).join("\n")}
            })
        },
        async (${destructure}) => ({
            content: [{
                type: "text",
                text: ${JSON.stringify(tool.description + "\\n")}${parts.length ? ` + \`\\n${parts.join("\\n")}\`` : ""}
            }]
        })
    );`;
}

export function generateProject(design: Design): Record<string, string> {
  const pkg = `{
  "name": ${JSON.stringify(design.name)},
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "description": ${JSON.stringify(design.idea)},
  "scripts": {
    "start": "tsx src/index.ts",
    "inspect": "npx @modelcontextprotocol/inspector npx tsx src/index.ts"
  },
  "engines": { "node": ">=20" },
  "dependencies": {
    "@modelcontextprotocol/server": "^2.0.0",
    "zod": "^4.0.0"
  },
  "devDependencies": {
    "@types/node": "^24.0.0",
    "tsx": "^4.20.0",
    "typescript": "^5.9.0"
  }
}
`;

  const tsconfig = `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "skipLibCheck": true,
    "types": ["node"],
    "noEmit": true,
    "rootDir": "src"
  },
  "include": ["src"]
}
`;

  const index = `import { McpServer, ResourceTemplate } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import * as z from "zod/v4";

function createServer(): McpServer {
    const server = new McpServer({ name: ${JSON.stringify(design.name)}, version: "1.0.0" });

${design.tools.map(toolHandler).join("\n\n")}

    server.registerResource(
        "sobre",
        ${JSON.stringify(design.resources[0]?.uri ?? `${design.name}://sobre`)},
        {
            title: "Sobre",
            description: ${JSON.stringify(design.idea)},
            mimeType: "text/markdown"
        },
        async (uri) => ({
            contents: [{
                uri: uri.href,
                mimeType: "text/markdown",
                text: ${JSON.stringify(`# ${design.name}\\n\\n${design.idea}\\n`)}
            }]
        })
    );

    server.registerPrompt(
        "comecar",
        {
            title: "Começar",
            description: ${JSON.stringify(design.prompts[0]?.description ?? "Inicia o fluxo")},
            argsSchema: z.object({
                pedido: z.string().describe("O que você quer fazer")
            })
        },
        ({ pedido }) => ({
            messages: [{
                role: "user" as const,
                content: {
                    type: "text" as const,
                    text: \`Use o servidor ${design.name} para: \${pedido}\`
                }
            }]
        })
    );

    return server;
}

void serveStdio(createServer);
console.error(${JSON.stringify(`${design.name} MCP server running on stdio`)});
`;

  const mcpJson = `{
  "servers": {
    ${JSON.stringify(design.name)}: {
      "type": "stdio",
      "command": "npx",
      "args": ["tsx", "src/index.ts"],
      "cwd": "\${workspaceFolder}"
    }
  }
}
`;

  const cursorJson = `{
  "mcpServers": {
    ${JSON.stringify(design.name)}: {
      "type": "stdio",
      "command": "npx",
      "args": ["tsx", "src/index.ts"],
      "cwd": "\${workspaceFolder}"
    }
  }
}
`;

  const readme = `# ${design.name}

${design.idea}

Servidor MCP gerado pelo **mcp-maker**. Transporte: stdio.

## Rodar

\`\`\`bash
npm install
npx tsx src/index.ts
\`\`\`

stdout é o protocolo. Não use \`console.log\`.

## VS Code

1. File → Open Folder neste diretório.
2. Instale as extensões sugeridas.
3. Abra o painel MCP / Agent e ligue \`${design.name}\`.
4. Peça no chat algo que use as ferramentas.

Arquivo de config: \`.vscode/mcp.json\`.

## Cursor

Copie \`.cursor/mcp.json\` ou use o mesmo comando no \`mcp.json\` do Cursor.

## Inspecionar sem host

\`\`\`bash
npm run inspect
\`\`\`
`;

  const gitignore = `node_modules/
dist/
*.log
.DS_Store
.env
`;

  return {
    "package.json": pkg,
    "tsconfig.json": tsconfig,
    ".gitignore": gitignore,
    "src/index.ts": index,
    ".vscode/mcp.json": mcpJson,
    ".cursor/mcp.json": cursorJson,
    "README.md": readme,
  };
}

export function formatGeneratedFiles(files: Record<string, string>): string {
  const blocks = Object.entries(files)
    .map(([path, body]) => `### ${path}\n\n\`\`\`\n${body.trimEnd()}\n\`\`\``)
    .join("\n\n");
  return `# Projeto gerado

O host (Cursor/VS Code) deve gravar estes arquivos numa pasta nova. Depois: \`npm install\` e ligar o servidor no \`mcp.json\`.

${blocks}
`;
}

export function cursorConfig(name: string, entry = "src/index.ts"): string {
  const slug = slugify(name);
  return `# Config para Cursor / VS Code

Grave em \`.cursor/mcp.json\` (Cursor) ou \`.vscode/mcp.json\` (VS Code).

## Cursor (\`.cursor/mcp.json\`)

\`\`\`json
{
  "mcpServers": {
    "${slug}": {
      "type": "stdio",
      "command": "npx",
      "args": ["tsx", ${JSON.stringify(entry)}],
      "cwd": "\${workspaceFolder}"
    }
  }
}
\`\`\`

## VS Code (\`.vscode/mcp.json\`)

\`\`\`json
{
  "servers": {
    "${slug}": {
      "type": "stdio",
      "command": "npx",
      "args": ["tsx", ${JSON.stringify(entry)}],
      "cwd": "\${workspaceFolder}"
    }
  }
}
\`\`\`

Depois: recarregue os servidores MCP, confirme que está ligado, peça no chat e aprove a primeira chamada.
`;
}

export function nextSteps(name?: string): string {
  const slug = name ? slugify(name) : "mcp-maker";
  return `# Próximos passos

1. \`npm install\` na pasta do servidor (Node 20+).
2. Teste sem host: \`npx @modelcontextprotocol/inspector npx tsx src/index.ts\`.
3. No **VS Code**: File → Open Folder → abra a pasta → ligue o servidor em \`.vscode/mcp.json\`.
4. No **Cursor**: Customize → MCP, ou use \`.cursor/mcp.json\`.
5. Peça no chat algo que dispare uma ferramenta. Aprove a chamada.
6. Se falhar: Output → **MCP Logs**. Causas comuns: Node < 20, \`console.log\` no stdout, pasta errada, \`npm install\` não rodou.

Servidor atual deste estudo: \`${slug}\`.
`;
}
