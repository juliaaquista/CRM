import { useState } from 'react';
import {
  DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import { App as AntApp } from 'antd';
import * as ofertasApi from '../../api/ofertas';
import KanbanColumn from './KanbanColumn';
import KanbanCard from './KanbanCard';

const COLUMNS = [
  { id: 'PREOFERTA', title: 'Preoferta', color: '#1677ff' },
  { id: 'OFICINA_TECNICA', title: 'Oficina Técnica', color: '#722ed1' },
  { id: 'ENTREGADA', title: 'Entregada', color: '#faad14' },
  { id: 'VISITAR', title: 'Visitar', color: '#52c41a' },
  { id: 'STANDBY', title: 'Standby', color: '#fa8c16' },
  { id: 'PERDIDA', title: 'Perdida', color: '#ff4d4f' },
];

export default function KanbanBoard({ items, loading, onRefresh, onCardClick }) {
  const [activeItem, setActiveItem] = useState(null);
  const { message } = AntApp.useApp();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const getColumnItems = (estado) => items.filter((item) => item.estado === estado);

  const handleDragStart = (event) => {
    const item = items.find((i) => i.id === event.active.id);
    setActiveItem(item);
  };

  const handleDragEnd = async (event) => {
    setActiveItem(null);
    const { active, over } = event;
    if (!over) return;

    const targetEstado = over.id;
    const item = items.find((i) => i.id === active.id);
    if (!item || item.estado === targetEstado) return;

    try {
      await ofertasApi.update(item.id, { estado: targetEstado });
      message.success(`Oferta movida a ${targetEstado}`);
      onRefresh();
    } catch (err) {
      message.error(err.response?.data?.detail || 'Error al actualizar estado');
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div
        style={{
          display: 'flex',
          gap: 12,
          overflowX: 'auto',
          paddingBottom: 16,
          minHeight: 400,
        }}
      >
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.id}
            id={col.id}
            title={col.title}
            color={col.color}
            items={getColumnItems(col.id)}
            loading={loading}
            onCardClick={(id) => onCardClick(id)}
          />
        ))}
      </div>

      <DragOverlay>
        {activeItem ? <KanbanCard item={activeItem} isDragging /> : null}
      </DragOverlay>
    </DndContext>
  );
}
