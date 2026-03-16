import { useState, useEffect, useCallback } from 'react';
import {
  Calendar, Badge, Modal, Form, Select, DatePicker, InputNumber, Input,
  Tag, Drawer, Button, Descriptions, Space, Popconfirm, App as AntApp, Spin,
  Checkbox, Segmented, Divider, Typography,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, BellOutlined, CheckOutlined,
  LeftOutlined, RightOutlined, WarningOutlined, CloseCircleOutlined, UndoOutlined, CheckCircleOutlined,
  VideoCameraOutlined, LinkOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
dayjs.locale('es');
import { useSearchParams } from 'react-router-dom';
import * as accionesApi from '../api/acciones';
import * as alertasApi from '../api/alertas';
import * as empresasApi from '../api/empresas';
import * as contactosApi from '../api/contactos';
import {
  TIPO_ACCION, ESTADO_ACCION, TIPO_ACCION_COLOR, ESTADO_ACCION_COLOR,
  ORIGEN_EMPRESA, toOptions, toEntityOptions,
} from '../constants/enums';

export default function CalendarioPage() {
  const [searchParams] = useSearchParams();
  const vistaInicial = searchParams.get('vista') === 'semana' ? 'week' : 'month';
  const [acciones, setAcciones] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(dayjs());
  const [viewMode, setViewMode] = useState(vistaInicial); // 'month' | 'week'
  const [empresas, setEmpresas] = useState([]);

  // Modal crear/editar accion
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAccion, setEditingAccion] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  // Modal crear/editar alerta
  const [alertaModalOpen, setAlertaModalOpen] = useState(false);
  const [editingAlerta, setEditingAlerta] = useState(null);
  const [alertaSaving, setAlertaSaving] = useState(false);
  const [alertaForm] = Form.useForm();

  // Drawer detalle accion
  const [drawerAccion, setDrawerAccion] = useState(null);

  // Drawer detalle alerta
  const [drawerAlerta, setDrawerAlerta] = useState(null);

  // Contactos para participantes
  const [contactos, setContactos] = useState([]);
  const [contactoModalOpen, setContactoModalOpen] = useState(false);
  const [contactoSaving, setContactoSaving] = useState(false);
  const [contactoForm] = Form.useForm();

  // Crear empresa inline (desde modal contacto)
  const [empresaModalOpen, setEmpresaModalOpen] = useState(false);
  const [empresaSaving, setEmpresaSaving] = useState(false);
  const [empresaForm] = Form.useForm();

  const { message } = AntApp.useApp();

  const fetchData = useCallback(async (month) => {
    setLoading(true);
    try {
      const desde = month.startOf('month').subtract(7, 'day').toDate();
      const hasta = month.endOf('month').add(7, 'day').toDate();
      const [accionesData, alertasData] = await Promise.all([
        accionesApi.calendario(desde, hasta),
        alertasApi.calendario(desde, hasta),
      ]);
      setAcciones(accionesData);
      setAlertas(alertasData);
    } catch {
      message.error('Error al cargar calendario');
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    fetchData(currentMonth);
  }, [currentMonth, fetchData]);

  useEffect(() => {
    empresasApi.list(0, 100).then((res) => setEmpresas(res.items)).catch(() => {});
    contactosApi.list({ limit: 500 }).then((res) => setContactos(res.items || res)).catch(() => {});
  }, []);

  const onPanelChange = (value) => {
    setCurrentMonth(value);
  };

  // Week helpers
  const getWeekStart = (date) => {
    const day = date.day(); // 0=Sun, 1=Mon...6=Sat
    const diff = day === 0 ? 6 : day - 1;
    return date.subtract(diff, 'day').startOf('day');
  };
  const weekStart = getWeekStart(currentMonth);
  const weekDays = Array.from({ length: 7 }, (_, i) => weekStart.add(i, 'day'));
  const DAY_NAMES = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];

  const goPrev = () => {
    setCurrentMonth(viewMode === 'week'
      ? currentMonth.subtract(7, 'day')
      : currentMonth.subtract(1, 'month'));
  };
  const goNext = () => {
    setCurrentMonth(viewMode === 'week'
      ? currentMonth.add(7, 'day')
      : currentMonth.add(1, 'month'));
  };
  const goToday = () => setCurrentMonth(dayjs());

  const headerTitle = viewMode === 'week'
    ? `${weekDays[0].format('DD MMM')} – ${weekDays[6].format('DD MMM YYYY')}`
    : currentMonth.format('MMMM YYYY');

  // Agrupar acciones por fecha (YYYY-MM-DD)
  const accionesPorDia = {};
  acciones.forEach((a) => {
    const key = dayjs(a.fecha_hora).format('YYYY-MM-DD');
    if (!accionesPorDia[key]) accionesPorDia[key] = [];
    accionesPorDia[key].push(a);
  });

  // Agrupar alertas por fecha
  const alertasPorDia = {};
  alertas.forEach((a) => {
    const key = a.fecha; // already YYYY-MM-DD string
    if (!alertasPorDia[key]) alertasPorDia[key] = [];
    alertasPorDia[key].push(a);
  });

  const hoy = dayjs().format('YYYY-MM-DD');

  // Helper: show tipo_otro when type is OTRO, otherwise show tipo
  const tipoLabel = (a) => a.tipo === 'OTRO' && a.tipo_otro ? a.tipo_otro : a.tipo;

  // Helper: show empresa razon_social (uppercase)
  const empresaRS = (a) => {
    if (a.empresa_razon_social) return a.empresa_razon_social.toUpperCase();
    if (a.empresa_id) {
      const e = empresas.find((emp) => emp.id === a.empresa_id);
      return e?.razon_social ? e.razon_social.toUpperCase() : (e?.nombre ? e.nombre.toUpperCase() : '');
    }
    return '';
  };

  const dateCellRender = (value) => {
    const key = value.format('YYYY-MM-DD');
    const dayAcciones = accionesPorDia[key] || [];
    const dayAlertas = alertasPorDia[key] || [];

    return (
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {/* Alertas first */}
        {dayAlertas.map((al) => {
          const vencida = !al.completada && al.fecha < hoy;
          return (
            <li key={`alerta-${al.id}`} style={{ marginBottom: 2 }}>
              <Badge
                color={al.completada ? 'gray' : vencida ? '#ff4d4f' : 'red'}
                text={
                  <span
                    style={{
                      fontSize: 11,
                      cursor: 'pointer',
                      textDecoration: al.completada ? 'line-through' : 'none',
                      color: al.completada ? '#999' : vencida ? '#ff4d4f' : undefined,
                      fontWeight: vencida ? 600 : undefined,
                    }}
                    onClick={(e) => { e.stopPropagation(); setDrawerAlerta(al); }}
                  >
                    {vencida ? <WarningOutlined /> : <BellOutlined />} {al.motivo.length > 20 ? al.motivo.substring(0, 20) + '...' : al.motivo}
                  </span>
                }
              />
            </li>
          );
        })}
        {/* Acciones */}
        {dayAcciones.slice(0, Math.max(1, 3 - dayAlertas.length)).map((a) => (
          <li key={`accion-${a.id}`} style={{ marginBottom: 2 }}>
            <Badge
              color={TIPO_ACCION_COLOR[a.tipo] || 'default'}
              text={
                <span
                  style={{ fontSize: 11, cursor: 'pointer' }}
                  onClick={(e) => { e.stopPropagation(); setDrawerAccion(a); }}
                >
                  {a.todo_el_dia ? '▪' : dayjs(a.fecha_hora).format('HH:mm')} {tipoLabel(a)}{empresaRS(a) ? ` - ${empresaRS(a)}` : ''}
                </span>
              }
            />
          </li>
        ))}
        {(dayAcciones.length + dayAlertas.length) > 3 && (
          <li style={{ fontSize: 11, color: '#999' }}>
            +{dayAcciones.length + dayAlertas.length - 3} mas
          </li>
        )}
      </ul>
    );
  };

  // --- Crear empresa inline (desde modal contacto) ---
  const handleCreateEmpresaInline = async () => {
    try {
      const values = await empresaForm.validateFields();
      setEmpresaSaving(true);
      const nueva = await empresasApi.create(values);
      setEmpresas((prev) => [...prev, nueva]);
      // Auto-seleccionar la nueva empresa en el form de contacto
      contactoForm.setFieldValue('empresa_id', nueva.id);
      setEmpresaModalOpen(false);
      empresaForm.resetFields();
      message.success('Empresa creada');
    } catch (err) {
      if (err.response) {
        message.error(err.response.data?.detail || 'Error al crear empresa');
      }
    } finally {
      setEmpresaSaving(false);
    }
  };

  // --- Crear contacto inline (para participantes) ---
  const handleCreateContactoInline = async () => {
    try {
      const values = await contactoForm.validateFields();
      setContactoSaving(true);
      const nuevo = await contactosApi.create(values);
      setContactos((prev) => [...prev, nuevo]);
      // Auto-seleccionar el nuevo contacto en participante_ids
      const current = form.getFieldValue('participante_ids') || [];
      form.setFieldValue('participante_ids', [...current, nuevo.id]);
      setContactoModalOpen(false);
      contactoForm.resetFields();
      message.success('Contacto creado');
    } catch (err) {
      if (err.response) {
        message.error(err.response.data?.detail || 'Error al crear contacto');
      }
    } finally {
      setContactoSaving(false);
    }
  };

  // --- Modal crear/editar ACCION ---
  const openCreateAccion = (date) => {
    setEditingAccion(null);
    form.resetFields();
    form.setFieldsValue({
      fecha_hora: date || dayjs(),
      duracion_minutos: 60,
      tipo: 'LLAMADA',
      todo_el_dia: false,
    });
    setModalOpen(true);
  };

  const openEditAccion = (accion) => {
    setEditingAccion(accion);
    form.setFieldsValue({
      ...accion,
      fecha_hora: dayjs(accion.fecha_hora),
      todo_el_dia: accion.todo_el_dia || false,
      tipo_otro: accion.tipo_otro || '',
      enlace_videollamada: accion.enlace_videollamada || '',
      participante_ids: (accion.participantes || []).map((p) => p.id),
    });
    setModalOpen(true);
    setDrawerAccion(null);
  };

  const todoElDia = Form.useWatch('todo_el_dia', form);
  const tipoWatch = Form.useWatch('tipo', form);

  const handleSaveAccion = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      let fechaHora = values.fecha_hora;
      if (values.todo_el_dia) {
        fechaHora = fechaHora.startOf('day');
      }
      const payload = {
        ...values,
        fecha_hora: fechaHora.toISOString(),
        tipo_otro: values.tipo === 'OTRO' ? values.tipo_otro : null,
        enlace_videollamada: values.tipo === 'VIDEOLLAMADA' ? values.enlace_videollamada : null,
        participante_ids: values.participante_ids || [],
      };
      if (editingAccion) {
        await accionesApi.update(editingAccion.id, payload);
        message.success('Accion actualizada');
      } else {
        await accionesApi.create(payload);
        message.success('Accion creada');
      }
      setModalOpen(false);
      fetchData(currentMonth);
    } catch (err) {
      if (err.response) {
        message.error(err.response.data?.detail || 'Error al guardar');
      } else if (!err.errorFields) {
        console.error('Error guardando acción:', err);
        message.error('Error de conexión al guardar. Intenta de nuevo.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccion = async (id) => {
    try {
      await accionesApi.remove(id);
      message.success('Accion eliminada');
      setDrawerAccion(null);
      fetchData(currentMonth);
    } catch {
      message.error('Error al eliminar');
    }
  };

  const handleQuickEstado = async (accionId, nuevoEstado) => {
    try {
      await accionesApi.update(accionId, { estado: nuevoEstado });
      message.success(`Accion marcada como ${nuevoEstado}`);
      setDrawerAccion(null);
      fetchData(currentMonth);
    } catch {
      message.error('Error al cambiar estado');
    }
  };

  // --- Modal crear/editar ALERTA ---
  const openCreateAlerta = (date) => {
    setEditingAlerta(null);
    alertaForm.resetFields();
    alertaForm.setFieldsValue({
      fecha: date || dayjs(),
    });
    setAlertaModalOpen(true);
  };

  const openEditAlerta = (alerta) => {
    setEditingAlerta(alerta);
    alertaForm.setFieldsValue({
      ...alerta,
      fecha: dayjs(alerta.fecha),
    });
    setAlertaModalOpen(true);
    setDrawerAlerta(null);
  };

  const handleSaveAlerta = async () => {
    try {
      const values = await alertaForm.validateFields();
      setAlertaSaving(true);
      const payload = {
        ...values,
        fecha: values.fecha.format('YYYY-MM-DD'),
      };
      if (editingAlerta) {
        await alertasApi.update(editingAlerta.id, payload);
        message.success('Alerta actualizada');
      } else {
        await alertasApi.create(payload);
        message.success('Alerta creada');
      }
      setAlertaModalOpen(false);
      fetchData(currentMonth);
    } catch (err) {
      if (err.response) {
        message.error(err.response.data?.detail || 'Error al guardar');
      } else if (!err.errorFields) {
        console.error('Error guardando alerta:', err);
        message.error('Error de conexión al guardar. Intenta de nuevo.');
      }
    } finally {
      setAlertaSaving(false);
    }
  };

  const handleDeleteAlerta = async (id) => {
    try {
      await alertasApi.remove(id);
      message.success('Alerta eliminada');
      setDrawerAlerta(null);
      fetchData(currentMonth);
    } catch {
      message.error('Error al eliminar');
    }
  };

  const handleToggleCompletada = async (alerta) => {
    try {
      await alertasApi.update(alerta.id, { completada: !alerta.completada });
      message.success(alerta.completada ? 'Alerta reactivada' : 'Alerta completada');
      setDrawerAlerta(null);
      fetchData(currentMonth);
    } catch {
      message.error('Error al actualizar');
    }
  };

  const empresaNombre = (id) => {
    const e = empresas.find((emp) => emp.id === id);
    return e ? e.nombre : `#${id}`;
  };

  return (
    <Spin spinning={loading}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, alignItems: 'center' }}>
        <Space size="middle">
          <h3 style={{ margin: 0 }}>Calendario</h3>
          <Segmented
            value={viewMode}
            onChange={setViewMode}
            options={[
              { label: 'Mes', value: 'month' },
              { label: 'Semana', value: 'week' },
            ]}
          />
        </Space>
        <Space>
          <Button icon={<BellOutlined />} onClick={() => openCreateAlerta()}>
            Nueva Alerta
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openCreateAccion()}>
            Nueva Accion
          </Button>
        </Space>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Button size="small" icon={<LeftOutlined />} onClick={goPrev} />
        <Button size="small" icon={<RightOutlined />} onClick={goNext} />
        <Button size="small" onClick={goToday}>Hoy</Button>
        <span style={{ fontSize: 16, fontWeight: 500, textTransform: 'capitalize' }}>{headerTitle}</span>
      </div>

      {viewMode === 'month' ? (
        <Calendar
          value={currentMonth}
          headerRender={() => null}
          cellRender={(current, info) => info.type === 'date' ? dateCellRender(current) : null}
          onPanelChange={onPanelChange}
          onSelect={(date, { source }) => {
            if (source === 'date') openCreateAccion(date);
          }}
        />
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          border: '1px solid #f0f0f0',
          overflowX: 'auto',
          minWidth: 700,
          borderRadius: 8,
          overflow: 'hidden',
        }}>
          {weekDays.map((day, idx) => {
            const key = day.format('YYYY-MM-DD');
            const dayAcciones = accionesPorDia[key] || [];
            const dayAlertas = alertasPorDia[key] || [];
            const isToday = day.isSame(dayjs(), 'day');

            return (
              <div
                key={key}
                style={{
                  borderRight: idx < 6 ? '1px solid #f0f0f0' : 'none',
                  minHeight: 400,
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div
                  style={{
                    padding: '8px 12px',
                    borderBottom: '1px solid #f0f0f0',
                    background: isToday ? '#e6f4ff' : '#fafafa',
                    textAlign: 'center',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                  onClick={() => openCreateAccion(day)}
                >
                  <div style={{ fontSize: 12, color: '#999' }}>{DAY_NAMES[idx]}</div>
                  <div style={{
                    fontSize: 18,
                    color: isToday ? '#1677ff' : undefined,
                    fontWeight: isToday ? 700 : 500,
                  }}>
                    {day.format('DD')}
                  </div>
                </div>
                <div style={{ padding: 6, flex: 1 }}>
                  {dayAlertas.map((al) => {
                    const vencida = !al.completada && al.fecha < hoy;
                    return (
                      <div
                        key={`alerta-${al.id}`}
                        style={{ marginBottom: 4, cursor: 'pointer' }}
                        onClick={() => setDrawerAlerta(al)}
                      >
                        <Badge
                          color={al.completada ? 'gray' : vencida ? '#ff4d4f' : 'red'}
                          text={
                            <span style={{
                              fontSize: 11,
                              textDecoration: al.completada ? 'line-through' : 'none',
                              color: al.completada ? '#999' : vencida ? '#ff4d4f' : undefined,
                              fontWeight: vencida ? 600 : undefined,
                            }}>
                              {vencida ? <WarningOutlined /> : <BellOutlined />} {al.motivo.length > 15 ? al.motivo.substring(0, 15) + '...' : al.motivo}
                            </span>
                          }
                        />
                      </div>
                    );
                  })}
                  {dayAcciones.map((a) => (
                    <div
                      key={`accion-${a.id}`}
                      style={{ marginBottom: 4, cursor: 'pointer' }}
                      onClick={() => setDrawerAccion(a)}
                    >
                      <Badge
                        color={TIPO_ACCION_COLOR[a.tipo] || 'default'}
                        text={
                          <span style={{ fontSize: 11 }}>
                            {a.todo_el_dia ? '▪ Todo el día' : dayjs(a.fecha_hora).format('HH:mm')} {tipoLabel(a)}{empresaRS(a) ? ` - ${empresaRS(a)}` : ''}
                          </span>
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal crear/editar accion */}
      <Modal
        title={editingAccion ? 'Editar Accion' : 'Nueva Accion'}
        open={modalOpen}
        onOk={handleSaveAccion}
        onCancel={() => setModalOpen(false)}
        confirmLoading={saving}
        okText="Guardar"
        cancelText="Cancelar"
        destroyOnHidden
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="tipo" label="Tipo" rules={[{ required: true }]}>
            <Select options={toOptions(TIPO_ACCION)} />
          </Form.Item>

          {tipoWatch === 'OTRO' && (
            <Form.Item name="tipo_otro" label="Especificar tipo" rules={[{ required: true, message: 'Especifica el tipo de acción' }]}>
              <Input placeholder="Ej: Reunión, Prospección, Oficina..." />
            </Form.Item>
          )}

          <Form.Item name="todo_el_dia" valuePropName="checked">
            <Checkbox>Todo el día</Checkbox>
          </Form.Item>

          <Form.Item name="fecha_hora" label={todoElDia ? 'Fecha' : 'Fecha y hora'} rules={[{ required: true }]}>
            <DatePicker
              showTime={!todoElDia}
              format={todoElDia ? 'DD/MM/YYYY' : 'DD/MM/YYYY HH:mm'}
              style={{ width: '100%' }}
            />
          </Form.Item>

          {!todoElDia && (
            <Form.Item name="duracion_minutos" label="Duracion (min)">
              <InputNumber min={5} max={480} style={{ width: '100%' }} />
            </Form.Item>
          )}

          <Form.Item name="empresa_id" label="Empresa">
            <Select
              allowClear
              showSearch
              placeholder="Sin empresa"
              optionFilterProp="label"
              options={toEntityOptions(empresas)}
            />
          </Form.Item>

          {editingAccion && (
            <Form.Item name="estado" label="Estado">
              <Select options={toOptions(ESTADO_ACCION)} />
            </Form.Item>
          )}

          {tipoWatch === 'VIDEOLLAMADA' && (
            <Form.Item
              name="enlace_videollamada"
              label="Enlace de videollamada"
              rules={[{ required: true, message: 'Pega el link de la videollamada' }]}
            >
              <Input
                prefix={<LinkOutlined />}
                placeholder="https://meet.google.com/... o https://zoom.us/..."
              />
            </Form.Item>
          )}

          <Form.Item name="participante_ids" label="Participantes">
            <Select
              mode="multiple"
              allowClear
              showSearch
              placeholder="Buscar contacto por nombre o empresa..."
              optionFilterProp="label"
              options={(() => {
                // Agrupar contactos por empresa
                const porEmpresa = {};
                contactos.forEach((c) => {
                  const emp = empresas.find((e) => e.id === c.empresa_id);
                  const empNombre = emp ? (emp.razon_social || emp.nombre || '').toUpperCase() : 'SIN EMPRESA';
                  if (!porEmpresa[empNombre]) porEmpresa[empNombre] = [];
                  porEmpresa[empNombre].push(c);
                });
                // Convertir a optgroup format, ordenado por empresa
                return Object.keys(porEmpresa)
                  .sort((a, b) => a.localeCompare(b))
                  .map((empNombre) => ({
                    label: empNombre,
                    options: porEmpresa[empNombre]
                      .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''))
                      .map((c) => ({
                        label: `${(c.nombre || '').toUpperCase()}${c.cargo ? ` (${c.cargo})` : ''}`,
                        value: c.id,
                      })),
                  }));
              })()}
              dropdownRender={(menu) => (
                <>
                  {menu}
                  <Divider style={{ margin: '8px 0' }} />
                  <Button
                    type="text"
                    icon={<PlusOutlined />}
                    style={{ width: '100%' }}
                    onClick={() => {
                      contactoForm.resetFields();
                      setContactoModalOpen(true);
                    }}
                  >
                    Crear nuevo contacto
                  </Button>
                </>
              )}
            />
          </Form.Item>

          <Form.Item name="descripcion" label="Descripcion">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal crear contacto inline */}
      <Modal
        title="Crear Nuevo Contacto"
        open={contactoModalOpen}
        onOk={handleCreateContactoInline}
        onCancel={() => setContactoModalOpen(false)}
        confirmLoading={contactoSaving}
        okText="Crear"
        cancelText="Cancelar"
        destroyOnHidden
      >
        <Form form={contactoForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="nombre" label="Nombre" rules={[{ required: true, message: 'El nombre es requerido' }]}>
            <Input placeholder="Nombre y apellido" />
          </Form.Item>
          <Form.Item name="empresa_id" label="Empresa" rules={[{ required: true, message: 'Selecciona una empresa' }]}>
            <Select
              showSearch
              placeholder="Selecciona empresa"
              optionFilterProp="label"
              options={toEntityOptions(empresas)}
              dropdownRender={(menu) => (
                <>
                  {menu}
                  <Divider style={{ margin: '8px 0' }} />
                  <Button
                    type="text"
                    icon={<PlusOutlined />}
                    style={{ width: '100%' }}
                    onClick={() => {
                      empresaForm.resetFields();
                      empresaForm.setFieldsValue({ origen: 'WEB' });
                      setEmpresaModalOpen(true);
                    }}
                  >
                    Crear nueva empresa
                  </Button>
                </>
              )}
            />
          </Form.Item>
          <Space style={{ width: '100%' }} size="middle">
            <Form.Item name="email" label="Email" style={{ flex: 1 }}>
              <Input placeholder="email@ejemplo.com" />
            </Form.Item>
            <Form.Item name="telefono" label="Telefono" style={{ flex: 1 }}>
              <Input placeholder="+34 600 00 00 00" />
            </Form.Item>
          </Space>
          <Form.Item name="cargo" label="Cargo">
            <Input placeholder="Ej: Director comercial" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal crear empresa inline (desde modal contacto) */}
      <Modal
        title="Crear Nueva Empresa"
        open={empresaModalOpen}
        onOk={handleCreateEmpresaInline}
        onCancel={() => setEmpresaModalOpen(false)}
        confirmLoading={empresaSaving}
        okText="Crear"
        cancelText="Cancelar"
        destroyOnHidden
      >
        <Form form={empresaForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="nombre" label="Nombre" rules={[{ required: true, message: 'El nombre es requerido' }]}>
            <Input placeholder="Nombre de la empresa" />
          </Form.Item>
          <Form.Item name="origen" label="Origen" rules={[{ required: true }]}>
            <Select options={toOptions(ORIGEN_EMPRESA)} />
          </Form.Item>
          <Space style={{ width: '100%' }} size="middle">
            <Form.Item name="ciudad" label="Ciudad" style={{ flex: 1 }}>
              <Input placeholder="Ciudad" />
            </Form.Item>
            <Form.Item name="provincia" label="Provincia" style={{ flex: 1 }}>
              <Input placeholder="Provincia" />
            </Form.Item>
          </Space>
        </Form>
      </Modal>

      {/* Modal crear/editar alerta */}
      <Modal
        title={editingAlerta ? 'Editar Alerta' : 'Nueva Alerta'}
        open={alertaModalOpen}
        onOk={handleSaveAlerta}
        onCancel={() => setAlertaModalOpen(false)}
        confirmLoading={alertaSaving}
        okText="Guardar"
        cancelText="Cancelar"
        destroyOnHidden
      >
        <Form form={alertaForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="fecha" label="Fecha" rules={[{ required: true }]}>
            <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="motivo" label="Motivo" rules={[{ required: true, message: 'El motivo es requerido' }]}>
            <Input.TextArea rows={3} placeholder="Describe el motivo de la alerta..." />
          </Form.Item>

          <Form.Item name="empresa_id" label="Empresa (opcional)">
            <Select
              allowClear
              showSearch
              placeholder="Sin empresa"
              optionFilterProp="label"
              options={toEntityOptions(empresas)}
            />
          </Form.Item>

          {editingAlerta && (
            <Form.Item name="completada" label="Completada" valuePropName="checked">
              <Checkbox>Marcar como completada</Checkbox>
            </Form.Item>
          )}
        </Form>
      </Modal>

      {/* Drawer detalle accion */}
      <Drawer
        title="Detalle de Accion"
        open={!!drawerAccion}
        onClose={() => setDrawerAccion(null)}
        size="default"
        extra={
          drawerAccion && (
          <Space>
            {drawerAccion.estado === 'PENDIENTE' && (
              <>
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  style={{ background: '#52c41a', borderColor: '#52c41a' }}
                  onClick={() => handleQuickEstado(drawerAccion.id, 'FINALIZADA')}
                >
                  Finalizar
                </Button>
                <Button
                  danger
                  icon={<CloseCircleOutlined />}
                  onClick={() => handleQuickEstado(drawerAccion.id, 'ANULADA')}
                >
                  Anular
                </Button>
              </>
            )}
            {drawerAccion.estado === 'FINALIZADA' && (
              <Button
                icon={<UndoOutlined />}
                onClick={() => handleQuickEstado(drawerAccion.id, 'PENDIENTE')}
              >
                Reactivar
              </Button>
            )}
            {drawerAccion.estado === 'ANULADA' && (
              <Button
                icon={<UndoOutlined />}
                onClick={() => handleQuickEstado(drawerAccion.id, 'PENDIENTE')}
              >
                Reactivar
              </Button>
            )}
            <Button icon={<EditOutlined />} onClick={() => openEditAccion(drawerAccion)}>
              Editar
            </Button>
            <Popconfirm
              title="Eliminar accion?"
              onConfirm={() => handleDeleteAccion(drawerAccion.id)}
            >
              <Button danger icon={<DeleteOutlined />}>Eliminar</Button>
            </Popconfirm>
          </Space>
          )
        }
      >
        {drawerAccion && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="Tipo">
              <Tag color={TIPO_ACCION_COLOR[drawerAccion.tipo]}>{tipoLabel(drawerAccion)}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Estado">
              <Tag color={ESTADO_ACCION_COLOR[drawerAccion.estado]}>{drawerAccion.estado}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Fecha">
              {drawerAccion.todo_el_dia
                ? `${dayjs(drawerAccion.fecha_hora).format('DD/MM/YYYY')} — Todo el día`
                : dayjs(drawerAccion.fecha_hora).format('DD/MM/YYYY HH:mm')}
            </Descriptions.Item>
            {!drawerAccion.todo_el_dia && (
              <Descriptions.Item label="Duracion">
                {drawerAccion.duracion_minutos} min
              </Descriptions.Item>
            )}
            <Descriptions.Item label="Empresa">
              {drawerAccion.empresa_id ? (
                <span style={{ textTransform: 'uppercase' }}>
                  {empresaRS(drawerAccion) || empresaNombre(drawerAccion.empresa_id)}
                </span>
              ) : '-'}
            </Descriptions.Item>
            {drawerAccion.enlace_videollamada && (
              <Descriptions.Item label="Enlace videollamada">
                <a href={drawerAccion.enlace_videollamada} target="_blank" rel="noopener noreferrer">
                  <VideoCameraOutlined /> {drawerAccion.enlace_videollamada}
                </a>
              </Descriptions.Item>
            )}
            {drawerAccion.participantes && drawerAccion.participantes.length > 0 && (
              <Descriptions.Item label="Participantes">
                {drawerAccion.participantes.map((p) => (
                  <div key={p.id} style={{ marginBottom: 4 }}>
                    <Typography.Text strong>{p.nombre}</Typography.Text>
                    {p.email && <Typography.Text type="secondary"> — {p.email}</Typography.Text>}
                    {p.telefono && <Typography.Text type="secondary"> — {p.telefono}</Typography.Text>}
                  </div>
                ))}
              </Descriptions.Item>
            )}
            <Descriptions.Item label="Descripcion">
              {drawerAccion.descripcion || '-'}
            </Descriptions.Item>
            {drawerAccion.es_resumida && (
              <Descriptions.Item label="Cliente (resumida)">
                {drawerAccion.nombre_cliente_resumida || '-'}
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Drawer>

      {/* Drawer detalle alerta */}
      <Drawer
        title="Detalle de Alerta"
        open={!!drawerAlerta}
        onClose={() => setDrawerAlerta(null)}
        size="default"
        extra={
          <Space>
            <Button
              icon={<CheckOutlined />}
              type={drawerAlerta?.completada ? 'default' : 'primary'}
              onClick={() => handleToggleCompletada(drawerAlerta)}
            >
              {drawerAlerta?.completada ? 'Reactivar' : 'Completar'}
            </Button>
            <Button icon={<EditOutlined />} onClick={() => openEditAlerta(drawerAlerta)}>
              Editar
            </Button>
            <Popconfirm
              title="Eliminar alerta?"
              onConfirm={() => handleDeleteAlerta(drawerAlerta.id)}
            >
              <Button danger icon={<DeleteOutlined />}>Eliminar</Button>
            </Popconfirm>
          </Space>
        }
      >
        {drawerAlerta && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="Estado">
              {drawerAlerta.completada ? (
                <Tag color="green">COMPLETADA</Tag>
              ) : !drawerAlerta.completada && drawerAlerta.fecha < hoy ? (
                <Tag color="red" icon={<WarningOutlined />}>VENCIDA</Tag>
              ) : (
                <Tag color="orange">PENDIENTE</Tag>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Fecha">
              {dayjs(drawerAlerta.fecha).format('DD/MM/YYYY')}
            </Descriptions.Item>
            <Descriptions.Item label="Motivo">
              {drawerAlerta.motivo}
            </Descriptions.Item>
            <Descriptions.Item label="Empresa">
              {drawerAlerta.empresa_id ? empresaNombre(drawerAlerta.empresa_id) : 'Sin empresa'}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
    </Spin>
  );
}
