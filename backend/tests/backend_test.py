"""Backend API tests for team job management app."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://team-task-hub-112.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN = {"email": "tipideal@tipideal.it", "password": "Admin2026!"}
MEMBER = {"email": "iariamaarco@gmail.com", "password": "Admin2026!"}


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

    def test_member_allowed(self, member_session):
        # Iteration 5: members can now CRUD work-types
        name = f"TEST_Tipo_M_{int(time.time())}"
        r = member_session.post(f"{API}/work-types", json={"name": name, "color": "#abcdef"})
        assert r.status_code == 200, r.text
        tid = r.json()["id"]
        # update
        r2 = member_session.put(f"{API}/work-types/{tid}", json={"name": name + "_u", "color": "#111111"})
        assert r2.status_code in (200,)
        r3 = member_session.delete(f"{API}/work-types/{tid}")
        assert r3.status_code == 200


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


# ---- Iteration 5: Clients & Invoicing ----
class TestClientsAndInvoicing:
    def test_list_clients(self, admin_session):
        r = admin_session.get(f"{API}/clients")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_upsert_client_creates_and_updates_no_duplicate(self, admin_session):
        name = f"TEST_Client_{int(time.time())}"
        payload = {"name": name, "piva": "12345678901", "citta": "Roma"}
        r = admin_session.post(f"{API}/clients", json=payload)
        assert r.status_code == 200, r.text
        cid = r.json()["id"]
        assert r.json()["name"] == name
        assert r.json()["piva"] == "12345678901"
        try:
            # upsert same name -> updates, no duplicate
            r2 = admin_session.post(f"{API}/clients", json={"name": name, "piva": "99999999999", "citta": "Milano"})
            assert r2.status_code == 200
            assert r2.json()["piva"] == "99999999999"
            assert r2.json()["citta"] == "Milano"
            # verify only one client with this name
            lst = admin_session.get(f"{API}/clients").json()
            same = [c for c in lst if c["name"] == name]
            assert len(same) == 1
            assert same[0]["id"] == cid
        finally:
            admin_session.delete(f"{API}/clients/{cid}")

    def test_delete_client(self, admin_session):
        name = f"TEST_Client_del_{int(time.time())}"
        r = admin_session.post(f"{API}/clients", json={"name": name})
        cid = r.json()["id"]
        r2 = admin_session.delete(f"{API}/clients/{cid}")
        assert r2.status_code == 200
        # verify removed
        lst = admin_session.get(f"{API}/clients").json()
        assert not any(c["id"] == cid for c in lst)

    def test_invoice_and_uninvoice_flow(self, admin_session):
        # create a job, complete it, invoice it, verify, uninvoice
        types = admin_session.get(f"{API}/work-types").json()
        team = admin_session.get(f"{API}/team").json()
        job_payload = {"title": f"TEST_JobInvoice_{int(time.time())}", "type_id": types[0]["id"],
                       "assignee_id": team[0]["id"] if team else None, "due_date": "2026-06-30", "price": 800.0,
                       "status": "in_attesa"}
        jr = admin_session.post(f"{API}/jobs", json=job_payload)
        assert jr.status_code == 200, jr.text
        jid = jr.json()["id"]
        client_name = f"TEST_ClientInv_{int(time.time())}"
        cid_created = None
        try:
            # complete/archive
            admin_session.post(f"{API}/jobs/{jid}/complete")
            # invoice
            inv_payload = {
                "client": {"name": client_name, "piva": "01234567890", "codice_fiscale": "RSSMRA80A01H501Z",
                           "indirizzo": "Via Roma 1", "cap": "00100", "citta": "Roma", "provincia": "RM",
                           "pec": "test@pec.it", "codice_sdi": "ABCDE12"},
                "invoice_number": "2026/0001",
                "invoice_date": "2026-01-15",
            }
            ir = admin_session.post(f"{API}/jobs/{jid}/invoice", json=inv_payload)
            assert ir.status_code == 200, ir.text
            body = ir.json()
            assert "client_id" in body
            cid_created = body["client_id"]

            # verify job now shows invoiced fields in archived list
            arch = admin_session.get(f"{API}/jobs?archived=true").json()
            found = next((j for j in arch if j["id"] == jid), None)
            assert found is not None
            assert found["invoiced"] is True
            assert found["invoice_number"] == "2026/0001"
            assert found["invoice_date"] == "2026-01-15"
            assert found["client_name"] == client_name
            assert found.get("client_id") is not None

            # verify client persisted with data
            clients = admin_session.get(f"{API}/clients").json()
            c = next((c for c in clients if c["name"] == client_name), None)
            assert c is not None
            assert c["piva"] == "01234567890"
            assert c["citta"] == "Roma"

            # uninvoice
            ur = admin_session.post(f"{API}/jobs/{jid}/uninvoice")
            assert ur.status_code == 200
            arch2 = admin_session.get(f"{API}/jobs?archived=true").json()
            found2 = next((j for j in arch2 if j["id"] == jid), None)
            assert found2 is not None
            assert found2["invoiced"] is False
            assert found2["invoice_number"] is None
            assert found2["invoice_date"] is None
            assert found2.get("client_name") in (None, "")

            # re-invoice same client (upsert): should reuse client, no dup
            ir2 = admin_session.post(f"{API}/jobs/{jid}/invoice", json={**inv_payload, "invoice_number": "2026/0002"})
            assert ir2.status_code == 200
            clients2 = admin_session.get(f"{API}/clients").json()
            same = [c for c in clients2 if c["name"] == client_name]
            assert len(same) == 1
        finally:
            admin_session.post(f"{API}/jobs/{jid}/uninvoice")
            admin_session.delete(f"{API}/jobs/{jid}")
            # cleanup client
            clients = admin_session.get(f"{API}/clients").json()
            for c in clients:
                if c["name"] == client_name:
                    admin_session.delete(f"{API}/clients/{c['id']}")

    def test_invoice_nonexistent_job_404(self, admin_session):
        r = admin_session.post(f"{API}/jobs/507f1f77bcf86cd799439011/invoice", json={
            "client": {"name": "TEST_x"}, "invoice_number": "N", "invoice_date": "2026-01-01"
        })
        assert r.status_code == 404

    def test_member_can_invoice(self, member_session, admin_session):
        # member should be able to invoice (endpoint uses get_current_user, not admin-only)
        types = admin_session.get(f"{API}/work-types").json()
        jr = admin_session.post(f"{API}/jobs", json={"title": f"TEST_MemInv_{int(time.time())}",
                                                     "type_id": types[0]["id"], "price": 100})
        jid = jr.json()["id"]
        client_name = f"TEST_MemClient_{int(time.time())}"
        try:
            admin_session.post(f"{API}/jobs/{jid}/complete")
            ir = member_session.post(f"{API}/jobs/{jid}/invoice", json={
                "client": {"name": client_name, "piva": "11122233344"},
                "invoice_number": "M-001", "invoice_date": "2026-02-01"
            })
            assert ir.status_code == 200, ir.text
        finally:
            admin_session.post(f"{API}/jobs/{jid}/uninvoice")
            admin_session.delete(f"{API}/jobs/{jid}")
            clients = admin_session.get(f"{API}/clients").json()
            for c in clients:
                if c["name"] == client_name:
                    admin_session.delete(f"{API}/clients/{c['id']}")



# ---- Team member update (PUT /api/team/{id}) ----
class TestTeamUpdate:
    def test_update_member_name_email_and_password(self, admin_session):
        # create temp member
        email = f"test.upd{int(time.time())}@example.com"
        r = admin_session.post(f"{API}/team", json={"name": "TEST_Upd", "email": email, "password": "Passw0rd!"})
        assert r.status_code == 200, r.text
        mid = r.json()["id"]
        try:
            new_email = f"test.upd2{int(time.time())}@example.com"
            new_pwd = "NewPassw0rd!"
            u = admin_session.put(f"{API}/team/{mid}", json={"name": "TEST_UpdRenamed", "email": new_email, "password": new_pwd})
            assert u.status_code == 200, u.text
            data = u.json()
            assert data["name"] == "TEST_UpdRenamed"
            assert data["email"] == new_email
            # verify new password works
            s2 = requests.Session()
            lr = s2.post(f"{API}/auth/login", json={"email": new_email, "password": new_pwd})
            assert lr.status_code == 200, lr.text
        finally:
            admin_session.delete(f"{API}/team/{mid}")

    def test_update_member_without_password_keeps_old(self, admin_session):
        email = f"test.keep{int(time.time())}@example.com"
        r = admin_session.post(f"{API}/team", json={"name": "TEST_Keep", "email": email, "password": "OldPass1!"})
        assert r.status_code == 200
        mid = r.json()["id"]
        try:
            u = admin_session.put(f"{API}/team/{mid}", json={"name": "TEST_KeepRenamed", "email": email})
            assert u.status_code == 200
            # old password still works
            s2 = requests.Session()
            lr = s2.post(f"{API}/auth/login", json={"email": email, "password": "OldPass1!"})
            assert lr.status_code == 200
        finally:
            admin_session.delete(f"{API}/team/{mid}")

    def test_update_member_duplicate_email_400(self, admin_session):
        # Attempt to change a member's email to admin's email
        email = f"test.dup{int(time.time())}@example.com"
        r = admin_session.post(f"{API}/team", json={"name": "TEST_Dup", "email": email, "password": "Passw0rd!"})
        assert r.status_code == 200
        mid = r.json()["id"]
        try:
            u = admin_session.put(f"{API}/team/{mid}", json={"name": "TEST_Dup", "email": ADMIN["email"]})
            assert u.status_code == 400
        finally:
            admin_session.delete(f"{API}/team/{mid}")

    def test_update_member_by_non_admin_forbidden(self, member_session, admin_session):
        # create a target member as admin
        email = f"test.tgt{int(time.time())}@example.com"
        r = admin_session.post(f"{API}/team", json={"name": "TEST_Tgt", "email": email, "password": "Passw0rd!"})
        assert r.status_code == 200
        mid = r.json()["id"]
        try:
            u = member_session.put(f"{API}/team/{mid}", json={"name": "TEST_Hacked", "email": email})
            assert u.status_code == 403
        finally:
            admin_session.delete(f"{API}/team/{mid}")


# ---- Work types PUT (regression) ----
class TestWorkTypesUpdate:
    def test_update_work_type_name_and_color(self, admin_session):
        cr = admin_session.post(f"{API}/work-types", json={"name": f"TEST_WT_{int(time.time())}", "color": "#123456"})
        assert cr.status_code == 200
        tid = cr.json()["id"]
        try:
            new_name = f"TEST_WT_upd_{int(time.time())}"
            u = admin_session.put(f"{API}/work-types/{tid}", json={"name": new_name, "color": "#abcdef"})
            assert u.status_code == 200
            data = u.json()
            assert data["name"] == new_name
            assert data["color"] == "#abcdef"
            # verify persistence
            lst = admin_session.get(f"{API}/work-types").json()
            found = [t for t in lst if t["id"] == tid][0]
            assert found["name"] == new_name
            assert found["color"] == "#abcdef"
        finally:
            admin_session.delete(f"{API}/work-types/{tid}")


# ---- Weekly reports ----
class TestWeeklyReports:
    def _create_complete_invoice(self, admin_session, price=123.45):
        types = admin_session.get(f"{API}/work-types").json()
        jr = admin_session.post(f"{API}/jobs", json={
            "title": f"TEST_WR_{int(time.time()*1000)}",
            "type_id": types[0]["id"], "price": price,
        })
        assert jr.status_code == 200, jr.text
        jid = jr.json()["id"]
        cr = admin_session.post(f"{API}/jobs/{jid}/complete")
        assert cr.status_code == 200
        client_name = f"TEST_WRClient_{int(time.time()*1000)}"
        ir = admin_session.post(f"{API}/jobs/{jid}/invoice", json={
            "client": {"name": client_name, "piva": "12345678901", "citta": "Milano"},
            "invoice_number": "WR-001", "invoice_date": "2026-01-06"
        })
        assert ir.status_code == 200
        return jid, client_name

    def _cleanup(self, admin_session, jids, client_names, report_ids):
        # remove weekly_reports (via direct pymongo not available -> use mongo)
        for rid in report_ids:
            # No delete endpoint; use mongo directly
            pass
        for jid in jids:
            admin_session.post(f"{API}/jobs/{jid}/uninvoice")
            admin_session.delete(f"{API}/jobs/{jid}")
        clients = admin_session.get(f"{API}/clients").json()
        for c in clients:
            if c["name"] in client_names:
                admin_session.delete(f"{API}/clients/{c['id']}")

    def test_generate_weekly_report_and_list_and_excel_and_404_and_no_new(self, admin_session):
        # 1) create + complete + invoice a job so we have data to archive
        jid, cname = self._create_complete_invoice(admin_session, price=250.0)
        report_id = None
        try:
            # 2) generate
            gr = admin_session.post(f"{API}/weekly-reports/generate")
            assert gr.status_code == 200, gr.text
            rep = gr.json()
            assert "id" in rep
            report_id = rep["id"]
            assert rep["n_lavori"] >= 1
            assert rep["totale"] >= 250.0
            assert rep["fatturato"] >= 250.0
            assert isinstance(rep["per_tipo"], list) and len(rep["per_tipo"]) >= 1
            assert isinstance(rep["invoices"], list) and len(rep["invoices"]) >= 1
            inv0 = [i for i in rep["invoices"] if i["client_name"] == cname][0]
            assert inv0["piva"] == "12345678901"
            assert inv0["citta"] == "Milano"

            # 3) list
            lr = admin_session.get(f"{API}/weekly-reports")
            assert lr.status_code == 200
            assert any(r["id"] == report_id for r in lr.json())

            # 4) second generate -> 400 since no new completed
            gr2 = admin_session.post(f"{API}/weekly-reports/generate")
            assert gr2.status_code == 400

            # 5) excel download
            er = admin_session.get(f"{API}/weekly-reports/{report_id}/excel")
            assert er.status_code == 200
            assert "spreadsheetml" in er.headers.get("Content-Type", "")
            content = er.content
            assert content[:2] == b"PK"  # xlsx zip signature
            # validate structure with openpyxl
            import io as _io
            from openpyxl import load_workbook
            wb = load_workbook(_io.BytesIO(content))
            assert set(wb.sheetnames) == {"Lavori", "Riepilogo Tipologie", "Fatturazione"}
            ws2 = wb["Riepilogo Tipologie"]
            assert len(ws2._charts) > 0, "Pie chart missing in Riepilogo Tipologie"
            ws3 = wb["Fatturazione"]
            headers = [c.value for c in ws3[1]]
            expected = ["Lavoro", "Cliente", "P.IVA", "Codice Fiscale", "Indirizzo", "CAP", "Città", "Provincia", "PEC", "Codice SDI", "N. Fattura", "Data Fattura", "Importo (€)"]
            assert headers == expected

            # 6) excel 404 on unknown id
            er404 = admin_session.get(f"{API}/weekly-reports/507f1f77bcf86cd799439099/excel")
            assert er404.status_code == 404
        finally:
            # Cleanup: delete the archived job (uninvoice fails since it's archived, but delete works)
            admin_session.delete(f"{API}/jobs/{jid}")
            clients = admin_session.get(f"{API}/clients").json()
            for c in clients:
                if c["name"] == cname:
                    admin_session.delete(f"{API}/clients/{c['id']}")
            # Cleanup weekly_reports via mongo
            if report_id:
                try:
                    import pymongo
                    from bson import ObjectId as _OID
                    mc = pymongo.MongoClient(os.environ.get("MONGO_URL", "mongodb://localhost:27017"))
                    mc[os.environ.get("DB_NAME", "test_database")].weekly_reports.delete_one({"_id": _OID(report_id)})
                    mc.close()
                except Exception as e:
                    print(f"weekly_reports cleanup warn: {e}")


# ---- Cron endpoint auth ----
class TestCronAuth:
    def test_cron_no_auth_401(self):
        r = requests.post(f"{API}/cron/weekly-archive")
        assert r.status_code == 401

    def test_cron_wrong_secret_401(self):
        r = requests.post(f"{API}/cron/weekly-archive", headers={"Authorization": "Bearer wrong-secret"})
        assert r.status_code == 401

    def test_cron_correct_secret_202_accepted(self):
        # read secret from backend env
        secret = None
        try:
            with open("/app/backend/.env") as f:
                for line in f:
                    if line.startswith("WEBHOOK_CRON_SECRET="):
                        secret = line.split("=", 1)[1].strip().strip('"')
                        break
        except Exception:
            pass
        if not secret:
            pytest.skip("WEBHOOK_CRON_SECRET not available")
        r = requests.post(f"{API}/cron/weekly-archive",
                          headers={"Authorization": f"Bearer {secret}",
                                   "X-Webhook-Id": f"test-webhook-{int(time.time())}"})
        assert r.status_code == 200, r.text
        assert r.json().get("status") == "accepted"
