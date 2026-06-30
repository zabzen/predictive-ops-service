"""Integration tests — hit the real DB, no mocking."""


def test_health(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_login_success(client, admin_user):
    user, password = admin_user
    resp = client.post("/auth/login", json={"email": user.email, "password": password})
    assert resp.status_code == 200
    assert "access_token" in resp.json()


def test_login_wrong_password(client, admin_user):
    user, _ = admin_user
    resp = client.post("/auth/login", json={"email": user.email, "password": "wrong"})
    assert resp.status_code == 401


def test_me(client, admin_token, admin_user, tenant):
    user, _ = admin_user
    resp = client.get("/auth/me", headers={"Authorization": f"Bearer {admin_token}"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == user.email
    assert data["role"] == "admin"


def test_asset_crud(client, admin_token, tenant):
    auth = {"Authorization": f"Bearer {admin_token}"}

    # Create
    resp = client.post("/assets/", json={"name": "Pump A", "asset_type": "pump", "location": "Hall 1"}, headers=auth)
    assert resp.status_code == 201
    asset_id = resp.json()["id"]

    # List
    resp = client.get("/assets/", headers=auth)
    assert resp.status_code == 200
    assert any(a["id"] == asset_id for a in resp.json())

    # Get single
    resp = client.get(f"/assets/{asset_id}", headers=auth)
    assert resp.status_code == 200
    assert resp.json()["name"] == "Pump A"

    # Update
    resp = client.patch(f"/assets/{asset_id}", json={"name": "Pump A (updated)"}, headers=auth)
    assert resp.status_code == 200
    assert resp.json()["name"] == "Pump A (updated)"

    # Delete
    resp = client.delete(f"/assets/{asset_id}", headers=auth)
    assert resp.status_code == 204


def test_tenant_isolation(client, db, admin_token):
    """Tenant A should not see Tenant B's assets."""
    from app.auth import hash_password
    from app.models.asset import Asset
    from app.models.tenant import Tenant
    from app.models.user import User, UserRole

    tenant_b = Tenant(name="Other Corp", slug="other-corp")
    db.add(tenant_b)
    db.flush()
    user_b = User(
        tenant_id=tenant_b.id,
        email="b@other.example",
        hashed_password=hash_password("bpass"),
        role=UserRole.admin,
    )
    db.add(user_b)
    db.flush()
    asset_b = Asset(tenant_id=tenant_b.id, name="B's Compressor", asset_type="compressor")
    db.add(asset_b)
    db.flush()

    # Tenant A token should NOT see Tenant B's asset
    auth_a = {"Authorization": f"Bearer {admin_token}"}
    resp = client.get("/assets/", headers=auth_a)
    assert resp.status_code == 200
    ids = [a["id"] for a in resp.json()]
    assert str(asset_b.id) not in ids
