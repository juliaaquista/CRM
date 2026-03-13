from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.core.security import hash_password, verify_password, create_access_token
from app.models.usuario import Usuario, RolEnum
from app.schemas.usuario import (
    Token,
    UsuarioCreate,
    UsuarioUpdate,
    PasswordReset,
    UsuarioResponse,
)
from app.utils.audit import registrar_cambio

router = APIRouter(prefix="/api/auth", tags=["Autenticación"])


@router.post("/registro", response_model=UsuarioResponse, status_code=status.HTTP_201_CREATED)
def registrar_usuario(
    data: UsuarioCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    """Registra un nuevo usuario. Solo el JEFE puede crear usuarios."""
    if current_user.rol != RolEnum.JEFE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo el jefe puede registrar usuarios",
        )
    existe = db.query(Usuario).filter(Usuario.email == data.email).first()
    if existe:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe un usuario con este email",
        )

    nuevo_usuario = Usuario(
        nombre=data.nombre,
        email=data.email,
        password=hash_password(data.password),
        rol=data.rol,
    )
    db.add(nuevo_usuario)
    db.flush()
    registrar_cambio(db, current_user.id, "CREAR", "usuario", nuevo_usuario.id, f"Usuario: {nuevo_usuario.nombre} ({nuevo_usuario.rol.value})")
    db.commit()
    db.refresh(nuevo_usuario)
    return nuevo_usuario


@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Autentica al usuario y devuelve un token JWT.
    En el campo 'username' usar el email del usuario."""
    usuario = db.query(Usuario).filter(Usuario.email == form_data.username).first()
    if not usuario or not verify_password(form_data.password, usuario.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
        )

    if not usuario.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario inactivo",
        )

    access_token = create_access_token(data={"sub": str(usuario.id)})
    return Token(access_token=access_token)


@router.get("/me", response_model=UsuarioResponse)
def perfil(current_user: Usuario = Depends(get_current_active_user)):
    """Devuelve el perfil del usuario autenticado."""
    return current_user


@router.get("/usuarios", response_model=list[UsuarioResponse])
def listar_usuarios(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    """Lista todos los usuarios. Solo JEFE puede acceder."""
    if current_user.rol != RolEnum.JEFE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo el jefe puede ver la lista de usuarios",
        )
    return db.query(Usuario).all()


@router.put("/usuarios/{user_id}", response_model=UsuarioResponse)
def actualizar_usuario(
    user_id: int,
    data: UsuarioUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    """Actualiza datos de un usuario (nombre, email, rol, activo). Solo JEFE."""
    if current_user.rol != RolEnum.JEFE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo el jefe puede modificar usuarios",
        )

    usuario = db.query(Usuario).filter(Usuario.id == user_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # No permitir que el JEFE se desactive a sí mismo
    if data.activo is False and usuario.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No puedes desactivarte a ti mismo",
        )

    # Validar email único si se cambia
    if data.email and data.email != usuario.email:
        existe = db.query(Usuario).filter(Usuario.email == data.email).first()
        if existe:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ya existe un usuario con este email",
            )

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(usuario, key, value)

    registrar_cambio(db, current_user.id, "EDITAR", "usuario", user_id, str(update_data))
    db.commit()
    db.refresh(usuario)
    return usuario


@router.put("/usuarios/{user_id}/password", response_model=UsuarioResponse)
def resetear_password(
    user_id: int,
    data: PasswordReset,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    """Resetea la contraseña de un usuario. Solo JEFE."""
    if current_user.rol != RolEnum.JEFE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo el jefe puede cambiar contraseñas",
        )

    usuario = db.query(Usuario).filter(Usuario.id == user_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    usuario.password = hash_password(data.nueva_password)
    registrar_cambio(db, current_user.id, "EDITAR", "usuario", user_id, "Reset password")
    db.commit()
    db.refresh(usuario)
    return usuario
