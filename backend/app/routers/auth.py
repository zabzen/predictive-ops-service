from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import create_access_token, hash_password, verify_password
from app.database import get_db
from app.deps import CurrentUser
from app.models.tenant import Tenant
from app.models.user import User, UserRole
from app.schemas.auth import LoginRequest, TokenResponse, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = db.query(User).filter(User.email == body.email).first()
    if user is None or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_access_token({"sub": str(user.id), "tenant_id": str(user.tenant_id), "role": user.role})
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserOut)
def me(current_user: CurrentUser) -> UserOut:
    return UserOut(
        id=str(current_user.id),
        email=current_user.email,
        role=current_user.role,
        tenant_id=str(current_user.tenant_id),
    )


@router.post("/seed-demo", include_in_schema=False)
def seed_demo(db: Session = Depends(get_db)) -> dict[str, str]:
    """Creates two demo tenants with admin users. Remove before production."""
    tenants_data = [
        ("Acme Industrial", "acme", "admin@acme.example", "acme-admin-pw"),
        ("Beta Corp", "beta", "admin@beta.example", "beta-admin-pw"),
    ]
    for name, slug, email, password in tenants_data:
        if db.query(Tenant).filter(Tenant.slug == slug).first():
            continue
        tenant = Tenant(name=name, slug=slug)
        db.add(tenant)
        db.flush()
        user = User(
            tenant_id=tenant.id,
            email=email,
            hashed_password=hash_password(password),
            role=UserRole.admin,
        )
        db.add(user)
    db.commit()
    return {"status": "seeded"}
