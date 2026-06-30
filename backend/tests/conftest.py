import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.auth import hash_password
from app.database import Base, get_db
from app.main import app
from app.models.tenant import Tenant
from app.models.user import User, UserRole

TEST_DB_URL = "postgresql://postgres:postgres@localhost:5432/assetrisk_test"


@pytest.fixture(scope="session")
def engine():
    e = create_engine(TEST_DB_URL)
    Base.metadata.create_all(e)
    yield e
    Base.metadata.drop_all(e)


@pytest.fixture
def db(engine):
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.rollback()
    session.close()


@pytest.fixture
def client(db):
    def override_db():
        yield db

    app.dependency_overrides[get_db] = override_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def tenant(db) -> Tenant:
    t = Tenant(name="Test Corp", slug="test-corp")
    db.add(t)
    db.flush()
    return t


@pytest.fixture
def admin_user(db, tenant) -> tuple[User, str]:
    u = User(
        tenant_id=tenant.id,
        email="admin@test.example",
        hashed_password=hash_password("testpass"),
        role=UserRole.admin,
    )
    db.add(u)
    db.flush()
    return u, "testpass"


@pytest.fixture
def admin_token(client, admin_user) -> str:
    user, password = admin_user
    resp = client.post("/auth/login", json={"email": user.email, "password": password})
    assert resp.status_code == 200
    return resp.json()["access_token"]
