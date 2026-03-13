import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Descriptions, Tag, Tabs, Table, Button, Modal, Form, Input, Select, Space,
  Popconfirm, App as AntApp, Spin, Upload, Switch, DatePicker,
} from 'antd';
import {
  ArrowLeftOutlined, PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined,
  UploadOutlined, DownloadOutlined, PaperClipOutlined, ShareAltOutlined, TeamOutlined, UserAddOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import * as empresasApi from '../api/empresas';
import * as contactosApi from '../api/contactos';
import * as accionesApi from '../api/acciones';
import * as ofertasApi from '../api/ofertas';
import * as sucursalesApi from '../api/sucursales';
import * as authApi from '../api/auth';
import { useAuth } from '../context/AuthContext';
import {
  TIPO_ACCION_COLOR, ESTADO_ACCION_COLOR, ESTADO_OFERTA_COLOR,
} from '../constants/enums';
import { formatPhone } from '../utils/phoneFormat';

export default function EmpresaDetallePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { message } = AntApp.useApp();
  const { isJefe } = useAuth();

  const [empresa, setEmpresa] = useState(null);
  const [contactos, setContactos] = useState([]);
  const [acciones, setAcciones] = useState([]);
  const [ofertas, setOfertas] = useState([]);
  const [archivos, setArchivos] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Modal contacto
  const [contactoModal, setContactoModal] = useState(false);
  const [editingContacto, setEditingContacto] = useState(null);
  const [contactoForm] = Form.useForm();
  const [saving, setSaving] = useState(false);

  // Modal sucursal
  const [sucursalModal, setSucursalModal] = useState(false);
  const [editingSucursal, setEditingSucursal] = useState(null);
  const [sucursalForm] = Form.useForm();
  const [savingSucursal, setSavingSucursal] = useState(false);

  // Comerciales / Compartir / Asignar
  const [comerciales, setComerciales] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [compartirModal, setCompartirModal] = useState(false);
  const [compartirForm] = Form.useForm();
  const [savingCompartir, setSavingCompartir] = useState(false);
  const [tiempoIndeterminado, setTiempoIndeterminado] = useState(true);
  const [asignarModal, setAsignarModal] = useState(false);
  const [asignarForm] = Form.useForm();
  const [savingAsignar, setSavingAsignar] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [emp, accRes, ofRes] = await Promise.all([
        empresasApi.getById(id),
        accionesApi.list({ empresa_id: id, limit: 100 }),
        ofertasApi.list({ empresa_id: id, limit: 100 }),
      ]);
      setEmpresa(emp);
      setAcciones(accRes.items);
      setOfertas(ofRes.items);
      const [contRes, archivosData, sucursalesData, comercialesData] = await Promise.all([
        contactosApi.list({ empresa_id: id, limit: 100 }),
        empresasApi.listArchivos(id),
        sucursalesApi.listByEmpresa(id),
        empresasApi.listComerciales(id),
      ]);
      setContactos(contRes.items);
      setArchivos(archivosData);
      setSucursales(sucursalesData);
      setComerciales(comercialesData);

      // Cargar usuarios para el selector de compartir (solo jefe)
      try {
        const usrs = await authApi.listUsuarios();
        setUsuarios(usrs);
      } catch { /* silent - no es jefe */ }
    } catch {
      message.error('Error al cargar empresa');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [id]);

  // --- Contactos CRUD ---
  const openCreateContacto = () => {
    setEditingContacto(null);
    contactoForm.resetFields();
    setContactoModal(true);
  };

  const openEditContacto = (record) => {
    setEditingContacto(record);
    contactoForm.setFieldsValue(record);
    setContactoModal(true);
  };

  const handleSaveContacto = async () => {
    try {
      const values = await contactoForm.validateFields();
      setSaving(true);
      if (editingContacto) {
        await contactosApi.update(editingContacto.id, values);
        message.success('Contacto actualizado');
      } else {
        await contactosApi.create({ ...values, empresa_id: Number(id) });
        message.success('Contacto creado');
      }
      setContactoModal(false);
      fetchAll();
    } catch (err) {
      if (err.response) { message.error(err.response.data?.detail || 'Error'); } else if (!err.errorFields) { console.error('Error:', err); message.error('Error de conexión. Intenta de nuevo.'); }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteContacto = async (contactoId) => {
    try {
      await contactosApi.remove(contactoId);
      message.success('Contacto eliminado');
      fetchAll();
    } catch {
      message.error('Error al eliminar');
    }
  };

  // --- Archivos ---
  const handleUploadArchivo = async (file) => {
    setUploading(true);
    try {
      await empresasApi.subirArchivo(id, file);
      message.success('Archivo subido');
      const data = await empresasApi.listArchivos(id);
      setArchivos(data);
    } catch (err) {
      message.error(err.response?.data?.detail || 'Error al subir archivo');
    } finally {
      setUploading(false);
    }
    return false; // prevent antd default upload
  };

  const handleDescargarArchivo = async (archivo) => {
    try {
      const response = await empresasApi.descargarArchivo(id, archivo.id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', archivo.nombre_original);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      message.error('Error al descargar archivo');
    }
  };

  const handleEliminarArchivo = async (archivoId) => {
    try {
      await empresasApi.eliminarArchivo(id, archivoId);
      message.success('Archivo eliminado');
      const data = await empresasApi.listArchivos(id);
      setArchivos(data);
    } catch {
      message.error('Error al eliminar archivo');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // --- Sucursales CRUD ---
  const openCreateSucursal = () => {
    setEditingSucursal(null);
    sucursalForm.resetFields();
    setSucursalModal(true);
  };

  const openEditSucursal = (record) => {
    setEditingSucursal(record);
    sucursalForm.setFieldsValue(record);
    setSucursalModal(true);
  };

  const handleSaveSucursal = async () => {
    try {
      const values = await sucursalForm.validateFields();
      setSavingSucursal(true);
      if (editingSucursal) {
        await sucursalesApi.update(id, editingSucursal.id, values);
        message.success('Sucursal actualizada');
      } else {
        await sucursalesApi.create(id, values);
        message.success('Sucursal creada');
      }
      setSucursalModal(false);
      const data = await sucursalesApi.listByEmpresa(id);
      setSucursales(data);
    } catch (err) {
      if (err.response) { message.error(err.response.data?.detail || 'Error'); } else if (!err.errorFields) { console.error('Error:', err); message.error('Error de conexión. Intenta de nuevo.'); }
    } finally {
      setSavingSucursal(false);
    }
  };

  const handleDeleteSucursal = async (sucursalId) => {
    try {
      await sucursalesApi.remove(id, sucursalId);
      message.success('Sucursal eliminada');
      const data = await sucursalesApi.listByEmpresa(id);
      setSucursales(data);
    } catch {
      message.error('Error al eliminar');
    }
  };

  // --- Compartir cliente ---
  const openCompartir = () => {
    compartirForm.resetFields();
    compartirForm.setFieldsValue({ acceso_origen: true });
    setTiempoIndeterminado(true);
    setCompartirModal(true);
  };

  const handleCompartir = async () => {
    try {
      const values = await compartirForm.validateFields();
      setSavingCompartir(true);
      const payload = {
        comercial_destino_id: values.comercial_destino_id,
        fecha_fin: tiempoIndeterminado ? null : values.fecha_fin?.toISOString(),
        acceso_origen: values.acceso_origen ?? true,
      };
      await empresasApi.compartirCliente(id, payload);
      message.success('Cliente compartido exitosamente');
      setCompartirModal(false);
      const data = await empresasApi.listComerciales(id);
      setComerciales(data);
    } catch (err) {
      if (err.response) { message.error(err.response.data?.detail || 'Error al compartir'); } else if (!err.errorFields) { console.error('Error:', err); message.error('Error de conexión. Intenta de nuevo.'); }
    } finally {
      setSavingCompartir(false);
    }
  };

  const handleRevocarAcceso = async (comercialId) => {
    try {
      await empresasApi.desasignarComercial(id, comercialId);
      message.success('Acceso revocado');
      const data = await empresasApi.listComerciales(id);
      setComerciales(data);
    } catch (err) {
      message.error(err.response?.data?.detail || 'Error al revocar');
    }
  };

  // --- Asignar comercial ---
  const openAsignar = () => {
    asignarForm.resetFields();
    setAsignarModal(true);
  };

  const handleAsignar = async () => {
    try {
      const values = await asignarForm.validateFields();
      setSavingAsignar(true);
      await empresasApi.asignarComercial(id, values.comercial_id);
      message.success('Comercial asignado como titular');
      setAsignarModal(false);
      const data = await empresasApi.listComerciales(id);
      setComerciales(data);
    } catch (err) {
      if (err.response) { message.error(err.response.data?.detail || 'Error al asignar'); } else if (!err.errorFields) { console.error('Error:', err); message.error('Error de conexión. Intenta de nuevo.'); }
    } finally {
      setSavingAsignar(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', paddingTop: 80 }}><Spin size="large" /></div>;
  }

  if (!empresa) {
    return <p>Empresa no encontrada</p>;
  }

  const contactoColumns = [
    { title: 'Nombre', dataIndex: 'nombre' },
    { title: 'Cargo', dataIndex: 'cargo' },
    { title: 'Email', dataIndex: 'email' },
    { title: 'Telefono', dataIndex: 'telefono', render: (val) => val ? formatPhone(val) : '-' },
    { title: 'Sucursal', dataIndex: 'sucursal' },
    {
      title: '', width: 100,
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEditContacto(record)} />
          <Popconfirm title="Eliminar?" onConfirm={() => handleDeleteContacto(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const accionColumns = [
    {
      title: 'Tipo', dataIndex: 'tipo',
      render: (val) => <Tag color={TIPO_ACCION_COLOR[val]}>{val}</Tag>,
    },
    {
      title: 'Estado', dataIndex: 'estado',
      render: (val) => <Tag color={ESTADO_ACCION_COLOR[val]}>{val}</Tag>,
    },
    {
      title: 'Fecha', dataIndex: 'fecha_hora',
      render: (val) => dayjs(val).format('DD/MM/YYYY HH:mm'),
      sorter: (a, b) => new Date(a.fecha_hora) - new Date(b.fecha_hora),
      defaultSortOrder: 'descend',
    },
    { title: 'Descripcion', dataIndex: 'descripcion', ellipsis: true },
  ];

  const ofertaColumns = [
    {
      title: 'Productos', dataIndex: 'productos',
      render: (prods) => {
        if (!prods || prods.length === 0) return '-';
        const text = prods.map((p) => p.producto_nombre || p.producto?.nombre || p.nombre || `#${p.producto_id}`).join(', ');
        return <span style={{ textTransform: 'uppercase' }}>{text}</span>;
      },
      ellipsis: true,
    },
    {
      title: 'Estado', dataIndex: 'estado',
      render: (val) => <Tag color={ESTADO_OFERTA_COLOR[val]}>{val}</Tag>,
    },
    {
      title: 'Precio', dataIndex: 'precio_negociado',
      render: (val) => val != null ? `${val.toLocaleString('es-ES')} EUR` : '-',
    },
    { title: 'Notas', dataIndex: 'notas', ellipsis: true },
    {
      title: '', width: 60,
      render: (_, record) => (
        <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/ofertas/${record.id}`)} />
      ),
    },
  ];

  return (
    <>
      <Button
        type="link"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/empresas')}
        style={{ padding: 0, marginBottom: 12 }}
      >
        Volver a Empresas
      </Button>

      <Descriptions
        title={<span style={{ textTransform: 'uppercase' }}>{empresa.nombre}</span>}
        bordered
        size="small"
        column={2}
        style={{ marginBottom: 24 }}
      >
        <Descriptions.Item label="Razon Social">
          <span style={{ textTransform: 'uppercase' }}>{empresa.razon_social || '-'}</span>
        </Descriptions.Item>
        <Descriptions.Item label="Ciudad">{empresa.ciudad || '-'}</Descriptions.Item>
        <Descriptions.Item label="Provincia">{empresa.provincia || '-'}</Descriptions.Item>
        <Descriptions.Item label="Origen">
          <Tag>{empresa.origen}</Tag>
          {empresa.origen_detalle && <span style={{ marginLeft: 4, fontSize: 12, color: '#666' }}>({empresa.origen_detalle})</span>}
        </Descriptions.Item>
        <Descriptions.Item label="Creada">
          {empresa.creado_en ? dayjs(empresa.creado_en).format('DD/MM/YYYY') : '-'}
        </Descriptions.Item>
        <Descriptions.Item label="Notas" span={2}>
          {empresa.notas_comerciales || '-'}
        </Descriptions.Item>
      </Descriptions>

      <Tabs
        defaultActiveKey="contactos"
        items={[
          {
            key: 'contactos',
            label: `Contactos (${contactos.length})`,
            children: (
              <>
                <div style={{ marginBottom: 12, textAlign: 'right' }}>
                  <Button size="small" icon={<PlusOutlined />} onClick={openCreateContacto}>
                    Nuevo Contacto
                  </Button>
                </div>
                <Table
                  dataSource={contactos}
                  columns={contactoColumns}
                  rowKey="id"
                  size="small"
                  pagination={false}
                />
              </>
            ),
          },
          {
            key: 'acciones',
            label: `Acciones (${acciones.length})`,
            children: (
              <Table
                dataSource={acciones}
                columns={accionColumns}
                rowKey="id"
                size="small"
                pagination={{ pageSize: 10 }}
              />
            ),
          },
          {
            key: 'ofertas',
            label: `Ofertas (${ofertas.length})`,
            children: (
              <Table
                dataSource={ofertas}
                columns={ofertaColumns}
                rowKey="id"
                size="small"
                pagination={{ pageSize: 10 }}
              />
            ),
          },
          {
            key: 'archivos',
            label: (
              <span><PaperClipOutlined /> Archivos ({archivos.length})</span>
            ),
            children: (
              <>
                <div style={{ marginBottom: 12, textAlign: 'right' }}>
                  <Upload
                    beforeUpload={handleUploadArchivo}
                    showUploadList={false}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.zip,.rar"
                  >
                    <Button icon={<UploadOutlined />} loading={uploading}>
                      Subir Archivo
                    </Button>
                  </Upload>
                </div>
                <Table
                  dataSource={archivos}
                  rowKey="id"
                  size="small"
                  pagination={false}
                  columns={[
                    { title: 'Nombre', dataIndex: 'nombre_original', ellipsis: true },
                    {
                      title: 'Tamaño', dataIndex: 'tamano', width: 100,
                      render: (val) => formatFileSize(val),
                    },
                    { title: 'Subido por', dataIndex: 'subido_por', width: 130 },
                    {
                      title: 'Fecha', dataIndex: 'subido_en', width: 120,
                      render: (val) => val ? dayjs(val).format('DD/MM/YYYY') : '-',
                    },
                    {
                      title: '', width: 100,
                      render: (_, record) => (
                        <Space>
                          <Button
                            size="small"
                            icon={<DownloadOutlined />}
                            onClick={() => handleDescargarArchivo(record)}
                          />
                          <Popconfirm
                            title="Eliminar archivo?"
                            onConfirm={() => handleEliminarArchivo(record.id)}
                          >
                            <Button size="small" danger icon={<DeleteOutlined />} />
                          </Popconfirm>
                        </Space>
                      ),
                    },
                  ]}
                />
              </>
            ),
          },
          {
            key: 'sucursales',
            label: `Sucursales (${sucursales.length})`,
            children: (
              <>
                <div style={{ marginBottom: 12, textAlign: 'right' }}>
                  <Button size="small" icon={<PlusOutlined />} onClick={openCreateSucursal}>
                    Nueva Sucursal
                  </Button>
                </div>
                <Table
                  dataSource={sucursales}
                  rowKey="id"
                  size="small"
                  pagination={false}
                  columns={[
                    { title: 'Nombre', dataIndex: 'nombre' },
                    { title: 'Direccion', dataIndex: 'direccion', ellipsis: true },
                    { title: 'Ciudad', dataIndex: 'ciudad' },
                    { title: 'Provincia', dataIndex: 'provincia' },
                    {
                      title: 'Coords', width: 80,
                      render: (_, r) => r.latitud ? '✓' : '-',
                    },
                    {
                      title: '', width: 100,
                      render: (_, record) => (
                        <Space>
                          <Button size="small" icon={<EditOutlined />} onClick={() => openEditSucursal(record)} />
                          <Popconfirm title="Eliminar sucursal?" onConfirm={() => handleDeleteSucursal(record.id)}>
                            <Button size="small" danger icon={<DeleteOutlined />} />
                          </Popconfirm>
                        </Space>
                      ),
                    },
                  ]}
                />
              </>
            ),
          },
          {
            key: 'comerciales',
            label: (
              <span><TeamOutlined /> Comerciales ({comerciales.length})</span>
            ),
            children: (
              <>
                <div style={{ marginBottom: 12, textAlign: 'right' }}>
                  <Space>
                    {isJefe && (
                      <Button size="small" icon={<UserAddOutlined />} onClick={openAsignar}>
                        Asignar comercial
                      </Button>
                    )}
                    <Button size="small" icon={<ShareAltOutlined />} onClick={openCompartir}>
                      Compartir cliente
                    </Button>
                  </Space>
                </div>
                <Table
                  dataSource={comerciales}
                  rowKey="id"
                  size="small"
                  pagination={false}
                  columns={[
                    {
                      title: 'Comercial', dataIndex: 'comercial_nombre',
                      render: (val) => val || '-',
                    },
                    {
                      title: 'Tipo', dataIndex: 'tipo', width: 120,
                      render: (val) => (
                        <Tag color={val === 'TITULAR' ? 'blue' : 'orange'}>
                          {val === 'TITULAR' ? 'Titular' : 'Compartido'}
                        </Tag>
                      ),
                    },
                    {
                      title: 'Vigencia', width: 150,
                      render: (_, r) => {
                        if (r.tipo === 'TITULAR') return 'Permanente';
                        if (!r.fecha_fin) return 'Indeterminado';
                        return `Hasta ${dayjs(r.fecha_fin).format('DD/MM/YYYY')}`;
                      },
                    },
                    {
                      title: 'Acceso origen', dataIndex: 'acceso_origen', width: 110,
                      render: (val, r) => r.tipo === 'COMPARTIDO' ? (val ? 'Sí' : 'No') : '-',
                    },
                    {
                      title: '', width: 80,
                      render: (_, record) => (
                        record.tipo === 'COMPARTIDO' && isJefe ? (
                          <Popconfirm title="Revocar acceso compartido?" onConfirm={() => handleRevocarAcceso(record.comercial_id)}>
                            <Button size="small" danger icon={<DeleteOutlined />} />
                          </Popconfirm>
                        ) : null
                      ),
                    },
                  ]}
                />
              </>
            ),
          },
        ]}
      />

      {/* Modal sucursal */}
      <Modal
        title={editingSucursal ? 'Editar Sucursal' : 'Nueva Sucursal'}
        open={sucursalModal}
        onOk={handleSaveSucursal}
        onCancel={() => setSucursalModal(false)}
        confirmLoading={savingSucursal}
        okText="Guardar"
        cancelText="Cancelar"
        destroyOnHidden
      >
        <Form form={sucursalForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="nombre" label="Nombre" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="direccion" label="Direccion">
            <Input />
          </Form.Item>
          <Space style={{ width: '100%' }} size="middle">
            <Form.Item name="ciudad" label="Ciudad" style={{ flex: 1 }}>
              <Input />
            </Form.Item>
            <Form.Item name="provincia" label="Provincia" style={{ flex: 1 }}>
              <Input />
            </Form.Item>
          </Space>
        </Form>
      </Modal>

      {/* Modal contacto */}
      <Modal
        title={editingContacto ? 'Editar Contacto' : 'Nuevo Contacto'}
        open={contactoModal}
        onOk={handleSaveContacto}
        onCancel={() => setContactoModal(false)}
        confirmLoading={saving}
        okText="Guardar"
        cancelText="Cancelar"
        destroyOnHidden
      >
        <Form form={contactoForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="nombre" label="Nombre" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="cargo" label="Cargo">
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email">
            <Input type="email" />
          </Form.Item>
          <Form.Item name="telefono" label="Telefono">
            <Input
              placeholder="+34 600 00 00 00"
              onBlur={() => {
                const val = contactoForm.getFieldValue('telefono');
                if (val) contactoForm.setFieldValue('telefono', formatPhone(val));
              }}
            />
          </Form.Item>
          <Form.Item name="sucursal" label="Sucursal">
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal compartir cliente */}
      <Modal
        title="Compartir cliente"
        open={compartirModal}
        onOk={handleCompartir}
        onCancel={() => setCompartirModal(false)}
        confirmLoading={savingCompartir}
        okText="Compartir"
        cancelText="Cancelar"
        destroyOnHidden
      >
        <Form form={compartirForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="comercial_destino_id"
            label="Comercial destino"
            rules={[{ required: true, message: 'Selecciona un comercial' }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="Seleccionar comercial"
              options={usuarios
                .filter((u) => !comerciales.some((c) => c.comercial_id === u.id))
                .map((u) => ({ label: `${u.nombre} (${u.rol})`.toUpperCase(), value: u.id }))
                .sort((a, b) => a.label.localeCompare(b.label))}
            />
          </Form.Item>

          <Form.Item label="Duracion">
            <Switch
              checked={tiempoIndeterminado}
              onChange={(checked) => setTiempoIndeterminado(checked)}
              checkedChildren="Indeterminado"
              unCheckedChildren="Con plazo"
            />
          </Form.Item>

          {!tiempoIndeterminado && (
            <Form.Item
              name="fecha_fin"
              label="Fecha de fin"
              rules={[{ required: true, message: 'Selecciona fecha de fin' }]}
            >
              <DatePicker
                style={{ width: '100%' }}
                format="DD/MM/YYYY"
                placeholder="Seleccionar fecha"
              />
            </Form.Item>
          )}

          <Form.Item
            name="acceso_origen"
            label="El comercial original mantiene acceso"
            valuePropName="checked"
            initialValue={true}
          >
            <Switch
              checkedChildren="Sí"
              unCheckedChildren="No"
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal asignar comercial */}
      <Modal
        title="Asignar comercial"
        open={asignarModal}
        onOk={handleAsignar}
        onCancel={() => setAsignarModal(false)}
        confirmLoading={savingAsignar}
        okText="Asignar"
        cancelText="Cancelar"
        destroyOnHidden
      >
        <Form form={asignarForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="comercial_id"
            label="Comercial"
            rules={[{ required: true, message: 'Selecciona un comercial' }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="Seleccionar comercial"
              options={usuarios
                .filter((u) => !comerciales.some((c) => c.comercial_id === u.id))
                .map((u) => ({ label: `${u.nombre} (${u.rol})`.toUpperCase(), value: u.id }))
                .sort((a, b) => a.label.localeCompare(b.label))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
