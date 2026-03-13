import { useLocation, useNavigate } from 'react-router-dom';
import { Menu } from 'antd';
import {
  DashboardOutlined,
  CalendarOutlined,
  BankOutlined,
  ShoppingOutlined,
  FileTextOutlined,
  UserOutlined,
  BarChartOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';

export default function SiderMenu() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isJefe } = useAuth();

  const items = [
    { key: '/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
    { key: '/calendario', icon: <CalendarOutlined />, label: 'Calendario' },
    { key: '/empresas', icon: <BankOutlined />, label: 'Empresas' },
    { key: '/productos', icon: <ShoppingOutlined />, label: 'Productos' },
    { key: '/ofertas', icon: <FileTextOutlined />, label: 'Ofertas' },
    ...(isJefe ? [
      { key: '/informes', icon: <BarChartOutlined />, label: 'Informes' },
      { key: '/historial', icon: <HistoryOutlined />, label: 'Historial' },
      { key: '/usuarios', icon: <UserOutlined />, label: 'Usuarios' },
    ] : []),
  ];

  // Determinar key activa (ej: /empresas/3 -> /empresas)
  const selectedKey = '/' + location.pathname.split('/')[1];

  return (
    <Menu
      theme="dark"
      mode="inline"
      selectedKeys={[selectedKey]}
      items={items}
      onClick={({ key }) => navigate(key)}
    />
  );
}
