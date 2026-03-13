import { useState, useEffect } from 'react';
import {
  Table, Select, DatePicker, Space, Tag, App as AntApp, Typography,
} from 'antd';
import {
  HistoryOutlined,
  PlusCircleOutlined, EditOutlined, DeleteOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import * as auditApi from '../api/audit';
import * as authApi from '../api/auth';

const { RangePicker } = DatePicker;
const { Title } = Typography;

const PAGE_SIZE = 20;

const ENTIDAD_OPTIONS = [
  { label: 'Todas', value: '__ALL__' },
  { label: 'Empresa', value: 'empresa' },
  { label: 'Contacto', value: 'contacto' },
  { label: 'Oferta', value: 'oferta' },
  { label: 'Accion', value: 'accion' },
  { label: 'Producto', value: 'producto' },
  { label: 'Usuario', value: 'usuario' },
];

const ACCION_COLOR = {
  CREAR: 'green',
  EDITAR: 'blue',
  ELIMINAR: 'red',
};

const ACCION_ICON = {
  CREAR: <PlusCircleOutlined />,
  EDITAR: <EditOutlined />,
  ELIMINAR: <DeleteOutlined />,
};

export default function AuditLogPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: PAGE_SIZE, total: 0 });
  const [usuarios, setUsuarios] = useState([]);

  // Filters
  const [entidad, setEntidad] = useState('__ALL__');
  const [usuarioId, setUsuarioId] = useState('__ALL__');
  const [dateRange, setDateRange] = useState(null);

  const { message } = AntApp.useApp();

  useEffect(() => {
    authApi.listUsuarios().then(setUsuarios).catch(() => {});
  }, []);

  const fetchLogs = async (page = 1, pageSize = PAGE_SIZE) => {
    setLoading(true);
    try {
      const params = {
        skip: (page - 1) * pageSize,
        limit: pageSize,
      };
      if (entidad !== '__ALL__') params.entidad = entidad;
      if (usuarioId !== '__ALL__') params.usuario_id = usuarioId;
      if (dateRange && dateRange[0]) params.desde = dateRange[0].startOf('day').toISOString();
      if (dateRange && dateRange[1]) params.hasta = dateRange[1].endOf('day').toISOString();

      const res = await auditApi.list(params);
      setLogs(res.items);
      setPagination({ current: page, pageSize, total: res.total });
    } catch {
      message.error('Error al cargar historial');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, [entidad, usuarioId, dateRange]);

  const handleTableChange = (pag) => {
    fetchLogs(pag.current, pag.pageSize);
  };

  const columns = [
    {
      title: 'Fecha',
      dataIndex: 'creado_en',
      width: 160,
      render: (val) => val ? dayjs(val).format('DD/MM/YYYY HH:mm') : '-',
    },
    {
      title: 'Usuario',
      dataIndex: 'usuario_nombre',
      width: 150,
    },
    {
      title: 'Accion',
      dataIndex: 'accion',
      width: 120,
      render: (val) => (
        <Tag color={ACCION_COLOR[val]} icon={ACCION_ICON[val]}>
          {val}
        </Tag>
      ),
    },
    {
      title: 'Entidad',
      dataIndex: 'entidad',
      width: 120,
      render: (val) => <Tag>{val}</Tag>,
    },
    {
      title: 'ID',
      dataIndex: 'entidad_id',
      width: 60,
    },
    {
      title: 'Detalle',
      dataIndex: 'detalle',
      ellipsis: true,
    },
  ];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          <HistoryOutlined /> Historial de Cambios
        </Title>
      </div>

      <Space wrap style={{ marginBottom: 16 }}>
        <Select
          value={entidad}
          onChange={setEntidad}
          options={ENTIDAD_OPTIONS}
          style={{ width: 140 }}
          placeholder="Entidad"
        />
        <Select
          value={usuarioId}
          onChange={setUsuarioId}
          style={{ width: 180 }}
          placeholder="Usuario"
          options={[
            { label: 'Todos', value: '__ALL__' },
            ...usuarios.map((u) => ({ label: u.nombre, value: u.id })),
          ]}
        />
        <RangePicker
          value={dateRange}
          onChange={setDateRange}
          format="DD/MM/YYYY"
          allowClear
          placeholder={['Desde', 'Hasta']}
        />
      </Space>

      <Table
        dataSource={logs}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50'],
          showTotal: (total) => `${total} registros`,
        }}
        onChange={handleTableChange}
        size="middle"
      />
    </>
  );
}
