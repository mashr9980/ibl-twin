// The smallest browser the storage-reading helpers need, installed at import time.
class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  get length() {
    return this.map.size;
  }
  clear() {
    this.map.clear();
  }
  getItem(key: string) {
    return this.map.has(key) ? (this.map.get(key) as string) : null;
  }
  key(index: number) {
    return [...this.map.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.map.delete(key);
  }
  setItem(key: string, value: string) {
    this.map.set(key, String(value));
  }
}

const g = globalThis as any;
g.localStorage = new MemoryStorage();
g.sessionStorage = new MemoryStorage();
g.window = g;
g.window.location = {
  origin: "http://localhost:3000",
  pathname: "/",
  search: "",
  href: "http://localhost:3000/",
  hostname: "localhost",
};
// Node already exposes a (getter-only) navigator; only fill what is missing.
if (typeof g.document === "undefined") g.document = { cookie: "" };

export {};
