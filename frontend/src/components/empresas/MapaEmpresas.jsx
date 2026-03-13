import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button, Tag, Empty } from 'antd';
import { EyeOutlined } from '@ant-design/icons';

// Fix default marker icons (leaflet webpack issue)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Icono naranja para sucursales
const sucursalIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const ORIGEN_COLOR = {
  WEB: 'blue', FERIAS: 'green', RRSS: 'purple',
  ABISYSA: '#13468A', REFERIDO: 'cyan', OTRO: 'default',
};

// Auto-fit bounds to markers
function FitBounds({ coords }) {
  const map = useMap();
  const fitted = useRef(false);

  useEffect(() => {
    if (coords.length > 0 && !fitted.current) {
      const bounds = L.latLngBounds(coords);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
      fitted.current = true;
    }
  }, [coords, map]);

  return null;
}

export default function MapaEmpresas({ empresas, sucursales = [], onVerDetalle }) {
  const empresasConCoords = empresas.filter((e) => e.latitud && e.longitud);
  const sucursalesConCoords = sucursales.filter((s) => s.latitud && s.longitud);

  // Crear mapa empresa_id -> nombre para las sucursales
  const empresaNombres = {};
  empresas.forEach((e) => { empresaNombres[e.id] = e.nombre; });

  const allCoords = [
    ...empresasConCoords.map((e) => [e.latitud, e.longitud]),
    ...sucursalesConCoords.map((s) => [s.latitud, s.longitud]),
  ];

  if (allCoords.length === 0) {
    return (
      <Empty
        description="No hay empresas ni sucursales con ubicacion disponible."
        style={{ padding: 60 }}
      />
    );
  }

  return (
    <MapContainer
      center={[40.4168, -3.7038]}
      zoom={6}
      style={{ height: 550, width: '100%', borderRadius: 8, border: '1px solid #f0f0f0' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds coords={allCoords} />

      {/* Marcadores de empresas (azul) */}
      {empresasConCoords.map((emp) => (
        <Marker key={`emp-${emp.id}`} position={[emp.latitud, emp.longitud]}>
          <Popup>
            <div style={{ minWidth: 180 }}>
              <strong style={{ fontSize: 14 }}>{emp.nombre}</strong>
              <br />
              {emp.ciudad && <span>{emp.ciudad}</span>}
              {emp.ciudad && emp.provincia && <span>, </span>}
              {emp.provincia && <span>{emp.provincia}</span>}
              <br />
              <Tag color={ORIGEN_COLOR[emp.origen]} style={{ marginTop: 4 }}>{emp.origen}</Tag>
              {emp.razon_social && (
                <div style={{ marginTop: 4, fontSize: 11, color: '#666' }}>
                  {emp.razon_social}
                </div>
              )}
              <div style={{ marginTop: 8 }}>
                <Button
                  size="small"
                  type="primary"
                  icon={<EyeOutlined />}
                  onClick={() => onVerDetalle(emp.id)}
                >
                  Ver detalle
                </Button>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Marcadores de sucursales (naranja) */}
      {sucursalesConCoords.map((suc) => (
        <Marker key={`suc-${suc.id}`} position={[suc.latitud, suc.longitud]} icon={sucursalIcon}>
          <Popup>
            <div style={{ minWidth: 180 }}>
              <Tag color="orange" style={{ marginBottom: 4 }}>SUCURSAL</Tag>
              <br />
              <strong style={{ fontSize: 14 }}>{suc.nombre}</strong>
              <br />
              <span style={{ fontSize: 12, color: '#666' }}>
                {empresaNombres[suc.empresa_id] || `Empresa #${suc.empresa_id}`}
              </span>
              <br />
              {suc.direccion && <span style={{ fontSize: 12 }}>{suc.direccion}</span>}
              {suc.direccion && <br />}
              {suc.ciudad && <span>{suc.ciudad}</span>}
              {suc.ciudad && suc.provincia && <span>, </span>}
              {suc.provincia && <span>{suc.provincia}</span>}
              <div style={{ marginTop: 8 }}>
                <Button
                  size="small"
                  type="primary"
                  icon={<EyeOutlined />}
                  onClick={() => onVerDetalle(suc.empresa_id)}
                >
                  Ver empresa
                </Button>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
