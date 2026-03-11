/**
 * input-mapper.ts — Map raw input events to named game actions with rebinding.
 *
 * Actions are registered with a default binding. Bindings can be overridden,
 * unbound, or reset to default. processInput resolves an InputCode to an action,
 * updates lastTriggeredAt, and records every event to history (most-recent-first).
 */

// ── Types ─────────────────────────────────────────────────────────

export type ActionId = string;

/** Raw input identifier, e.g. 'KeyW', 'Space', 'MouseLeft', 'GamepadA'. */
export type InputCode = string;

export type InputMapperError =
  | 'action-not-found'
  | 'binding-not-found'
  | 'already-bound'
  | 'action-already-exists';

export interface InputAction {
  readonly actionId: ActionId;
  readonly name: string;
  readonly description: string;
  readonly defaultBinding: InputCode;
  readonly currentBinding: InputCode;
  readonly lastTriggeredAt: bigint | null;
}

export interface InputEvent {
  readonly eventId: string;
  readonly inputCode: InputCode;
  readonly actionId: ActionId | null;
  readonly triggeredAt: bigint;
}

export interface BindingConflict {
  readonly inputCode: InputCode;
  readonly existingActionId: ActionId;
  readonly requestedActionId: ActionId;
}

export interface InputMapperSystem {
  registerAction(
    actionId: ActionId,
    name: string,
    description: string,
    defaultBinding: InputCode,
  ): InputAction | InputMapperError;
  bindAction(
    actionId: ActionId,
    inputCode: InputCode,
  ): { success: true } | { success: false; error: InputMapperError; conflict?: BindingConflict };
  unbindAction(actionId: ActionId): { success: true } | { success: false; error: InputMapperError };
  resetToDefault(
    actionId: ActionId,
  ): { success: true } | { success: false; error: InputMapperError };
  processInput(inputCode: InputCode): InputEvent;
  getAction(actionId: ActionId): InputAction | undefined;
  getActionForInput(inputCode: InputCode): InputAction | undefined;
  listActions(): ReadonlyArray<InputAction>;
  getInputHistory(limit: number): ReadonlyArray<InputEvent>;
}

// ── Ports ─────────────────────────────────────────────────────────

interface InputClock {
  nowUs(): bigint;
}

interface InputIdGenerator {
  generate(): string;
}

interface InputLogger {
  debug(msg: string): void;
  info(msg: string): void;
  warn(msg: string): void;
  error(msg: string): void;
}

export interface InputMapperDeps {
  readonly clock: InputClock;
  readonly idGen: InputIdGenerator;
  readonly logger: InputLogger;
}

// ── Internal State ────────────────────────────────────────────────

interface MutableAction {
  actionId: ActionId;
  name: string;
  description: string;
  defaultBinding: InputCode;
  currentBinding: InputCode;
  lastTriggeredAt: bigint | null;
}

interface InputMapperState {
  readonly actions: Map<ActionId, MutableAction>;
  /** Maps currently-bound InputCode → actionId (only non-empty bindings). */
  readonly bindingIndex: Map<InputCode, ActionId>;
  readonly history: InputEvent[];
  readonly clock: InputClock;
  readonly idGen: InputIdGenerator;
  readonly logger: InputLogger;
}

// ── Snapshot ──────────────────────────────────────────────────────

function toReadonly(action: MutableAction): InputAction {
  return {
    actionId: action.actionId,
    name: action.name,
    description: action.description,
    defaultBinding: action.defaultBinding,
    currentBinding: action.currentBinding,
    lastTriggeredAt: action.lastTriggeredAt,
  };
}

// ── Binding Index Helpers ─────────────────────────────────────────

function removeFromIndex(state: InputMapperState, action: MutableAction): void {
  if (action.currentBinding !== '') {
    state.bindingIndex.delete(action.currentBinding);
  }
}

function addToIndex(state: InputMapperState, action: MutableAction): void {
  if (action.currentBinding !== '') {
    state.bindingIndex.set(action.currentBinding, action.actionId);
  }
}

// ── Operations ────────────────────────────────────────────────────

function registerActionImpl(
  state: InputMapperState,
  actionId: ActionId,
  name: string,
  description: string,
  defaultBinding: InputCode,
): InputAction | InputMapperError {
  if (state.actions.has(actionId)) return 'action-already-exists';

  const action: MutableAction = {
    actionId,
    name,
    description,
    defaultBinding,
    currentBinding: defaultBinding,
    lastTriggeredAt: null,
  };
  state.actions.set(actionId, action);
  addToIndex(state, action);
  state.logger.info('input-action-registered actionId=' + actionId + ' binding=' + defaultBinding);
  return toReadonly(action);
}

function bindActionImpl(
  state: InputMapperState,
  actionId: ActionId,
  inputCode: InputCode,
): { success: true } | { success: false; error: InputMapperError; conflict?: BindingConflict } {
  const action = state.actions.get(actionId);
  if (action === undefined) return { success: false, error: 'action-not-found' };

  const existingOwner = state.bindingIndex.get(inputCode);
  if (existingOwner !== undefined && existingOwner !== actionId) {
    return {
      success: false,
      error: 'already-bound',
      conflict: { inputCode, existingActionId: existingOwner, requestedActionId: actionId },
    };
  }
  if (existingOwner === actionId) return { success: true };

  removeFromIndex(state, action);
  action.currentBinding = inputCode;
  addToIndex(state, action);
  state.logger.info('input-action-bound actionId=' + actionId + ' inputCode=' + inputCode);
  return { success: true };
}

function unbindActionImpl(
  state: InputMapperState,
  actionId: ActionId,
): { success: true } | { success: false; error: InputMapperError } {
  const action = state.actions.get(actionId);
  if (action === undefined) return { success: false, error: 'action-not-found' };
  removeFromIndex(state, action);
  action.currentBinding = '';
  state.logger.info('input-action-unbound actionId=' + actionId);
  return { success: true };
}

function resetToDefaultImpl(
  state: InputMapperState,
  actionId: ActionId,
): { success: true } | { success: false; error: InputMapperError } {
  const action = state.actions.get(actionId);
  if (action === undefined) return { success: false, error: 'action-not-found' };
  removeFromIndex(state, action);
  action.currentBinding = action.defaultBinding;
  addToIndex(state, action);
  state.logger.info('input-action-reset actionId=' + actionId);
  return { success: true };
}

function processInputImpl(state: InputMapperState, inputCode: InputCode): InputEvent {
  const now = state.clock.nowUs();
  const eventId = state.idGen.generate();
  const matchedActionId = state.bindingIndex.get(inputCode) ?? null;

  if (matchedActionId !== null) {
    const action = state.actions.get(matchedActionId);
    if (action !== undefined) action.lastTriggeredAt = now;
  }

  const event: InputEvent = {
    eventId,
    inputCode,
    actionId: matchedActionId,
    triggeredAt: now,
  };
  state.history.unshift(event);
  return event;
}

function getActionForInputImpl(
  state: InputMapperState,
  inputCode: InputCode,
): InputAction | undefined {
  const actionId = state.bindingIndex.get(inputCode);
  if (actionId === undefined) return undefined;
  const action = state.actions.get(actionId);
  return action !== undefined ? toReadonly(action) : undefined;
}

function getInputHistoryImpl(state: InputMapperState, limit: number): ReadonlyArray<InputEvent> {
  return state.history.slice(0, limit);
}

// ── Factory ───────────────────────────────────────────────────────

export function createInputMapperSystem(deps: InputMapperDeps): InputMapperSystem {
  const state: InputMapperState = {
    actions: new Map(),
    bindingIndex: new Map(),
    history: [],
    clock: deps.clock,
    idGen: deps.idGen,
    logger: deps.logger,
  };

  return {
    registerAction: (actionId, name, description, defaultBinding) =>
      registerActionImpl(state, actionId, name, description, defaultBinding),
    bindAction: (actionId, inputCode) => bindActionImpl(state, actionId, inputCode),
    unbindAction: (actionId) => unbindActionImpl(state, actionId),
    resetToDefault: (actionId) => resetToDefaultImpl(state, actionId),
    processInput: (inputCode) => processInputImpl(state, inputCode),
    getAction: (actionId) => {
      const action = state.actions.get(actionId);
      return action !== undefined ? toReadonly(action) : undefined;
    },
    getActionForInput: (inputCode) => getActionForInputImpl(state, inputCode),
    listActions: () => Array.from(state.actions.values()).map(toReadonly),
    getInputHistory: (limit) => getInputHistoryImpl(state, limit),
  };
}
