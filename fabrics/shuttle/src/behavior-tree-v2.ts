/**
 * Behavior Tree V2 — Enhanced tick-driven decision trees.
 *
 * Extends the base behavior tree with:
 *   - Parallel nodes (run all children concurrently)
 *   - Decorator nodes (invert, repeat, succeeder, guard)
 *   - Memory nodes (resume from last running child)
 *   - Fluent tree builder API
 *   - Dynamic subtree insertion at runtime
 *
 * "The Loom weaves each thread in its own time."
 */

// ── Types ────────────────────────────────────────────────────────

type BtV2NodeStatus = 'idle' | 'running' | 'success' | 'failure';

type BtV2NodeType = 'sequence' | 'selector' | 'parallel' | 'decorator' | 'action' | 'condition';

type BtV2DecoratorKind = 'inverter' | 'succeeder' | 'repeater' | 'guard';

type BtV2ParallelPolicy = 'require_all' | 'require_one';

interface BtV2Blackboard {
  readonly get: (key: string) => unknown;
  readonly set: (key: string, value: unknown) => void;
  readonly has: (key: string) => boolean;
  readonly clear: () => void;
  readonly keys: () => ReadonlyArray<string>;
  readonly size: () => number;
  readonly snapshot: () => Readonly<Record<string, unknown>>;
}

interface BtV2TickContext {
  readonly npcId: string;
  readonly worldId: string;
  readonly deltaUs: number;
  readonly blackboard: BtV2Blackboard;
  readonly tickCount: number;
}

type BtV2ActionFn = (ctx: BtV2TickContext) => BtV2NodeStatus;
type BtV2ConditionFn = (ctx: BtV2TickContext) => boolean;
type BtV2GuardFn = (ctx: BtV2TickContext) => boolean;

interface BtV2Node {
  readonly nodeId: string;
  readonly name: string;
  readonly nodeType: BtV2NodeType;
  readonly tick: (ctx: BtV2TickContext) => BtV2NodeStatus;
  readonly reset: () => void;
  readonly lastStatus: () => BtV2NodeStatus;
}

interface BtV2Tree {
  readonly treeId: string;
  readonly name: string;
  readonly tick: (ctx: BtV2TickContext) => BtV2NodeStatus;
  readonly reset: () => void;
  readonly getRoot: () => BtV2Node;
  readonly insertSubtree: (parentId: string, subtree: BtV2Node) => boolean;
  readonly removeSubtree: (nodeId: string) => boolean;
  readonly nodeCount: () => number;
}

interface BtV2TreeBuilder {
  readonly sequence: (name: string) => BtV2TreeBuilder;
  readonly selector: (name: string) => BtV2TreeBuilder;
  readonly parallel: (name: string, policy: BtV2ParallelPolicy) => BtV2TreeBuilder;
  readonly action: (name: string, fn: BtV2ActionFn) => BtV2TreeBuilder;
  readonly condition: (name: string, fn: BtV2ConditionFn) => BtV2TreeBuilder;
  readonly inverter: (name: string) => BtV2TreeBuilder;
  readonly succeeder: (name: string) => BtV2TreeBuilder;
  readonly repeater: (name: string, maxRepeats: number) => BtV2TreeBuilder;
  readonly guard: (name: string, guardFn: BtV2GuardFn) => BtV2TreeBuilder;
  readonly end: () => BtV2TreeBuilder;
  readonly build: (treeId: string, treeName: string) => BtV2Tree;
}

interface BtV2TreeDeps {
  readonly idGenerator: { readonly next: () => string };
}

// ── Blackboard Factory ───────────────────────────────────────────

function createBtV2Blackboard(): BtV2Blackboard {
  const data = new Map<string, unknown>();
  return {
    get: (key) => data.get(key),
    set: (key, value) => {
      data.set(key, value);
    },
    has: (key) => data.has(key),
    clear: () => {
      data.clear();
    },
    keys: () => [...data.keys()],
    size: () => data.size,
    snapshot: () => buildSnapshot(data),
  };
}

function buildSnapshot(data: Map<string, unknown>): Readonly<Record<string, unknown>> {
  const obj: Record<string, unknown> = {};
  for (const [k, v] of data) {
    obj[k] = v;
  }
  return obj;
}

// ── Node Factories ───────────────────────────────────────────────

function createBtV2ActionNode(nodeId: string, name: string, fn: BtV2ActionFn): BtV2Node {
  let status: BtV2NodeStatus = 'idle';
  return {
    nodeId,
    name,
    nodeType: 'action',
    tick: (ctx) => {
      status = fn(ctx);
      return status;
    },
    reset: () => {
      status = 'idle';
    },
    lastStatus: () => status,
  };
}

function createBtV2ConditionNode(nodeId: string, name: string, fn: BtV2ConditionFn): BtV2Node {
  let status: BtV2NodeStatus = 'idle';
  return {
    nodeId,
    name,
    nodeType: 'condition',
    tick: (ctx) => {
      status = fn(ctx) ? 'success' : 'failure';
      return status;
    },
    reset: () => {
      status = 'idle';
    },
    lastStatus: () => status,
  };
}

function createBtV2SequenceNode(nodeId: string, name: string, children: BtV2Node[]): BtV2Node {
  let runningIndex = 0;
  let status: BtV2NodeStatus = 'idle';
  return {
    nodeId,
    name,
    nodeType: 'sequence',
    tick: (ctx) => {
      status = tickSequence(children, ctx, runningIndex, (i) => {
        runningIndex = i;
      });
      return status;
    },
    reset: () => {
      runningIndex = 0;
      status = 'idle';
      resetAll(children);
    },
    lastStatus: () => status,
  };
}

function tickSequence(
  children: readonly BtV2Node[],
  ctx: BtV2TickContext,
  startIdx: number,
  setIdx: (i: number) => void,
): BtV2NodeStatus {
  for (let i = startIdx; i < children.length; i++) {
    const child = children[i];
    if (child === undefined) continue;
    const result = child.tick(ctx);
    if (result === 'failure') {
      setIdx(0);
      return 'failure';
    }
    if (result === 'running') {
      setIdx(i);
      return 'running';
    }
  }
  setIdx(0);
  return 'success';
}

function createBtV2SelectorNode(nodeId: string, name: string, children: BtV2Node[]): BtV2Node {
  let runningIndex = 0;
  let status: BtV2NodeStatus = 'idle';
  return {
    nodeId,
    name,
    nodeType: 'selector',
    tick: (ctx) => {
      status = tickSelector(children, ctx, runningIndex, (i) => {
        runningIndex = i;
      });
      return status;
    },
    reset: () => {
      runningIndex = 0;
      status = 'idle';
      resetAll(children);
    },
    lastStatus: () => status,
  };
}

function tickSelector(
  children: readonly BtV2Node[],
  ctx: BtV2TickContext,
  startIdx: number,
  setIdx: (i: number) => void,
): BtV2NodeStatus {
  for (let i = startIdx; i < children.length; i++) {
    const child = children[i];
    if (child === undefined) continue;
    const result = child.tick(ctx);
    if (result === 'success') {
      setIdx(0);
      return 'success';
    }
    if (result === 'running') {
      setIdx(i);
      return 'running';
    }
  }
  setIdx(0);
  return 'failure';
}

function createBtV2ParallelNode(
  nodeId: string,
  name: string,
  children: BtV2Node[],
  policy: BtV2ParallelPolicy,
): BtV2Node {
  let status: BtV2NodeStatus = 'idle';
  return {
    nodeId,
    name,
    nodeType: 'parallel',
    tick: (ctx) => {
      status = tickParallel(children, ctx, policy);
      return status;
    },
    reset: () => {
      status = 'idle';
      resetAll(children);
    },
    lastStatus: () => status,
  };
}

function tickParallel(
  children: readonly BtV2Node[],
  ctx: BtV2TickContext,
  policy: BtV2ParallelPolicy,
): BtV2NodeStatus {
  let successCount = 0;
  let failureCount = 0;
  for (const child of children) {
    const result = child.tick(ctx);
    if (result === 'success') successCount++;
    else if (result === 'failure') failureCount++;
  }
  if (policy === 'require_all') {
    if (failureCount > 0) return 'failure';
    if (successCount === children.length) return 'success';
    return 'running';
  }
  if (successCount > 0) return 'success';
  if (failureCount === children.length) return 'failure';
  return 'running';
}

function createBtV2DecoratorNode(
  nodeId: string,
  name: string,
  kind: BtV2DecoratorKind,
  child: BtV2Node,
  config: DecoratorConfig,
): BtV2Node {
  let status: BtV2NodeStatus = 'idle';
  let repeatCount = 0;
  return {
    nodeId,
    name,
    nodeType: 'decorator',
    tick: (ctx) => {
      status = tickDecorator(kind, child, ctx, config, repeatCount, (c) => {
        repeatCount = c;
      });
      return status;
    },
    reset: () => {
      status = 'idle';
      repeatCount = 0;
      child.reset();
    },
    lastStatus: () => status,
  };
}

interface DecoratorConfig {
  readonly maxRepeats: number;
  readonly guardFn: BtV2GuardFn | null;
}

function tickDecorator(
  kind: BtV2DecoratorKind,
  child: BtV2Node,
  ctx: BtV2TickContext,
  config: DecoratorConfig,
  repeatCount: number,
  setRepeatCount: (c: number) => void,
): BtV2NodeStatus {
  if (kind === 'inverter') return invertResult(child.tick(ctx));
  if (kind === 'succeeder') {
    child.tick(ctx);
    return 'success';
  }
  if (kind === 'guard') return tickGuard(child, ctx, config);
  return tickRepeater(child, ctx, config, repeatCount, setRepeatCount);
}

function invertResult(result: BtV2NodeStatus): BtV2NodeStatus {
  if (result === 'success') return 'failure';
  if (result === 'failure') return 'success';
  return result;
}

function tickGuard(child: BtV2Node, ctx: BtV2TickContext, config: DecoratorConfig): BtV2NodeStatus {
  if (config.guardFn !== null && !config.guardFn(ctx)) return 'failure';
  return child.tick(ctx);
}

function tickRepeater(
  child: BtV2Node,
  ctx: BtV2TickContext,
  config: DecoratorConfig,
  repeatCount: number,
  setRepeatCount: (c: number) => void,
): BtV2NodeStatus {
  const result = child.tick(ctx);
  if (result === 'running') return 'running';
  const newCount = repeatCount + 1;
  if (newCount >= config.maxRepeats) {
    setRepeatCount(0);
    child.reset();
    return 'success';
  }
  setRepeatCount(newCount);
  child.reset();
  return 'running';
}

// ── Tree Factory ─────────────────────────────────────────────────

function createBtV2Tree(treeId: string, treeName: string, root: BtV2Node): BtV2Tree {
  const nodeMap = new Map<string, { readonly node: BtV2Node; readonly children: BtV2Node[] }>();
  indexNodes(root, nodeMap);

  return {
    treeId,
    name: treeName,
    tick: (ctx) => root.tick(ctx),
    reset: () => {
      root.reset();
    },
    getRoot: () => root,
    insertSubtree: (parentId, subtree) => insertSubtreeImpl(nodeMap, parentId, subtree),
    removeSubtree: (nodeId) => removeSubtreeImpl(nodeMap, nodeId),
    nodeCount: () => nodeMap.size,
  };
}

function indexNodes(
  node: BtV2Node,
  map: Map<string, { readonly node: BtV2Node; readonly children: BtV2Node[] }>,
): void {
  map.set(node.nodeId, { node, children: [] });
}

function insertSubtreeImpl(
  map: Map<string, { readonly node: BtV2Node; readonly children: BtV2Node[] }>,
  parentId: string,
  subtree: BtV2Node,
): boolean {
  const parent = map.get(parentId);
  if (parent === undefined) return false;
  parent.children.push(subtree);
  map.set(subtree.nodeId, { node: subtree, children: [] });
  return true;
}

function removeSubtreeImpl(
  map: Map<string, { readonly node: BtV2Node; readonly children: BtV2Node[] }>,
  nodeId: string,
): boolean {
  return map.delete(nodeId);
}

// ── Builder ──────────────────────────────────────────────────────

interface BuilderFrame {
  readonly name: string;
  readonly nodeType: BtV2NodeType;
  readonly children: BtV2Node[];
  readonly decoratorKind: BtV2DecoratorKind | null;
  readonly parallelPolicy: BtV2ParallelPolicy;
  readonly decoratorConfig: DecoratorConfig;
}

function createBtV2TreeBuilder(deps: BtV2TreeDeps): BtV2TreeBuilder {
  const stack: BuilderFrame[] = [];
  let rootNode: BtV2Node | null = null;

  function pushFrame(
    name: string,
    nodeType: BtV2NodeType,
    decoratorKind: BtV2DecoratorKind | null,
    policy: BtV2ParallelPolicy,
    config: DecoratorConfig,
  ): void {
    stack.push({
      name,
      nodeType,
      children: [],
      decoratorKind,
      parallelPolicy: policy,
      decoratorConfig: config,
    });
  }

  function addLeaf(node: BtV2Node): void {
    const top = stack[stack.length - 1];
    if (top !== undefined) {
      top.children.push(node);
    } else {
      rootNode = node;
    }
  }

  const builder: BtV2TreeBuilder = {
    sequence: (name) => {
      pushFrame(name, 'sequence', null, 'require_all', defaultConfig());
      return builder;
    },
    selector: (name) => {
      pushFrame(name, 'selector', null, 'require_all', defaultConfig());
      return builder;
    },
    parallel: (name, policy) => {
      pushFrame(name, 'parallel', null, policy, defaultConfig());
      return builder;
    },
    action: (name, fn) => {
      addLeaf(createBtV2ActionNode(deps.idGenerator.next(), name, fn));
      return builder;
    },
    condition: (name, fn) => {
      addLeaf(createBtV2ConditionNode(deps.idGenerator.next(), name, fn));
      return builder;
    },
    inverter: (name) => {
      pushFrame(name, 'decorator', 'inverter', 'require_all', defaultConfig());
      return builder;
    },
    succeeder: (name) => {
      pushFrame(name, 'decorator', 'succeeder', 'require_all', defaultConfig());
      return builder;
    },
    repeater: (name, maxRepeats) => {
      pushFrame(name, 'decorator', 'repeater', 'require_all', { maxRepeats, guardFn: null });
      return builder;
    },
    guard: (name, guardFn) => {
      pushFrame(name, 'decorator', 'guard', 'require_all', { maxRepeats: 0, guardFn });
      return builder;
    },
    end: () => {
      popFrame(stack, deps, addLeaf);
      return builder;
    },
    build: (treeId, treeName) => {
      finalize(stack, deps, addLeaf);
      return createBtV2Tree(treeId, treeName, rootNode as BtV2Node);
    },
  };

  return builder;
}

function popFrame(stack: BuilderFrame[], deps: BtV2TreeDeps, addLeaf: (n: BtV2Node) => void): void {
  const frame = stack.pop();
  if (frame === undefined) return;
  const node = frameToNode(frame, deps);
  addLeaf(node);
}

function finalize(stack: BuilderFrame[], deps: BtV2TreeDeps, addLeaf: (n: BtV2Node) => void): void {
  while (stack.length > 0) {
    popFrame(stack, deps, addLeaf);
  }
}

function frameToNode(frame: BuilderFrame, deps: BtV2TreeDeps): BtV2Node {
  const id = deps.idGenerator.next();
  if (frame.nodeType === 'sequence') return createBtV2SequenceNode(id, frame.name, frame.children);
  if (frame.nodeType === 'selector') return createBtV2SelectorNode(id, frame.name, frame.children);
  if (frame.nodeType === 'parallel')
    return createBtV2ParallelNode(id, frame.name, frame.children, frame.parallelPolicy);
  return buildDecoratorFromFrame(id, frame);
}

function buildDecoratorFromFrame(id: string, frame: BuilderFrame): BtV2Node {
  const child = frame.children[0];
  if (child === undefined) {
    return createBtV2ActionNode(id, frame.name, () => 'success');
  }
  return createBtV2DecoratorNode(
    id,
    frame.name,
    frame.decoratorKind ?? 'succeeder',
    child,
    frame.decoratorConfig,
  );
}

function defaultConfig(): DecoratorConfig {
  return { maxRepeats: 1, guardFn: null };
}

// ── Helpers ──────────────────────────────────────────────────────

function resetAll(children: readonly BtV2Node[]): void {
  for (const child of children) {
    child.reset();
  }
}

// ── Exports ──────────────────────────────────────────────────────

export {
  createBtV2Blackboard,
  createBtV2ActionNode,
  createBtV2ConditionNode,
  createBtV2SequenceNode,
  createBtV2SelectorNode,
  createBtV2ParallelNode,
  createBtV2DecoratorNode,
  createBtV2Tree,
  createBtV2TreeBuilder,
};
export type {
  BtV2NodeStatus,
  BtV2NodeType,
  BtV2DecoratorKind,
  BtV2ParallelPolicy,
  BtV2Blackboard,
  BtV2TickContext,
  BtV2ActionFn,
  BtV2ConditionFn,
  BtV2GuardFn,
  BtV2Node,
  BtV2Tree,
  BtV2TreeBuilder,
  BtV2TreeDeps,
  DecoratorConfig,
};
