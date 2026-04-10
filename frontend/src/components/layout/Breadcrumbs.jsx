import { Breadcrumb } from 'antd';
import { useLocation, useNavigate, useParams, matchPath } from 'react-router-dom';
import { HomeOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import * as empresasApi from '../../api/empresas';
import * as ofertasApi from '../../api/ofertas';

// Definición de rutas con label y (opcionalmente) una función que obtiene el nombre dinámico
const ROUTE_CONFIG = [
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/calendario', label: 'Calendario' },
  { path: '/empresas', label: 'Empresas' },
  { path: '/empresas/:id', label: 'Empresas', parent: '/empresas', dynamic: 'empresa' },
  { path: '/productos', label: 'Productos' },
  { path: '/ofertas', label: 'Ofertas' },
  { path: '/ofertas/:id', label: 'Ofertas', parent: '/ofertas', dynamic: 'oferta' },
  { path: '/usuarios', label: 'Usuarios' },
  { path: '/informes', label: 'Informes' },
  { path: '/historial', label: 'Historial' },
];

export default function Breadcrumbs() {
  const location = useLocation();
  const navigate = useNavigate();
  const [dynamicLabel, setDynamicLabel] = useState(null);

  // Encontrar la ruta que matchea
  const matched = ROUTE_CONFIG.find((r) => matchPath(r.path, location.pathname));

  // Si es una ruta de detalle, traer el nombre del recurso
  useEffect(() => {
    setDynamicLabel(null);
    if (!matched?.dynamic) return;
    const match = matchPath(matched.path, location.pathname);
    const id = match?.params?.id;
    if (!id) return;

    let cancelled = false;
    const fetchDynamic = async () => {
      try {
        if (matched.dynamic === 'empresa') {
          const emp = await empresasApi.getById(id);
          if (!cancelled) setDynamicLabel(emp?.nombre || `#${id}`);
        } else if (matched.dynamic === 'oferta') {
          const oferta = await ofertasApi.getById(id);
          if (!cancelled) setDynamicLabel(oferta?.numero ? `#${oferta.numero}` : `#${id}`);
        }
      } catch {
        if (!cancelled) setDynamicLabel(`#${id}`);
      }
    };
    fetchDynamic();
    return () => { cancelled = true; };
  }, [location.pathname, matched]);

  // No mostrar breadcrumbs en login ni dashboard (raíz)
  if (!matched || location.pathname === '/dashboard') return null;

  const items = [
    {
      title: <HomeOutlined />,
      onClick: () => navigate('/dashboard'),
      className: 'crumb-clickable',
    },
  ];

  // Si hay un parent, agregarlo
  if (matched.parent) {
    const parent = ROUTE_CONFIG.find((r) => r.path === matched.parent);
    if (parent) {
      items.push({
        title: parent.label,
        onClick: () => navigate(parent.path),
        className: 'crumb-clickable',
      });
    }
    // Item actual (detalle): el nombre dinámico
    items.push({ title: dynamicLabel || '...' });
  } else {
    items.push({ title: matched.label });
  }

  return (
    <Breadcrumb
      items={items}
      style={{ margin: '0 16px 12px' }}
    />
  );
}
