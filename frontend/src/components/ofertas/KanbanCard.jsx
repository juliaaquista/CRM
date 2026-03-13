import { useDraggable } from '@dnd-kit/core';
import { Tag } from 'antd';
import {
  ShopOutlined, DollarOutlined, ClockCircleOutlined, ShoppingOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

export default function KanbanCard({ item, isDragging, onClick }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: item.id,
  });

  const style = {
    background: '#fff',
    borderRadius: 6,
    padding: 12,
    border: '1px solid #e8e8e8',
    cursor: isDragging ? 'grabbing' : 'grab',
    boxShadow: isDragging
      ? '0 4px 12px rgba(0,0,0,0.15)'
      : '0 1px 2px rgba(0,0,0,0.06)',
    opacity: isDragging ? 0.8 : 1,
    transform: transform
      ? `translate(${transform.x}px, ${transform.y}px)`
      : undefined,
    transition: isDragging ? undefined : 'box-shadow 0.2s',
  };

  const daysInState = item.creado_en
    ? dayjs().diff(dayjs(item.creado_en), 'day')
    : null;

  const truncatedNotas = item.notas?.length > 60
    ? item.notas.substring(0, 60) + '...'
    : item.notas;

  // Build productos label
  const productosLabel = item.productos && item.productos.length > 0
    ? item.productos.map((p) => p.producto_nombre || p.nombre || `#${p.producto_id}`).join(', ')
    : null;

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <div
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
        style={{ cursor: 'pointer' }}
      >
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6, color: '#13468A' }}>
          <ShopOutlined style={{ marginRight: 4 }} />
          {item.empresa_nombre}
        </div>

        {productosLabel && (
          <div style={{ fontSize: 12, color: '#444', marginBottom: 4 }}>
            <ShoppingOutlined style={{ marginRight: 4, color: '#888' }} />
            {productosLabel.length > 50 ? productosLabel.substring(0, 50) + '...' : productosLabel}
          </div>
        )}

        {truncatedNotas && (
          <div style={{ fontSize: 11, color: '#888', marginBottom: 8 }}>
            {truncatedNotas}
          </div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, fontSize: 11 }}>
          {item.precio_negociado != null && (
            <Tag style={{ fontSize: 11, margin: 0 }} color="green">
              <DollarOutlined /> {item.precio_negociado.toLocaleString('es-ES')} EUR
            </Tag>
          )}

          {daysInState !== null && (
            <Tag
              style={{ fontSize: 11, margin: 0 }}
              color={daysInState > 30 ? 'red' : daysInState > 14 ? 'orange' : 'default'}
            >
              <ClockCircleOutlined /> {daysInState}d
            </Tag>
          )}
        </div>
      </div>
    </div>
  );
}
