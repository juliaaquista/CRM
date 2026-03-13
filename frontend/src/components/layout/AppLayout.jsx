import { useState, useCallback, useRef } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Layout, Button, Typography, Space, Dropdown, AutoComplete, Input, theme } from 'antd';
import {
  MenuFoldOutlined, MenuUnfoldOutlined, UserOutlined, LogoutOutlined,
  SearchOutlined, ShopOutlined, ContactsOutlined, FileTextOutlined,
} from '@ant-design/icons';
import SiderMenu from './SiderMenu';
import { useAuth } from '../../context/AuthContext';
import { buscar } from '../../api/buscar';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const TIPO_ICON = {
  empresa: <ShopOutlined style={{ color: '#1677ff' }} />,
  contacto: <ContactsOutlined style={{ color: '#52c41a' }} />,
  oferta: <FileTextOutlined style={{ color: '#fa8c16' }} />,
};

const TIPO_LABEL = { empresa: 'Empresa', contacto: 'Contacto', oferta: 'Oferta' };

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const { token: themeToken } = theme.useToken();
  const navigate = useNavigate();

  // Search state
  const [searchOptions, setSearchOptions] = useState([]);
  const [searchValue, setSearchValue] = useState('');
  const debounceRef = useRef(null);

  const handleSearch = useCallback((text) => {
    setSearchValue(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!text || text.length < 2) {
      setSearchOptions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await buscar(text, 10);
        // Group by type
        const grouped = {};
        results.forEach((r) => {
          if (!grouped[r.tipo]) grouped[r.tipo] = [];
          grouped[r.tipo].push(r);
        });

        const options = Object.entries(grouped).map(([tipo, items]) => ({
          label: (
            <span style={{ fontWeight: 600, fontSize: 12, color: '#999' }}>
              {TIPO_ICON[tipo]} {TIPO_LABEL[tipo]}s
            </span>
          ),
          options: items.map((item) => ({
            value: `${item.tipo}-${item.id}`,
            label: (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{TIPO_ICON[item.tipo]} <strong>{item.texto}</strong></span>
                <span style={{ fontSize: 11, color: '#999' }}>{item.subtexto}</span>
              </div>
            ),
            data: item,
          })),
        }));

        setSearchOptions(options);
      } catch {
        setSearchOptions([]);
      }
    }, 300);
  }, []);

  const handleSelect = useCallback((_value, option) => {
    const item = option.data;
    setSearchValue('');
    setSearchOptions([]);
    if (item.tipo === 'empresa') {
      navigate(`/empresas/${item.empresa_id}`);
    } else if (item.tipo === 'contacto') {
      navigate(`/empresas/${item.empresa_id}`);
    } else if (item.tipo === 'oferta') {
      navigate(`/ofertas/${item.id}`);
    }
  }, [navigate]);

  const dropdownItems = {
    items: [
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: 'Cerrar sesion',
        danger: true,
        onClick: logout,
      },
    ],
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        breakpoint="lg"
        onBreakpoint={(broken) => setCollapsed(broken)}
      >
        <div style={{
          height: 48,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '8px 0',
        }}>
          <Text strong style={{ color: '#fff', fontSize: collapsed ? 14 : 18 }}>
            {collapsed ? 'CRM' : 'CRM Abisysa'}
          </Text>
        </div>
        <SiderMenu />
      </Sider>

      <Layout>
        <Header style={{
          padding: '0 24px',
          background: themeToken.colorBgContainer,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        }}>
          <Space>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
            />
            <AutoComplete
              value={searchValue}
              options={searchOptions}
              onSearch={handleSearch}
              onSelect={handleSelect}
              style={{ width: 320 }}
              popupMatchSelectWidth={420}
            >
              <Input
                prefix={<SearchOutlined style={{ color: '#bbb' }} />}
                placeholder="Buscar empresa, contacto, oferta..."
                allowClear
              />
            </AutoComplete>
          </Space>
          <Space>
            <Text type="secondary">{user?.nombre}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>({user?.rol})</Text>
            <Dropdown menu={dropdownItems} placement="bottomRight">
              <Button type="text" icon={<UserOutlined />} />
            </Dropdown>
          </Space>
        </Header>

        <Content style={{
          margin: 16,
          padding: 24,
          background: themeToken.colorBgContainer,
          borderRadius: themeToken.borderRadiusLG,
          minHeight: 280,
          overflow: 'auto',
        }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
