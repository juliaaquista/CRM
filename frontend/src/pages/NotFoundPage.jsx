import { Button, Typography, Space } from 'antd';
import { HomeOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #13468A 0%, #0a2a54 100%)',
      padding: 24,
      textAlign: 'center',
    }}>
      <img
        src="/logo.png"
        alt="Abisysa"
        style={{
          height: 80,
          marginBottom: 24,
          objectFit: 'contain',
          filter: 'brightness(0) invert(1)',
        }}
      />
      <Title level={1} style={{ color: '#fff', fontSize: 96, margin: 0, fontWeight: 700, lineHeight: 1 }}>
        404
      </Title>
      <Title level={3} style={{ color: '#fff', marginTop: 8, fontWeight: 500 }}>
        Página no encontrada
      </Title>
      <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 16, maxWidth: 480, display: 'block', marginBottom: 32 }}>
        La página que buscas no existe o fue movida. Verifica la dirección o volvé al inicio.
      </Text>
      <Space size="middle">
        <Button
          icon={<ArrowLeftOutlined />}
          size="large"
          onClick={() => navigate(-1)}
        >
          Volver
        </Button>
        <Button
          type="primary"
          icon={<HomeOutlined />}
          size="large"
          onClick={() => navigate('/dashboard')}
        >
          Ir al inicio
        </Button>
      </Space>
    </div>
  );
}
