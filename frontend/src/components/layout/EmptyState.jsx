import { Empty, Button } from 'antd';
import { PlusOutlined, InboxOutlined } from '@ant-design/icons';

/**
 * EmptyState reusable con acción sugerida.
 *
 * Props:
 * - icon: ReactNode (default: InboxOutlined grande)
 * - title: string
 * - description: string
 * - actionLabel: string (opcional — si se pasa, aparece botón)
 * - onAction: fn (opcional)
 * - size: 'small' | 'default' | 'large' (default 'default')
 */
export default function EmptyState({
  icon,
  title = 'No hay nada por aquí',
  description,
  actionLabel,
  onAction,
  size = 'default',
}) {
  const iconSize = size === 'small' ? 40 : size === 'large' ? 72 : 56;
  const padding = size === 'small' ? '24px 16px' : size === 'large' ? '64px 16px' : '48px 16px';

  return (
    <div style={{ padding, textAlign: 'center' }}>
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: iconSize + 16,
        height: iconSize + 16,
        borderRadius: '50%',
        background: '#f5f7fa',
        color: '#13468A',
        fontSize: iconSize * 0.6,
        marginBottom: 16,
      }}>
        {icon || <InboxOutlined />}
      </div>
      <div style={{ fontSize: 16, fontWeight: 600, color: 'rgba(0,0,0,0.75)', marginBottom: 4 }}>
        {title}
      </div>
      {description && (
        <div style={{ fontSize: 13, color: '#888', maxWidth: 360, margin: '0 auto 16px' }}>
          {description}
        </div>
      )}
      {actionLabel && onAction && (
        <Button type="primary" icon={<PlusOutlined />} onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
