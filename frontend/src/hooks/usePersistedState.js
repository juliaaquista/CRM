import { useState, useEffect, useRef } from 'react';

/**
 * useState que persiste automáticamente en localStorage.
 *
 * @param {string} key  - clave única en localStorage (incluí el contexto, ej: "ofertas:sort")
 * @param {*} initial   - valor inicial si no hay nada en localStorage
 * @returns [state, setState]
 *
 * Si el valor almacenado no se puede parsear, usa el initial.
 * Los errores de localStorage (quota, permissions) se silencian — el state sigue funcionando en memoria.
 */
export default function usePersistedState(key, initial) {
  const [state, setState] = useState(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw == null) return initial;
      return JSON.parse(raw);
    } catch {
      return initial;
    }
  });

  // Referencia al último key usado — permite cambiar la key en runtime si hace falta
  const keyRef = useRef(key);
  useEffect(() => { keyRef.current = key; }, [key]);

  useEffect(() => {
    try {
      window.localStorage.setItem(keyRef.current, JSON.stringify(state));
    } catch {
      // Silencioso: localStorage lleno o deshabilitado
    }
  }, [state]);

  return [state, setState];
}
