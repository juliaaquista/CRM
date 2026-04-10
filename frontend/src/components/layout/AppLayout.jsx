import { useState, useCallback, useRef, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Button, Typography, Space, Dropdown, AutoComplete, Input, Avatar, Tooltip, Drawer, Grid, theme } from 'antd';
import {
  MenuFoldOutlined, MenuUnfoldOutlined, MenuOutlined, LogoutOutlined,
  SearchOutlined, ShopOutlined, ContactsOutlined, FileTextOutlined,
} from '@ant-design/icons';
import SiderMenu from './SiderMenu';
import Breadcrumbs from './Breadcrumbs';
import { useAuth } from '../../context/AuthContext';
import { buscar } from '../../api/buscar';
import useKeyboardShortcuts from '../../hooks/useKeyboardShortcuts';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;
const { useBreakpoint } = Grid;

const TIPO_ICON = {
  empresa: <ShopOutlined style={{ color: '#1677ff' }} />,
  contacto: <ContactsOutlined style={{ color: '#52c41a' }} />,
  oferta: <FileTextOutlined style={{ color: '#fa8c16' }} />,
};

const TIPO_LABEL = { empresa: 'Empresa', contacto: 'Contacto', oferta: 'Oferta' };

// Iniciales a partir del nombre completo: "Juan Perez" -> "JP", "Laura" -> "LA"
function getInitials(nombre) {
  if (!nombre) return '?';
  const parts = nombre.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Color determinista a partir del nombre (hash simple)
function getAvatarColor(nombre) {
  if (!nombre) return '#13468A';
  const colors = ['#13468A', '#1890ff', '#52c41a', '#722ed1', '#eb2f96', '#fa8c16', '#13c2c2'];
  let hash = 0;
  for (let i = 0; i < nombre.length; i++) hash = nombre.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

// Detectar si el usuario usa Mac para mostrar el atajo correcto
const IS_MAC = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform);
const MOD_KEY = IS_MAC ? '⌘' : 'Ctrl';

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const { user, logout } = useAuth();
  const { token: themeToken } = theme.useToken();
  const navigate = useNavigate();
  const location = useLocation();
  const screens = useBreakpoint();
  const isMobile = !screens.lg; // < 992px → modo móvil con drawer

  // Hook global de atajos
  useKeyboardShortcuts();

  // Search state
  const [searchOptions, setSearchOptions] = useState([]);
  const [searchValue, setSearchValue] = useState('');
  const debounceRef = useRef(null);
  const searchInputRef = useRef(null);

  // Escuchar el atajo Ctrl+K → foco en el buscador
  useEffect(() => {
    const onShortcut = (e) => {
      if (e.detail.key === 'search') {
        searchInputRef.current?.focus();
        searchInputRef.current?.select?.();
      }
    };
    window.addEventListener('crm:shortcut', onShortcut);
    return () => window.removeEventListener('crm:shortcut', onShortcut);
  }, []);

  // Cerrar drawer al navegar (en mobile)
  useEffect(() => {
    if (isMobile) setMobileDrawerOpen(false);
  }, [location.pathname, isMobile]);

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

  const userInitials = getInitials(user?.nombre);
  const userColor = getAvatarColor(user?.nombre);

  const dropdownItems = {
    items: [
      {
        key: 'profile-header',
        type: 'group',
        label: (
          <div style={{ padding: '8px 4px' }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'rgba(0,0,0,0.85)' }}>
              {user?.nombre || '—'}
            </div>
            <div style={{ fontSize: 12, color: '#888' }}>{user?.email}</div>
            <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
              Rol: <strong>{user?.rol}</strong>
            </div>
          </div>
        ),
      },
      { type: 'divider' },
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: 'Cerrar sesion',
        danger: true,
        onClick: logout,
      },
    ],
  };

  // Contenido del sidebar (header con logo + menú) — compartido entre Sider y Drawer
  const sidebarContent = (isCollapsed = collapsed) => (
    <>
      <div style={{
        height: isCollapsed ? 56 : 88,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '12px 0 8px',
        gap: 4,
      }}>
        <img
          src="/logo.png"
          alt="Abisysa"
          style={{
            height: isCollapsed ? 32 : 48,
            objectFit: 'contain',
            filter: 'brightness(0) invert(1)', // logo blanco sobre sidebar azul
          }}
        />
        {!isCollapsed && (
          <Text strong style={{ color: '#fff', fontSize: 14, letterSpacing: 1 }}>
            CRM
          </Text>
        )}
      </div>
      <SiderMenu />
    </>
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Sidebar fijo en desktop */}
      {!isMobile && (
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
        >
          {sidebarContent(collapsed)}
        </Sider>
      )}

      {/* Drawer en mobile */}
      {isMobile && (
        <Drawer
          placement="left"
          open={mobileDrawerOpen}
          onClose={() => setMobileDrawerOpen(false)}
          closable={false}
          width={240}
          styles={{
            body: { padding: 0, backgroundColor: '#0a2a54' },
            header: { display: 'none' },
          }}
        >
          {sidebarContent(false)}
        </Drawer>
      )}

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
              icon={isMobile ? <MenuOutlined /> : (collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />)}
              onClick={() => {
                if (isMobile) setMobileDrawerOpen(true);
                else setCollapsed(!collapsed);
              }}
            />
            <AutoComplete
              value={searchValue}
              options={searchOptions}
              onSearch={handleSearch}
              onSelect={handleSelect}
              style={{ width: 340 }}
              popupMatchSelectWidth={420}
            >
              <Input
                ref={searchInputRef}
                prefix={<SearchOutlined style={{ color: '#bbb' }} />}
                suffix={
                  <Tooltip title={`Atajo de teclado: ${MOD_KEY}+K`}>
                    <span className="kbd-hint">{MOD_KEY}+K</span>
                  </Tooltip>
                }
                placeholder="Buscar empresa, contacto, oferta..."
                allowClear
              />
            </AutoComplete>
          </Space>
          <Dropdown menu={dropdownItems} placement="bottomRight" trigger={['click']}>
            <Space style={{ cursor: 'pointer', padding: '4px 8px', borderRadius: 6 }} className="user-dropdown-trigger">
              <Avatar
                size={36}
                style={{ backgroundColor: userColor, fontWeight: 600, fontSize: 14 }}
              >
                {userInitials}
              </Avatar>
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
                <Text strong style={{ fontSize: 13 }}>{user?.nombre || '—'}</Text>
                <Text type="secondary" style={{ fontSize: 11 }}>{user?.rol}</Text>
              </div>
            </Space>
          </Dropdown>
        </Header>

        <Content style={{
          margin: 16,
          padding: '16px 24px 24px',
          background: themeToken.colorBgContainer,
          borderRadius: themeToken.borderRadiusLG,
          minHeight: 280,
          overflow: 'auto',
        }}>
          <Breadcrumbs />
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
