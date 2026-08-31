import type { AgentActionContext, AgentPlugin, IntelligenceResult } from "./types.js";

const plugins = new Map<string, AgentPlugin>();

export function registerPlugin(plugin: AgentPlugin): void {
  if (!plugin.name || !plugin.version) throw new Error("Plugin requires name and version");
  if (plugins.has(plugin.name)) throw new Error(`Plugin already registered: ${plugin.name}`);
  plugins.set(plugin.name, plugin);
}

export function unregisterPlugin(name: string): boolean { return plugins.delete(name); }
export function listPlugins(): { name: string; version: string; actions: string[] }[] { return [...plugins.values()].map(p => ({ name: p.name, version: p.version, actions: Object.keys(p.actions || {}) })); }

export async function runPluginAction(name: string, action: string, input: unknown, context: AgentActionContext = {}): Promise<unknown> {
  const plugin = plugins.get(name);
  if (!plugin) throw new Error(`Plugin not found: ${name}`);
  const fn = plugin.actions?.[action];
  if (!fn) throw new Error(`Plugin action not found: ${name}.${action}`);
  return fn(input, context);
}

export async function applyPluginEnrichers(result: IntelligenceResult, context: AgentActionContext = {}): Promise<IntelligenceResult> {
  let current = result;
  for (const plugin of plugins.values()) if (plugin.enrich) current = await plugin.enrich(current, context);
  return current;
}

export async function loadPlugin(modulePath: string): Promise<void> {
  const importer = new Function("m", "return import(m)") as (module: string) => Promise<any>;
  const mod = await importer(modulePath);
  const plugin = (mod.default || mod.plugin) as AgentPlugin | undefined;
  if (!plugin) throw new Error(`Module ${modulePath} does not export default/plugin AgentPlugin`);
  registerPlugin(plugin);
}

export function definePlugin(plugin: AgentPlugin): AgentPlugin { return plugin; }
