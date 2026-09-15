"""Backend API tests for team job management app."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://team-task-hub-112.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN = {"email": "iariamaarco@gmail.com", "password": "Admin2026!"}
MEMBER = {"email": "giulia.bianchi@team.it", "password": "Team2026!"}


def _session(creds=None):
    s = requests.Session()
    if creds:
        r = s.post(f"{API}/auth/login", json=creds, timeout=15)
        assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    return s


@pytest.fixture(scope="module")
def admin_session():
    return _session(ADMIN)


@pytest.fixture(scope="module")
def member_session():
    # Try demo member; if deleted by user, create a temp one via admin
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json=MEMBER, timeout=15)
    if r.status_code == 200:
        return s
    admin = _session(ADMIN)
    email = f"test.member.session{int(time.time())}@example.com"
    pwd = "Passw0rd!"
    cr = admin.post(f"{API}/team", json={"name": "TEST Session Member", "email": email, "password": pwd})
    if cr.status_code != 200:
        pytest.skip(f"Cannot create member for tests: {cr.text}")
    s2 = requests.Session()
    r2 = s2.post(f"{API}/auth/login", json={"email": email, "password": pwd}, timeout=15)
    assert r2.status_code == 200, r2.text
    return s2


# ---- Auth ----
class TestAuth:
    def test_login_admin(self):
        s = requests.Session()
        r = s.post(f"{API}/auth/login", json=ADMIN)
        assert r.status_code == 200
        data = r.json()
        assert data["email"] == ADMIN["email"]
        assert data["role"] == "admin"
        assert "access_token" in s.cookies.get_dict()

    def test_login_bad_password(self):
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN["email"], "password": "wrong"})
        assert r.status_code in (401, 429)

    def test_me(self, admin_session):
        r = admin_session.get(f"{API}/auth/me")
        assert r.status_code == 200
        assert r.json()["role"] == "admin"

    def test_me_unauth(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_register_and_login(self):
        email = f"test.nuovo{int(time.time())}@example.com"
        s = requests.Session()
        r = s.post(f"{API}/auth/register", json={"name": "Test User", "email": email, "password": "Passw0rd!"})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["email"] == email
        assert data["role"] == "member"
        # login
        s2 = requests.Session()
        r2 = s2.post(f"{API}/auth/login", json={"email": email, "password": "Passw0rd!"})
        assert r2.status_code == 200

    def test_logout(self, admin_session):
        s = _session(ADMIN)
        r = s.post(f"{API}/auth/logout")
        assert r.status_code == 200

    def test_refresh_without_cookie(self):
        r = requests.post(f"{API}/auth/refresh")
        assert r.status_code == 401

    def test_refresh_with_refresh_cookie_only(self):
        # Login -> keep only refresh_token, drop access_token, refresh must succeed
        s = requests.Session()
        r = s.post(f"{API}/auth/login", json=ADMIN)
        assert r.status_code == 200
        assert "refresh_token" in s.cookies.get_dict()
        # Simulate expired/missing access token
        s.cookies.set("access_token", "", domain=s.cookies.list_domains()[0])
        # Clear access_token entirely
        rc = s.cookies.get("refresh_token")
        s.cookies.clear()
        # Re-set only refresh_token (host from BASE_URL)
        from urllib.parse import urlparse
        host = urlparse(BASE_URL).hostname
        s.cookies.set("refresh_token", rc, domain=host, path="/")
        # /auth/me should now be 401 (no access token)
        r_me = s.get(f"{API}/auth/me")
        assert r_me.status_code == 401
        # Refresh should return 200 and set access_token
        r_ref = s.post(f"{API}/auth/refresh")
        assert r_ref.status_code == 200, r_ref.text
        data = r_ref.json()
        assert data["email"] == ADMIN["email"]
        assert "access_token" in s.cookies.get_dict()
        # /auth/me should now succeed
        r_me2 = s.get(f"{API}/auth/me")
        assert r_me2.status_code == 200
        assert r_me2.json()["email"] == ADMIN["email"]

    def test_me_with_invalid_access_token(self):
        # Simulate expired/invalid access token, no refresh -> 401
        s = requests.Session()
        from urllib.parse import urlparse
        host = urlparse(BASE_URL).hostname
        s.cookies.set("access_token", "invalid.jwt.token", domain=host, path="/")
        r = s.get(f"{API}/auth/me")
        assert r.status_code == 401



# ---- Stats ----
class TestStats:
    def test_stats(self, admin_session):
        r = admin_session.get(f"{API}/stats")
        assert r.status_code == 200
        data = r.json()
        assert data["fatturato_completati"] >= 0
        assert data["completati_totali"] >= 0
        assert isinstance(data["per_tipo"], list)
        assert data["lavori_attivi_totali"] >= 0


# ---- Work types ----
class TestWorkTypes:
    def test_list(self, admin_session):
        r = admin_session.get(f"{API}/work-types")
        assert r.status_code == 200
        assert len(r.json()) >= 5

    def test_admin_crud(self, admin_session):
        name = f"TEST_Tipo_{int(time.time())}"
        r = admin_session.post(f"{API}/work-types", json={"name": name, "color": "#123456"})
        assert r.status_code == 200
        tid = r.json()["id"]
        # verify via list
        r2 = admin_session.get(f"{API}/work-types")
        assert any(t["id"] == tid for t in r2.json())
        # delete
        r3 = admin_session.delete(f"{API}/work-types/{tid}")
        assert r3.status_code == 200

    def test_member_forbidden(self, member_session):
        r = member_session.post(f"{API}/work-types", json={"name": "X", "color": "#000"})
        assert r.status_code == 403


# ---- Team ----
class TestTeam:
    def test_list(self, admin_session):
        r = admin_session.get(f"{API}/team")
        assert r.status_code == 200
        assert len(r.json()) >= 1

    def test_admin_create_delete(self, admin_session):
        email = f"test.member{int(time.time())}@example.com"
        r = admin_session.post(f"{API}/team", json={"name": "Test Membro", "email": email, "password": "Passw0rd!"})
        assert r.status_code == 200
        mid = r.json()["id"]
        r2 = admin_session.delete(f"{API}/team/{mid}")
        assert r2.status_code == 200

    def test_member_forbidden(self, member_session):
        r = member_session.post(f"{API}/team", json={"name": "X", "email": "x@y.z", "password": "Passw0rd!"})
        assert r.status_code == 403


# ---- Jobs ----
class TestJobs:
    def test_list_active(self, admin_session):
        r = admin_session.get(f"{API}/jobs")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_list_archived(self, admin_session):
        r = admin_session.get(f"{API}/jobs?archived=true")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_job_full_flow(self, admin_session):
        types = admin_session.get(f"{API}/work-types").json()
        team = admin_session.get(f"{API}/team").json()
        payload = {
            "title": "TEST_Lavoro_flow",
            "type_id": types[0]["id"],
            "assignee_id": team[0]["id"],
            "due_date": "2026-12-31",
            "price": 500.0,
            "status": "in_attesa",
        }
        r = admin_session.post(f"{API}/jobs", json=payload)
        assert r.status_code == 200, r.text
        job = r.json()
        jid = job["id"]
        assert job["title"] == payload["title"]
        assert job["price"] == 500.0

        # update
        payload["title"] = "TEST_Lavoro_updated"
        payload["status"] = "in_corso"
        r2 = admin_session.put(f"{API}/jobs/{jid}", json=payload)
        assert r2.status_code == 200
        assert r2.json()["title"] == "TEST_Lavoro_updated"
        assert r2.json()["status"] == "in_corso"

        # patch status
        r3 = admin_session.patch(f"{API}/jobs/{jid}/status", json={"status": "in_revisione"})
        assert r3.status_code == 200

        # complete (archive)
        r4 = admin_session.post(f"{API}/jobs/{jid}/complete")
        assert r4.status_code == 200
        active = admin_session.get(f"{API}/jobs").json()
        assert not any(j["id"] == jid for j in active)
        archived = admin_session.get(f"{API}/jobs?archived=true").json()
        assert any(j["id"] == jid for j in archived)

        # restore
        r5 = admin_session.post(f"{API}/jobs/{jid}/restore")
        assert r5.status_code == 200

        # delete
        r6 = admin_session.delete(f"{API}/jobs/{jid}")
        assert r6.status_code == 200

# ---- Report ----
class TestReport:
    def test_report_unauth(self):
        r = requests.get(f"{API}/report?from=2026-01-01&to=2026-12-31")
        assert r.status_code == 401

    def test_report_missing_params(self, admin_session):
        r = admin_session.get(f"{API}/report")
        assert r.status_code == 400
        r2 = admin_session.get(f"{API}/report?from=2026-01-01")
        assert r2.status_code == 400

    def test_report_invalid_range(self, admin_session):
        r = admin_session.get(f"{API}/report?from=2026-12-31&to=2026-01-01")
        assert r.status_code == 400

    def test_report_full_year(self, admin_session):
        r = admin_session.get(f"{API}/report?from=2026-01-01&to=2026-12-31")
        assert r.status_code == 200
        data = r.json()
        assert data["from"] == "2026-01-01"
        assert data["to"] == "2026-12-31"
        assert isinstance(data["jobs"], list)
        assert data["totale_lavori"] == len(data["jobs"])
        assert data["valore_totale"] >= 0
        assert data["fatturato_completati"] >= 0
        assert data["fatturato_completati"] <= data["valore_totale"]
        assert isinstance(data["per_tipo"], list)
        for pt in data["per_tipo"]:
            assert "name" in pt and "color" in pt and "totale" in pt and "count" in pt
        # sum of per_tipo totals equals valore_totale
        assert abs(sum(pt["totale"] for pt in data["per_tipo"]) - data["valore_totale"]) < 0.01
        assert sum(pt["count"] for pt in data["per_tipo"]) == data["totale_lavori"]

    def test_report_narrow_range_excludes(self, admin_session):
        full = admin_session.get(f"{API}/report?from=2026-01-01&to=2026-12-31").json()
        empty = admin_session.get(f"{API}/report?from=2020-01-01&to=2020-12-31").json()
        assert empty["totale_lavori"] == 0
        assert empty["valore_totale"] == 0
        assert empty["per_tipo"] == []
        # narrow range July should exclude jobs in Aug/Sep
        july = admin_session.get(f"{API}/report?from=2026-07-01&to=2026-07-31").json()
        assert july["totale_lavori"] <= full["totale_lavori"]

    def test_report_member_allowed(self, member_session):
        r = member_session.get(f"{API}/report?from=2026-01-01&to=2026-12-31")
        assert r.status_code == 200


class TestJobsPartial:
    """Tests for iteration 4: partial job creation with optional fields."""

    def test_create_job_only_title(self, admin_session):
        r = admin_session.post(f"{API}/jobs", json={"title": "TEST_partial_only_title"})
        assert r.status_code == 200, r.text
        job = r.json()
        jid = job["id"]
        try:
            assert job["title"] == "TEST_partial_only_title"
            assert job["type_id"] is None
            assert job["type_name"] is None
            assert job["assignee_id"] is None
            assert job["assignee_name"] == "Non assegnato"
            assert job["due_date"] is None
            assert job["price"] == 0
            assert job["status"] == "in_attesa"
            # verify appears in list
            lst = admin_session.get(f"{API}/jobs").json()
            assert any(j["id"] == jid for j in lst)
        finally:
            admin_session.delete(f"{API}/jobs/{jid}")

    def test_update_job_partial_fields(self, admin_session):
        # create minimal
        r = admin_session.post(f"{API}/jobs", json={"title": "TEST_partial_update"})
        jid = r.json()["id"]
        try:
            # send only title + price (others null/default)
            r2 = admin_session.put(f"{API}/jobs/{jid}", json={
                "title": "TEST_partial_updated", "price": 250.5, "status": "in_corso"
            })
            assert r2.status_code == 200, r2.text
            data = r2.json()
            assert data["title"] == "TEST_partial_updated"
            assert data["price"] == 250.5
            assert data["status"] == "in_corso"
            assert data["type_id"] is None
            assert data["assignee_id"] is None
            assert data["due_date"] is None
        finally:
            admin_session.delete(f"{API}/jobs/{jid}")

    def test_list_jobs_with_partial_no_serialization_error(self, admin_session):
        r = admin_session.post(f"{API}/jobs", json={"title": "TEST_partial_list"})
        jid = r.json()["id"]
        try:
            lst = admin_session.get(f"{API}/jobs")
            assert lst.status_code == 200
            found = next((j for j in lst.json() if j["id"] == jid), None)
            assert found is not None
            assert found["due_date"] is None
            assert found["type_name"] is None
        finally:
            admin_session.delete(f"{API}/jobs/{jid}")

    def test_stats_and_report_with_partial(self, admin_session):
        r = admin_session.post(f"{API}/jobs", json={"title": "TEST_partial_stats", "price": 100})
        jid = r.json()["id"]
        try:
            # mark completed to include in stats per_tipo (none bucket)
            admin_session.post(f"{API}/jobs/{jid}/complete")
            s = admin_session.get(f"{API}/stats")
            assert s.status_code == 200
            data = s.json()
            assert any(pt.get("type_id") == "none" or pt.get("name") == "Senza tipo" for pt in data["per_tipo"])
            # report with wide range – jobs w/o due_date should NOT throw
            r2 = admin_session.get(f"{API}/report?from=2020-01-01&to=2030-12-31")
            assert r2.status_code == 200
        finally:
            admin_session.delete(f"{API}/jobs/{jid}")


class TestJobsExtra:
    def test_invalid_status(self, admin_session):
        types = admin_session.get(f"{API}/work-types").json()
        team = admin_session.get(f"{API}/team").json()
        r = admin_session.post(f"{API}/jobs", json={
            "title": "TEST_bad", "type_id": types[0]["id"], "assignee_id": team[0]["id"],
            "due_date": "2026-12-31", "price": 100, "status": "invalido"
        })
        assert r.status_code == 400
