import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Tag,
  Progress,
  Typography,
  Spin,
  Select,
  DatePicker,
  Button,
  Space,
  App as AntApp,
} from 'antd';
import {
  BankOutlined,
  TeamOutlined,
  FileTextOutlined,
  CalendarOutlined,
  TrophyOutlined,
  DollarOutlined,
  RiseOutlined,
  DownloadOutlined,
  FilterOutlined,
  ClearOutlined,
  PrinterOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getResumen } from '../api/informes';
import { list as listEmpresas } from '../api/empresas';
import { list as listProductos } from '../api/productos';
import { listUsuarios } from '../api/auth';
import {
  ESTADO_OFERTA_COLOR,
  TIPO_ACCION_COLOR,
  toEntityOptions,
} from '../constants/enums';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const PRESETS = [
  { label: 'Este mes', value: () => [dayjs().startOf('month'), dayjs().endOf('month')] },
  { label: 'Mes anterior', value: () => [dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')] },
  { label: 'Este trimestre', value: () => [dayjs().startOf('quarter'), dayjs().endOf('quarter')] },
  { label: 'Este año', value: () => [dayjs().startOf('year'), dayjs().endOf('year')] },
];

const ORIGEN_LABELS = {
  WEB: 'Web', FERIAS: 'Ferias', RRSS: 'Redes Sociales',
  PROSPECCION: 'Prospección', REFERIDO: 'Referido', OTRO: 'Otro',
};
const ORIGEN_COLORS = {
  WEB: '#1677ff', FERIAS: '#52c41a', RRSS: '#722ed1',
  PROSPECCION: '#fa8c16', REFERIDO: '#13c2c2', OTRO: '#8c8c8c',
};
const TIPO_ACCION_LABELS = {
  LLAMADA: 'Llamada', VISITA: 'Visita', SEGUIMIENTO: 'Seguimiento', OTRO: 'Otro',
};
const ESTADO_OFERTA_LABELS = {
  PREOFERTA: 'Preoferta', OFICINA_TECNICA: 'Oficina Técnica',
  ENTREGADA: 'Entregada', VISITAR: 'Visitar',
  STANDBY: 'Standby', PERDIDA: 'Perdida',
};

export default function InformesPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { isJefe } = useAuth();
  const navigate = useNavigate();
  const { message } = AntApp.useApp();

  // Filter state
  const [fechas, setFechas] = useState(null);
  const [comercialId, setComercialId] = useState(null);
  const [empresaId, setEmpresaId] = useState(null);
  const [productoId, setProductoId] = useState(null);
  const [estadoOferta, setEstadoOferta] = useState(null);
  const [origenFiltro, setOrigenFiltro] = useState(null);

  // Dropdown options
  const [usuarios, setUsuarios] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [productos, setProductos] = useState([]);

  useEffect(() => {
    if (!isJefe) {
      navigate('/calendario', { replace: true });
      return;
    }
    loadDropdowns();
    fetchData({});
  }, []);

  const loadDropdowns = async () => {
    try {
      const [u, eRes, pRes] = await Promise.all([
        listUsuarios(),
        listEmpresas(0, 100),
        listProductos({ skip: 0, limit: 100, activo: true }),
      ]);
      setUsuarios(u);
      setEmpresas(eRes.items);
      setProductos(pRes.items);
    } catch {
      // silently fail, filters will just be empty
    }
  };

  const buildFilters = useCallback(() => {
    const f = {};
    if (fechas && fechas[0]) f.desde = fechas[0].startOf('day').toISOString();
    if (fechas && fechas[1]) f.hasta = fechas[1].endOf('day').toISOString();
    if (comercialId) f.comercial_id = comercialId;
    if (empresaId) f.empresa_id = empresaId;
    if (productoId) f.producto_id = productoId;
    if (estadoOferta) f.estado_oferta = estadoOferta;
    if (origenFiltro) f.origen = origenFiltro;
    return f;
  }, [fechas, comercialId, empresaId, productoId, estadoOferta, origenFiltro]);

  const fetchData = async (filters) => {
    setLoading(true);
    try {
      const res = await getResumen(filters || {});
      setData(res);
    } catch {
      message.error('Error al cargar informes');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = () => {
    fetchData(buildFilters());
  };

  const handleClearFilters = () => {
    setFechas(null);
    setComercialId(null);
    setEmpresaId(null);
    setProductoId(null);
    setEstadoOferta(null);
    setOrigenFiltro(null);
    fetchData({});
  };

  const hasActiveFilters = fechas || comercialId || empresaId || productoId || estadoOferta || origenFiltro;

  // ── Excel export ──
  const exportToExcel = () => {
    if (!data) return;
    const wb = XLSX.utils.book_new();

    // Sheet 1: Resumen KPIs
    const kpis = [
      ['Métrica', 'Valor'],
      ['Empresas', data.totales.empresas],
      ['Contactos', data.totales.contactos],
      ['Ofertas', data.totales.ofertas],
      ['Acciones', data.totales.acciones],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(kpis), 'Resumen');

    // Sheet 2: Pipeline Ofertas
    const ofRows = [['Estado', 'Cantidad', 'Valor (€)']];
    Object.entries(ESTADO_OFERTA_LABELS).forEach(([k, label]) => {
      const info = data.ofertas_por_estado[k] || { cantidad: 0, valor: 0 };
      ofRows.push([label, info.cantidad, info.valor]);
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ofRows), 'Ofertas');

    // Sheet 3: Rendimiento Comerciales
    const rendRows = [['Comercial', 'Rol', 'Empresas', 'Acciones', 'Finalizadas', 'Ofertas', 'Ganadas', 'Valor Ganado (€)']];
    data.rendimiento_comerciales.forEach((r) => {
      rendRows.push([r.nombre, r.rol, r.empresas, r.acciones, r.acciones_finalizadas, r.ofertas, r.ofertas_ganadas, r.valor_ganado]);
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rendRows), 'Rendimiento');

    // Sheet 4: Acciones por tipo
    const actRows = [['Tipo', 'Cantidad']];
    Object.entries(TIPO_ACCION_LABELS).forEach(([k, label]) => {
      actRows.push([label, data.acciones_por_tipo[k] || 0]);
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(actRows), 'Acciones');

    // Sheet 5: Origen empresas
    const origRows = [['Origen', 'Cantidad']];
    Object.entries(ORIGEN_LABELS).forEach(([k, label]) => {
      origRows.push([label, data.empresas_por_origen[k] || 0]);
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(origRows), 'Orígenes');

    const fileName = `Informe_CRM_${dayjs().format('YYYY-MM-DD')}.xlsx`;
    XLSX.writeFile(wb, fileName);
    message.success(`Exportado: ${fileName}`);
  };

  // ── Table columns ──
  const rendimientoColumns = [
    {
      title: 'Comercial', dataIndex: 'nombre', key: 'nombre',
      render: (text, record) => (
        <span>{text} <Tag color={record.rol === 'JEFE' ? 'gold' : 'blue'}>{record.rol}</Tag></span>
      ),
    },
    { title: 'Empresas', dataIndex: 'empresas', key: 'empresas', align: 'center', sorter: (a, b) => a.empresas - b.empresas },
    {
      title: 'Acciones', key: 'acciones', align: 'center',
      render: (_, r) => <span>{r.acciones_finalizadas}/{r.acciones}</span>,
      sorter: (a, b) => a.acciones - b.acciones,
    },
    {
      title: 'Ofertas', key: 'ofertas', align: 'center',
      render: (_, r) => <span><Tag color="green">{r.ofertas_ganadas}</Tag> / {r.ofertas}</span>,
      sorter: (a, b) => a.ofertas - b.ofertas,
    },
    {
      title: 'Valor Ganado', dataIndex: 'valor_ganado', key: 'valor_ganado', align: 'right',
      render: (v) => (
        <Text strong style={{ color: v > 0 ? '#52c41a' : undefined }}>
          {v.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
        </Text>
      ),
      sorter: (a, b) => a.valor_ganado - b.valor_ganado,
      defaultSortOrder: 'descend',
    },
  ];

  if (!isJefe) return null;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Informes y Estadísticas</Title>
        <Space>
          <Button icon={<PrinterOutlined />} onClick={() => window.print()} disabled={!data}>
            Imprimir / PDF
          </Button>
          <Button icon={<DownloadOutlined />} onClick={exportToExcel} disabled={!data}>
            Exportar Excel
          </Button>
        </Space>
      </div>

      {/* ── FILTER BAR ── */}
      <Card size="small" style={{ marginBottom: 24 }}>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} sm={12} lg={6}>
            <RangePicker
              value={fechas}
              onChange={setFechas}
              format="DD/MM/YYYY"
              placeholder={['Desde', 'Hasta']}
              presets={PRESETS}
              style={{ width: '100%' }}
              allowClear
            />
          </Col>
          <Col xs={12} sm={6} lg={3}>
            <Select
              value={comercialId}
              onChange={(v) => setComercialId(v === '__ALL__' ? null : v)}
              placeholder="Vendedor"
              allowClear
              style={{ width: '100%' }}
              options={[{ label: 'Todos los vendedores', value: '__ALL__' }, ...toEntityOptions(usuarios)]}
            />
          </Col>
          <Col xs={12} sm={6} lg={3}>
            <Select
              value={empresaId}
              onChange={(v) => setEmpresaId(v === '__ALL__' ? null : v)}
              placeholder="Cliente"
              allowClear
              showSearch
              optionFilterProp="label"
              style={{ width: '100%' }}
              options={[{ label: 'Todos los clientes', value: '__ALL__' }, ...toEntityOptions(empresas)]}
            />
          </Col>
          <Col xs={12} sm={6} lg={3}>
            <Select
              value={productoId}
              onChange={(v) => setProductoId(v === '__ALL__' ? null : v)}
              placeholder="Producto"
              allowClear
              showSearch
              optionFilterProp="label"
              style={{ width: '100%' }}
              options={[{ label: 'Todos los productos', value: '__ALL__' }, ...toEntityOptions(productos)]}
            />
          </Col>
          <Col xs={12} sm={6} lg={3}>
            <Select
              value={estadoOferta}
              onChange={setEstadoOferta}
              placeholder="Estado oferta"
              allowClear
              style={{ width: '100%' }}
              options={Object.entries(ESTADO_OFERTA_LABELS).map(([k, v]) => ({ label: v, value: k }))}
            />
          </Col>
          <Col xs={12} sm={6} lg={3}>
            <Select
              value={origenFiltro}
              onChange={setOrigenFiltro}
              placeholder="Origen"
              allowClear
              style={{ width: '100%' }}
              options={Object.entries(ORIGEN_LABELS).map(([k, v]) => ({ label: v, value: k }))}
            />
          </Col>
          <Col xs={24} sm={12} lg={3}>
            <Space>
              <Button type="primary" icon={<FilterOutlined />} onClick={handleApplyFilters}>
                Filtrar
              </Button>
              {hasActiveFilters && (
                <Button icon={<ClearOutlined />} onClick={handleClearFilters}>
                  Limpiar
                </Button>
              )}
            </Space>
          </Col>
        </Row>
      </Card>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 80 }}>
          <Spin size="large" />
        </div>
      ) : data ? (
        <DashboardContent data={data} rendimientoColumns={rendimientoColumns} />
      ) : null}
    </div>
  );
}

// ── Dashboard content component ──
function DashboardContent({ data, rendimientoColumns }) {
  const {
    totales,
    ofertas_por_estado,
    empresas_por_origen,
    acciones_por_tipo,
    acciones_por_estado,
    rendimiento_comerciales,
  } = data;

  const totalOfertasCount = Object.values(ofertas_por_estado).reduce((s, o) => s + o.cantidad, 0);
  const ofertasGanadas = ofertas_por_estado.ENTREGADA?.cantidad || 0;
  const ofertasPerdidas = ofertas_por_estado.PERDIDA?.cantidad || 0;
  const ofertasDecididas = ofertasGanadas + ofertasPerdidas;
  const tasaConversion = ofertasDecididas > 0 ? Math.round((ofertasGanadas / ofertasDecididas) * 100) : 0;
  const valorGanado = ofertas_por_estado.ENTREGADA?.valor || 0;

  return (
    <>
      {/* ── KPI Cards ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={8} lg={4}>
          <Card size="small"><Statistic title="Empresas" value={totales.empresas} prefix={<BankOutlined />} /></Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card size="small"><Statistic title="Contactos" value={totales.contactos} prefix={<TeamOutlined />} /></Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card size="small"><Statistic title="Ofertas" value={totales.ofertas} prefix={<FileTextOutlined />} /></Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card size="small">
            <Statistic
              title="Tasa Conversión" value={tasaConversion} suffix="%" prefix={<RiseOutlined />}
              styles={{ content: { color: tasaConversion >= 50 ? '#3f8600' : '#cf1322' } }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card size="small">
            <Statistic
              title="Valor Ganado" value={valorGanado} precision={2}
              prefix={<DollarOutlined />} suffix="€"
              styles={{ content: { color: '#3f8600' } }}
            />
          </Card>
        </Col>
      </Row>

      {/* ── Pipeline Row ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="Pipeline de Ofertas" size="small">
            {Object.entries(ESTADO_OFERTA_LABELS).map(([key, label]) => {
              const info = ofertas_por_estado[key] || { cantidad: 0, valor: 0 };
              const pct = totalOfertasCount > 0 ? Math.round((info.cantidad / totalOfertasCount) * 100) : 0;
              const colors = { PREOFERTA: '#1677ff', OFICINA_TECNICA: '#722ed1', ENTREGADA: '#faad14', VISITAR: '#52c41a', STANDBY: '#fa8c16', PERDIDA: '#ff4d4f' };
              return (
                <div key={key} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Tag color={ESTADO_OFERTA_COLOR[key]}>{label}</Tag>
                    <Text>
                      {info.cantidad}{' '}
                      {info.valor > 0 && <Text type="secondary" style={{ fontSize: 12 }}>({info.valor.toLocaleString('es-ES')}€)</Text>}
                    </Text>
                  </div>
                  <Progress percent={pct} strokeColor={colors[key]} size="small" showInfo={false} />
                </div>
              );
            })}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Origen de Empresas" size="small">
            {Object.entries(ORIGEN_LABELS).map(([key, label]) => {
              const count = empresas_por_origen[key] || 0;
              const pct = totales.empresas > 0 ? Math.round((count / totales.empresas) * 100) : 0;
              return (
                <div key={key} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text>
                      <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', backgroundColor: ORIGEN_COLORS[key], marginRight: 8 }} />
                      {label}
                    </Text>
                    <Text strong>{count}</Text>
                  </div>
                  <Progress percent={pct} strokeColor={ORIGEN_COLORS[key]} size="small" showInfo={false} />
                </div>
              );
            })}
          </Card>
        </Col>
      </Row>

      {/* ── Activity Row ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="Acciones por Tipo" size="small">
            {Object.entries(TIPO_ACCION_LABELS).map(([key, label]) => {
              const count = acciones_por_tipo[key] || 0;
              const pct = totales.acciones > 0 ? Math.round((count / totales.acciones) * 100) : 0;
              const colors = { LLAMADA: '#1677ff', VISITA: '#52c41a', SEGUIMIENTO: '#13c2c2', OTRO: '#8c8c8c' };
              return (
                <div key={key} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Tag color={TIPO_ACCION_COLOR[key]}>{label}</Tag>
                    <Text>{count}</Text>
                  </div>
                  <Progress percent={pct} strokeColor={colors[key]} size="small" showInfo={false} />
                </div>
              );
            })}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Estado de Acciones" size="small">
            <Row gutter={16}>
              {[
                { key: 'PENDIENTE', label: 'Pendientes', color: '#1677ff', icon: <CalendarOutlined /> },
                { key: 'FINALIZADA', label: 'Finalizadas', color: '#52c41a', icon: <TrophyOutlined /> },
                { key: 'ANULADA', label: 'Anuladas', color: '#ff4d4f', icon: null },
              ].map(({ key, label, color, icon }) => (
                <Col span={8} key={key}>
                  <Statistic title={label} value={acciones_por_estado[key] || 0} styles={{ content: { color } }} prefix={icon} />
                </Col>
              ))}
            </Row>
            {totales.acciones > 0 && (
              <div style={{ marginTop: 16 }}>
                <Text type="secondary">Tasa de completado</Text>
                <Progress percent={Math.round(((acciones_por_estado.FINALIZADA || 0) / totales.acciones) * 100)} status="active" strokeColor="#52c41a" />
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* ── Rendimiento Comerciales ── */}
      <Card title="Rendimiento por Comercial" style={{ marginBottom: 24 }}>
        <Table
          dataSource={rendimiento_comerciales}
          columns={rendimientoColumns}
          rowKey="id"
          pagination={false}
          size="middle"
          scroll={{ x: 700 }}
          summary={() => {
            const totEmp = rendimiento_comerciales.reduce((s, r) => s + r.empresas, 0);
            const totAcc = rendimiento_comerciales.reduce((s, r) => s + r.acciones, 0);
            const totAccFin = rendimiento_comerciales.reduce((s, r) => s + r.acciones_finalizadas, 0);
            const totOfe = rendimiento_comerciales.reduce((s, r) => s + r.ofertas, 0);
            const totGan = rendimiento_comerciales.reduce((s, r) => s + r.ofertas_ganadas, 0);
            const totVal = rendimiento_comerciales.reduce((s, r) => s + r.valor_ganado, 0);
            return (
              <Table.Summary.Row style={{ fontWeight: 'bold' }}>
                <Table.Summary.Cell index={0}>TOTAL</Table.Summary.Cell>
                <Table.Summary.Cell index={1} align="center">{totEmp}</Table.Summary.Cell>
                <Table.Summary.Cell index={2} align="center">{totAccFin}/{totAcc}</Table.Summary.Cell>
                <Table.Summary.Cell index={3} align="center"><Tag color="green">{totGan}</Tag> / {totOfe}</Table.Summary.Cell>
                <Table.Summary.Cell index={4} align="right">
                  <Text strong style={{ color: '#52c41a' }}>
                    {totVal.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                  </Text>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            );
          }}
        />
      </Card>
    </>
  );
}
