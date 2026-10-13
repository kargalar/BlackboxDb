const DEFAULT_BATCH_SIZE = 100;

/** Cache and batch reads for one GraphQL request only. Never share across users. */
export class RequestBatchLoader<K, V> {
  private readonly cache = new Map<K, Promise<V>>();
  private pending: Array<{
    key: K;
    resolve: (value: V) => void;
    reject: (error: unknown) => void;
  }> = [];
  private scheduled = false;

  constructor(
    private readonly fetchBatch: (
      keys: readonly K[],
    ) => Promise<ReadonlyMap<K, V>>,
    private readonly missingValue: (key: K) => V,
    private readonly maxBatchSize = DEFAULT_BATCH_SIZE,
  ) {
    if (!Number.isInteger(maxBatchSize) || maxBatchSize < 1)
      throw new Error("Invalid batch size");
  }

  load(key: K): Promise<V> {
    const cached = this.cache.get(key);
    if (cached) return cached;
    const promise = new Promise<V>((resolve, reject) =>
      this.pending.push({ key, resolve, reject }),
    );
    this.cache.set(key, promise);
    if (!this.scheduled) {
      this.scheduled = true;
      queueMicrotask(() => void this.flush());
    }
    return promise;
  }

  private async flush(): Promise<void> {
    const pending = this.pending;
    this.pending = [];
    this.scheduled = false;
    for (let offset = 0; offset < pending.length; offset += this.maxBatchSize) {
      const batch = pending.slice(offset, offset + this.maxBatchSize);
      try {
        const values = await this.fetchBatch(batch.map(({ key }) => key));
        for (const entry of batch)
          entry.resolve(
            values.has(entry.key)
              ? values.get(entry.key)!
              : this.missingValue(entry.key),
          );
      } catch (error) {
        for (const entry of batch) {
          this.cache.delete(entry.key);
          entry.reject(error);
        }
      }
    }
  }
}
