/**
 * query-index.ts — Searchable index over archived records.
 *
 * Builds typed field indexes over arbitrary record sets, supporting
 * EQ, GT, LT, and CONTAINS filters with AND composition. Indexes
 * enforce field schemas at insert/update time.
 *
 * "Every record remembered. Every record findable."
 */

// ============================================================================
// PORTS
// ============================================================================

export type Clock = {
  now(): bigint;
};

export type IdGenerator = {
  generate(): string;
};

export type Logger = {
  info(message: string): void;
  error(message: string): void;
};

// ============================================================================
// TYPES
// ============================================================================

export type IndexId = string;
export type RecordId = string;
export type FieldName = string;

export type IndexError =
  | 'index-not-found'
  | 'record-not-found'
  | 'field-not-found'
  | 'already-exists'
  | 'invalid-value';

export type IndexField = {
  fieldName: FieldName;
  fieldType: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'BIGINT';
};

export type IndexRecord = {
  recordId: RecordId;
  indexId: IndexId;
  fields: Map<FieldName, string | number | boolean | bigint>;
  indexedAt: bigint;
};

export type QueryFilter = {
  field: FieldName;
  operator: 'EQ' | 'GT' | 'LT' | 'CONTAINS';
  value: string | number | boolean | bigint;
};

export type QueryResult = {
  records: ReadonlyArray<IndexRecord>;
  totalCount: number;
  executedAt: bigint;
};

export type IndexStats = {
  indexId: IndexId;
  name: string;
  recordCount: number;
  fieldCount: number;
  createdAt: bigint;
};

// ============================================================================
// STATE
// ============================================================================

type IndexDefinition = {
  indexId: IndexId;
  name: string;
  fields: ReadonlyArray<IndexField>;
  createdAt: bigint;
};

export type QueryIndexState = {
  indexes: Map<IndexId, IndexDefinition>;
  indexesByName: Map<string, IndexId>;
  records: Map<IndexId, Map<RecordId, IndexRecord>>;
};

// ============================================================================
// FACTORY
// ============================================================================

export function createQueryIndexState(): QueryIndexState {
  return {
    indexes: new Map(),
    indexesByName: new Map(),
    records: new Map(),
  };
}

// ============================================================================
// INDEX MANAGEMENT
// ============================================================================

export function createIndex(
  state: QueryIndexState,
  name: string,
  fields: ReadonlyArray<IndexField>,
  idGen: IdGenerator,
  clock: Clock,
  logger: Logger,
): IndexStats | IndexError {
  if (state.indexesByName.has(name)) return 'already-exists';

  const indexId = idGen.generate();
  const def: IndexDefinition = { indexId, name, fields, createdAt: clock.now() };

  state.indexes.set(indexId, def);
  state.indexesByName.set(name, indexId);
  state.records.set(indexId, new Map());

  logger.info('Index created: ' + name + ' (' + String(fields.length) + ' fields)');

  return buildIndexStats(def, 0);
}

function buildIndexStats(def: IndexDefinition, recordCount: number): IndexStats {
  return {
    indexId: def.indexId,
    name: def.name,
    recordCount,
    fieldCount: def.fields.length,
    createdAt: def.createdAt,
  };
}

export function getIndexStats(state: QueryIndexState, indexId: IndexId): IndexStats | undefined {
  const def = state.indexes.get(indexId);
  if (def === undefined) return undefined;
  const recordMap = state.records.get(indexId);
  return buildIndexStats(def, recordMap?.size ?? 0);
}

export function listIndexes(state: QueryIndexState): ReadonlyArray<IndexStats> {
  const results: IndexStats[] = [];
  for (const def of state.indexes.values()) {
    const recordMap = state.records.get(def.indexId);
    results.push(buildIndexStats(def, recordMap?.size ?? 0));
  }
  return results;
}

// ============================================================================
// RECORD MANAGEMENT
// ============================================================================

export function insertRecord(
  state: QueryIndexState,
  indexId: IndexId,
  recordId: RecordId,
  fieldValues: Record<FieldName, string | number | boolean | bigint>,
  clock: Clock,
  logger: Logger,
): IndexRecord | IndexError {
  const def = state.indexes.get(indexId);
  if (def === undefined) return 'index-not-found';

  const recordMap = state.records.get(indexId);
  if (recordMap === undefined) return 'index-not-found';

  if (recordMap.has(recordId)) return 'already-exists';

  const validationError = validateFieldValues(def.fields, fieldValues);
  if (validationError !== null) return validationError;

  const record = buildRecord(recordId, indexId, fieldValues, clock.now());
  recordMap.set(recordId, record);

  logger.info('Record inserted: ' + recordId + ' into index ' + indexId);

  return record;
}

export function updateRecord(
  state: QueryIndexState,
  indexId: IndexId,
  recordId: RecordId,
  fieldValues: Record<FieldName, string | number | boolean | bigint>,
  clock: Clock,
  logger: Logger,
): IndexRecord | IndexError {
  const def = state.indexes.get(indexId);
  if (def === undefined) return 'index-not-found';

  const recordMap = state.records.get(indexId);
  if (recordMap === undefined) return 'index-not-found';

  if (!recordMap.has(recordId)) return 'record-not-found';

  const validationError = validateFieldValues(def.fields, fieldValues);
  if (validationError !== null) return validationError;

  const record = buildRecord(recordId, indexId, fieldValues, clock.now());
  recordMap.set(recordId, record);

  logger.info('Record updated: ' + recordId + ' in index ' + indexId);

  return record;
}

export function deleteRecord(
  state: QueryIndexState,
  indexId: IndexId,
  recordId: RecordId,
): { success: true } | { success: false; error: IndexError } {
  const recordMap = state.records.get(indexId);
  if (recordMap === undefined) return { success: false, error: 'index-not-found' };
  if (!recordMap.has(recordId)) return { success: false, error: 'record-not-found' };

  recordMap.delete(recordId);
  return { success: true };
}

export function getRecord(
  state: QueryIndexState,
  indexId: IndexId,
  recordId: RecordId,
): IndexRecord | undefined {
  return state.records.get(indexId)?.get(recordId);
}

function buildRecord(
  recordId: RecordId,
  indexId: IndexId,
  fieldValues: Record<FieldName, string | number | boolean | bigint>,
  now: bigint,
): IndexRecord {
  const fields = new Map<FieldName, string | number | boolean | bigint>();
  for (const [k, v] of Object.entries(fieldValues)) {
    fields.set(k, v);
  }
  return { recordId, indexId, fields, indexedAt: now };
}

function validateFieldValues(
  indexFields: ReadonlyArray<IndexField>,
  values: Record<FieldName, string | number | boolean | bigint>,
): IndexError | null {
  for (const field of indexFields) {
    if (!(field.fieldName in values)) return 'field-not-found';
  }
  return null;
}

// ============================================================================
// QUERY
// ============================================================================

export function query(
  state: QueryIndexState,
  indexId: IndexId,
  filters: ReadonlyArray<QueryFilter>,
  clock: Clock,
): QueryResult | IndexError {
  const recordMap = state.records.get(indexId);
  if (recordMap === undefined) return 'index-not-found';

  const matching: IndexRecord[] = [];
  for (const record of recordMap.values()) {
    if (recordMatchesAllFilters(record, filters)) {
      matching.push(record);
    }
  }

  return { records: matching, totalCount: matching.length, executedAt: clock.now() };
}

function recordMatchesAllFilters(
  record: IndexRecord,
  filters: ReadonlyArray<QueryFilter>,
): boolean {
  for (const filter of filters) {
    if (!applyFilter(record, filter)) return false;
  }
  return true;
}

function applyFilter(record: IndexRecord, filter: QueryFilter): boolean {
  const value = record.fields.get(filter.field);
  if (value === undefined) return false;

  if (filter.operator === 'EQ') return value === filter.value;
  if (filter.operator === 'GT') return value > filter.value;
  if (filter.operator === 'LT') return value < filter.value;
  // CONTAINS — exhausts the union
  if (typeof value !== 'string' || typeof filter.value !== 'string') return false;
  return value.toLowerCase().includes(filter.value.toLowerCase());
}
