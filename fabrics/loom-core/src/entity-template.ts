/**
 * entity-template.ts — Entity template registry.
 *
 * Stores reusable entity blueprints (templates) that define the
 * default component set for a type of entity. When spawning entities,
 * the template provides the base component configuration which can
 * then be customized per-instance.
 */

// ── Types ────────────────────────────────────────────────────────

interface ComponentTemplate {
  readonly componentType: string;
  readonly defaultData: string;
}

interface EntityTemplate {
  readonly templateId: string;
  readonly name: string;
  readonly category: string;
  readonly components: readonly ComponentTemplate[];
  readonly tags: readonly string[];
  readonly createdAt: number;
}

interface RegisterTemplateParams {
  readonly name: string;
  readonly category: string;
  readonly components: readonly ComponentTemplate[];
  readonly tags?: readonly string[];
}

interface TemplateFilter {
  readonly category?: string;
  readonly tag?: string;
}

interface TemplateStats {
  readonly totalTemplates: number;
  readonly categories: number;
}

// ── Ports ────────────────────────────────────────────────────────

interface TemplateIdGenerator {
  readonly next: () => string;
}

interface TemplateClock {
  readonly nowMicroseconds: () => number;
}

// ── Public API ───────────────────────────────────────────────────

interface EntityTemplateRegistry {
  readonly register: (params: RegisterTemplateParams) => EntityTemplate;
  readonly unregister: (templateId: string) => boolean;
  readonly get: (templateId: string) => EntityTemplate | undefined;
  readonly findByName: (name: string) => EntityTemplate | undefined;
  readonly list: (filter?: TemplateFilter) => readonly EntityTemplate[];
  readonly getStats: () => TemplateStats;
}

interface EntityTemplateDeps {
  readonly idGenerator: TemplateIdGenerator;
  readonly clock: TemplateClock;
}

// ── State ────────────────────────────────────────────────────────

interface TemplateState {
  readonly templates: Map<string, EntityTemplate>;
  readonly nameIndex: Map<string, string>;
  readonly deps: EntityTemplateDeps;
}

// ── Operations ───────────────────────────────────────────────────

function registerImpl(state: TemplateState, params: RegisterTemplateParams): EntityTemplate {
  const id = state.deps.idGenerator.next();
  const template: EntityTemplate = {
    templateId: id,
    name: params.name,
    category: params.category,
    components: [...params.components],
    tags: params.tags ? [...params.tags] : [],
    createdAt: state.deps.clock.nowMicroseconds(),
  };
  state.templates.set(id, template);
  state.nameIndex.set(params.name, id);
  return template;
}

function unregisterImpl(state: TemplateState, templateId: string): boolean {
  const template = state.templates.get(templateId);
  if (!template) return false;
  state.nameIndex.delete(template.name);
  state.templates.delete(templateId);
  return true;
}

function matchesFilter(template: EntityTemplate, filter: TemplateFilter): boolean {
  if (filter.category !== undefined && template.category !== filter.category) {
    return false;
  }
  if (filter.tag !== undefined && !template.tags.includes(filter.tag)) {
    return false;
  }
  return true;
}

function listImpl(state: TemplateState, filter?: TemplateFilter): readonly EntityTemplate[] {
  if (!filter) return [...state.templates.values()];
  const results: EntityTemplate[] = [];
  for (const t of state.templates.values()) {
    if (matchesFilter(t, filter)) results.push(t);
  }
  return results;
}

function getStatsImpl(state: TemplateState): TemplateStats {
  const categories = new Set<string>();
  for (const t of state.templates.values()) {
    categories.add(t.category);
  }
  return {
    totalTemplates: state.templates.size,
    categories: categories.size,
  };
}

// ── Factory ──────────────────────────────────────────────────────

function createEntityTemplateRegistry(deps: EntityTemplateDeps): EntityTemplateRegistry {
  const state: TemplateState = {
    templates: new Map(),
    nameIndex: new Map(),
    deps,
  };
  return {
    register: (p) => registerImpl(state, p),
    unregister: (id) => unregisterImpl(state, id),
    get: (id) => state.templates.get(id),
    findByName: (name) => {
      const id = state.nameIndex.get(name);
      return id !== undefined ? state.templates.get(id) : undefined;
    },
    list: (f) => listImpl(state, f),
    getStats: () => getStatsImpl(state),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createEntityTemplateRegistry };
export type {
  EntityTemplateRegistry,
  EntityTemplateDeps,
  EntityTemplate,
  ComponentTemplate,
  RegisterTemplateParams,
  TemplateFilter,
  TemplateStats,
};
