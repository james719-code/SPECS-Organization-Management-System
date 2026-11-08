import { firebaseAccessToken, firebaseProjectId } from './serviceAccount.ts';
import type { JsonMap } from '../types.ts';

function encodeValue(value: unknown): JsonMap {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'number') return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeValue) } };
  if (typeof value === 'object') {
    return { mapValue: { fields: Object.fromEntries(Object.entries(value as JsonMap).map(([key, child]) => [key, encodeValue(child)])) } };
  }
  return { stringValue: String(value) };
}

function decodeValue(value: JsonMap | undefined, preserveTimestamps = false): unknown {
  if (!value) return null;
  if ('nullValue' in value) return null;
  if ('stringValue' in value) return value.stringValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('timestampValue' in value) return preserveTimestamps ? new Date(String(value.timestampValue)) : value.timestampValue;
  if ('arrayValue' in value) return ((value.arrayValue as JsonMap).values as JsonMap[] || []).map((child) => decodeValue(child, preserveTimestamps));
  if ('mapValue' in value) {
    const fields = ((value.mapValue as JsonMap).fields || {}) as JsonMap;
    return Object.fromEntries(Object.entries(fields).map(([key, child]) => [key, decodeValue(child as JsonMap, preserveTimestamps)]));
  }
  return null;
}

function decodeDocument(document: JsonMap, preserveTimestamps = false): JsonMap {
  const name = String(document.name || '');
  const id = name.split('/').pop() || '';
  const fields = (document.fields || {}) as JsonMap;
  return { $id: id, ...Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, decodeValue(value as JsonMap, preserveTimestamps)])) };
}

export class FirestoreRestClient {
  private baseUrl = `${Deno.env.get('FIRESTORE_EMULATOR_HOST') ? `http://${Deno.env.get('FIRESTORE_EMULATOR_HOST')}` : 'https://firestore.googleapis.com'}/v1/projects/${firebaseProjectId()}/databases/(default)/documents`;

  private async request(path: string, init: RequestInit = {}): Promise<JsonMap> {
    const token = await firebaseAccessToken();
    const response = await fetch(path.startsWith(':') ? `${this.baseUrl}${path}` : `${this.baseUrl}/${path}`, {
      ...init,
      signal: init.signal || AbortSignal.timeout(20_000),
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
    });
    const text = await response.text();
    let data: JsonMap = {};
    try { data = text ? JSON.parse(text) as JsonMap : {}; } catch { data = { error: text }; }
    if (!response.ok) {
      const message = ((data.error as JsonMap | undefined)?.message || data.error || response.statusText) as string;
      throw new Error(`Firestore ${response.status}: ${message}`);
    }
    return data;
  }

  async get(collection: string, id: string, transaction?: string): Promise<JsonMap> {
    if (transaction) {
      const name = `projects/${firebaseProjectId()}/databases/(default)/documents/${collection}/${id}`;
      const rows = await this.request(':batchGet', { method: 'POST', body: JSON.stringify({ documents: [name], transaction }) }) as unknown as Array<{ found?: JsonMap }>;
      const found = rows.find((row) => row.found)?.found;
      if (!found) throw new Error(`Firestore 404: Document not found: ${id}`);
      // Read/modify/write transactions must retain Firestore timestamp types;
      // otherwise editing a row silently changes its date's index ordering.
      return decodeDocument(found, true);
    }
    return decodeDocument(await this.request(`${encodeURIComponent(collection)}/${encodeURIComponent(id)}`));
  }

  async list(collection: string): Promise<JsonMap[]> {
    const documents: JsonMap[] = [];
    let pageToken = '';
    do {
      const query = new URLSearchParams({ pageSize: '1000' });
      if (pageToken) query.set('pageToken', pageToken);
      const page = await this.request(`${encodeURIComponent(collection)}?${query.toString()}`);
      documents.push(...((page.documents || []) as JsonMap[]).map((document) => decodeDocument(document)));
      pageToken = String(page.nextPageToken || '');
    } while (pageToken);
    return documents;
  }

  async listPage(collection: string, limit: number, cursor?: string): Promise<JsonMap> {
    const query = new URLSearchParams({ pageSize: String(limit) });
    if (cursor) query.set('pageToken', cursor);
    const page = await this.request(`${encodeURIComponent(collection)}?${query}`);
    return {
      documents: ((page.documents || []) as JsonMap[]).map((document) => decodeDocument(document)),
      nextCursor: page.nextPageToken || null,
    };
  }

  async queryPage(collection: string, limit: number, cursor: string | undefined, filters: Array<{ field: string; value: unknown }>): Promise<JsonMap> {
    const query: JsonMap = {
      from: [{ collectionId: collection }], limit: limit + 1,
      orderBy: [{ field: { fieldPath: '__name__' }, direction: 'ASCENDING' }],
    };
    // Firestore requires a unary filter for null equality.
    if (filters.length) query.where = { compositeFilter: { op: 'AND', filters: filters.map(({ field, value }) => value === null
      ? { unaryFilter: { field: { fieldPath: field }, op: 'IS_NULL' } }
      : { fieldFilter: { field: { fieldPath: field }, op: 'EQUAL', value: encodeValue(value) } }) } };
    if (cursor) query.startAt = { before: false, values: [{ referenceValue: `projects/${firebaseProjectId()}/databases/(default)/documents/${collection}/${cursor}` }] };
    const rows = await this.request(':runQuery', { method: 'POST', body: JSON.stringify({ structuredQuery: query }) }) as unknown as Array<{ document?: JsonMap }>;
    const documents = rows.flatMap((row) => row.document ? [decodeDocument(row.document)] : []);
    const hasMore = documents.length > limit;
    const page = documents.slice(0, limit);
    return { documents: page, nextCursor: hasMore ? page.at(-1)?.$id : null };
  }

  async create(collection: string, id: string, data: JsonMap): Promise<JsonMap> {
    const path = `${encodeURIComponent(collection)}?documentId=${encodeURIComponent(id)}`;
    return decodeDocument(await this.request(path, {
      method: 'POST', body: JSON.stringify({ fields: Object.fromEntries(Object.entries(data).map(([key, value]) => [key, encodeValue(value)])) }),
    }));
  }

  async set(collection: string, id: string, data: JsonMap): Promise<JsonMap> {
    const path = `${encodeURIComponent(collection)}/${encodeURIComponent(id)}`;
    const result = await this.request(path, {
      method: 'PATCH',
      body: JSON.stringify({ name: `projects/${firebaseProjectId()}/databases/(default)/documents/${collection}/${id}`, fields: Object.fromEntries(Object.entries(data).map(([key, value]) => [key, encodeValue(value)])) }),
    });
    return decodeDocument(result);
  }

  async update(collection: string, id: string, patch: JsonMap, options: { upsert?: boolean } = {}): Promise<JsonMap> {
    const params = new URLSearchParams();
    if (!options.upsert) params.set('currentDocument.exists', 'true');
    for (const key of Object.keys(patch)) params.append('updateMask.fieldPaths', key);
    return decodeDocument(await this.request(`${encodeURIComponent(collection)}/${encodeURIComponent(id)}?${params}`, {
      method: 'PATCH', body: JSON.stringify({ fields: Object.fromEntries(Object.entries(patch).map(([key, value]) => [key, encodeValue(value)])) }),
    }));
  }

  async delete(collection: string, id: string): Promise<void> {
    await this.request(`${encodeURIComponent(collection)}/${encodeURIComponent(id)}`, { method: 'DELETE' });
  }

  // Firestore commits the reads and writes serializably. In particular, two
  // registrations cannot both claim an absent student-number reservation.
  async runTransaction<T>(work: (transaction: FirestoreTransaction) => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      const started = await this.request(':beginTransaction', { method: 'POST', body: JSON.stringify({ options: { readWrite: {} } }) });
      const id = String(started.transaction);
      const transaction = new FirestoreTransaction(this, id);
      try {
        const result = await work(transaction);
        await this.request(':commit', { method: 'POST', body: JSON.stringify({ transaction: id, writes: transaction.writes }) });
        return result;
      } catch (error) {
        try { await this.request(':rollback', { method: 'POST', body: JSON.stringify({ transaction: id }) }); } catch { /* already aborted/committed */ }
        if (attempt >= 4 || !/Firestore (409|503):/.test(String(error))) throw error;
        await new Promise((resolve) => setTimeout(resolve, 25 * 2 ** attempt + Math.random() * 50));
      }
    }
  }
}

export class FirestoreTransaction {
  readonly writes: JsonMap[] = [];
  constructor(private store: FirestoreRestClient, private id: string) {}

  async get(collection: string, id: string): Promise<JsonMap | null> {
    try { return await this.store.get(collection, id, this.id); } catch (error) {
      if (String(error).includes('Firestore 404:')) return null;
      throw error;
    }
  }

  set(collection: string, id: string, data: JsonMap): void {
    const { $id: _id, ...fields } = data;
    this.writes.push({ update: {
      name: `projects/${firebaseProjectId()}/databases/(default)/documents/${collection}/${id}`,
      fields: Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, encodeValue(value)])),
    } });
  }

  delete(collection: string, id: string): void {
    this.writes.push({ delete: `projects/${firebaseProjectId()}/databases/(default)/documents/${collection}/${id}` });
  }
}

export function matchesRef(value: unknown, id: string): boolean {
  if (value === id) return true;
  if (!value || typeof value !== 'object') return false;
  const ref = value as JsonMap;
  return ref.$id === id || ref.id === id || ref.legacyAppwriteId === id;
}
