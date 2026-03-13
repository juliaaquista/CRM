import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Descriptions, Tag, Table, Button, Modal, Form, Input, InputNumber, Select,
  Space, App as AntApp, Spin, Popconfirm,
} from 'antd';
import {
  ArrowLeftOutlined, EditOutlined, DeleteOutlined, MinusCircleOutlined, PlusOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import * as ofertasApi from '../api/ofertas';
import * as productosApi from '../api/productos';
import * as empresasApi from '../api/empresas';
import { ESTADO_OFERTA, ESTADO_OFERTA_COLOR, MODO_PAGO, toOptions, toEntityOptions } from '../constants/enums';

export default function OfertaDetallePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { message } = AntApp.useApp();

  const [oferta, setOferta] = useState(null);
  const [productos, setProductos] = useState([]);
  const [empresa, setEmpresa] = useState(null);
  const [loading, setLoading] = useState(true);

  const [editModal, setEditModal] = useState(false);
  const [editForm] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const estadoWatch = Form.useWatch('estado', editForm);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [of, prodsRes] = await Promise.all([
        ofertasApi.getById(id),
        productosApi.list({ skip: 0, limit: 100 }),
      ]);
      setOferta(of);
      setProductos(prodsRes.items);
      if (of.empresa_id) {
        const emp = await empresasApi.getById(of.empresa_id);
        setEmpresa(emp);
      }
    } catch {
      message.error('Error al cargar oferta');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [id]);

  const productoNombre = (prodId) => {
    const p = productos.find((pr) => pr.id === prodId);
    return p ? p.nombre : `#${prodId}`;
  };

  const openEdit = () => {
    editForm.setFieldsValue({
      estado: oferta.estado,
      precio_negociado: oferta.precio_negociado,
      condiciones_venta: oferta.condiciones_venta,
      motivo_perdida: oferta.motivo_perdida,
      notas: oferta.notas,
      modo_pago: oferta.modo_pago,
      hitos_pago: oferta.hitos_pago,
      especificaciones_pago: oferta.especificaciones_pago,
      productos: (oferta.productos || []).map((p) => ({
        producto_id: p.producto_id,
        cantidad: p.cantidad,
        precio_unitario: p.precio_unitario,
      })),
    });
    setEditModal(true);
  };

  const handleEdit = async () => {
    try {
      const values = await editForm.validateFields();
      setSaving(true);
      const payload = {
        estado: values.estado,
        precio_negociado: values.precio_negociado || null,
        condiciones_venta: values.condiciones_venta || null,
        motivo_perdida: values.estado === 'PERDIDA' ? (values.motivo_perdida || null) : null,
        notas: values.notas || null,
        modo_pago: values.modo_pago || null,
        hitos_pago: values.hitos_pago || null,
        especificaciones_pago: values.especificaciones_pago || null,
        productos: (values.productos || [])
          .filter((p) => p && p.producto_id)
          .map((p) => ({
            producto_id: p.producto_id,
            cantidad: p.cantidad || 1,
            precio_unitario: p.precio_unitario || null,
          })),
      };
      await ofertasApi.update(id, payload);
      message.success('Oferta actualizada');
      setEditModal(false);
      fetchAll();
    } catch (err) {
      if (err.response) { message.error(err.response.data?.detail || 'Error'); } else if (!err.errorFields) { console.error('Error:', err); message.error('Error de conexión. Intenta de nuevo.'); }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await ofertasApi.remove(id);
      message.success('Oferta eliminada');
      navigate('/ofertas');
    } catch {
      message.error('Error al eliminar oferta');
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', paddingTop: 80 }}><Spin size="large" /></div>;
  }
  if (!oferta) return <p>Oferta no encontrada</p>;

  const activeProductos = productos.filter((p) => p.activo);

  const productoColumns = [
    {
      title: 'Producto', dataIndex: 'producto_id',
      render: (val, record) => <span style={{ textTransform: 'uppercase' }}>{record.producto_nombre || record.producto?.nombre || productoNombre(val)}</span>,
    },
    { title: 'Cantidad', dataIndex: 'cantidad', width: 100 },
    {
      title: 'Precio unitario', dataIndex: 'precio_unitario', width: 150,
      render: (val) => val != null ? `${val.toLocaleString('es-ES')} EUR` : '-',
    },
  ];

  return (
    <>
      <Button type="link" icon={<ArrowLeftOutlined />} onClick={() => navigate('/ofertas')} style={{ padding: 0, marginBottom: 12 }}>
        Volver a Ofertas
      </Button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0 }}>Oferta {oferta.numero || `#${oferta.id}`}</h3>
        <Space>
          <Button icon={<EditOutlined />} onClick={openEdit}>Editar</Button>
          <Popconfirm title="¿Eliminar esta oferta?" onConfirm={handleDelete} okText="Sí" cancelText="No">
            <Button danger icon={<DeleteOutlined />}>Eliminar</Button>
          </Popconfirm>
        </Space>
      </div>

      <Descriptions bordered size="small" column={2} style={{ marginBottom: 24 }}>
        <Descriptions.Item label="Empresa">
          {empresa ? (
            <a onClick={() => navigate(`/empresas/${empresa.id}`)} style={{ textTransform: 'uppercase' }}>
              {empresa.razon_social || empresa.nombre}
            </a>
          ) : '-'}
        </Descriptions.Item>
        <Descriptions.Item label="Estado">
          <Tag color={ESTADO_OFERTA_COLOR[oferta.estado]}>{oferta.estado}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Precio negociado">
          {oferta.precio_negociado != null ? `${oferta.precio_negociado.toLocaleString('es-ES')} EUR` : '-'}
        </Descriptions.Item>
        <Descriptions.Item label="Creada">
          {oferta.creado_en ? dayjs(oferta.creado_en).format('DD/MM/YYYY HH:mm') : '-'}
        </Descriptions.Item>
        <Descriptions.Item label="Modo de pago">
          {oferta.modo_pago ? <Tag>{oferta.modo_pago}</Tag> : '-'}
        </Descriptions.Item>
        <Descriptions.Item label="Hitos de pago">
          {oferta.hitos_pago || '-'}
        </Descriptions.Item>
        <Descriptions.Item label="Especificaciones de pago" span={2}>
          {oferta.especificaciones_pago || '-'}
        </Descriptions.Item>
        <Descriptions.Item label="Condiciones de venta" span={2}>
          {oferta.condiciones_venta || '-'}
        </Descriptions.Item>
        {oferta.motivo_perdida && (
          <Descriptions.Item label="Motivo de perdida" span={2}>
            {oferta.motivo_perdida}
          </Descriptions.Item>
        )}
        <Descriptions.Item label="Notas" span={2}>
          {oferta.notas || '-'}
        </Descriptions.Item>
      </Descriptions>

      <h4 style={{ marginBottom: 12 }}>Productos ({oferta.productos?.length || 0})</h4>
      <Table
        dataSource={oferta.productos || []}
        columns={productoColumns}
        rowKey="id"
        size="small"
        pagination={false}
      />

      {/* Modal editar oferta */}
      <Modal
        title="Editar Oferta"
        open={editModal}
        onOk={handleEdit}
        onCancel={() => setEditModal(false)}
        confirmLoading={saving}
        okText="Guardar"
        cancelText="Cancelar"
        destroyOnHidden
        width={640}
      >
        <Form form={editForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="estado" label="Estado">
            <Select options={toOptions(ESTADO_OFERTA)} />
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
                      <MinusCircleOutlined
                        onClick={() => remove(name)}
                        style={{ fontSize: 18, color: '#ff4d4f', marginTop: 8 }}
                      />
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
          <Form.Item name="condiciones_venta" label="Condiciones de venta">
            <Input.TextArea rows={2} />
          </Form.Item>
          {estadoWatch === 'PERDIDA' && (
            <Form.Item name="motivo_perdida" label="Motivo de perdida" rules={[{ required: true, message: 'Indica el motivo de pérdida' }]}>
              <Input.TextArea rows={2} placeholder="¿Por qué se perdió la oferta?" />
            </Form.Item>
          )}
          <Form.Item name="notas" label="Notas">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
