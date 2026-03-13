import { useState, useEffect } from 'react';
import {
  Table, Button, Modal, Form, Input, InputNumber, Select, Tag, Space,
  Popconfirm, Segmented, DatePicker, App as AntApp,
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, EyeOutlined,
  UnorderedListOutlined, AppstoreOutlined,
  MinusCircleOutlined, SearchOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import * as ofertasApi from '../api/ofertas';
import * as productosApi from '../api/productos';
import * as empresasApi from '../api/empresas';
import { ESTADO_OFERTA, ESTADO_OFERTA_COLOR, MODO_PAGO, toOptions, toEntityOptions } from '../constants/enums';
import KanbanBoard from '../components/ofertas/KanbanBoard';

const PAGE_SIZE = 20;

export default function OfertasPage() {
  const [ofertas, setOfertas] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: PAGE_SIZE, total: 0 });
  const [viewMode, setViewMode] = useState('table');
  const [kanbanItems, setKanbanItems] = useState([]);
  const [kanbanLoading, setKanbanLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { message } = AntApp.useApp();

  const fetchOfertas = async (page = 1, pageSize = PAGE_SIZE, q = searchText) => {
    setLoading(true);
    try {
      const skip = (page - 1) * pageSize;
      const params = { skip, limit: pageSize };
      if (q) params.q = q;
      const res = await ofertasApi.list(params);
      setOfertas(res.items);
      setPagination({ current: page, pageSize, total: res.total });
    } catch {
      message.error('Error al cargar ofertas');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmpresas = async () => {
    try {
      const res = await empresasApi.list(0, 100);
      setEmpresas(res.items);
    } catch { /* silent */ }
  };

  const fetchProductos = async () => {
    try {
      const res = await productosApi.list({ skip: 0, limit: 100 });
      setProductos(res.items);
    } catch { /* silent */ }
  };

  const fetchKanban = async () => {
    setKanbanLoading(true);
    try {
      const res = await ofertasApi.listKanban();
      setKanbanItems(res.items);
    } catch {
      message.error('Error al cargar vista kanban');
    } finally {
      setKanbanLoading(false);
    }
  };

  useEffect(() => {
    fetchOfertas();
    fetchEmpresas();
    fetchProductos();
  }, []);

  useEffect(() => {
    if (viewMode === 'kanban') {
      fetchKanban();
    }
  }, [viewMode]);

  const handleTableChange = (pag) => {
    fetchOfertas(pag.current, pag.pageSize, searchText);
  };

  const handleSearch = (value) => {
    setSearchText(value);
    fetchOfertas(1, pagination.pageSize, value || null);
  };

  const empresaNombre = (id) => {
    const e = empresas.find((emp) => emp.id === id);
    return e ? (e.razon_social || e.nombre) : `#${id}`;
  };

  const productoNombre = (id) => {
    const p = productos.find((pr) => pr.id === id);
    return p ? p.nombre : `#${id}`;
  };

  const openCreate = () => {
    form.resetFields();
    form.setFieldsValue({ productos: [{}] });
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const validProducts = (values.productos || []).filter((p) => p && p.producto_id);
      if (validProducts.length === 0) {
        message.warning('Debes agregar al menos un producto a la oferta');
        return;
      }
      setSaving(true);
      const payload = {
        empresa_id: values.empresa_id,
        precio_negociado: values.precio_negociado || null,
        notas: values.notas || null,
        modo_pago: values.modo_pago || null,
        hitos_pago: values.hitos_pago || null,
        especificaciones_pago: values.especificaciones_pago || null,
        fecha_oferta: values.fecha_oferta ? values.fecha_oferta.toISOString() : null,
        estado: values.estado || null,
        productos: (values.productos || [])
          .filter((p) => p && p.producto_id)
          .map((p) => ({
            producto_id: p.producto_id,
            cantidad: p.cantidad || 1,
            precio_unitario: p.precio_unitario || null,
          })),
      };
      await ofertasApi.create(payload);
      message.success('Oferta creada');
      setModalOpen(false);
      fetchOfertas(pagination.current, pagination.pageSize);
      if (viewMode === 'kanban') fetchKanban();
    } catch (err) {
      if (err.response) {
        message.error(err.response.data?.detail || 'Error al guardar oferta');
      } else if (!err.errorFields) {
        console.error('Error creando oferta:', err);
        message.error('Error de conexión al guardar. Intenta de nuevo.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await ofertasApi.remove(id);
      message.success('Oferta eliminada');
      fetchOfertas(pagination.current, pagination.pageSize);
    } catch {
      message.error('Error al eliminar');
    }
  };

  const columns = [
    { title: 'Nº', dataIndex: 'numero', width: 110, render: (val, rec) => val || `#${rec.id}` },
    {
      title: 'Empresa', dataIndex: 'empresa_id',
      render: (val) => (
        <a onClick={() => navigate(`/empresas/${val}`)} style={{ textTransform: 'uppercase' }}>{empresaNombre(val)}</a>
      ),
    },
    {
      title: 'Productos', dataIndex: 'productos',
      render: (prods) => {
        if (!prods || prods.length === 0) return '-';
        const text = prods.map((p) => p.producto_nombre || p.producto?.nombre || productoNombre(p.producto_id)).join(', ');
        return <span style={{ textTransform: 'uppercase' }}>{text}</span>;
      },
      ellipsis: true,
    },
    {
      title: 'Estado', dataIndex: 'estado',
      render: (val) => <Tag color={ESTADO_OFERTA_COLOR[val]}>{val}</Tag>,
      filters: Object.values(ESTADO_OFERTA).map((v) => ({ text: v, value: v })),
      onFilter: (value, record) => record.estado === value,
    },
    {
      title: 'Precio', dataIndex: 'precio_negociado',
      render: (val) => val != null ? `${val.toLocaleString('es-ES')} EUR` : '-',
      sorter: (a, b) => (a.precio_negociado || 0) - (b.precio_negociado || 0),
    },
    { title: 'Notas', dataIndex: 'notas', ellipsis: true },
    {
      title: 'Creada', dataIndex: 'creado_en',
      render: (val) => val ? dayjs(val).format('DD/MM/YYYY') : '-',
    },
    {
      title: '', width: 100,
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/ofertas/${record.id}`)} />
          <Popconfirm title="Eliminar?" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const activeProductos = productos.filter((p) => p.activo);

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Space>
          <h3 style={{ margin: 0 }}>Ofertas</h3>
          <Segmented
            value={viewMode}
            onChange={setViewMode}
            options={[
              { value: 'table', icon: <UnorderedListOutlined /> },
              { value: 'kanban', icon: <AppstoreOutlined /> },
            ]}
          />
          <Input.Search
            placeholder="Buscar por empresa..."
            allowClear
            onSearch={handleSearch}
            style={{ width: 220 }}
            prefix={<SearchOutlined />}
          />
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Nueva Oferta
        </Button>
      </div>

      {viewMode === 'table' ? (
        <Table
          dataSource={ofertas}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            showTotal: (total) => `${total} ofertas`,
          }}
          onChange={handleTableChange}
          size="middle"
        />
      ) : (
        <KanbanBoard
          items={kanbanItems}
          loading={kanbanLoading}
          onRefresh={fetchKanban}
          onCardClick={(id) => navigate(`/ofertas/${id}`)}
        />
      )}

      <Modal
        title="Nueva Oferta"
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        confirmLoading={saving}
        okText="Guardar"
        cancelText="Cancelar"
        destroyOnHidden
        width={640}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="empresa_id" label="Empresa" rules={[{ required: true, message: 'Selecciona empresa' }]}>
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="Seleccionar empresa"
              options={toEntityOptions(empresas)}
            />
          </Form.Item>

          <Form.Item name="fecha_oferta" label="Fecha de oferta" tooltip="Dejar vacío para usar la fecha de hoy. Completar si es una oferta del pasado.">
            <DatePicker
              format="DD/MM/YYYY"
              placeholder="Hoy (por defecto)"
              style={{ width: '100%' }}
              allowClear
            />
          </Form.Item>

          <Form.Item name="estado" label="Estado" tooltip="Por defecto: PREOFERTA">
            <Select allowClear placeholder="PREOFERTA (por defecto)" options={toOptions(ESTADO_OFERTA)} />
          </Form.Item>

          <Form.Item label="Productos">
            <Form.List name="productos">
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name, ...rest }) => (
                    <Space key={key} align="start" style={{ display: 'flex', marginBottom: 8 }}>
                      <Form.Item
                        {...rest}
                        name={[name, 'producto_id']}
                        rules={[{ required: true, message: 'Producto' }]}
                        style={{ marginBottom: 0, width: 200 }}
                      >
                        <Select
                          showSearch
                          optionFilterProp="label"
                          placeholder="Producto"
                          options={toEntityOptions(activeProductos)}
                        />
                      </Form.Item>
                      <Form.Item
                        {...rest}
                        name={[name, 'cantidad']}
                        style={{ marginBottom: 0, width: 80 }}
                      >
                        <InputNumber min={1} placeholder="Cant." />
                      </Form.Item>
                      <Form.Item
                        {...rest}
                        name={[name, 'precio_unitario']}
                        style={{ marginBottom: 0, width: 120 }}
                      >
                        <InputNumber min={0} placeholder="Precio unit." style={{ width: '100%' }} />
                      </Form.Item>
                      {fields.length > 1 && (
                        <MinusCircleOutlined
                          onClick={() => remove(name)}
                          style={{ fontSize: 18, color: '#ff4d4f', marginTop: 8 }}
                        />
                      )}
                    </Space>
                  ))}
                  <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />} style={{ width: '100%' }}>
                    Agregar producto
                  </Button>
                </>
              )}
            </Form.List>
          </Form.Item>

          <Form.Item name="precio_negociado" label="Precio negociado total (EUR)">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="modo_pago" label="Modo de pago">
            <Select allowClear placeholder="Seleccionar modo de pago" options={toOptions(MODO_PAGO)} />
          </Form.Item>
          <Form.Item name="hitos_pago" label="Hitos de pago">
            <Input placeholder="Ej: 50% anticipo, 50% contra entrega" />
          </Form.Item>
          <Form.Item name="especificaciones_pago" label="Especificaciones de pago">
            <Input.TextArea rows={2} placeholder="Detalles adicionales sobre el pago..." />
          </Form.Item>
          <Form.Item name="notas" label="Notas">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
