import { useState, useEffect, useCallback } from 'react';
import {
  Row, Col, Card, Statistic, Tag, Calendar, Badge, List, Progress, Spin,
  App as AntApp, Typography, Empty, Segmented,
} from 'antd';
import {
  BankOutlined, FileTextOutlined,
  CheckSquareOutlined, ClockCircleOutlined, RightOutlined, WarningOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import * as dashboardApi from '../api/dashboard';
import * as accionesApi from '../api/acciones';
import {
  ESTADO_OFERTA_COLOR,
  TIPO_ACCION_COLOR,
} from '../constants/enums';

const { Text, Title } = Typography;

const KPI_CONFIG = [
  { key: 'empresas_asignadas', label: 'Empresas', icon: <BankOutlined />, color: '#13468A' },
  { key: 'ofertas_pendientes', label: 'Ofertas pendientes', icon: <FileTextOutlined />, color: '#52c41a' },
  { key: 'acciones_pendientes', label: 'Acciones pendientes', icon: <CheckSquareOutlined />, color: '#faad14' },
  { key: 'alertas_vencidas', label: 'Alertas vencidas', icon: <WarningOutlined />, color: '#f5222d' },
];

const OFERTA_ESTADO_LABELS = {
  PREOFERTA: 'Preoferta', OFICINA_TECNICA: 'Oficina Técnica',
  ENTREGADA: 'Entregada', VISITAR: 'Visitar',
  STANDBY: 'Standby', PERDIDA: 'Perdida',
};

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [calAcciones, setCalAcciones] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(dayjs());
  const navigate = useNavigate();
  const { message } = AntApp.useApp();

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await dashboardApi.miResumen();
      setData(res);
    } catch {
      message.error('Error al cargar dashboard');
    } finally {
      setLoading(false);
    }
  }, [message]);

  const fetchCalAcciones = useCallback(async (month) => {
    try {
      const desde = month.startOf('month').subtract(7, 'day').toDate();
      const hasta = month.endOf('month').add(7, 'day').toDate();
      const items = await accionesApi.calendario(desde, hasta);
      setCalAcciones(items);
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);
  useEffect(() => { fetchCalAcciones(currentMonth); }, [currentMonth, fetchCalAcciones]);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>;
  }

  if (!data) {
    return <Empty description="No se pudo cargar el dashboard" />;
  }

  // Calendar: group acciones by day
  const accionesPorDia = {};
  calAcciones.forEach((a) => {
    const key = dayjs(a.fecha_hora).format('YYYY-MM-DD');
    if (!accionesPorDia[key]) accionesPorDia[key] = [];
    accionesPorDia[key].push(a);
  });

  const dateCellRender = (value) => {
    const key = value.format('YYYY-MM-DD');
    const items = accionesPorDia[key] || [];
    return (
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {items.slice(0, 2).map((a) => {
          const rs = a.empresa_razon_social || a.empresa_nombre || '';
          return (
            <li key={a.id} style={{ marginBottom: 1 }}>
              <Badge
                color={TIPO_ACCION_COLOR[a.tipo] || 'default'}
                text={
                  <span style={{ fontSize: 10 }}>
                    {dayjs(a.fecha_hora).format('HH:mm')} {a.tipo}{rs ? ` - ${rs.toUpperCase()}` : ''}
                  </span>
                }
              />
            </li>
          );
        })}
        {items.length > 2 && (
          <li style={{ fontSize: 10, color: '#999' }}>+{items.length - 2}</li>
        )}
      </ul>
    );
  };

  // Pipeline totals
  const ofertaTotal = Object.values(data.ofertas_por_estado).reduce((s, v) => s + v, 0) || 1;

  return (
    <>
      <Title level={4} style={{ marginTop: 0, marginBottom: 20 }}>Dashboard</Title>

      {/* KPI Cards */}
      <Row gutter={[16, 16]}>
        {KPI_CONFIG.map((kpi) => (
          <Col xs={12} sm={12} md={6} key={kpi.key}>
            <Card hoverable size="small" styles={{ body: { padding: '16px 20px' } }}>
              <Statistic
                title={<span style={{ fontSize: 13 }}>{kpi.label}</span>}
                value={data[kpi.key]}
                prefix={<span style={{ color: kpi.color }}>{kpi.icon}</span>}
                styles={{ content: { color: kpi.color, fontSize: 28, fontWeight: 700 } }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* Row 2: Calendar + Proximas acciones */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={14}>
          <Card
            title={<span><ClockCircleOutlined /> Calendario</span>}
            size="small"
            styles={{ body: { padding: 8 } }}
          >
            <Calendar
              fullscreen={false}
              cellRender={(current, info) => info.type === 'date' ? dateCellRender(current) : null}
              onPanelChange={(val) => setCurrentMonth(val)}
              onSelect={(date) => navigate('/calendario')}
              headerRender={({ value, onChange }) => {
                const year = value.year();
                const month = value.month();
                const years = [];
                for (let y = year - 2; y <= year + 2; y++) years.push(y);
                const months = [];
                for (let m = 0; m < 12; m++) months.push(dayjs().month(m).format('MMM'));
                return (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, padding: '8px 0' }}>
                    <select
                      value={year}
                      onChange={(e) => onChange(value.year(parseInt(e.target.value)))}
                      style={{ padding: '2px 8px', borderRadius: 4, border: '1px solid #d9d9d9' }}
                    >
                      {years.map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <select
                      value={month}
                      onChange={(e) => onChange(value.month(parseInt(e.target.value)))}
                      style={{ padding: '2px 8px', borderRadius: 4, border: '1px solid #d9d9d9' }}
                    >
                      {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
                    </select>
                    <Segmented
                      value="month"
                      onChange={(v) => { if (v === 'week') navigate('/calendario?vista=semana'); }}
                      options={[
                        { label: 'Mes', value: 'month' },
                        { label: 'Semana', value: 'week' },
                      ]}
                      size="small"
                    />
                  </div>
                );
              }}
            />
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card
            title={<span><CheckSquareOutlined /> Proximas acciones</span>}
            size="small"
            extra={<a onClick={() => navigate('/calendario')}>Ver todo <RightOutlined /></a>}
            styles={{ body: { padding: '8px 16px' } }}
          >
            {data.proximas_acciones.length === 0 ? (
              <Empty description="Sin acciones proximas" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <List
                size="small"
                dataSource={data.proximas_acciones}
                renderItem={(accion) => (
                  <List.Item style={{ padding: '8px 0' }}>
                    <List.Item.Meta
                      avatar={
                        <Tag color={TIPO_ACCION_COLOR[accion.tipo]} style={{ margin: 0 }}>
                          {accion.tipo}
                        </Tag>
                      }
                      title={
                        <span style={{ fontSize: 13 }}>
                          {dayjs(accion.fecha_hora).format('DD/MM HH:mm')}
                          {accion.empresa_id && (
                            <Text
                              type="secondary"
                              style={{ fontSize: 12, marginLeft: 8, cursor: 'pointer', textTransform: 'uppercase' }}
                              onClick={() => navigate(`/empresas/${accion.empresa_id}`)}
                            >
                              {accion.empresa_razon_social || accion.empresa_nombre || `Empresa #${accion.empresa_id}`}
                            </Text>
                          )}
                        </span>
                      }
                      description={
                        accion.descripcion
                          ? <Text type="secondary" style={{ fontSize: 12 }}>{accion.descripcion.slice(0, 60)}</Text>
                          : null
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* Row 3: Pipeline ofertas */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24}>
          <Card title="Pipeline Ofertas" size="small">
            {Object.entries(data.ofertas_por_estado).map(([estado, count]) => (
              <div key={estado} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <Tag color={ESTADO_OFERTA_COLOR[estado]}>
                    {OFERTA_ESTADO_LABELS[estado] || estado}
                  </Tag>
                  <Text strong>{count}</Text>
                </div>
                <Progress
                  percent={Math.round((count / ofertaTotal) * 100)}
                  strokeColor={
                    estado === 'PREOFERTA' ? '#1677ff'
                    : estado === 'OFICINA_TECNICA' ? '#722ed1'
                    : estado === 'ENTREGADA' ? '#faad14'
                    : estado === 'VISITAR' ? '#52c41a'
                    : estado === 'STANDBY' ? '#fa8c16'
                    : '#f5222d'
                  }
                  showInfo={false}
                  size="small"
                />
              </div>
            ))}
          </Card>
        </Col>
      </Row>
    </>
  );
}
