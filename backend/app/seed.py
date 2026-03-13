"""
Seed de datos de prueba para demo con el cliente.
Ejecutar desde backend/: python -m app.seed
"""

from datetime import datetime, timedelta, timezone
from app.core.database import SessionLocal, engine, Base
from app.core.security import hash_password
from app.models.usuario import Usuario, RolEnum
from app.models.empresa import Empresa, OrigenEmpresaEnum
from app.models.empresa_comercial import EmpresaComercial
from app.models.contacto import Contacto
from app.models.producto import Producto
from app.models.oferta import Oferta, EstadoOfertaEnum
from app.models.oferta_producto import OfertaProducto
from app.models.accion import Accion, TipoAccionEnum, EstadoAccionEnum

import app.models  # noqa: registra todos los modelos


def seed():
    from sqlalchemy import text
    with engine.connect() as conn:
        conn.execute(text("DROP SCHEMA public CASCADE"))
        conn.execute(text("CREATE SCHEMA public"))
        conn.commit()
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    now = datetime.now(timezone.utc)

    # == USUARIOS =====================================================
    jefe = Usuario(
        nombre="Carlos Mendez",
        email="carlos@abisysa.com",
        password=hash_password("admin123"),
        rol=RolEnum.JEFE,
    )
    comercial1 = Usuario(
        nombre="Laura Garcia",
        email="laura@abisysa.com",
        password=hash_password("comercial123"),
        rol=RolEnum.COMERCIAL,
    )
    comercial2 = Usuario(
        nombre="Martin Lopez",
        email="martin@abisysa.com",
        password=hash_password("comercial123"),
        rol=RolEnum.COMERCIAL,
    )
    db.add_all([jefe, comercial1, comercial2])
    db.flush()

    # == PRODUCTOS ====================================================
    productos = [
        Producto(nombre="Consultoria TI", descripcion="Servicio de consultoria en tecnologia", categoria="Servicios"),
        Producto(nombre="Soporte Tecnico Anual", descripcion="Contrato de soporte 24/7", categoria="Servicios"),
        Producto(nombre="Licencia Software ERP", descripcion="Licencia anual del sistema ERP", categoria="Software"),
        Producto(nombre="Capacitacion Equipo", descripcion="Programa de capacitacion personalizado", categoria="Formacion"),
        Producto(nombre="Infraestructura Cloud", descripcion="Servicio de hosting y cloud computing", categoria="Infraestructura"),
    ]
    db.add_all(productos)
    db.flush()

    # == EMPRESAS =====================================================
    emp1 = Empresa(nombre="TechSolutions SL", ciudad="Madrid", provincia="Madrid",
                   razon_social="TechSolutions Sistemas SL",
                   notas_comerciales="Empresa de desarrollo de software con 50 empleados",
                   origen=OrigenEmpresaEnum.WEB)
    emp2 = Empresa(nombre="Grupo Alimenticio Mediterraneo", ciudad="Valencia", provincia="Valencia",
                   razon_social="Grupo Alimenticio Mediterraneo SA",
                   notas_comerciales="Distribuidora regional de alimentos",
                   origen=OrigenEmpresaEnum.FERIAS)
    emp3 = Empresa(nombre="Constructora Levante", ciudad="Sevilla", provincia="Sevilla",
                   razon_social="Constructora Levante SL",
                   notas_comerciales="Constructora con proyectos en toda Andalucia",
                   origen=OrigenEmpresaEnum.ABISYSA)
    emp4 = Empresa(nombre="Logistica Express", ciudad="Barcelona", provincia="Barcelona",
                   razon_social="Logistica Express SA",
                   notas_comerciales="Empresa de transporte y logistica nacional",
                   origen=OrigenEmpresaEnum.RRSS)
    emp5 = Empresa(nombre="Farmaceutica Vida", ciudad="Bilbao", provincia="Vizcaya",
                   razon_social="Farmaceutica Vida SL",
                   notas_comerciales="Laboratorio farmaceutico con presencia regional",
                   origen=OrigenEmpresaEnum.REFERIDO)
    emp6 = Empresa(nombre="Energia Renovable SL", ciudad="Malaga", provincia="Malaga",
                   razon_social="Energia Renovable Soluciones SL",
                   notas_comerciales="Empresa de paneles solares y energia eolica",
                   origen=OrigenEmpresaEnum.WEB)

    db.add_all([emp1, emp2, emp3, emp4, emp5, emp6])
    db.flush()

    # == EMPRESA-COMERCIAL (many-to-many) =============================
    asignaciones = [
        EmpresaComercial(empresa_id=emp1.id, comercial_id=comercial1.id),
        EmpresaComercial(empresa_id=emp2.id, comercial_id=comercial1.id),
        EmpresaComercial(empresa_id=emp3.id, comercial_id=comercial1.id),
        EmpresaComercial(empresa_id=emp4.id, comercial_id=comercial2.id),
        EmpresaComercial(empresa_id=emp5.id, comercial_id=comercial2.id),
        EmpresaComercial(empresa_id=emp6.id, comercial_id=comercial2.id),
        EmpresaComercial(empresa_id=emp1.id, comercial_id=comercial2.id),
    ]
    db.add_all(asignaciones)
    db.flush()

    # == CONTACTOS ====================================================
    c1 = Contacto(empresa_id=emp1.id, nombre="Ana Ruiz", cargo="CTO",
                  email="ana.ruiz@techsolutions.es", telefono="+34 91 555 12 34",
                  sucursal="Sede Central - Madrid")
    c2 = Contacto(empresa_id=emp1.id, nombre="Pedro Sanchez", cargo="Gerente de Compras",
                  email="pedro@techsolutions.es", telefono="+34 93 555 56 78",
                  sucursal="Oficina Barcelona")
    c3 = Contacto(empresa_id=emp2.id, nombre="Maria Fernandez", cargo="Directora General",
                  email="maria@alimentmediterraneo.es", telefono="+34 96 322 99 00",
                  sucursal="Sede Central - Valencia")
    c4 = Contacto(empresa_id=emp3.id, nombre="Jorge Martinez", cargo="Gerente de Operaciones",
                  email="jorge@constructoralevante.es", telefono="+34 95 443 11 22",
                  sucursal="Oficina Sevilla")
    c5 = Contacto(empresa_id=emp4.id, nombre="Lucia Romero", cargo="Jefa de Sistemas",
                  email="lucia@logisticaexpress.es", telefono="+34 93 456 78 90",
                  sucursal="Sede Central - Barcelona")
    c6 = Contacto(empresa_id=emp5.id, nombre="Roberto Diaz", cargo="Director Comercial",
                  email="roberto@farmavida.es", telefono="+34 94 488 33 44",
                  sucursal="Sede Central - Bilbao")
    c7 = Contacto(empresa_id=emp6.id, nombre="Valentina Torres", cargo="CEO",
                  email="valentina@energiarenovable.es", telefono="+34 95 255 66 77",
                  sucursal="Sede Central - Malaga")
    db.add_all([c1, c2, c3, c4, c5, c6, c7])
    db.flush()

    # == OFERTAS (directas a empresa, multi-producto) =================
    of1 = Oferta(empresa_id=emp1.id, estado=EstadoOfertaEnum.ENTREGADA,
                 precio_negociado=7500.0, notas="Propuesta de ERP con migracion incluida",
                 creado_por_id=comercial1.id)
    of2 = Oferta(empresa_id=emp1.id, estado=EstadoOfertaEnum.ENTREGADA,
                 precio_negociado=4500.0, condiciones_venta="Pago en 3 cuotas",
                 notas="Consultoria inicial completada", creado_por_id=comercial1.id)
    of3 = Oferta(empresa_id=emp3.id, estado=EstadoOfertaEnum.VISITAR,
                 precio_negociado=11000.0, condiciones_venta="Contrato anual renovable",
                 notas="Firmado por 1 ano", creado_por_id=comercial1.id)
    of4 = Oferta(empresa_id=emp6.id, estado=EstadoOfertaEnum.PREOFERTA,
                 notas="Pendiente elaborar propuesta", creado_por_id=comercial2.id)
    of5 = Oferta(empresa_id=emp4.id, estado=EstadoOfertaEnum.STANDBY,
                 precio_negociado=9200.0, notas="Esperando aprobacion de presupuesto del cliente",
                 creado_por_id=comercial2.id)
    of6 = Oferta(empresa_id=emp2.id, estado=EstadoOfertaEnum.PERDIDA,
                 precio_negociado=3000.0, motivo_perdida="Eligieron otro proveedor",
                 notas="No aceptaron la propuesta de cloud", creado_por_id=comercial1.id)

    db.add_all([of1, of2, of3, of4, of5, of6])
    db.flush()

    # == OFERTA-PRODUCTOS (N:M) =======================================
    db.add_all([
        OfertaProducto(oferta_id=of1.id, producto_id=productos[2].id, cantidad=1, precio_unitario=5000.0),
        OfertaProducto(oferta_id=of1.id, producto_id=productos[0].id, cantidad=1, precio_unitario=2500.0),
        OfertaProducto(oferta_id=of2.id, producto_id=productos[0].id, cantidad=1, precio_unitario=4500.0),
        OfertaProducto(oferta_id=of3.id, producto_id=productos[1].id, cantidad=1, precio_unitario=11000.0),
        OfertaProducto(oferta_id=of4.id, producto_id=productos[0].id, cantidad=1),
        OfertaProducto(oferta_id=of4.id, producto_id=productos[4].id, cantidad=1),
        OfertaProducto(oferta_id=of5.id, producto_id=productos[2].id, cantidad=1, precio_unitario=9200.0),
        OfertaProducto(oferta_id=of6.id, producto_id=productos[4].id, cantidad=1, precio_unitario=3000.0),
    ])
    db.flush()

    # == ACCIONES =====================================================
    acciones = [
        Accion(empresa_id=emp1.id, contacto_id=c1.id, tipo=TipoAccionEnum.LLAMADA,
               estado=EstadoAccionEnum.FINALIZADA, fecha_hora=now - timedelta(days=15, hours=2),
               duracion_minutos=30, descripcion="Primer contacto con Ana Ruiz. Interesados en modernizar su ERP.",
               creado_por_id=comercial1.id),
        Accion(empresa_id=emp1.id, contacto_id=c1.id, tipo=TipoAccionEnum.VISITA,
               estado=EstadoAccionEnum.FINALIZADA, fecha_hora=now - timedelta(days=10, hours=4),
               duracion_minutos=90, descripcion="Reunion presencial con CTO. Presentamos portafolio completo.",
               creado_por_id=comercial1.id),
        Accion(empresa_id=emp1.id, contacto_id=c2.id, tipo=TipoAccionEnum.VISITA,
               estado=EstadoAccionEnum.FINALIZADA, fecha_hora=now - timedelta(days=5, hours=3),
               duracion_minutos=60, descripcion="Visita a oficina Barcelona. Pedro reviso propuesta.",
               creado_por_id=comercial1.id),
        Accion(empresa_id=emp1.id, contacto_id=c1.id, tipo=TipoAccionEnum.SEGUIMIENTO,
               estado=EstadoAccionEnum.PENDIENTE, fecha_hora=now + timedelta(days=2, hours=5),
               duracion_minutos=30, descripcion="Llamada de seguimiento. Esperando respuesta sobre ERP.",
               creado_por_id=comercial1.id),
        Accion(empresa_id=emp2.id, contacto_id=c3.id, tipo=TipoAccionEnum.LLAMADA,
               estado=EstadoAccionEnum.FINALIZADA, fecha_hora=now - timedelta(days=8, hours=1),
               duracion_minutos=20, descripcion="Contacto inicial con Maria. Necesitan cloud.",
               creado_por_id=comercial1.id),
        Accion(empresa_id=emp3.id, contacto_id=c4.id, tipo=TipoAccionEnum.VISITA,
               estado=EstadoAccionEnum.FINALIZADA, fecha_hora=now - timedelta(days=30, hours=6),
               duracion_minutos=120, descripcion="Presentacion inicial del servicio de soporte.",
               creado_por_id=comercial1.id),
        Accion(empresa_id=emp4.id, contacto_id=c5.id, tipo=TipoAccionEnum.LLAMADA,
               estado=EstadoAccionEnum.FINALIZADA, fecha_hora=now - timedelta(days=5, hours=2),
               duracion_minutos=25, descripcion="Primer contacto con Lucia. Buscan ERP para flota.",
               creado_por_id=comercial2.id),
        Accion(empresa_id=emp4.id, contacto_id=c5.id, tipo=TipoAccionEnum.VISITA,
               estado=EstadoAccionEnum.PENDIENTE, fecha_hora=now + timedelta(days=3, hours=4),
               duracion_minutos=90, descripcion="Visita programada a sede Barcelona.",
               creado_por_id=comercial2.id),
        Accion(empresa_id=emp6.id, contacto_id=c7.id, tipo=TipoAccionEnum.VISITA,
               estado=EstadoAccionEnum.FINALIZADA, fecha_hora=now - timedelta(days=7, hours=3),
               duracion_minutos=60, descripcion="Reunion virtual con Valentina. Quieren digitalizar procesos.",
               creado_por_id=comercial2.id),
        Accion(tipo=TipoAccionEnum.OTRO, estado=EstadoAccionEnum.PENDIENTE,
               fecha_hora=now + timedelta(days=1, hours=2), duracion_minutos=120,
               descripcion="Preparar presupuesto Logistica Express", es_resumida=True,
               nombre_cliente_resumida="Logistica Express", creado_por_id=comercial2.id),
    ]
    db.add_all(acciones)

    db.commit()
    db.close()

    print("[OK] Seed v3 completado:")
    print("   3 usuarios (1 jefe + 2 comerciales)")
    print("   5 productos")
    print("   6 empresas (1 compartida entre Laura y Martin)")
    print("   7 asignaciones empresa-comercial")
    print("   7 contactos (con sucursal)")
    print("   6 ofertas (directas a empresa, multi-producto)")
    print("   8 oferta-productos (relacion N:M)")
    print("   10 acciones (8 normales + 1 futura + 1 resumida)")
    print()
    print("Credenciales de prueba:")
    print("   JEFE:      carlos@abisysa.com / admin123")
    print("   COMERCIAL: laura@abisysa.com  / comercial123")
    print("   COMERCIAL: martin@abisysa.com / comercial123")


if __name__ == "__main__":
    seed()
