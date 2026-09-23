import { McpServer, ResourceTemplate } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import {
  EXAMPLES,
  TOPICS,
  exampleBySlug,
  evaluateIdea,
  explain,
  formatExample,
  listExamples,
  type Topic,
} from "./knowledge.js";
import {
  cursorConfig,
  designMcp,
  formatDesign,
  formatGeneratedFiles,
  generateProject,
  nextSteps,
} from "./templates.js";

const TOPIC_ENUM = z.enum(TOPICS);

function text(body: string, isError = false) {
  return { content: [{ type: "text" as const, text: body }], isError };
}

export function createServer(): McpServer {
  const server = new McpServer({ name: "mcp-maker", version: "1.0.0" });

  server.registerTool(
    "explain_mcp",
    {
      title: "Explicar MCP",
      description:
        "Explica o que é MCP e para que serve. Use quando a pessoa não souber o protocolo, ou pedir analogia, ferramentas, recursos, prompts, transporte ou Cursor.",
      inputSchema: z.object({
        topic: TOPIC_ENUM.describe(
          "Tópico: para-que-serve, analogia, como-funciona, ferramentas, recursos, prompts, transporte, cursor, quando-nao-usar",
        ),
      }),
    },
    async ({ topic }) => text(explain(topic as Topic)),
  );

  server.registerTool(
    "evaluate_idea",
    {
      title: "Avaliar ideia",
      description:
        "Diz se uma ideia merece um MCP, uma rule, um prompt ou só o chat. Chame antes de gerar código.",
      inputSchema: z.object({
        idea: z.string().describe("A ideia em uma ou duas frases, em português"),
      }),
    },
    async ({ idea }) => text(evaluateIdea(idea)),
  );

  server.registerTool(
    "design_mcp",
    {
      title: "Desenhar MCP",
      description:
        "Desenha ferramentas, recursos e prompts de um servidor MCP a partir de uma ideia. Não grava arquivos.",
      inputSchema: z.object({
        idea: z.string().describe("O que o servidor deve fazer"),
        name: z.string().optional().describe("Nome curto do servidor, kebab-case"),
      }),
    },
    async ({ idea, name }) => {
      const design = designMcp(idea, name);
      if ("error" in design) return text(design.error, true);
      return text(formatDesign(design));
    },
  );

  server.registerTool(
    "generate_mcp",
    {
      title: "Gerar MCP",
      description:
        "Gera um projeto MCP TypeScript completo (package.json, src/index.ts, mcp.json). Devolve o texto dos arquivos para o host gravar. Não escreve disco.",
      inputSchema: z.object({
        idea: z.string().describe("O que o servidor deve fazer"),
        name: z.string().optional().describe("Nome curto do servidor, kebab-case"),
      }),
    },
    async ({ idea, name }) => {
      const design = designMcp(idea, name);
      if ("error" in design) return text(design.error, true);
      return text(formatGeneratedFiles(generateProject(design)));
    },
  );

  server.registerTool(
    "generate_cursor_config",
    {
      title: "Gerar mcp.json",
      description:
        "Gera o JSON para ligar um servidor stdio no Cursor (.cursor/mcp.json) e no VS Code (.vscode/mcp.json).",
      inputSchema: z.object({
        name: z.string().describe("Nome do servidor no config"),
        entry: z
          .string()
          .optional()
          .describe("Arquivo de entrada, padrão src/index.ts"),
      }),
    },
    async ({ name, entry }) => text(cursorConfig(name, entry)),
  );

  server.registerTool(
    "list_examples",
    {
      title: "Listar exemplos",
      description: "Lista ideias de MCP que valem a pena, com slug para detalhar.",
      inputSchema: z.object({
        slug: z
          .string()
          .optional()
          .describe("Se informado, devolve o detalhe daquele exemplo"),
      }),
    },
    async ({ slug }) => {
      if (!slug) return text(listExamples());
      const ex = exampleBySlug(slug);
      if (!ex) {
        return text(
          `Exemplo "${slug}" não existe. Slugs: ${EXAMPLES.map((e) => e.slug).join(", ")}`,
          true,
        );
      }
      return text(formatExample(ex));
    },
  );

  server.registerTool(
    "next_steps",
    {
      title: "Próximos passos",
      description:
        "Checklist para instalar, inspecionar e ligar um servidor MCP no VS Code ou Cursor.",
      inputSchema: z.object({
        name: z.string().optional().describe("Nome do servidor recém-gerado"),
      }),
    },
    async ({ name }) => text(nextSteps(name)),
  );

  server.registerResource(
    "o-que-e",
    "mcp-maker://o-que-e",
    {
      title: "Para que serve MCP",
      description: "O que é MCP e o problema que resolve.",
      mimeType: "text/markdown",
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "text/markdown",
          text: explain("para-que-serve"),
        },
      ],
    }),
  );

  server.registerResource(
    "anatomia",
    "mcp-maker://anatomia",
    {
      title: "Anatomia de um servidor",
      description: "Como funcionam tools, resources, prompts e transporte.",
      mimeType: "text/markdown",
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "text/markdown",
          text: [
            explain("como-funciona"),
            "",
            explain("ferramentas"),
            "",
            explain("recursos"),
            "",
            explain("prompts"),
            "",
            explain("transporte"),
          ].join("\n"),
        },
      ],
    }),
  );

  server.registerResource(
    "conectar",
    "mcp-maker://conectar",
    {
      title: "Ligar no Cursor e no VS Code",
      description: "Como configurar mcp.json e depurar conexão.",
      mimeType: "text/markdown",
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "text/markdown",
          text: `${explain("cursor")}\n\n${nextSteps()}`,
        },
      ],
    }),
  );

  server.registerResource(
    "quando-nao-usar",
    "mcp-maker://quando-nao-usar",
    {
      title: "Quando não fazer MCP",
      description: "Quando usar rule, skill ou só o chat.",
      mimeType: "text/markdown",
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "text/markdown",
          text: explain("quando-nao-usar"),
        },
      ],
    }),
  );

  server.registerResource(
    "exemplos",
    new ResourceTemplate("mcp-maker://exemplos/{slug}", {
      list: async () => ({
        resources: EXAMPLES.map((ex) => ({
          uri: `mcp-maker://exemplos/${ex.slug}`,
          name: ex.titulo,
          description: ex.ideia,
          mimeType: "text/markdown",
        })),
      }),
    }),
    {
      title: "Exemplo de MCP",
      description: "Um exemplo concreto do catálogo do Maker.",
      mimeType: "text/markdown",
    },
    async (uri, { slug }) => {
      const ex = exampleBySlug(String(slug));
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "text/markdown",
            text: ex
              ? formatExample(ex)
              : `Slug desconhecido: ${slug}. Válidos: ${EXAMPLES.map((e) => e.slug).join(", ")}`,
          },
        ],
      };
    },
  );

  server.registerPrompt(
    "criar-mcp",
    {
      title: "Criar um MCP",
      description: "Fluxo completo: avaliar ideia, desenhar e gerar um servidor MCP.",
      argsSchema: z.object({
        ideia: z.string().describe("O que o novo servidor deve fazer"),
      }),
    },
    ({ ideia }) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `Quero um MCP para: ${ideia}

Use as ferramentas do mcp-maker nesta ordem:
1. evaluate_idea — se não valer MCP, pare e explique a alternativa
2. design_mcp — mostre o desenho
3. generate_mcp — gere os arquivos
4. generate_cursor_config e next_steps — como ligar no VS Code e no Cursor

Responda em português. Não grave arquivos até eu pedir.`,
          },
        },
      ],
    }),
  );

  server.registerPrompt(
    "explicar-mcp",
    {
      title: "Explicar MCP",
      description: "Explica para que serve MCP, no nível pedido.",
      argsSchema: z.object({
        nivel: z
          .string()
          .describe("Nivel: crianca, iniciante ou dev"),
      }),
    },
    ({ nivel }) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `Explique MCP no nível "${nivel}". Comece por explain_mcp com topic "para-que-serve", depois analogia e como-funciona. Se o nível for dev, inclua ferramentas, recursos, prompts e cursor. Responda em português, curto e concreto.`,
          },
        },
      ],
    }),
  );

  return server;
}
