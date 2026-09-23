export const TOPICS = [
  "para-que-serve",
  "analogia",
  "como-funciona",
  "ferramentas",
  "recursos",
  "prompts",
  "transporte",
  "cursor",
  "quando-nao-usar",
] as const;

export type Topic = (typeof TOPICS)[number];

const PAGES: Record<Topic, string> = {
  "para-que-serve": `# Para que serve um MCP?

O modelo no chat **não tem mãos**. Ele lê o que você cola e responde com texto. Não abre seu Gmail, não consulta seu banco, não cria um ticket no Jira, não lê a wiki interna — a menos que alguém dê essas capacidades.

**MCP (Model Context Protocol)** é o padrão que dá essas mãos. Você escreve um **servidor** que expõe:

- **ferramentas** — ações que o modelo pode executar
- **recursos** — dados que o modelo pode ler
- **prompts** — fluxos prontos que a pessoa escolhe

Qualquer **host** (Cursor, Claude, VS Code, o seu app) conecta nesse servidor e o modelo passa a usar o que ele expõe.

## O problema que ele resolve

Antes do MCP, cada app de IA precisava de uma integração própria com cada sistema. Gmail no Cursor ≠ Gmail no Claude ≠ Gmail no seu bot. MCP é o conector único: você escreve o servidor **uma vez** e qualquer host fala o mesmo protocolo.

## Para que serve na prática

1. **Trazer dados vivos** — e-mail, calendário, tickets, métricas, arquivos internos.
2. **Executar ações** — criar issue, mandar mensagem, consultar API, gerar um projeto.
3. **Empacotar um domínio** — em vez de reexplicar as regras toda hora, o servidor já sabe o ofício (este MCP Maker é o exemplo: ele sabe o que é MCP e como gerar outro).

## Este projeto

O **mcp-maker** é um MCP que sabe fazer MCP. Ele existe para duas coisas:

- explicar o protocolo sem enrolação
- desenhar e gerar um servidor novo a partir de uma ideia

Se você só lembra de uma frase: **MCP conecta a IA aos sistemas onde seus dados e ferramentas já moram.**
`,

  analogia: `# Analogia: USB para IAs

Antes do USB, cada periférico tinha um plugue diferente. Impressora, câmera, teclado — cabo próprio, driver próprio.

**MCP é o USB da IA.**

- O **host** (Cursor) é o computador, com a porta USB.
- O **servidor MCP** é o dispositivo (pendrive, impressora, webcam).
- O **protocolo** é o formato do plugue: os dois lados combinam como listar ferramentas, chamar uma ação, ler um recurso.

Você não ensina o Cursor a falar com o Gmail. Você liga um servidor Gmail na porta MCP. O modelo vê as ferramentas e usa.

Outra analogia, se USB não colar: **MCP é uma API feita para modelos**, não para humanos. Em vez de uma tela, você descreve funções com nome, descrição e esquema de entrada. O modelo escolhe qual chamar.
`,

  "como-funciona": `# Como um MCP funciona

Há três papéis:

1. **Host** — o app que roda o modelo (Cursor). Ele descobre servidores, mostra ferramentas e pede aprovação.
2. **Cliente** — a parte do host que fala o protocolo MCP.
3. **Servidor** — o seu programa. Expõe ferramentas, recursos e prompts.

## O ciclo de uma ferramenta

1. O host inicia o servidor (processo local via stdio, ou HTTP remoto).
2. O servidor anuncia: "tenho a ferramenta \`gerar-mcp\` com estes argumentos".
3. A pessoa pede algo. O modelo escolhe a ferramenta e preenche os argumentos.
4. O host pede aprovação (salvo quando você já autorizou).
5. O servidor executa e devolve **conteúdo** (texto, às vezes imagem).
6. O modelo lê o resultado e continua a conversa.

## O que você escreve

Um servidor TypeScript típico cabe em um arquivo:

- cria um \`McpServer({ name, version })\`
- registra ferramentas / recursos / prompts
- entrega a fábrica para \`serveStdio\` (local) ou HTTP (remoto)

O SDK valida os argumentos com Zod **antes** do seu handler rodar. Você escreve o esquema uma vez: o modelo vê o JSON Schema, o TypeScript infere os tipos.

## Regra de ouro do stdio

\`stdout\` é o canal do protocolo. **Nunca** use \`console.log\`. Logue com \`console.error\`.
`,

  ferramentas: `# Ferramentas (tools)

Ferramenta é uma **função que o modelo chama**. É o primitivo mais usado.

Use ferramenta quando o modelo precisa **fazer** alguma coisa: buscar, criar, calcular, gerar código, disparar API.

## Anatomia

- **nome** — estável, em kebab-case: \`gerar-mcp\`
- **descrição** — o modelo escolhe pela descrição. Seja específica.
- **inputSchema** — objeto Zod. Cada campo com \`.describe()\`.
- **handler** — async, devolve \`{ content: [{ type: "text", text }] }\`. Em falha, acrescente \`isError: true\`.

## Boas práticas

- Uma ferramenta = uma intenção clara. Não faça um \`do_anything\`.
- Descrição em linguagem de resultado: "Gera um servidor MCP TypeScript completo", não "Processa input".
- Prefira poucos argumentos obrigatórios. Opcione o resto.
- Não devolva 50 páginas. Devolva o que o modelo precisa para o próximo passo.
- Segredos ficam em variável de ambiente, nunca no código nem no \`mcp.json\` commitado.

## Quando NÃO é ferramenta

- Texto fixo que o modelo só precisa ler → **recurso**
- Fluxo que a pessoa dispara no menu → **prompt**
`,

  recursos: `# Recursos (resources)

Recurso é **dado que o modelo lê**, com um URI. Não é uma ação.

Use recurso para: guias, schemas, configs, catálogos, documentos de domínio.

## Anatomia

- **nome** — id interno
- **URI** — estável, com esquema próprio: \`mcp-maker://o-que-e\`
- **metadata** — título, descrição, mimeType
- **read callback** — devolve \`{ contents: [{ uri, text, mimeType }] }\`

URI fixo = um documento. \`ResourceTemplate\` = família (\`exemplos://{slug}\`).

## Por que não é só uma ferramenta \`ler-doc\`?

Recurso aparece na lista de contexto do host. O modelo (ou a pessoa) puxa o documento sem inventar argumentos. Ferramenta é para computar; recurso é para consultar.
`,

  prompts: `# Prompts

Prompt MCP é um **modelo de conversa** que a pessoa escolhe — slash command, item de menu. Não é o modelo quem decide chamar; é o usuário.

Use prompt para fluxos repetíveis: "criar um MCP a partir desta ideia", "explicar MCP para iniciante".

## Anatomia

- **nome** e **descrição**
- **argsSchema** — campos que o host pede para a pessoa preencher
- **callback** — devolve \`{ messages }\` com \`role: "user" | "assistant"\`

O host entrega essas mensagens ao modelo já montadas. Você padroniza o pedido; o modelo executa.

## Ferramenta vs prompt

| | Ferramenta | Prompt |
|---|---|---|
| Quem inicia | o modelo | a pessoa |
| Serve para | ação / dado vivo | iniciar um fluxo |
| Retorno | conteúdo da tool | mensagens de chat |
`,

  transporte: `# Transporte: stdio ou HTTP

## stdio (o que este projeto usa)

O host **sobe o seu processo**. Lê stdin, escreve stdout. Ideal para ferramenta pessoal no Cursor.

- Cursor gerencia o ciclo de vida
- Um usuário, na sua máquina
- Segredos via \`env\` / \`envFile\` no \`mcp.json\`

## Streamable HTTP (e SSE legado)

Você sobe um endpoint. Vários hosts conectam. Ideal para time ou produto.

- Precisa hospedar e autenticar (OAuth / bearer)
- A fábrica do servidor roda **por requisição** — não guarde estado no objeto global sem querer

## Como escolher

- Só você, no Cursor, lendo disco ou API com a sua chave → **stdio**
- Várias pessoas, um serviço só → **HTTP**
`,

  cursor: `# Ligar um MCP no Cursor

Há dois jeitos: marketplace (um clique) ou \`mcp.json\` (servidor seu).

## Onde fica o arquivo

- **projeto:** \`.cursor/mcp.json\` — só neste repo
- **global:** \`~/.cursor/mcp.json\` — em todos os projetos

## Servidor stdio local

\`\`\`json
{
  "mcpServers": {
    "mcp-maker": {
      "type": "stdio",
      "command": "npx",
      "args": ["tsx", "src/index.ts"],
      "cwd": "\${workspaceFolder}"
    }
  }
}
\`\`\`

Variáveis úteis: \`\${workspaceFolder}\`, \`\${userHome}\`, \`\${env:NOME}\`.

Segredo: \`"env": { "API_KEY": "\${env:API_KEY}" }\` ou \`envFile\`. Nunca commite a chave.

## Servidor HTTP remoto

\`\`\`json
{
  "mcpServers": {
    "meu-remoto": {
      "url": "https://exemplo.com/mcp",
      "headers": {
        "Authorization": "Bearer \${env:MEU_TOKEN}"
      }
    }
  }
}
\`\`\`

## Depois de salvar

1. Customize → MCP (ou recarregue os servidores)
2. Confirme que o servidor aparece e está ligado
3. Peça no chat algo que use uma ferramenta dele
4. Aprove a chamada na primeira vez

## Se não conectar

Output → **MCP Logs**. Causas comuns: \`type\` ausente no stdio, caminho errado, \`console.log\` quebrando o JSON-RPC, Node < 20, \`npm install\` não rodou.
`,

  "quando-nao-usar": `# Quando NÃO fazer um MCP

MCP tem custo: processo, aprovação de tool, manutenção. Nem todo pedido merece um servidor.

## Use outra coisa

- **Regra do Cursor** (\`.cursor/rules\`) — estilo de código, convenções do repo
- **Skill / prompt salvo** — um texto que o agente deve seguir, sem ação externa
- **O próprio chat** — dúvida pontual, sem dado vivo nem ação
- **Script / CLI** — automação que um humano roda, sem o modelo no meio

## MCP vale a pena quando

- o modelo precisa de **dado que muda** (API, banco, e-mail)
- o modelo precisa **agir** num sistema (criar, buscar, gerar arquivo de projeto)
- você quer **reusar** a mesma capacidade em mais de um host
- o domínio é denso o bastante para empacotar (este Maker: saber criar MCP)

## Sinais de ideia fraca

- "Explicar TypeScript" — o modelo já sabe
- "Sempre usar 2 espaços" — isso é rule
- Uma ferramenta que só devolve um parágrafo estático — vire recurso
- Super-ferramenta com 20 argumentos — quebre em várias
`,
};

export function explain(topic: Topic): string {
  return PAGES[topic];
}

export type Example = {
  slug: string;
  titulo: string;
  ideia: string;
  porQueMcp: string;
  ferramentas: { nome: string; descricao: string }[];
  recursos?: { uri: string; descricao: string }[];
};

export const EXAMPLES: Example[] = [
  {
    slug: "notas",
    titulo: "Notas pessoais",
    ideia: "Guardar e buscar notas locais.",
    porQueMcp:
      "O modelo precisa ler e gravar um arquivo que vive na sua máquina, não no chat.",
    ferramentas: [
      { nome: "adicionar-nota", descricao: "Acrescenta uma nota com título e texto." },
      { nome: "buscar-notas", descricao: "Busca notas por termo." },
    ],
    recursos: [{ uri: "notas://todas", descricao: "Lista completa das notas." }],
  },
  {
    slug: "clima",
    titulo: "Alertas de clima",
    ideia: "Consultar alertas meteorológicos de um estado.",
    porQueMcp: "Dado vivo de uma API; colar forecast no chat envelhece na hora.",
    ferramentas: [
      { nome: "get-alerts", descricao: "Alertas ativos para um código de estado." },
    ],
  },
  {
    slug: "tarefas",
    titulo: "Lista de tarefas do time",
    ideia: "Criar e listar cards num quadro (Linear, Jira, Trello).",
    porQueMcp: "Ação em sistema externo com autenticação. O modelo não tem essa API sozinho.",
    ferramentas: [
      { nome: "criar-tarefa", descricao: "Cria um card com título e descrição." },
      { nome: "listar-tarefas", descricao: "Lista cards abertos de um quadro." },
    ],
  },
  {
    slug: "docs-internas",
    titulo: "Wiki interna",
    ideia: "O agente consulta a documentação da empresa antes de responder.",
    porQueMcp: "Conhecimento privado. Sem MCP, você fica colando páginas.",
    ferramentas: [
      { nome: "buscar-docs", descricao: "Busca na wiki por pergunta." },
    ],
    recursos: [{ uri: "docs://indice", descricao: "Índice das páginas disponíveis." }],
  },
  {
    slug: "mcp-maker",
    titulo: "Este próprio projeto",
    ideia: "Ensinar MCP e gerar outro servidor a partir de uma ideia.",
    porQueMcp:
      "Domínio empacotado: explicação + desenho + código. O host só precisa conectar.",
    ferramentas: [
      { nome: "explain_mcp", descricao: "Explica um tópico do protocolo." },
      { nome: "design_mcp", descricao: "Desenha ferramentas e recursos de uma ideia." },
      { nome: "generate_mcp", descricao: "Gera o projeto TypeScript." },
    ],
    recursos: [{ uri: "mcp-maker://o-que-e", descricao: "Guia do que é MCP." }],
  },
];

export function listExamples(): string {
  const lines = EXAMPLES.map(
    (ex) => `- **${ex.slug}** — ${ex.titulo}: ${ex.ideia}`,
  );
  return `# Exemplos de MCP que valem a pena\n\n${lines.join("\n")}\n\nPeça o detalhe de um slug ou use o recurso \`mcp-maker://exemplos/{slug}\`.`;
}

export function exampleBySlug(slug: string): Example | undefined {
  return EXAMPLES.find((ex) => ex.slug === slug);
}

export function formatExample(ex: Example): string {
  const tools = ex.ferramentas
    .map((t) => `- \`${t.nome}\` — ${t.descricao}`)
    .join("\n");
  const resources = ex.recursos?.length
    ? ex.recursos.map((r) => `- \`${r.uri}\` — ${r.descricao}`).join("\n")
    : "_nenhum_";

  return `# ${ex.titulo}

**Ideia:** ${ex.ideia}

**Por que é MCP:** ${ex.porQueMcp}

## Ferramentas
${tools}

## Recursos
${resources}
`;
}

const HARMFUL =
  /\b(malware|ransomware|keylogger|exploit|phishing|crack|botnet|ddos|weapon|bioweapon|csam|child.?sex)\b/i;

export function isHarmfulIdea(idea: string): boolean {
  return HARMFUL.test(idea);
}

export function evaluateIdea(idea: string): string {
  if (isHarmfulIdea(idea)) {
    return "Essa ideia não é um MCP que eu ajudo a construir. Escolha um uso legítimo: dados seus, API que você pode chamar, fluxo de trabalho do time.";
  }

  const text = idea.trim();
  if (text.length < 8) {
    return "A ideia está curta demais. Diga o sistema (Gmail, pasta local, API X) e a ação (buscar, criar, listar).";
  }

  const wantsLiveData =
    /api|banco|email|e-mail|gmail|calend[aá]rio|jira|linear|slack|arquivo|pasta|wiki|ticket|nota|clima|preço|metric/i.test(
      text,
    );
  const wantsAction =
    /criar|gerar|buscar|listar|enviar|gravar|consultar|atualizar|deletar|abrir|sincron/i.test(
      text,
    );
  const soundsLikeRule =
    /sempre use|nunca use|indent|espaços|estilo|prettier|eslint|conven[cç][aã]o/i.test(
      text,
    );
  const soundsLikeChat = /explica[r]?|o que [eé]|como funciona|tutorial de/i.test(
    text,
  );

  const lines: string[] = [`# Avaliação: ${text}`, ""];

  if (soundsLikeRule) {
    lines.push(
      "**Provavelmente não é MCP.** Isso é regra de editor (`.cursor/rules`). MCP é para ação ou dado externo.",
    );
    return lines.join("\n");
  }

  if (soundsLikeChat && !wantsLiveData && !wantsAction) {
    lines.push(
      "**Pode ser só o chat** — ou um recurso/prompt se o texto for o mesmo toda vez. MCP só vale se houver dado vivo ou ação.",
    );
    return lines.join("\n");
  }

  if (wantsLiveData || wantsAction) {
    lines.push("**Vale um MCP.** Há dado externo ou ação. Próximo passo: `design_mcp` com essa mesma ideia, depois `generate_mcp`.");
    lines.push("");
    lines.push("Checklist rápido:");
    lines.push("- Qual sistema é a fonte da verdade?");
    lines.push("- Quais 2–5 ações o modelo realmente precisa?");
    lines.push("- O que é leitura fixa (recurso) vs ação (ferramenta)?");
    lines.push("- stdio no Cursor basta, ou outras pessoas vão usar (HTTP)?");
    return lines.join("\n");
  }

  lines.push(
    "**Incerto.** Se o modelo só precisa de um texto seu, use prompt ou resource. Se precisa falar com um sistema, descreva o sistema e as ações e chame `evaluate_idea` de novo.",
  );
  return lines.join("\n");
}
