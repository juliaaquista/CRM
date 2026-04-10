import { Skeleton } from 'antd';

/**
 * Esqueleto para tablas. Muestra N filas grises en posición similar a las reales.
 * Se usa durante la primera carga (cuando aún no hay datos) para que la UI no quede en blanco.
 *
 * Props:
 *  - rows: cantidad de filas a mostrar (default 8)
 *  - columns: cantidad de columnas simuladas (default 6)
 */
export default function TableSkeleton({ rows = 8, columns = 6 }) {
  const colWidths = Array.from({ length: columns }, (_, i) => {
    // Anchos variados para que parezca una tabla real
    const widths = ['14%', '18%', '22%', '12%', '10%', '16%', '8%'];
    return widths[i % widths.length];
  });

  return (
    <div style={{
      border: '1px solid #f0f0f0',
      borderRadius: 8,
      overflow: 'hidden',
      background: '#fff',
    }}>
      {/* Header del skeleton */}
      <div style={{
        display: 'flex',
        gap: 16,
        padding: '14px 16px',
        borderBottom: '1px solid #f0f0f0',
        background: '#fafafa',
      }}>
        {colWidths.map((w, i) => (
          <Skeleton.Input
            key={i}
            active
            size="small"
            style={{ width: w, minWidth: 60, height: 14 }}
          />
        ))}
      </div>
      {/* Filas del skeleton */}
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          style={{
            display: 'flex',
            gap: 16,
            padding: '12px 16px',
            borderBottom: r < rows - 1 ? '1px solid #f5f5f5' : 'none',
          }}
        >
          {colWidths.map((w, i) => (
            <Skeleton.Input
              key={i}
              active
              size="small"
              style={{ width: w, minWidth: 60, height: 14, opacity: 0.8 }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
