import { useState, useEffect } from 'react';
import {
  Table, Button, Modal, Form, Input, Select, Switch, Space, Popconfirm, Tag, Upload, Divider, App as AntApp,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, FilePdfOutlined,
  UploadOutlined, DownloadOutlined,
} from '@ant-design/icons';
import * as productosApi from '../api/productos';
import { useAuth } from '../context/AuthContext';

const PAGE_SIZE = 20;

export default function ProductosPage() {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: PAGE_SIZE, total: 0 });
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [categorias, setCategorias] = useState([]);
  const [newCategoria, setNewCategoria] = useState('');
  const [form] = Form.useForm();
  const { message } = AntApp.useApp();
  const { isJefe } = useAuth();

  const fetchProductos = async (page = 1, pageSize = PAGE_SIZE) => {
    setLoading(true);
    try {
      const skip = (page - 1) * pageSize;
      const res = await productosApi.list({ skip, limit: pageSize });
      setProductos(res.items);
      setPagination({ current: page, pageSize, total: res.total });
    } catch {
      message.error('Error al cargar productos');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategorias = async () => {
    try {
      const cats = await productosApi.listCategorias();
      setCategorias(cats);
    } catch { /* silent */ }
  };

  useEffect(() => { fetchProductos(); fetchCategorias(); }, []);

  const handleTableChange = (pag) => {
    fetchProductos(pag.current, pag.pageSize);
  };

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (record) => {
    setEditing(record);
    form.setFieldsValue(record);
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      if (editing) {
        await productosApi.update(editing.id, values);
        message.success('Producto actualizado');
      } else {
        await productosApi.create(values);
        message.success('Producto creado');
      }
      setModalOpen(false);
      fetchProductos(pagination.current, pagination.pageSize);
      fetchCategorias();
    } catch (err) {
      if (err.response) { message.error(err.response.data?.detail || 'Error'); } else if (!err.errorFields) { console.error('Error:', err); message.error('Error de conexión. Intenta de nuevo.'); }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await productosApi.remove(id);
      message.success('Producto eliminado');
      fetchProductos(pagination.current, pagination.pageSize);
    } catch {
      message.error('Error al eliminar');
    }
  };

  const handleUploadFicha = async (file) => {
    if (!editing) return false;
    setUploading(true);
    try {
      await productosApi.uploadFichaTecnica(editing.id, file);
      message.success('Ficha tecnica subida');
      setEditing((prev) => ({ ...prev, ficha_tecnica: file.name }));
      fetchProductos(pagination.current, pagination.pageSize);
    } catch (err) {
      message.error(err.response?.data?.detail || 'Error al subir ficha tecnica');
    } finally {
      setUploading(false);
    }
    return false;
  };

  const handleDeleteFicha = async () => {
    if (!editing) return;
    try {
      await productosApi.deleteFichaTecnica(editing.id);
      message.success('Ficha tecnica eliminada');
      setEditing((prev) => ({ ...prev, ficha_tecnica: null }));
      fetchProductos(pagination.current, pagination.pageSize);
    } catch (err) {
      message.error(err.response?.data?.detail || 'Error al eliminar ficha');
    }
  };

  const columns = [
    { title: 'Nombre', dataIndex: 'nombre', sorter: (a, b) => a.nombre.localeCompare(b.nombre), render: (val) => <span style={{ textTransform: 'uppercase' }}>{val}</span> },
    { title: 'Categoria', dataIndex: 'categoria', render: (val) => <span style={{ textTransform: 'uppercase' }}>{val || '-'}</span> },
    { title: 'Descripcion', dataIndex: 'descripcion', ellipsis: true },
    {
      title: 'Ficha Tecnica',
      dataIndex: 'ficha_tecnica',
      render: (val, record) => val ? (
        <Button
          type="link"
          size="small"
          icon={<FilePdfOutlined />}
          onClick={() => productosApi.downloadFichaTecnica(record.id, val)}
        >
          {val.length > 20 ? val.substring(0, 20) + '...' : val}
        </Button>
      ) : (
        <Tag>Sin ficha</Tag>
      ),
    },
    {
      title: 'Activo',
      dataIndex: 'activo',
      render: (val) => <Tag color={val ? 'green' : 'red'}>{val ? 'Si' : 'No'}</Tag>,
      filters: [{ text: 'Activo', value: true }, { text: 'Inactivo', value: false }],
      onFilter: (value, record) => record.activo === value,
    },
    {
      title: '', width: 100,
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          <Popconfirm title="Eliminar producto?" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 style={{ margin: 0 }}>Productos</h3>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Nuevo Producto
        </Button>
      </div>

      <Table
        dataSource={productos}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50'],
          showTotal: (total) => `${total} productos`,
        }}
        onChange={handleTableChange}
        size="middle"
      />

      <Modal
        title={editing ? 'Editar Producto' : 'Nuevo Producto'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        confirmLoading={saving}
        okText="Guardar"
        cancelText="Cancelar"
        destroyOnHidden
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="nombre" label="Nombre" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="categoria" label="Categoria">
            <Select
              placeholder="Seleccionar o crear categoria"
              allowClear
              showSearch
              optionFilterProp="label"
              options={categorias.map((c) => ({ label: c.toUpperCase(), value: c }))}
              dropdownRender={(menu) => (
                <>
                  {menu}
                  <Divider style={{ margin: '8px 0' }} />
                  <Space style={{ padding: '0 8px 4px' }}>
                    <Input
                      placeholder="Nueva categoria"
                      value={newCategoria}
                      onChange={(e) => setNewCategoria(e.target.value)}
                      onKeyDown={(e) => e.stopPropagation()}
                    />
                    <Button
                      type="text"
                      icon={<PlusOutlined />}
                      onClick={() => {
                        if (newCategoria && !categorias.some((c) => c.toLowerCase() === newCategoria.toLowerCase())) {
                          setCategorias([...categorias, newCategoria].sort((a, b) => a.localeCompare(b)));
                        }
                        if (newCategoria) form.setFieldValue('categoria', newCategoria);
                        setNewCategoria('');
                      }}
                    >
                      Crear
                    </Button>
                  </Space>
                </>
              )}
            />
          </Form.Item>
          <Form.Item name="descripcion" label="Descripcion">
            <Input.TextArea rows={3} />
          </Form.Item>
          {editing && (
            <Form.Item name="activo" label="Activo" valuePropName="checked">
              <Switch />
            </Form.Item>
          )}
          {editing && isJefe && (
            <Form.Item label="Ficha Tecnica (PDF)">
              {editing.ficha_tecnica && (
                <Space style={{ marginBottom: 8 }}>
                  <Button
                    size="small"
                    icon={<DownloadOutlined />}
                    onClick={() => productosApi.downloadFichaTecnica(editing.id, editing.ficha_tecnica)}
                  >
                    {editing.ficha_tecnica}
                  </Button>
                  <Popconfirm title="Eliminar ficha tecnica?" onConfirm={handleDeleteFicha}>
                    <Button size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </Space>
              )}
              <Upload
                accept=".pdf"
                showUploadList={false}
                beforeUpload={handleUploadFicha}
              >
                <Button icon={<UploadOutlined />} loading={uploading}>
                  {editing.ficha_tecnica ? 'Reemplazar PDF' : 'Subir PDF'}
                </Button>
              </Upload>
            </Form.Item>
          )}
        </Form>
      </Modal>
    </>
  );
}
