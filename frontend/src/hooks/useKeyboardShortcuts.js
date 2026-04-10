import { useEffect } from 'react';

/**
 * Hook global de atajos de teclado para el CRM.
 *
 * Atajos disponibles:
 * - Ctrl/Cmd + K → dispatch 'crm:shortcut' detail={key: 'search'} (foco en buscador global)
 * - Ctrl/Cmd + N → dispatch 'crm:shortcut' detail={key: 'new'} (nueva entidad en la página actual)
 * - Esc         → dispatch 'crm:shortcut' detail={key: 'escape'}
 *
 * Las páginas pueden escuchar el evento 'crm:shortcut' para reaccionar.
 *
 * Se ignora cuando el foco está en un input/textarea/contentEditable PARA LAS TECLAS DE ACCIÓN
 * (Ctrl+N, Esc), pero Ctrl+K SÍ funciona siempre (para no perder el atajo cuando ya estás escribiendo).
 */
export default function useKeyboardShortcuts() {
  useEffect(() => {
    const dispatch = (key, originalEvent) => {
      window.dispatchEvent(new CustomEvent('crm:shortcut', { detail: { key, originalEvent } }));
    };

    const isEditableTarget = (target) => {
      if (!target) return false;
      const tag = target.tagName?.toLowerCase();
      return (
        tag === 'input' ||
        tag === 'textarea' ||
        tag === 'select' ||
        target.isContentEditable
      );
    };

    const handler = (e) => {
      const mod = e.ctrlKey || e.metaKey;

      // Ctrl/Cmd + K → buscador global (SIEMPRE funciona)
      if (mod && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        dispatch('search', e);
        return;
      }

      // Ctrl/Cmd + N → nueva entidad (solo si no estás en un input)
      if (mod && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'n') {
        if (isEditableTarget(e.target)) return;
        e.preventDefault();
        dispatch('new', e);
        return;
      }

      // Esc → cerrar modal/dropdown activo
      if (e.key === 'Escape') {
        dispatch('escape', e);
        return;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}
