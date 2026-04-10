// Tracker de empresas/ofertas visitadas recientemente (localStorage)
// Se guarda una lista FIFO limitada para cada tipo.

const MAX_ITEMS = 8;

function read(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(key, arr) {
  try {
    localStorage.setItem(key, JSON.stringify(arr.slice(0, MAX_ITEMS)));
  } catch {
    /* silent */
  }
}

/**
 * Registra un item como visitado. Si ya existe, lo mueve al principio (más reciente).
 * @param {'empresa'|'oferta'} tipo
 * @param {{id: number, label: string, sublabel?: string}} item
 */
export function trackVisited(tipo, item) {
  if (!item?.id) return;
  const key = `crm:recent:${tipo}`;
  const existing = read(key).filter((x) => x.id !== item.id);
  const next = [{ ...item, visitedAt: Date.now() }, ...existing];
  write(key, next);
}

/** Obtiene las últimas visitadas. */
export function getRecentVisited(tipo) {
  return read(`crm:recent:${tipo}`);
}
