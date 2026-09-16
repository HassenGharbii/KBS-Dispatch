import { createMMKV } from 'react-native-mmkv';

// Fast key-value cache for small scalars only (cached role, last pull time,
// "has seen consent screen"). Durable relational/domain data lives in
// SQLite (src/db), never here.
export const appCache = createMMKV({ id: 'kbs-app-cache' });

export const CacheKeys = {
  cachedRole: 'cachedRole',
  lastReferenceDataPullAt: 'lastReferenceDataPullAt',
} as const;
