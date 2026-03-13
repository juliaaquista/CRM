import { useState, useEffect } from 'react';
import {
  Table, Button, Modal, Form, Input, Select, Tag, Space, Popconfirm,
  App as AntApp, Tooltip,
} from 'antd';
import {
  PlusOutlined, EditOutlined, LockOutlined, StopOutlined, CheckCircleOutlined,
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import * as authApi from '../api/auth';
import { ROL, toOptions } from '../constants/enums';

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modal crear
  const [createOpen, setCreateOpen] = useState(false);
  const [createSaving, setCreateSaving] = useState(false);
  const [createForm] = Form.useForm();

  // Modal editar
  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editForm] = Form.useForm();
  const [editingUser, setEditingUser] = useState(null);

  // Modal password
  const [pwdOpen, setPwdOpen] = useState(false);
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdForm] = Form.useForm();
  const [pwdUser, setPwdUser] = useState(null);

  const { isJefe, user: currentUser } = useAuth();
  const navigate = useNavigate();
  const { message } = AntApp.useApp();

  useEffect(() => {
    if (!isJefe) {
      navigate('/calendario', { replace: true });
      return;
    }
    fetchUsuarios();
  }, []);

  const fetchUsuarios = async () => {
    setLoading(true);
    try {
      const data = await authApi.listUsuarios();
      setUsuarios(data);
    } catch {
      message.error('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  /* ---------- Crear ---------- */
  const handleCreate = async () => {
    try {
      const values = await createForm.validateFields();
      setCreateSaving(true);
      await authApi.registrarUsuario(values);
      message.success('Usuario creado');
      setCreateOpen(false);
      fetchUsuarios();
    } catch (err) {
      if (err.response) message.error(err.response.data?.detail || 'Error');
    } finally {
      setCreateSaving(false);
    }
  };

  /* ---------- Editar ---------- */
  const openEdit = (record) => {
    setEditingUser(record);
    editForm.setFieldsValue({
      nombre: record.nombre,
      email: record.email,
      rol: record.rol,
    });
    setEditOpen(true);
  };

  const handleEdit = async () => {
    try {
      const values = await editForm.validateFields();
      setEditSaving(true);
      await authApi.updateUsuario(editingUser.id, values);
      message.success('Usuario actualizado');
      setEditOpen(false);
      fetchUsuarios();
    } catch (err) {
      if (err.response) message.error(err.response.data?.detail || 'Error');
    } finally {
      setEditSaving(false);
    }
  };

  /* ---------- Activar / Desactivar ---------- */
  const handleToggleActivo = async (record) => {
    try {
      await authApi.updateUsuario(record.id, { activo: !record.activo });
      message.success(record.activo ? 'Usuario desactivado' : 'Usuario activado');
      fetchUsuarios();
    } catch (err) {
      message.error(err.response?.data?.detail || 'Error al cambiar estado');
    }
  };

  /* ---------- Cambiar password ---------- */
  const openPwd = (record) => {
    setPwdUser(record);
    pwdForm.resetFields();
    setPwdOpen(true);
  };

  const handlePwd = async () => {
    try {
      const values = await pwdForm.validateFields();
      setPwdSaving(true);
      await authApi.resetPassword(pwdUser.id, values.nueva_password);
      message.success('Contraseña actualizada');
      setPwdOpen(false);
    } catch (err) {
      if (err.response) message.error(err.response.data?.detail || 'Error');
    } finally {
      setPwdSaving(false);
    }
  };

  /* ---------- Columnas ---------- */
  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: 'Nombre', dataIndex: 'nombre' },
    { title: 'Email', dataIndex: 'email' },
    {
      title: 'Rol', dataIndex: 'rol',
      render: (val) => <Tag color={val === 'JEFE' ? 'purple' : 'blue'}>{val}</Tag>,
    },
    {
      title: 'Estado', dataIndex: 'activo',
      render: (val) => <Tag color={val ? 'green' : 'red'}>{val ? 'Activo' : 'Inactivo'}</Tag>,
    },
    {
      title: 'Acciones', key: 'acciones', width: 200,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Editar">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEdit(record)}
            />
          </Tooltip>
          <Tooltip title="Cambiar contraseña">
            <Button
              size="small"
              icon={<LockOutlined />}
              onClick={() => openPwd(record)}
            />
          </Tooltip>
          {record.id !== currentUser?.id && (
            <Popconfirm
              title={record.activo ? 'Desactivar usuario?' : 'Activar usuario?'}
              description={record.activo
                ? 'El usuario no podrá iniciar sesión.'
                : 'El usuario podrá iniciar sesión nuevamente.'}
              onConfirm={() => handleToggleActivo(record)}
              okText="Sí"
              cancelText="No"
            >
              <Tooltip title={record.activo ? 'Desactivar' : 'Activar'}>
                <Button
                  size="small"
                  danger={record.activo}
                  icon={record.activo ? <StopOutlined /> : <CheckCircleOutlined />}
                />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 style={{ margin: 0 }}>Usuarios</h3>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { createForm.resetFields(); setCreateOpen(true); }}>
          Nuevo Usuario
        </Button>
      </div>

      <Table
        dataSource={usuarios}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={false}
        size="middle"
      />

      {/* Modal Crear */}
      <Modal
        title="Nuevo Usuario"
        open={createOpen}
        onOk={handleCreate}
        onCancel={() => setCreateOpen(false)}
        confirmLoading={createSaving}
        okText="Crear"
        cancelText="Cancelar"
        destroyOnHidden
      >
        <Form form={createForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="nombre" label="Nombre" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true }, { type: 'email' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="password" label="Contraseña" rules={[{ required: true, min: 6 }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="rol" label="Rol" rules={[{ required: true }]}>
            <Select options={toOptions(ROL)} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Editar */}
      <Modal
        title={`Editar: ${editingUser?.nombre || ''}`}
        open={editOpen}
        onOk={handleEdit}
        onCancel={() => setEditOpen(false)}
        confirmLoading={editSaving}
        okText="Guardar"
        cancelText="Cancelar"
        destroyOnHidden
      >
        <Form form={editForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="nombre" label="Nombre" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true }, { type: 'email' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="rol" label="Rol" rules={[{ required: true }]}>
            <Select options={toOptions(ROL)} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Cambiar Contraseña */}
      <Modal
        title={`Cambiar contraseña: ${pwdUser?.nombre || ''}`}
        open={pwdOpen}
        onOk={handlePwd}
        onCancel={() => setPwdOpen(false)}
        confirmLoading={pwdSaving}
        okText="Cambiar"
        cancelText="Cancelar"
        destroyOnHidden
      >
        <Form form={pwdForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="nueva_password"
            label="Nueva contraseña"
            rules={[{ required: true, min: 6, message: 'Mínimo 6 caracteres' }]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item
            name="confirmar_password"
            label="Confirmar contraseña"
            dependencies={['nueva_password']}
            rules={[
              { required: true, message: 'Confirma la contraseña' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('nueva_password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Las contraseñas no coinciden'));
                },
              }),
            ]}
          >
            <Input.Password />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
