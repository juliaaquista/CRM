"""
Script de test para todos los endpoints v2 del CRM.
Incluye tests de mejoras: FK SET NULL, registro protegido, calendario datetime.
"""
import requests
import json

BASE = "http://localhost:8002/api"
OK_COUNT = 0
FAIL_COUNT = 0

def login(email, password):
    r = requests.post(f"{BASE}/auth/login", data={"username": email, "password": password})
    assert r.status_code == 200, f"Login failed for {email}: {r.status_code} {r.text}"
    return r.json()["access_token"]

def h(token):
    return {"Authorization": f"Bearer {token}"}

def test(method, url, token, expected_status=200, json_data=None, label=""):
    global OK_COUNT, FAIL_COUNT
    fn = getattr(requests, method.lower())
    kwargs = {"headers": h(token)}
    if json_data:
        kwargs["json"] = json_data
    r = fn(f"{BASE}{url}", **kwargs)
    if r.status_code == expected_status:
        OK_COUNT += 1
        print(f"  [OK]   {method} {url} -> {r.status_code} {label}")
    else:
        FAIL_COUNT += 1
        print(f"  [FAIL] {method} {url} -> {r.status_code} (expected {expected_status}) {label}")
        print(f"         Response: {r.text[:200]}")
    return r

# ==================== LOGIN ====================
print("=== 1. AUTH ===")
JEFE = login("carlos@abisysa.com", "admin123")
print("  [OK]   Login JEFE (Carlos)")
LAURA = login("laura@abisysa.com", "comercial123")
print("  [OK]   Login COMERCIAL (Laura)")
MARTIN = login("martin@abisysa.com", "comercial123")
print("  [OK]   Login COMERCIAL (Martin)")

r = test("GET", "/auth/me", JEFE, 200, label="- jefe")
me = r.json()
assert me["rol"] == "JEFE"

r = test("GET", "/auth/me", LAURA, 200, label="- laura")
r = test("GET", "/auth/me", None, 401, label="- sin token")

# Registro protegido (fix #7)
r = test("POST", "/auth/registro", LAURA, 403, json_data={
    "nombre": "Intruso", "email": "intruso@test.com", "password": "hack123", "rol": "JEFE"
}, label="- comercial NO puede registrar usuarios")

r = test("POST", "/auth/registro", JEFE, 201, json_data={
    "nombre": "NuevoUser", "email": "nuevo@abisysa.com", "password": "test123", "rol": "COMERCIAL"
}, label="- jefe SI puede registrar usuarios")

# Registro sin token -> 401
r = test("POST", "/auth/registro", None, 401, json_data={
    "nombre": "Anonimo", "email": "anonimo@test.com", "password": "test123", "rol": "COMERCIAL"
}, label="- sin token NO puede registrar")
print()

# ==================== EMPRESAS ====================
print("=== 2. EMPRESAS ===")
r = test("GET", "/empresas/", JEFE, 200, label="- jefe ve todas")
empresas_jefe = r.json()
print(f"         Jefe ve {len(empresas_jefe)} empresas")
assert len(empresas_jefe) == 6

r = test("GET", "/empresas/", LAURA, 200, label="- laura ve sus asignadas")
print(f"         Laura ve {len(r.json())} empresas")

r = test("GET", "/empresas/", MARTIN, 200, label="- martin ve sus asignadas")
print(f"         Martin ve {len(r.json())} empresas")

r = test("GET", "/empresas/1", JEFE, 200, label="- get by id")

# CRUD
r = test("POST", "/empresas/", JEFE, 201, json_data={
    "nombre": "EmpresaTest", "ciudad": "TestCity", "pais": "TestPais", "origen": "WEB"
}, label="- crear empresa")
new_emp_id = r.json()["id"]

r = test("PUT", f"/empresas/{new_emp_id}", JEFE, 200, json_data={
    "nombre": "EmpresaTestModificada"
}, label="- actualizar empresa")

r = test("DELETE", f"/empresas/{new_emp_id}", JEFE, 204, label="- eliminar empresa nueva")

# CASCADE test: empresa con contacto + accion
r = test("POST", "/empresas/", JEFE, 201, json_data={
    "nombre": "CascadeTest", "ciudad": "Test", "pais": "Test", "origen": "OTRO"
}, label="- crear empresa cascade test")
cascade_emp_id = r.json()["id"]

r = test("POST", "/contactos/", JEFE, 201, json_data={
    "empresa_id": cascade_emp_id, "nombre": "ContactoCascade", "cargo": "Test"
}, label="- contacto en empresa cascade")

r = test("POST", "/acciones/", JEFE, 201, json_data={
    "empresa_id": cascade_emp_id, "tipo": "LLAMADA",
    "fecha_hora": "2026-03-10T10:00:00Z", "duracion_minutos": 15,
    "descripcion": "Accion cascade test"
}, label="- accion en empresa cascade")

r = test("DELETE", f"/empresas/{cascade_emp_id}", JEFE, 204, label="- DELETE empresa con hijos (CASCADE)")
r = test("GET", f"/empresas/{cascade_emp_id}", JEFE, 404, label="- verificar eliminada")
print()

# ==================== COMERCIALES ====================
print("=== 3. COMERCIALES ===")
r = test("GET", "/empresas/1/comerciales", JEFE, 200, label="- listar comerciales emp1")
print(f"         Emp1 tiene {len(r.json())} comerciales")

r = test("POST", "/empresas/2/comerciales", JEFE, 201, json_data={
    "comercial_id": 1
}, label="- asignar jefe a emp2")

r = test("POST", "/empresas/2/comerciales", JEFE, 400, json_data={
    "comercial_id": 1
}, label="- duplicado rechazado")

r = test("DELETE", "/empresas/2/comerciales/1", JEFE, 204, label="- desasignar")

r = test("POST", "/empresas/1/comerciales", LAURA, 403, json_data={
    "comercial_id": 3
}, label="- comercial no puede asignar")
print()

# ==================== CONTACTOS ====================
print("=== 4. CONTACTOS ===")
r = test("GET", "/contactos/", JEFE, 200, label="- jefe ve todos")
print(f"         {len(r.json())} contactos")

r = test("GET", "/contactos/", LAURA, 200, label="- laura ve suyos")
r = test("GET", "/contactos/?empresa_id=1", JEFE, 200, label="- filtrar por empresa")

r = test("GET", "/contactos/1", JEFE, 200, label="- get by id")
assert "sucursal" in r.json()
print(f"         Sucursal: {r.json().get('sucursal')}")

r = test("POST", "/contactos/", JEFE, 201, json_data={
    "empresa_id": 1, "nombre": "TestContacto", "sucursal": "Oficina Test"
}, label="- crear con sucursal")
new_c_id = r.json()["id"]

r = test("PUT", f"/contactos/{new_c_id}", JEFE, 200, json_data={
    "nombre": "TestContactoMod"
}, label="- actualizar")

# Test DELETE contacto que tiene accion (fix #2: SET NULL)
r = test("POST", "/acciones/", JEFE, 201, json_data={
    "empresa_id": 1, "contacto_id": new_c_id, "tipo": "VISITA",
    "fecha_hora": "2026-03-15T10:00:00Z", "duracion_minutos": 30,
    "descripcion": "Visita test SET NULL"
}, label="- crear accion con contacto")
accion_setnull_id = r.json()["id"]

r = test("DELETE", f"/contactos/{new_c_id}", JEFE, 204, label="- DELETE contacto con accion (SET NULL)")

# Verificar que la accion sigue existiendo con contacto_id = null
r = test("GET", f"/acciones/{accion_setnull_id}", JEFE, 200, label="- accion sobrevive con contacto_id=null")
assert r.json()["contacto_id"] is None, f"Expected null, got {r.json()['contacto_id']}"
print(f"         contacto_id = {r.json()['contacto_id']} (SET NULL OK)")

# Limpiar
r = test("DELETE", f"/acciones/{accion_setnull_id}", JEFE, 204, label="- limpiar accion test")
print()

# ==================== PRODUCTOS ====================
print("=== 5. PRODUCTOS ===")
r = test("GET", "/productos/", JEFE, 200, label="- listar")
print(f"         {len(r.json())} productos")

r = test("GET", "/productos/1", JEFE, 200, label="- get by id")

r = test("POST", "/productos/", JEFE, 201, json_data={
    "nombre": "ProductoTest", "descripcion": "Test", "categoria": "Test"
}, label="- crear")
new_p_id = r.json()["id"]

r = test("PUT", f"/productos/{new_p_id}", JEFE, 200, json_data={
    "nombre": "ProductoTestMod"
}, label="- actualizar")

r = test("DELETE", f"/productos/{new_p_id}", JEFE, 204, label="- eliminar")
print()

# ==================== INTERESES ====================
print("=== 6. INTERESES ===")
r = test("GET", "/intereses/", JEFE, 200, label="- jefe ve todos")
print(f"         {len(r.json())} intereses")

r = test("GET", "/intereses/", LAURA, 200, label="- laura ve suyos")
r = test("GET", "/intereses/?empresa_id=1", JEFE, 200, label="- filtrar por empresa")
r = test("GET", "/intereses/1", JEFE, 200, label="- get by id")

r = test("POST", "/intereses/", LAURA, 201, json_data={
    "empresa_id": 1, "descripcion": "Interes test"
}, label="- crear")
new_int_id = r.json()["id"]
assert r.json()["estado"] == "INICIAL"

r = test("PUT", f"/intereses/{new_int_id}", LAURA, 200, json_data={
    "estado": "EN_CURSO"
}, label="- actualizar a EN_CURSO")

r = test("DELETE", f"/intereses/{new_int_id}", LAURA, 204, label="- eliminar")
print()

# ==================== OFERTAS ====================
print("=== 7. OFERTAS ===")
r = test("GET", "/ofertas/", JEFE, 200, label="- jefe ve todas")
print(f"         {len(r.json())} ofertas")

r = test("GET", "/ofertas/", LAURA, 200, label="- laura ve suyas")
r = test("GET", "/ofertas/?interes_id=1", JEFE, 200, label="- filtrar por interes")
r = test("GET", "/ofertas/1", JEFE, 200, label="- get by id")

r = test("POST", "/ofertas/", LAURA, 201, json_data={
    "interes_id": 2, "producto_id": 1, "notas": "Oferta test"
}, label="- crear")
new_of_id = r.json()["id"]
assert r.json()["estado"] == "SOLICITADA"

r = test("PUT", f"/ofertas/{new_of_id}", LAURA, 200, json_data={
    "estado": "ENTREGADA", "precio_negociado": 5000.0
}, label="- actualizar a ENTREGADA")

r = test("DELETE", f"/ofertas/{new_of_id}", LAURA, 204, label="- eliminar")
print()

# ==================== ACCIONES ====================
print("=== 8. ACCIONES ===")
r = test("GET", "/acciones/", JEFE, 200, label="- jefe ve todas")
print(f"         {len(r.json())} acciones")

r = test("GET", "/acciones/", LAURA, 200, label="- laura ve suyas")
r = test("GET", "/acciones/1", JEFE, 200, label="- get by id")

# Calendario con datetime params (fix #6)
r = test("GET", "/acciones/calendario", LAURA, 200, label="- calendario laura")
print(f"         Laura calendario: {len(r.json())} acciones")

r = test("GET", "/acciones/calendario?desde=2026-01-01T00:00:00Z&hasta=2026-12-31T23:59:59Z", JEFE, 200, label="- calendario con rango datetime")
print(f"         Calendario 2026: {len(r.json())} acciones")

r = test("GET", "/acciones/calendario?desde=2099-01-01T00:00:00Z", JEFE, 200, label="- calendario futuro vacio")
assert len(r.json()) == 0
print(f"         Calendario 2099: {len(r.json())} acciones (vacio OK)")

# CRUD
r = test("POST", "/acciones/", LAURA, 201, json_data={
    "empresa_id": 1, "contacto_id": 1, "tipo": "LLAMADA",
    "fecha_hora": "2026-03-10T10:00:00Z", "duracion_minutos": 30,
    "descripcion": "Llamada test"
}, label="- crear accion normal")
new_ac_id = r.json()["id"]

r = test("POST", "/acciones/", MARTIN, 201, json_data={
    "tipo": "OFICINA", "fecha_hora": "2026-03-11T14:00:00Z",
    "duracion_minutos": 60, "descripcion": "Oficina test",
    "es_resumida": True, "nombre_cliente_resumida": "Cliente test"
}, label="- crear accion resumida")
new_acr_id = r.json()["id"]

r = test("PUT", f"/acciones/{new_ac_id}", LAURA, 200, json_data={
    "estado": "FINALIZADA"
}, label="- finalizar accion")

r = test("DELETE", f"/acciones/{new_ac_id}", LAURA, 204, label="- eliminar accion")
r = test("DELETE", f"/acciones/{new_acr_id}", MARTIN, 204, label="- eliminar resumida")
print()

# ==================== PERMISOS ====================
print("=== 9. PERMISOS DE ROL ===")
r = test("GET", "/empresas/4", LAURA, 403, label="- laura no ve emp4 (martin)")
r = test("GET", "/empresas/2", MARTIN, 403, label="- martin no ve emp2 (laura)")
r = test("GET", "/empresas/1", LAURA, 200, label="- laura ve emp1 (compartida)")
r = test("GET", "/empresas/1", MARTIN, 200, label="- martin ve emp1 (compartida)")
r = test("DELETE", "/empresas/1", LAURA, 403, label="- comercial no elimina empresa")
r = test("DELETE", "/productos/1", LAURA, 403, label="- comercial no elimina producto")
print()

# ==================== RESUMEN ====================
print("=" * 60)
total = OK_COUNT + FAIL_COUNT
print(f"  RESULTADO: {OK_COUNT}/{total} tests pasaron", end="")
if FAIL_COUNT > 0:
    print(f" ({FAIL_COUNT} fallaron)")
else:
    print(" - TODO OK!")
print("=" * 60)
