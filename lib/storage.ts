/** localStorage under the `drs:` prefix, tolerant of private mode and blocked storage. */
export const store = {
  get<T>(key: string, fallback: T): T {
    try {
      const v = localStorage.getItem('drs:' + key);
      return v ? (JSON.parse(v) as T) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key: string, value: unknown) {
    try {
      localStorage.setItem('drs:' + key, JSON.stringify(value));
    } catch {
      /* storage unavailable */
    }
  },
};
