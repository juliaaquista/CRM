import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Table, Button, Modal, Form, Input, Select, Tag, Space, Popconfirm, Upload, App as AntApp,
  Segmented, Divider, Alert, List, Typography,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined,
  DownloadOutlined, UploadOutlined, EnvironmentOutlined, UnorderedListOutlined,
  SearchOutlined, WarningOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import * as empresasApi from '../api/empresas';
import * as sucursalesApi from '../api/sucursales';
import * as contactosApi from '../api/contactos';
import { ORIGEN_EMPRESA, toOptions } from '../constants/enums';
import { useAuth } from '../context/AuthContext';
import MapaEmpresas from '../components/empresas/MapaEmpresas';
import EmptyState from '../components/layout/EmptyState';
import TableSkeleton from '../components/layout/TableSkeleton';
import { ShopOutlined } from '@ant-design/icons';
import { formatPhone } from '../utils/phoneFormat';
import usePersistedState from '../hooks/usePersistedState';

const ORIGEN_COLOR = {
  WEB: 'blue', FERIAS: 'green', RRSS: 'purple',
  ABISYSA: '#13468A', REFERIDO: 'cyan', PROSPECCION: 'orange', OTRO: 'default',
};

const DEFAULT_PAGE_SIZE = 50;

export default function EmpresasPage() {
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [firstLoad, setFirstLoad] = useState(true);
  const [persistedPageSize, setPersistedPageSize] = usePersistedState('empresas:pageSize', DEFAULT_PAGE_SIZE);
  const [pagination, setPagination] = useState({ current: 1, pageSize: persistedPageSize, total: 0 });
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [viewMode, setViewMode] = usePersistedState('empresas:viewMode', 'tabla'); // 'tabla' | 'mapa'
  const [allEmpresas, setAllEmpresas] = useState([]);
  const [allSucursales, setAllSucursales] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [matchedEmpresas, setMatchedEmpresas] = useState([]);
  const [searchingNombre, setSearchingNombre] = useState(false);
  const debounceRef = useRef(null);
  const navigate = useNavigate();
  const { message } = AntApp.useApp();
  const { isJefe } = useAuth();

  // Búsqueda predictiva al escribir nombre de empresa
  const handleNombreChange = useCallback((e) => {
    const val = e.target.value;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!val || val.length < 2) {
      setMatchedEmpresas([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearchingNombre(true);
      try {
        const results = await empresasApi.search(val);
        setMatchedEmpresas(results);
      } catch {
        setMatchedEmpresas([]);
      } finally {
        setSearchingNombre(false);
      }
    }, 300);
  }, []);

  const fetchEmpresas = async (page = 1, pageSize = persistedPageSize, q = searchText) => {
    setLoading(true);
    try {
      const skip = (page - 1) * pageSize;
      const res = await empresasApi.list(skip, pageSize, q || null);
      setEmpresas(res.items);
      setPagination({ current: page, pageSize, total: res.total });
    } catch {
      message.error('Error al cargar empresas');
    } finally {
      setLoading(false);
      setFirstLoad(false);
    }
  };

  useEffect(() => { fetchEmpresas(); }, []);

  // Atajo Ctrl+N → Nueva empresa
  useEffect(() => {
    const onShortcut = (e) => { if (e.detail.key === 'new') openCreate(); };
    window.addEventListener('crm:shortcut', onShortcut);
    return () => window.removeEventListener('crm:shortcut', onShortcut);
  }, []);

  // Cargar todas las empresas y sucursales para el mapa (sin paginacion)
  useEffect(() => {
    if (viewMode === 'mapa') {
      empresasApi.list(0, 100).then((res) => setAllEmpresas(res.items)).catch(() => {});
      sucursalesApi.listAll().then((data) => setAllSucursales(data)).catch(() => {});
    }
  }, [viewMode]);

  const handleTableChange = (pag) => {
    if (pag.pageSize !== persistedPageSize) setPersistedPageSize(pag.pageSize);
    fetchEmpresas(pag.current, pag.pageSize, searchText);
  };

  const handleSearch = (value) => {
    setSearchText(value);
    fetchEmpresas(1, pagination.pageSize, value || null);
  };

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ origen: 'WEB' });
    setMatchedEmpresas([]);
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

      // Separar campos de contacto de los de empresa
      const { contacto_nombre, contacto_cargo, contacto_email, contacto_telefono, contacto_sucursal, ...empresaValues } = values;

      if (editing) {
        await empresasApi.update(editing.id, empresaValues);
        message.success('Empresa actualizada');
      } else {
        const nuevaEmpresa = await empresasApi.create(empresaValues);

        // Si se llenó al menos el nombre del contacto, crearlo automáticamente
        if (contacto_nombre) {
          try {
            await contactosApi.create({
              empresa_id: nuevaEmpresa.id,
              nombre: contacto_nombre,
              cargo: contacto_cargo || null,
              email: contacto_email || null,
              telefono: contacto_telefono || null,
              sucursal: contacto_sucursal || null,
            });
            message.success('Empresa y contacto creados');
          } catch {
            message.success('Empresa creada');
            message.warning('No se pudo crear el contacto');
          }
        } else {
          message.success('Empresa creada');
        }
      }
      setModalOpen(false);
      fetchEmpresas(pagination.current, pagination.pageSize);
    } catch (err) {
      // err sin .response ni .errorFields = error de red/timeout
      if (err.response) {
        message.error(err.response.data?.detail || 'Error al guardar');
      } else if (!err.errorFields) {
        console.error('Error creando empresa:', err);
        message.error('Error de conexión al guardar. Intenta de nuevo.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await empresasApi.remove(id);
      message.success('Empresa eliminada');
      fetchEmpresas(pagination.current, pagination.pageSize);
    } catch {
      message.error('Error al eliminar');
    }
  };

  const handleExport = async () => {
    try {
      await empresasApi.exportarExcel();
      message.success('Excel exportado');
    } catch {
      message.error('Error al exportar');
    }
  };

  const handleImport = async (file) => {
    setImporting(true);
    try {
      const result = await empresasApi.importarExcel(file);
      setImportResult(result);
      if (result.creadas > 0) {
        message.success(`${result.creadas} empresa(s) importada(s)`);
        fetchEmpresas(1, pagination.pageSize);
      }
      if (result.errores.length > 0) {
        message.warning(`${result.errores.length} error(es) durante la importacion`);
      }
    } catch (err) {
      message.error(err.response?.data?.detail || 'Error al importar');
    } finally {
      setImporting(false);
    }
    return false; // Prevent default upload
  };

  const columns = [
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      sorter: (a, b) => a.nombre.localeCompare(b.nombre),
      render: (val) => <span style={{ textTransform: 'uppercase' }}>{val}</span>,
    },
    {
      title: 'Ciudad', dataIndex: 'ciudad',
      sorter: (a, b) => (a.ciudad || '').localeCompare(b.ciudad || ''),
    },
    {
      title: 'Provincia', dataIndex: 'provincia',
      sorter: (a, b) => (a.provincia || '').localeCompare(b.provincia || ''),
    },
    {
      title: 'Razon Social', dataIndex: 'razon_social', ellipsis: true,
      sorter: (a, b) => (a.razon_social || '').localeCompare(b.razon_social || ''),
      render: (val) => <span style={{ textTransform: 'uppercase' }}>{val || '-'}</span>,
    },
    {
      title: 'Comercial',
      dataIndex: 'comerciales_nombres',
      ellipsis: true,
      render: (val) => val || '-',
      sorter: (a, b) => (a.comerciales_nombres || '').localeCompare(b.comerciales_nombres || ''),
    },
    {
      title: 'Origen',
      dataIndex: 'origen',
      filters: Object.values(ORIGEN_EMPRESA).map((v) => ({ text: v, value: v })),
      onFilter: (value, record) => record.origen === value,
      render: (val) => <Tag color={ORIGEN_COLOR[val]}>{val}</Tag>,
    },
    {
      title: 'Creada',
      dataIndex: 'creado_en',
      render: (val) => val ? dayjs(val).format('DD/MM/YYYY') : '-',
      sorter: (a, b) => new Date(a.creado_en) - new Date(b.creado_en),
    },
    {
      title: 'Acciones',
      width: isJefe ? 150 : 60,
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/empresas/${record.id}`)} />
          {isJefe && (
            <>
              <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
              <Popconfirm title="Eliminar empresa?" onConfirm={() => handleDelete(record.id)}>
                <Button size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' }}>
        <Space size="middle">
          <h3 style={{ margin: 0 }}>Empresas</h3>
          <Segmented
            value={viewMode}
            onChange={setViewMode}
            options={[
              { label: 'Tabla', value: 'tabla', icon: <UnorderedListOutlined /> },
              { label: 'Mapa', value: 'mapa', icon: <EnvironmentOutlined /> },
            ]}
          />
          <Input.Search
            placeholder="Buscar empresa..."
            allowClear
            onSearch={handleSearch}
            style={{ width: 250 }}
            prefix={<SearchOutlined />}
          />
        </Space>
        <Space>
          <Button icon={<DownloadOutlined />} onClick={handleExport}>
            Exportar Excel
          </Button>
          {isJefe && (
            <Upload
              accept=".xlsx,.xls"
              showUploadList={false}
              beforeUpload={handleImport}
              disabled={importing}
            >
              <Button icon={<UploadOutlined />} loading={importing}>
                Importar Excel
              </Button>
            </Upload>
          )}
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Nueva Empresa
          </Button>
        </Space>
      </div>

      {viewMode === 'tabla' && firstLoad && loading && (
        <TableSkeleton rows={8} columns={7} />
      )}
      {viewMode === 'tabla' && !(firstLoad && loading) && (
        <Table
          dataSource={empresas}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            pageSizeOptions: ['20', '50', '100'],
            showTotal: (total) => `${total} empresas`,
          }}
          onChange={handleTableChange}
          size="middle"
          locale={{
            emptyText: !loading && (
              <EmptyState
                icon={<ShopOutlined />}
                title={searchText ? 'Sin resultados' : 'Sin empresas'}
                description={
                  searchText
                    ? `No se encontraron empresas que coincidan con "${searchText}"`
                    : 'Todavía no hay empresas cargadas. Empezá creando la primera.'
                }
                actionLabel={!searchText ? 'Nueva empresa' : undefined}
                onAction={!searchText ? openCreate : undefined}
              />
            ),
          }}
        />
      )}
      {viewMode !== 'tabla' && (
        <MapaEmpresas
          empresas={allEmpresas}
          sucursales={allSucursales}
          onVerDetalle={(id) => navigate(`/empresas/${id}`)}
        />
      )}

      <Modal
        title={editing ? 'Editar Empresa' : 'Nueva Empresa'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        confirmLoading={saving}
        okText="Guardar"
        cancelText="Cancelar"
        destroyOnHidden
        width={editing ? 520 : 600}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="nombre" label="Nombre" rules={[{ required: true, message: 'Requerido' }]}>
            <Input
              onChange={!editing ? handleNombreChange : undefined}
              autoComplete="off"
            />
          </Form.Item>
          {!editing && matchedEmpresas.length > 0 && (
            <Alert
              type="warning"
              showIcon
              icon={<WarningOutlined />}
              title="Empresas similares encontradas"
              description={
                <List
                  size="small"
                  dataSource={matchedEmpresas}
                  renderItem={(emp) => (
                    <List.Item
                      style={{ padding: '4px 0', cursor: 'pointer' }}
                      onClick={() => {
                        setModalOpen(false);
                        navigate(`/empresas/${emp.id}`);
                      }}
                    >
                      <Typography.Text strong style={{ textTransform: 'uppercase' }}>
                        {emp.razon_social || emp.nombre}
                      </Typography.Text>
                      {emp.ciudad && (
                        <Typography.Text type="secondary" style={{ marginLeft: 8 }}>
                          — {emp.ciudad}
                        </Typography.Text>
                      )}
                      <Typography.Link style={{ marginLeft: 'auto' }}>
                        Ver empresa →
                      </Typography.Link>
                    </List.Item>
                  )}
                />
              }
              style={{ marginBottom: 16 }}
            />
          )}
          <Form.Item name="razon_social" label="Razon Social">
            <Input />
          </Form.Item>
          <Form.Item name="direccion" label="Direccion">
            <Input placeholder="Ej: Calle Mayor 15, 2o B" />
          </Form.Item>
          <Space style={{ width: '100%' }} size="middle">
            <Form.Item name="ciudad" label="Ciudad" style={{ flex: 1 }}>
              <Input />
            </Form.Item>
            <Form.Item name="provincia" label="Provincia" style={{ flex: 1 }}>
              <Input />
            </Form.Item>
          </Space>
          <Form.Item name="notas_comerciales" label="Notas comerciales">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="origen" label="Origen" rules={[{ required: true }]}>
            <Select options={toOptions(ORIGEN_EMPRESA)} />
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.origen !== cur.origen}>
            {({ getFieldValue }) =>
              ['REFERIDO', 'OTRO'].includes(getFieldValue('origen')) ? (
                <Form.Item name="origen_detalle" label="Especificar origen">
                  <Input placeholder="Ej: Recomendado por cliente X..." />
                </Form.Item>
              ) : null
            }
          </Form.Item>

          {/* Sección contacto — solo al crear */}
          {!editing && (
            <>
              <Divider orientation="left" style={{ fontSize: 13 }}>
                Contacto principal (opcional)
              </Divider>
              <Form.Item name="contacto_nombre" label="Nombre del contacto">
                <Input placeholder="Nombre y apellido" />
              </Form.Item>
              <Space style={{ width: '100%' }} size="middle">
                <Form.Item name="contacto_cargo" label="Cargo" style={{ flex: 1 }}>
                  <Input placeholder="Ej: Director comercial" />
                </Form.Item>
                <Form.Item name="contacto_sucursal" label="Sucursal" style={{ flex: 1 }}>
                  <Input placeholder="Ej: Madrid central" />
                </Form.Item>
              </Space>
              <Space style={{ width: '100%' }} size="middle">
                <Form.Item name="contacto_email" label="Email" style={{ flex: 1 }}>
                  <Input placeholder="email@ejemplo.com" />
                </Form.Item>
                <Form.Item name="contacto_telefono" label="Telefono" style={{ flex: 1 }}>
                  <Input
                    placeholder="+34 600 00 00 00"
                    onBlur={() => {
                      const val = form.getFieldValue('contacto_telefono');
                      if (val) form.setFieldValue('contacto_telefono', formatPhone(val));
                    }}
                  />
                </Form.Item>
              </Space>
            </>
          )}
        </Form>
      </Modal>

      {/* Modal resultado de importacion */}
      <Modal
        title="Resultado de Importacion"
        open={!!importResult}
        onOk={() => setImportResult(null)}
        onCancel={() => setImportResult(null)}
        cancelButtonProps={{ style: { display: 'none' } }}
        okText="Cerrar"
      >
        {importResult && (
          <>
            <p><strong>{importResult.creadas}</strong> empresa(s) creada(s) exitosamente.</p>
            {importResult.errores.length > 0 && (
              <>
                <p style={{ color: '#f5222d' }}><strong>{importResult.errores.length}</strong> error(es):</p>
                <ul style={{ maxHeight: 200, overflow: 'auto' }}>
                  {importResult.errores.map((e, i) => (
                    <li key={i}>Fila {e.fila}: {e.error}</li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </Modal>
    </>
  );
}
