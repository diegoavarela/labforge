# Plan de Mejoras - LabForge

> 8 iniciativas: 4 cambios al código existente + 4 features nuevas.
> Ordenadas por dependencia: las primeras desbloquean a las siguientes.

---

## CAMBIO 1: Discriminated Unions para FlowNode

### Problema
`FlowNode.data` es `Record<string, unknown>` — un `any` disfrazado. No hay type safety sobre qué datos lleva cada tipo de nodo.

### Solución
Reemplazar `FlowNode` con un discriminated union tipado por `type`.

### Archivos a modificar
- `types/index.ts` — definir el union
- `components/flow/nodes/*.tsx` — actualizar cada nodo para usar su tipo específico
- `lib/generator/plugin.ts` — `generateCommandFile()` usa `n.data`, ajustar
- `lib/ai/assistant.ts` — las actions que crean commands pasan `data`, tipar
- `stores/plugin.ts` — no cambia (ya usa `FlowNode[]`)

### Implementación detallada

#### Paso 1: Definir los data types por nodo en `types/index.ts`

```typescript
// Reemplazar la interfaz FlowNode actual con:

interface FlowNodeBase {
  id: string;
  position: { x: number; y: number };
}

interface StartNodeData { label?: string }
interface StepNodeData { label: string; description?: string }
interface AgentNodeData { agentId: string; label?: string }
interface BranchNodeData { condition: string; label?: string }
interface McpNodeData { mcpId: string; toolName: string; label?: string }
interface ParallelNodeData { label?: string }
interface NotifyNodeData { message: string; channel?: string }
interface EndNodeData { label?: string }
interface ConditionNodeData { expression: string; label?: string }
interface LoopNodeData { iterable: string; variable: string; label?: string }
interface SkillNodeData { skillId: string; label?: string }
interface ShellNodeData { command: string; label?: string }
interface PromptNodeData { prompt: string; label?: string }
interface VariableNodeData { name: string; value: string; label?: string }
interface TemplateNodeData { template: string; label?: string }

type FlowNode =
  | (FlowNodeBase & { type: "start"; data: StartNodeData })
  | (FlowNodeBase & { type: "step"; data: StepNodeData })
  | (FlowNodeBase & { type: "agent"; data: AgentNodeData })
  | (FlowNodeBase & { type: "branch"; data: BranchNodeData })
  | (FlowNodeBase & { type: "mcp"; data: McpNodeData })
  | (FlowNodeBase & { type: "parallel"; data: ParallelNodeData })
  | (FlowNodeBase & { type: "notify"; data: NotifyNodeData })
  | (FlowNodeBase & { type: "end"; data: EndNodeData })
  | (FlowNodeBase & { type: "condition"; data: ConditionNodeData })
  | (FlowNodeBase & { type: "loop"; data: LoopNodeData })
  | (FlowNodeBase & { type: "skill"; data: SkillNodeData })
  | (FlowNodeBase & { type: "shell"; data: ShellNodeData })
  | (FlowNodeBase & { type: "prompt"; data: PromptNodeData })
  | (FlowNodeBase & { type: "variable"; data: VariableNodeData })
  | (FlowNodeBase & { type: "template"; data: TemplateNodeData });
```

#### Paso 2: Actualizar componentes de nodos
Cada archivo en `components/flow/nodes/` que accede a `node.data` con casts o indexación genérica debe usar narrowing por `type`. Buscar todos los `as any`, `as Record`, y accesos `data["..."]` y reemplazarlos con accesos tipados.

#### Paso 3: Actualizar el generador
En `lib/generator/plugin.ts:96-106`, `generateCommandFile` serializa `n.data` con `JSON.stringify`. Esto sigue funcionando pero agregar un helper `serializeNodeData(node: FlowNode)` que haga un switch por type para serialización más limpia.

#### Paso 4: Ajustar las acciones del assistant
En `lib/ai/prompts.ts`, el system prompt que describe los nodos disponibles debe documentar los campos requeridos por tipo de nodo para que Claude genere data correcta.

### Criterios de aceptación
- [ ] `tsc --noEmit` pasa sin errores
- [ ] Crear un command con nodos de diferentes tipos funciona en la UI
- [ ] Los nodos existentes en localStorage se migran (migration function en el store)

---

## CAMBIO 2: Migrar persistencia de localStorage a IndexedDB

### Problema
Zustand persist usa localStorage (límite 5MB). Un plugin con 20+ skills con archivos adjuntos puede superar ese límite. Además, `chatMessages` se acumula sin límite.

### Solución
Usar `idb-keyval` como storage adapter para Zustand persist. Es un wrapper mínimo sobre IndexedDB, zero-config, y Zustand persist ya soporta custom storage.

### Archivos a modificar
- `package.json` — agregar `idb-keyval`
- `lib/storage/indexeddb.ts` — **nuevo**: adapter de storage
- `stores/plugin.ts` — cambiar el storage del persist middleware
- `stores/library.ts` — idem

### Implementación detallada

#### Paso 1: Instalar dependencia
```bash
npm install idb-keyval
```

#### Paso 2: Crear adapter en `lib/storage/indexeddb.ts`

```typescript
import { get, set, del } from "idb-keyval";
import type { StateStorage } from "zustand/middleware";

export const indexedDBStorage: StateStorage = {
  getItem: async (name: string) => {
    const value = await get(name);
    return value ?? null;
  },
  setItem: async (name: string, value: string) => {
    await set(name, value);
  },
  removeItem: async (name: string) => {
    await del(name);
  },
};
```

#### Paso 3: Aplicar en stores

En `stores/plugin.ts`:
```typescript
import { indexedDBStorage } from "@/lib/storage/indexeddb";

// En el persist config:
{
  name: "plugin-forge-state",
  storage: createJSONStorage(() => indexedDBStorage),
}
```

Mismo patrón para `stores/library.ts`.

#### Paso 4: Migración de datos existentes
Agregar lógica one-time en el layout principal:
```typescript
// En app/layout.tsx o un provider
async function migrateFromLocalStorage() {
  const keys = ["plugin-forge-state", "plugin-forge-library"];
  for (const key of keys) {
    const data = localStorage.getItem(key);
    if (data) {
      await set(key, data);  // Copiar a IndexedDB
      localStorage.removeItem(key);  // Limpiar localStorage
    }
  }
}
```

#### Paso 5: Limitar chat messages
En `addChatMessage`, agregar un cap de 200 mensajes (FIFO):
```typescript
addChatMessage: (message: ChatMessage) =>
  set((s) => ({
    chatMessages: [...s.chatMessages, message].slice(-200),
  })),
```

### Criterios de aceptación
- [ ] Datos persisten después de refresh
- [ ] Migración automática desde localStorage (si existía data vieja)
- [ ] Chat messages no superan 200 entries
- [ ] Un plugin con 50 skills y archivos pesados se guarda sin error

---

## CAMBIO 3: Reemplazar ACTION tags con tool_use de la API de Claude

### Problema
El sistema actual parsea `[ACTION:type:{json}]` del texto del modelo. Es frágil: JSON malformado, brackets extra, o cambios en el formato del modelo rompen el parser. Además, el modelo no tiene feedback de si la acción se ejecutó correctamente.

### Solución
Usar la funcionalidad de `tool_use` de la API de Anthropic. Definir tools para cada acción (create_skill, create_agent, etc.) y dejar que Claude use llamadas tipadas.

### Archivos a modificar
- `app/api/chat/route.ts` — agregar tool definitions, manejar tool_use events
- `lib/ai/assistant.ts` — reemplazar el parser de ACTION tags con procesamiento de tool_use blocks
- `lib/ai/prompts.ts` — simplificar system prompt (ya no necesita documentar formato de ACTION tags)
- `components/layout/ChatPanel.tsx` — adaptar handling de actions desde tool_use
- `types/index.ts` — tipar AssistantAction con los tool schemas

### Implementación detallada

#### Paso 1: Definir tools en `lib/ai/tools.ts` (nuevo archivo)

```typescript
import type { Anthropic } from "@anthropic-ai/sdk";

export const pluginTools: Anthropic.Messages.Tool[] = [
  {
    name: "create_skill",
    description: "Create a new skill in the plugin",
    input_schema: {
      type: "object" as const,
      properties: {
        name: { type: "string", description: "Skill name" },
        description: { type: "string", description: "Brief description" },
        content: { type: "string", description: "Markdown content of the skill" },
        categories: { type: "array", items: { type: "string" }, description: "Category tags" },
        tags: { type: "array", items: { type: "string" }, description: "Tags" },
      },
      required: ["name", "description", "content"],
    },
  },
  {
    name: "update_skill",
    description: "Update an existing skill",
    input_schema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "Skill ID to update" },
        name: { type: "string" },
        description: { type: "string" },
        content: { type: "string" },
      },
      required: ["id"],
    },
  },
  {
    name: "create_agent",
    description: "Create a new agent in the plugin",
    input_schema: {
      type: "object" as const,
      properties: {
        name: { type: "string" },
        description: { type: "string" },
        model: { type: "string", enum: ["claude-sonnet-4-20250514", "claude-haiku-4-20250414"] },
        context: { type: "string", enum: ["fork", "main"] },
        instructions: { type: "string", description: "Agent instructions markdown" },
        skillIds: { type: "array", items: { type: "string" }, description: "IDs of skills to attach" },
        mcpIds: { type: "array", items: { type: "string" }, description: "IDs of MCPs to attach" },
        allowedTools: { type: "array", items: { type: "string" } },
      },
      required: ["name", "description", "instructions"],
    },
  },
  {
    name: "create_command",
    description: "Create a new command/workflow in the plugin",
    input_schema: {
      type: "object" as const,
      properties: {
        name: { type: "string" },
        description: { type: "string" },
        nodes: { type: "array", description: "Flow nodes" },
        edges: { type: "array", description: "Flow edges" },
      },
      required: ["name", "description", "nodes", "edges"],
    },
  },
  {
    name: "create_hook",
    description: "Create a new hook",
    input_schema: {
      type: "object" as const,
      properties: {
        name: { type: "string" },
        event: { type: "string" },
        matcher: { type: "string" },
        action: {
          type: "object",
          properties: {
            type: { type: "string", enum: ["bash", "mcp_call", "agent"] },
            config: { type: "object" },
          },
          required: ["type", "config"],
        },
      },
      required: ["name", "event", "action"],
    },
  },
  {
    name: "add_mcp",
    description: "Add an MCP server to the plugin",
    input_schema: {
      type: "object" as const,
      properties: {
        name: { type: "string" },
        description: { type: "string" },
        source: { type: "string" },
        installCommand: { type: "string" },
        tools: { type: "array" },
      },
      required: ["name", "description", "source", "installCommand"],
    },
  },
];
```

#### Paso 2: Actualizar `app/api/chat/route.ts`

Cambiar la llamada a la API para usar tools y manejar el streaming con tool_use blocks:

```typescript
const response = await client.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 4096,
  system: pluginContext || "",
  messages: anthropicMessages,
  tools: pluginTools,
  stream: true,
});
```

El streaming ahora emite eventos de tipo `content_block_start` con `type: "tool_use"` además de `text_delta`. Hay que enviar al frontend un protocolo que distinga texto de tool calls. Formato propuesto:

```
// Texto normal: se envía tal cual
// Tool call: se envía como línea JSON prefijada
\n__TOOL_USE__:{"id":"toolu_xxx","name":"create_skill","input":{...}}\n
```

#### Paso 3: Actualizar `lib/ai/assistant.ts`

Reemplazar `parseAssistantActions` y `extractActionBlocks` con:

```typescript
export interface ToolUseAction {
  toolUseId: string;
  name: string;
  input: Record<string, unknown>;
}

export function parseStreamChunk(chunk: string): {
  text: string;
  toolCalls: ToolUseAction[];
} {
  const lines = chunk.split("\n");
  let text = "";
  const toolCalls: ToolUseAction[] = [];

  for (const line of lines) {
    if (line.startsWith("__TOOL_USE__:")) {
      const json = line.slice("__TOOL_USE__:".length);
      try {
        toolCalls.push(JSON.parse(json));
      } catch { /* skip */ }
    } else {
      text += line + "\n";
    }
  }

  return { text: text.trimEnd(), toolCalls };
}
```

#### Paso 4: Actualizar `ChatPanel.tsx`

En el loop de streaming, usar `parseStreamChunk` en vez de acumular texto y parsear al final. Las tool calls se aplican inmediatamente al store conforme llegan (no al final del mensaje).

#### Paso 5: Limpiar
- Eliminar `extractActionBlocks()` y `stripActionTags()` de `assistant.ts`
- Eliminar del system prompt la documentación de formato `[ACTION:...]`
- Actualizar `AssistantAction` type para reflejar tool_use structure

### Criterios de aceptación
- [ ] Claude usa tool_use para crear/modificar componentes
- [ ] Las acciones se aplican al store correctamente
- [ ] El texto conversacional sigue apareciendo en el chat
- [ ] No hay regresión en la creación de skills, agents, commands via chat
- [ ] `extractActionBlocks` y `stripActionTags` eliminados del codebase

---

## CAMBIO 4: Evaluar dependencia de Next.js 16 / React 19

### Problema
Next.js 16 y React 19 son versiones cutting-edge. Si no se usan features específicas (Server Actions, use() hook, etc.), es complejidad innecesaria.

### Solución
Auditar el uso real de features de React 19 y Next.js 16. Si no hay uso significativo, documentar la decisión de quedarse (o downgrade). No hacer downgrade a ciegas.

### Archivos a revisar
- `app/**/*.tsx` — buscar `use()`, `useOptimistic`, `useFormStatus`, Server Actions (`"use server"`)
- `next.config.*` — features experimentales habilitadas
- `package.json` — versiones exactas

### Implementación

#### Paso 1: Auditoría
Buscar en todo el codebase:
```bash
grep -r "use server" app/
grep -r "useOptimistic\|useFormStatus\|useFormState\|use(" --include="*.tsx" --include="*.ts" .
grep -r "experimental" next.config*
```

#### Paso 2: Documentar hallazgos
Si se usan features de React 19/Next 16: documentar cuáles en un comentario en `package.json` o en `CLAUDE.md`.
Si NO se usan: considerar pin a Next.js 15 + React 18 para estabilidad. Esto es una decisión de producto, no técnica.

#### Paso 3: Si se decide mantener
Agregar un test de smoke que verifique que la app buildea correctamente:
```bash
npm run build
```

### Criterios de aceptación
- [ ] Auditoría documentada en `CLAUDE.md` o en un comment en este mismo plan
- [ ] Decisión tomada: mantener o downgrade
- [ ] Si se mantiene: build pasa sin warnings de deprecation

---

## FEATURE 1: Testing / Dry-run de plugins

### Problema
Hoy el flujo es: construir plugin → exportar ZIP → instalar en Claude Code → probar → fallar → volver. No hay forma de validar que el plugin funciona antes de exportar.

### Solución
Agregar un "Dry Run" panel que simula la ejecución de un command paso a paso, mostrando qué haría cada nodo sin ejecutar nada realmente.

### Archivos a crear/modificar
- `lib/simulator/command.ts` — **nuevo**: lógica de simulación
- `components/simulator/DryRunPanel.tsx` — **nuevo**: UI del simulador
- `components/simulator/StepResult.tsx` — **nuevo**: visualización de cada paso
- `components/canvas/CommandCanvas.tsx` — agregar botón "Dry Run"
- `types/index.ts` — agregar tipos de simulación

### Implementación detallada

#### Paso 1: Tipos de simulación en `types/index.ts`

```typescript
export interface SimulationStep {
  nodeId: string;
  nodeType: FlowNode["type"];
  nodeName: string;
  status: "pending" | "running" | "success" | "warning" | "error";
  description: string;  // Qué haría este nodo
  warnings: string[];   // Problemas detectados
  output?: string;      // Output simulado
}

export interface SimulationResult {
  commandName: string;
  steps: SimulationStep[];
  errors: string[];
  warnings: string[];
  isValid: boolean;
}
```

#### Paso 2: Motor de simulación en `lib/simulator/command.ts`

```typescript
import type { Command, FlowNode, FlowEdge, PluginState, SimulationResult, SimulationStep } from "@/types";

export function simulateCommand(command: Command, state: PluginState): SimulationResult {
  const steps: SimulationStep[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Topological sort de nodos siguiendo edges
  const ordered = topologicalSort(command.nodes, command.edges);

  for (const node of ordered) {
    const step = simulateNode(node, state, command);
    steps.push(step);
    errors.push(...step.warnings.filter(w => w.startsWith("ERROR:")));
    warnings.push(...step.warnings.filter(w => !w.startsWith("ERROR:")));
  }

  return {
    commandName: command.name,
    steps,
    errors,
    warnings,
    isValid: errors.length === 0,
  };
}

function simulateNode(node: FlowNode, state: PluginState, command: Command): SimulationStep {
  const base = {
    nodeId: node.id,
    nodeType: node.type,
    nodeName: getLabelForNode(node),
    status: "success" as const,
    warnings: [] as string[],
  };

  switch (node.type) {
    case "agent": {
      const agentId = node.data.agentId;
      const agent = state.agents.find(a => a.id === agentId);
      if (!agent) {
        return { ...base, status: "error", description: `Agent not found: ${agentId}`, warnings: [`ERROR: Agent reference "${agentId}" does not exist`] };
      }
      // Verificar skills del agent
      for (const skillId of agent.skillIds) {
        if (!state.skills.find(s => s.id === skillId)) {
          base.warnings.push(`Agent "${agent.name}" references missing skill: ${skillId}`);
        }
      }
      // Verificar MCPs del agent
      for (const mcpId of agent.mcpIds) {
        if (!state.mcps.find(m => m.id === mcpId)) {
          base.warnings.push(`Agent "${agent.name}" references missing MCP: ${mcpId}`);
        }
      }
      return { ...base, description: `Invoke agent "${agent.name}" (${agent.model})` };
    }

    case "skill": {
      const skillId = node.data.skillId;
      const skill = state.skills.find(s => s.id === skillId);
      if (!skill) {
        return { ...base, status: "error", description: `Skill not found: ${skillId}`, warnings: [`ERROR: Skill reference "${skillId}" does not exist`] };
      }
      return { ...base, description: `Apply skill "${skill.name}"` };
    }

    case "mcp": {
      const mcpId = node.data.mcpId;
      const mcp = state.mcps.find(m => m.id === mcpId);
      if (!mcp) {
        return { ...base, status: "error", description: `MCP not found: ${mcpId}`, warnings: [`ERROR: MCP reference "${mcpId}" does not exist`] };
      }
      if (!mcp.isConfigured) {
        base.warnings.push(`MCP "${mcp.name}" is not fully configured (missing env vars?)`);
      }
      return { ...base, description: `Call MCP "${mcp.name}" tool: ${node.data.toolName || "?"}` };
    }

    case "shell":
      return { ...base, description: `Execute shell: ${node.data.command || "(empty)"}` };

    case "branch":
      return { ...base, description: `Branch on: ${node.data.condition || "(no condition)"}` };

    case "condition":
      return { ...base, description: `Evaluate: ${node.data.expression || "(no expression)"}` };

    case "loop":
      return { ...base, description: `Loop over: ${node.data.iterable || "(no iterable)"} as ${node.data.variable || "item"}` };

    case "start":
      return { ...base, description: "Command starts" };

    case "end":
      return { ...base, description: "Command ends" };

    default:
      return { ...base, description: `Node: ${node.type}` };
  }
}
```

#### Paso 3: UI del Dry Run

`DryRunPanel.tsx` — un modal o side panel que muestra los steps como una lista vertical con indicadores de color (verde=ok, amarillo=warning, rojo=error). Cada step expandible para ver detalles.

#### Paso 4: Integrar en CommandCanvas
Agregar un botón "Dry Run" en la toolbar del command canvas que abre el panel de simulación.

### Criterios de aceptación
- [ ] Botón "Dry Run" visible en el command canvas
- [ ] La simulación recorre todos los nodos en orden topológico
- [ ] Referencias rotas (agent/skill/mcp inexistentes) se marcan como error
- [ ] MCPs sin configurar se marcan como warning
- [ ] El resultado muestra claramente si el plugin es válido

---

## FEATURE 2: Versionado de plugins

### Problema
No hay concepto de versión. No podés saber qué cambió entre dos exports de un plugin.

### Solución
Agregar `version` al estado del plugin con semver, y un changelog automático que registra cada cambio significativo (agregar/eliminar componente).

### Archivos a modificar
- `types/index.ts` — agregar `version` y `changelog` a `PluginState` y `PluginData`
- `stores/plugin.ts` — auto-incrementar patch en cada cambio, registrar changelog entries
- `lib/generator/plugin.ts` — usar `version` del state en `plugin.json` y README
- `components/layout/Header.tsx` — mostrar versión actual
- `components/version/ChangelogPanel.tsx` — **nuevo**: UI para ver changelog

### Implementación detallada

#### Paso 1: Tipos

```typescript
export interface ChangelogEntry {
  version: string;
  timestamp: number;
  changes: string[];  // ["Added skill: Testing Guidelines", "Removed agent: Linter"]
}

// Agregar a PluginState:
// version: string;  // "1.0.0"
// changelog: ChangelogEntry[];
```

#### Paso 2: Auto-tracking de cambios

Wrappear las actions del store con un middleware que detecta cambios:

```typescript
function withChangelog(actionName: string, entity: string, entityName: string) {
  // Agrega entry al changelog
  // Ejemplo: "Added skill: Testing Guidelines"
}
```

Actions a trackear:
- `addSkill` → "Added skill: {name}"
- `removeSkill` → "Removed skill: {name}"
- `addAgent` → "Added agent: {name}"
- `removeAgent` → "Removed agent: {name}"
- `addCommand` → "Added command: {name}"
- `removeCommand` → "Removed command: {name}"
- `addHook` → "Added hook: {name}"
- `removeHook` → "Removed hook: {name}"
- `addMCP` → "Added MCP: {name}"
- `removeMCP` → "Removed MCP: {name}"

Los updates (updateSkill, updateAgent, etc.) no se trackean individualmente para evitar ruido.

#### Paso 3: Bump de versión
- Agregar action `bumpVersion(type: "major" | "minor" | "patch")` al store
- Auto-bump patch en cada add/remove
- UI permite bump manual (minor/major) vía dropdown en el header

#### Paso 4: Generar changelog en export
En `generatePluginStructure`, agregar un `CHANGELOG.md`:
```markdown
# Changelog

## 1.2.0 - 2026-01-15
- Added skill: Testing Guidelines
- Added agent: Test Runner

## 1.1.0 - 2026-01-10
- Added command: /deploy
- Added MCP: Vercel
```

### Criterios de aceptación
- [ ] `version` aparece en el header de la app
- [ ] Agregar/eliminar componentes auto-incrementa patch
- [ ] Bump manual de minor/major funciona
- [ ] `CHANGELOG.md` se incluye en el export
- [ ] `plugin.json` usa la versión del state

---

## FEATURE 3: Composición entre plugins (dependencias)

### Problema
No hay forma de reutilizar skills/agents de un plugin en otro. Cada plugin es una isla.

### Solución
Agregar un sistema de "dependencias" liviano: un plugin puede declarar que depende de skills de otro plugin (por registry URL o plugin ID de la library). Al exportar, las skills dependientes se copian (vendoring) o se referencian.

### Archivos a modificar
- `types/index.ts` — agregar `PluginDependency` y `dependencies` a `PluginState`
- `stores/plugin.ts` — actions para manage dependencies
- `components/dependencies/DependencyPanel.tsx` — **nuevo**: UI para gestionar deps
- `components/layout/InventoryPanel.tsx` — sección de dependencias
- `lib/generator/plugin.ts` — incluir skills dependientes en el export
- `stores/library.ts` — exponer skills de plugins guardados para importar

### Implementación detallada

#### Paso 1: Tipos

```typescript
export interface PluginDependency {
  id: string;
  sourcePluginId: string;     // ID en la library local
  sourcePluginName: string;
  importedSkillIds: string[];  // Skills específicas importadas
  importedAgentIds: string[];  // Agents específicos importados
}

// Agregar a PluginState:
// dependencies: PluginDependency[];
```

#### Paso 2: UI de importación

En el InventoryPanel, agregar una sección "Import from Library" que:
1. Lista los otros plugins en la library
2. Permite seleccionar skills/agents específicos
3. Los agrega como dependencias (no como copia directa)

Los items importados aparecen en el inventory con un badge "imported" y son read-only. Se pueden des-vincular (lo que los convierte en copia local editable).

#### Paso 3: Resolución en export

En `generatePluginStructure`, cuando se encuentran dependencias:
- **Estrategia: Vendoring** — Las skills/agents importados se copian al export como si fueran locales. Simple, sin runtime resolution.
- Los archivos generados incluyen un comentario `# Imported from: {sourcePluginName}` en el frontmatter.

#### Paso 4: Detección de conflictos
Si un skill importado tiene el mismo nombre que un skill local → warning en la UI. El usuario elige: renombrar o sobrescribir.

### Criterios de aceptación
- [ ] Puedo importar un skill de otro plugin de mi library
- [ ] El skill importado aparece con badge "imported" en el inventory
- [ ] Al exportar, las skills importadas se incluyen en el ZIP
- [ ] Conflictos de nombre se detectan y muestran warning
- [ ] Puedo "unlink" un import para convertirlo en copia local

---

## FEATURE 4: Validación pre-export

### Problema
Se puede exportar un plugin con referencias rotas, MCPs sin configurar, y agents sin skills. El usuario descubre los errores después de instalar.

### Solución
Agregar un paso de validación que corre antes de exportar y muestra todos los errores/warnings.

### Archivos a crear/modificar
- `lib/validator/plugin.ts` — **nuevo**: motor de validación
- `components/export/ValidationReport.tsx` — **nuevo**: UI del reporte
- `components/export/ExportModal.tsx` — integrar validación antes de permitir export
- `types/index.ts` — tipos de validación

### Implementación detallada

#### Paso 1: Tipos

```typescript
export type ValidationSeverity = "error" | "warning" | "info";

export interface ValidationIssue {
  severity: ValidationSeverity;
  component: ItemType;   // "skill" | "agent" | "command" | "hook" | "mcp"
  componentId: string;
  componentName: string;
  message: string;
  fix?: string;          // Sugerencia de fix
}

export interface ValidationReport {
  issues: ValidationIssue[];
  isValid: boolean;      // true si no hay errors (warnings OK)
  timestamp: number;
}
```

#### Paso 2: Reglas de validación en `lib/validator/plugin.ts`

```typescript
export function validatePlugin(state: PluginState): ValidationReport {
  const issues: ValidationIssue[] = [];

  // --- Plugin-level ---
  if (!state.pluginName || state.pluginName.trim() === "") {
    issues.push({
      severity: "error",
      component: "skill", // plugin-level, pero no hay tipo "plugin"
      componentId: "",
      componentName: "Plugin",
      message: "Plugin name is empty",
      fix: "Set a plugin name in the header",
    });
  }

  // --- Skills ---
  for (const skill of state.skills) {
    if (!skill.content || skill.content.trim() === "") {
      issues.push({
        severity: "warning",
        component: "skill",
        componentId: skill.id,
        componentName: skill.name,
        message: "Skill has no content",
        fix: "Add content to the skill or remove it",
      });
    }
  }

  // --- Agents ---
  for (const agent of state.agents) {
    // Verificar skill references
    for (const skillId of agent.skillIds) {
      if (!state.skills.find(s => s.id === skillId)) {
        issues.push({
          severity: "error",
          component: "agent",
          componentId: agent.id,
          componentName: agent.name,
          message: `References non-existent skill: ${skillId}`,
          fix: "Remove the broken skill reference or create the missing skill",
        });
      }
    }
    // Verificar MCP references
    for (const mcpId of agent.mcpIds) {
      if (!state.mcps.find(m => m.id === mcpId)) {
        issues.push({
          severity: "error",
          component: "agent",
          componentId: agent.id,
          componentName: agent.name,
          message: `References non-existent MCP: ${mcpId}`,
          fix: "Remove the broken MCP reference or add the missing MCP",
        });
      }
    }
    if (!agent.instructions || agent.instructions.trim() === "") {
      issues.push({
        severity: "warning",
        component: "agent",
        componentId: agent.id,
        componentName: agent.name,
        message: "Agent has no instructions",
      });
    }
  }

  // --- Commands ---
  for (const command of state.commands) {
    // Verificar que tiene start node
    if (!command.nodes.find(n => n.type === "start")) {
      issues.push({
        severity: "error",
        component: "command",
        componentId: command.id,
        componentName: command.name,
        message: "Command has no start node",
        fix: "Add a start node to the command flow",
      });
    }
    // Verificar nodos agent/skill/mcp references
    for (const node of command.nodes) {
      if (node.type === "agent" && node.data.agentId) {
        if (!state.agents.find(a => a.id === node.data.agentId as string)) {
          issues.push({
            severity: "error",
            component: "command",
            componentId: command.id,
            componentName: command.name,
            message: `Node "${node.id}" references non-existent agent`,
          });
        }
      }
      if (node.type === "skill" && node.data.skillId) {
        if (!state.skills.find(s => s.id === node.data.skillId as string)) {
          issues.push({
            severity: "error",
            component: "command",
            componentId: command.id,
            componentName: command.name,
            message: `Node "${node.id}" references non-existent skill`,
          });
        }
      }
    }
    // Nodos desconectados
    const connectedNodeIds = new Set<string>();
    for (const edge of command.edges) {
      connectedNodeIds.add(edge.source);
      connectedNodeIds.add(edge.target);
    }
    for (const node of command.nodes) {
      if (command.nodes.length > 1 && !connectedNodeIds.has(node.id)) {
        issues.push({
          severity: "warning",
          component: "command",
          componentId: command.id,
          componentName: command.name,
          message: `Node "${node.id}" (${node.type}) is disconnected from the flow`,
        });
      }
    }
  }

  // --- MCPs ---
  for (const mcp of state.mcps) {
    if (!mcp.isConfigured) {
      issues.push({
        severity: "warning",
        component: "mcp",
        componentId: mcp.id,
        componentName: mcp.name,
        message: "MCP is not fully configured",
        fix: "Configure required environment variables",
      });
    }
    // Verificar env vars vacías
    for (const [key, val] of Object.entries(mcp.configuredEnvVars)) {
      if (!val || val === "" || val.startsWith("${")) {
        issues.push({
          severity: "info",
          component: "mcp",
          componentId: mcp.id,
          componentName: mcp.name,
          message: `Environment variable "${key}" needs to be set by the user`,
        });
      }
    }
  }

  // --- Hooks ---
  for (const hook of state.hooks) {
    if (!hook.event) {
      issues.push({
        severity: "error",
        component: "hook",
        componentId: hook.id,
        componentName: hook.name,
        message: "Hook has no event trigger",
      });
    }
  }

  // --- Orphan detection ---
  // Skills no usadas por ningún agent
  for (const skill of state.skills) {
    const usedByAgent = state.agents.some(a => a.skillIds.includes(skill.id));
    const usedByCommand = state.commands.some(c =>
      c.nodes.some(n => n.type === "skill" && n.data.skillId === skill.id)
    );
    if (!usedByAgent && !usedByCommand) {
      issues.push({
        severity: "info",
        component: "skill",
        componentId: skill.id,
        componentName: skill.name,
        message: "Skill is not referenced by any agent or command",
      });
    }
  }

  return {
    issues,
    isValid: !issues.some(i => i.severity === "error"),
    timestamp: Date.now(),
  };
}
```

#### Paso 3: UI — `ValidationReport.tsx`

Un componente que muestra los issues agrupados por severidad:
- **Errors** (rojo): bloquean el export
- **Warnings** (amarillo): se pueden ignorar
- **Info** (gris): sugerencias

Cada issue es clickeable y navega al componente afectado (llama `selectItem(componentId, component)`).

#### Paso 4: Integrar en ExportModal

En `ExportModal.tsx`, antes de mostrar el botón de descarga:
1. Correr `validatePlugin(state)`
2. Si hay errors → mostrar reporte, deshabilitar botón de export
3. Si solo warnings/info → mostrar reporte, permitir export con "Export anyway"
4. Si todo clean → botón verde directo

### Criterios de aceptación
- [ ] La validación corre automáticamente al abrir el export modal
- [ ] Errors bloquean el export
- [ ] Warnings permiten export con confirmación
- [ ] Clickear un issue navega al componente afectado
- [ ] Se detectan: referencias rotas, nodos desconectados, skills huérfanas, MCPs sin config, plugin sin nombre

---

## Orden de implementación recomendado

```
1. CAMBIO 1 — Discriminated Unions (base de types, desbloquea todo)
2. CAMBIO 4 — Auditoría React/Next (rápido, informativo, puede cambiar decisiones)
3. FEATURE 4 — Validación pre-export (alto valor, bajo esfuerzo)
4. FEATURE 1 — Dry-run / simulación (complementa validación)
5. CAMBIO 2 — IndexedDB (infraestructura, no bloquea features)
6. CAMBIO 3 — Tool Use (mejora calidad pero requiere más testing)
7. FEATURE 2 — Versionado (útil pero no crítico)
8. FEATURE 3 — Composición (más complejo, hacer último)
```

Cada paso es independiente y mergeable. No hay dependencias duras entre ellos excepto que CAMBIO 1 (tipos) facilita todo lo demás.
