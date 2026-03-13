import { useDroppable } from '@dnd-kit/core';
import { Badge, Spin } from 'antd';
import KanbanCard from './KanbanCard';

export default function KanbanColumn({ id, title, color, items, loading, onCardClick }) {
  const { setNodeRef, isOver } = useDroppable({ id });

  const totalValor = items.reduce((sum, item) => sum + (item.precio_negociado || 0), 0);

  return (
    <div
      ref={setNodeRef}
      style={{
        flex: '1 1 0',
        minWidth: 240,
        maxWidth: 360,
        background: isOver ? '#f0f5ff' : '#fafafa',
        borderRadius: 8,
        padding: 12,
        border: isOver ? '2px dashed #13468A' : '2px solid transparent',
        transition: 'all 0.2s',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 4,
          paddingBottom: 8,
          borderBottom: `3px solid ${color}`,
        }}
      >
        <span style={{ fontWeight: 600, fontSize: 14 }}>{title}</span>
        <Badge count={items.length} style={{ backgroundColor: color }} />
      </div>
      {totalValor > 0 && (
        <div style={{ fontSize: 12, color: '#888', marginBottom: 8, textAlign: 'right' }}>
          {totalValor.toLocaleString('es-ES')} EUR
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <Spin />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map((item) => (
            <KanbanCard
              key={item.id}
              item={item}
              onClick={() => onCardClick(item.id)}
            />
          ))}
          {items.length === 0 && (
            <div
              style={{
                textAlign: 'center',
                color: '#bbb',
                padding: 24,
                fontSize: 13,
              }}
            >
              Sin ofertas
            </div>
          )}
        </div>
      )}
    </div>
  );
}
