import { useState } from 'react';
import { Card, Form, Input, Button, Typography, Alert, App as AntApp } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const { Title } = Typography;

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { message } = AntApp.useApp();

  const parseError = (err) => {
    // Error de red / servidor caído
    if (!err.response) {
      return 'No se pudo conectar con el servidor. Verifica tu conexión o contacta al administrador.';
    }
    const status = err.response.status;
    const detail = err.response.data?.detail;

    if (detail) return detail;

    if (status === 401) return 'Email o contraseña incorrectos';
    if (status === 403) return 'No tienes permiso para acceder';
    if (status >= 500) return 'Error del servidor. Intenta de nuevo en unos minutos.';
    return 'Error al iniciar sesión';
  };

  const onFinish = async (values) => {
    setErrorMsg(null);
    setLoading(true);
    try {
      await login(values.email, values.password);
      message.success('Bienvenido');
      navigate('/calendario', { replace: true });
    } catch (err) {
      setErrorMsg(parseError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #13468A 0%, #0a2a54 100%)',
    }}>
      <Card style={{ width: 380, boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <img
            src="/logo.png"
            alt="Abisysa"
            style={{ height: 72, marginBottom: 12, objectFit: 'contain' }}
          />
          <Title level={4} style={{ marginBottom: 4, marginTop: 0 }}>CRM</Title>
          <Typography.Text type="secondary">Inicia sesion para continuar</Typography.Text>
        </div>

        {errorMsg && (
          <Alert
            type="error"
            title={errorMsg}
            showIcon
            closable
            onClose={() => setErrorMsg(null)}
            style={{ marginBottom: 16 }}
          />
        )}

        <Form
          name="login"
          onFinish={onFinish}
          onValuesChange={() => { if (errorMsg) setErrorMsg(null); }}
          layout="vertical"
          size="large"
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, message: 'Ingresa tu email' },
              { type: 'email', message: 'Email no valido' },
            ]}
          >
            <Input prefix={<UserOutlined />} placeholder="Email" autoComplete="email" />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Ingresa tu contraseña' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Contraseña" autoComplete="current-password" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" loading={loading} block>
              Iniciar sesion
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
