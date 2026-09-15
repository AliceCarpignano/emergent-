from dotenv import load_dotenv
load_dotenv()

import os
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

import bcrypt
import jwt
from bson import ObjectId
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_ALGORITHM = "HS256"
STATI = ["in_attesa", "in_corso", "in_revisione", "confezionato"]

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# ---------- Auth helpers ----------

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "exp": datetime.now(timezone.utc) + timedelta(minutes=60), "type": "access"}
    return jwt.encode(payload, os.environ["JWT_SECRET"], algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    payload = {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "refresh"}
    return jwt.encode(payload, os.environ["JWT_SECRET"], algorithm=JWT_ALGORITHM)


def set_auth_cookies(response: Response, user_id: str, email: str):
    response.set_cookie("access_token", create_access_token(user_id, email), httponly=True, secure=True, samesite="none", max_age=3600, path="/")
    response.set_cookie("refresh_token", create_refresh_token(user_id), httponly=True, secure=True, samesite="none", max_age=604800, path="/")


def serialize_user(user: dict) -> dict:
    return {"id": str(user["_id"]), "email": user["email"], "name": user["name"], "role": user["role"], "color": user.get("color", "#4F46E5")}


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Non autenticato")
    try:
        payload = jwt.decode(token, os.environ["JWT_SECRET"], algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Token non valido")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token scaduto")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token non valido")
    user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
    if not user:
        raise HTTPException(status_code=401, detail="Utente non trovato")
    return user


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo l'amministratore può eseguire questa azione")
    return user


def to_object_id(id_str: str) -> ObjectId:
    try:
        return ObjectId(id_str)
    except Exception:
        raise HTTPException(status_code=404, detail="Risorsa non trovata")


# ---------- Schemas ----------

class RegisterBody(BaseModel):
    name: str = Field(min_length=2, max_length=60)
    email: EmailStr
    password: str = Field(min_length=6, max_length=100)


class LoginBody(BaseModel):
    email: EmailStr
    password: str


class WorkTypeBody(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    color: str = "#4F46E5"


class JobBody(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    type_id: Optional[str] = None
    assignee_id: Optional[str] = None
    due_date: Optional[str] = None
    price: float = Field(default=0, ge=0)
    status: str = "in_attesa"


class StatusBody(BaseModel):
    status: str


class MemberBody(BaseModel):
    name: str = Field(min_length=2, max_length=60)
    email: EmailStr
    password: str = Field(min_length=6, max_length=100)


# ---------- Auth routes ----------

@api_router.post("/auth/register")
async def register(body: RegisterBody, response: Response):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email già registrata")
    colors = ["#4F46E5", "#0EA5E9", "#10B981", "#F59E0B", "#EC4899", "#8B5CF6"]
    count = await db.users.count_documents({})
    doc = {
        "email": email,
        "password_hash": hash_password(body.password),
        "name": body.name,
        "role": "member",
        "color": colors[count % len(colors)],
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.users.insert_one(doc)
    doc["_id"] = result.inserted_id
    set_auth_cookies(response, str(result.inserted_id), email)
    return serialize_user(doc)


@api_router.post("/auth/login")
async def login(body: LoginBody, request: Request, response: Response):
    email = body.email.lower()
    identifier = f"{request.client.host}:{email}"
    attempts = await db.login_attempts.find_one({"identifier": identifier})
    if attempts and attempts.get("count", 0) >= 5:
        locked_until = attempts.get("locked_until")
        if locked_until and locked_until > datetime.now(timezone.utc):
            raise HTTPException(status_code=429, detail="Troppi tentativi. Riprova tra 15 minuti.")
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        await db.login_attempts.update_one(
            {"identifier": identifier},
            {"$inc": {"count": 1}, "$set": {"locked_until": datetime.now(timezone.utc) + timedelta(minutes=15)}},
            upsert=True,
        )
        raise HTTPException(status_code=401, detail="Credenziali non valide")
    await db.login_attempts.delete_one({"identifier": identifier})
    set_auth_cookies(response, str(user["_id"]), email)
    return serialize_user(user)


@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"message": "Disconnesso"}


@api_router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return serialize_user(user)


@api_router.post("/auth/refresh")
async def refresh(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="Refresh token mancante")
    try:
        payload = jwt.decode(token, os.environ["JWT_SECRET"], algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Token non valido")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token scaduto")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token non valido")
    user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
    if not user:
        raise HTTPException(status_code=401, detail="Utente non trovato")
    response.set_cookie("access_token", create_access_token(str(user["_id"]), user["email"]), httponly=True, secure=True, samesite="none", max_age=3600, path="/")
    return serialize_user(user)


# ---------- Team members ----------

@api_router.get("/team")
async def list_team(user: dict = Depends(get_current_user)):
    members = await db.users.find({}).to_list(100)
    return [serialize_user(m) for m in members]


@api_router.post("/team")
async def create_member(body: MemberBody, admin: dict = Depends(require_admin)):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email già registrata")
    colors = ["#4F46E5", "#0EA5E9", "#10B981", "#F59E0B", "#EC4899", "#8B5CF6"]
    count = await db.users.count_documents({})
    doc = {
        "email": email,
        "password_hash": hash_password(body.password),
        "name": body.name,
        "role": "member",
        "color": colors[count % len(colors)],
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.users.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_user(doc)


@api_router.delete("/team/{member_id}")
async def delete_member(member_id: str, admin: dict = Depends(require_admin)):
    if str(admin["_id"]) == member_id:
        raise HTTPException(status_code=400, detail="Non puoi eliminare il tuo account")
    result = await db.users.delete_one({"_id": to_object_id(member_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Membro non trovato")
    await db.jobs.update_many({"assignee_id": member_id}, {"$set": {"assignee_id": None}})
    return {"message": "Membro eliminato"}


# ---------- Work types ----------

@api_router.get("/work-types")
async def list_work_types(user: dict = Depends(get_current_user)):
    types = await db.work_types.find({}).sort("name", 1).to_list(200)
    return [{"id": str(t["_id"]), "name": t["name"], "color": t.get("color", "#4F46E5")} for t in types]


@api_router.post("/work-types")
async def create_work_type(body: WorkTypeBody, user: dict = Depends(get_current_user)):
    existing = await db.work_types.find_one({"name": {"$regex": f"^{body.name}$", "$options": "i"}})
    if existing:
        raise HTTPException(status_code=400, detail="Tipo di lavoro già esistente")
    result = await db.work_types.insert_one({"name": body.name, "color": body.color})
    return {"id": str(result.inserted_id), "name": body.name, "color": body.color}


@api_router.put("/work-types/{type_id}")
async def update_work_type(type_id: str, body: WorkTypeBody, user: dict = Depends(get_current_user)):
    result = await db.work_types.update_one({"_id": to_object_id(type_id)}, {"$set": {"name": body.name, "color": body.color}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Tipo non trovato")
    return {"id": type_id, "name": body.name, "color": body.color}


@api_router.delete("/work-types/{type_id}")
async def delete_work_type(type_id: str, user: dict = Depends(get_current_user)):
    result = await db.work_types.delete_one({"_id": to_object_id(type_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Tipo non trovato")
    return {"message": "Tipo eliminato"}


# ---------- Jobs ----------

async def serialize_job(job: dict) -> dict:
    type_doc = await db.work_types.find_one({"_id": job.get("type_id")}) if job.get("type_id") else None
    assignee = await db.users.find_one({"_id": job.get("assignee_id")}) if job.get("assignee_id") else None
    return {
        "id": str(job["_id"]),
        "title": job["title"],
        "type_id": str(job["type_id"]) if job.get("type_id") else None,
        "type_name": type_doc["name"] if type_doc else None,
        "type_color": type_doc.get("color", "#4F46E5") if type_doc else None,
        "assignee_id": str(job["assignee_id"]) if job.get("assignee_id") else None,
        "assignee_name": assignee["name"] if assignee else "Non assegnato",
        "assignee_color": assignee.get("color", "#94A3B8") if assignee else "#94A3B8",
        "due_date": job.get("due_date"),
        "price": job["price"],
        "status": job["status"],
        "archived": job.get("archived", False),
        "completed_at": job.get("completed_at").isoformat() if job.get("completed_at") else None,
        "invoiced": job.get("invoiced", False),
        "invoice_number": job.get("invoice_number"),
        "invoice_date": job.get("invoice_date"),
        "client_id": str(job["client_id"]) if job.get("client_id") else None,
        "client_name": job.get("client_name"),
        "created_at": job["created_at"].isoformat(),
    }


@api_router.get("/jobs")
async def list_jobs(archived: bool = False, user: dict = Depends(get_current_user)):
    jobs = await db.jobs.find({"archived": archived}).sort("due_date", 1).to_list(1000)
    return [await serialize_job(j) for j in jobs]


@api_router.post("/jobs")
async def create_job(body: JobBody, user: dict = Depends(get_current_user)):
    if body.status not in STATI:
        raise HTTPException(status_code=400, detail="Stato non valido")
    doc = {
        "title": body.title,
        "type_id": to_object_id(body.type_id) if body.type_id else None,
        "assignee_id": to_object_id(body.assignee_id) if body.assignee_id else None,
        "due_date": body.due_date or None,
        "price": body.price,
        "status": body.status,
        "archived": False,
        "completed_at": None,
        "created_by": user["_id"],
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.jobs.insert_one(doc)
    doc["_id"] = result.inserted_id
    return await serialize_job(doc)


@api_router.put("/jobs/{job_id}")
async def update_job(job_id: str, body: JobBody, user: dict = Depends(get_current_user)):
    if body.status not in STATI:
        raise HTTPException(status_code=400, detail="Stato non valido")
    result = await db.jobs.update_one(
        {"_id": to_object_id(job_id), "archived": False},
        {"$set": {
            "title": body.title,
            "type_id": to_object_id(body.type_id) if body.type_id else None,
            "assignee_id": to_object_id(body.assignee_id) if body.assignee_id else None,
            "due_date": body.due_date or None,
            "price": body.price,
            "status": body.status,
        }},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Lavoro non trovato")
    job = await db.jobs.find_one({"_id": ObjectId(job_id)})
    return await serialize_job(job)


@api_router.patch("/jobs/{job_id}/status")
async def update_job_status(job_id: str, body: StatusBody, user: dict = Depends(get_current_user)):
    if body.status not in STATI:
        raise HTTPException(status_code=400, detail="Stato non valido")
    result = await db.jobs.update_one({"_id": to_object_id(job_id)}, {"$set": {"status": body.status}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Lavoro non trovato")
    return {"message": "Stato aggiornato", "status": body.status}


@api_router.post("/jobs/{job_id}/complete")
async def complete_job(job_id: str, user: dict = Depends(get_current_user)):
    result = await db.jobs.update_one(
        {"_id": to_object_id(job_id)},
        {"$set": {"archived": True, "status": "confezionato", "completed_at": datetime.now(timezone.utc)}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Lavoro non trovato")
    return {"message": "Lavoro spostato in Completati"}


@api_router.post("/jobs/{job_id}/restore")
async def restore_job(job_id: str, user: dict = Depends(get_current_user)):
    result = await db.jobs.update_one(
        {"_id": to_object_id(job_id)},
        {"$set": {"archived": False, "status": "in_attesa", "completed_at": None}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Lavoro non trovato")
    return {"message": "Lavoro ripristinato"}


@api_router.delete("/jobs/{job_id}")
async def delete_job(job_id: str, user: dict = Depends(get_current_user)):
    result = await db.jobs.delete_one({"_id": to_object_id(job_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Lavoro non trovato")
    return {"message": "Lavoro eliminato"}


# ---------- Clients & Fatturazione ----------

class ClientBody(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    piva: Optional[str] = None
    codice_fiscale: Optional[str] = None
    indirizzo: Optional[str] = None
    cap: Optional[str] = None
    citta: Optional[str] = None
    provincia: Optional[str] = None
    pec: Optional[str] = None
    codice_sdi: Optional[str] = None


class InvoiceBody(BaseModel):
    client: ClientBody
    invoice_number: str = Field(min_length=1, max_length=60)
    invoice_date: str


def serialize_client(c: dict) -> dict:
    return {
        "id": str(c["_id"]),
        "name": c["name"],
        "piva": c.get("piva"),
        "codice_fiscale": c.get("codice_fiscale"),
        "indirizzo": c.get("indirizzo"),
        "cap": c.get("cap"),
        "citta": c.get("citta"),
        "provincia": c.get("provincia"),
        "pec": c.get("pec"),
        "codice_sdi": c.get("codice_sdi"),
    }


@api_router.get("/clients")
async def list_clients(user: dict = Depends(get_current_user)):
    clients = await db.clients.find({}).sort("name", 1).to_list(500)
    return [serialize_client(c) for c in clients]


@api_router.post("/clients")
async def upsert_client(body: ClientBody, user: dict = Depends(get_current_user)):
    data = body.model_dump()
    existing = await db.clients.find_one({"name": body.name})
    if existing:
        await db.clients.update_one({"_id": existing["_id"]}, {"$set": data})
        existing.update(data)
        return serialize_client(existing)
    result = await db.clients.insert_one({**data, "created_at": datetime.now(timezone.utc)})
    return serialize_client({"_id": result.inserted_id, **data})


@api_router.delete("/clients/{client_id}")
async def delete_client(client_id: str, user: dict = Depends(get_current_user)):
    result = await db.clients.delete_one({"_id": to_object_id(client_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    return {"message": "Cliente eliminato"}


@api_router.post("/jobs/{job_id}/invoice")
async def invoice_job(job_id: str, body: InvoiceBody, user: dict = Depends(get_current_user)):
    job = await db.jobs.find_one({"_id": to_object_id(job_id)})
    if not job:
        raise HTTPException(status_code=404, detail="Lavoro non trovato")
    data = body.client.model_dump()
    existing = await db.clients.find_one({"name": body.client.name})
    if existing:
        await db.clients.update_one({"_id": existing["_id"]}, {"$set": data})
        client_id = existing["_id"]
    else:
        result = await db.clients.insert_one({**data, "created_at": datetime.now(timezone.utc)})
        client_id = result.inserted_id
    await db.jobs.update_one(
        {"_id": job["_id"]},
        {"$set": {
            "invoiced": True,
            "invoice_number": body.invoice_number,
            "invoice_date": body.invoice_date,
            "client_id": client_id,
            "client_name": body.client.name,
        }},
    )
    return {"message": "Lavoro fatturato", "client_id": str(client_id)}


@api_router.post("/jobs/{job_id}/uninvoice")
async def uninvoice_job(job_id: str, user: dict = Depends(get_current_user)):
    result = await db.jobs.update_one(
        {"_id": to_object_id(job_id)},
        {"$set": {"invoiced": False, "invoice_number": None, "invoice_date": None, "client_id": None, "client_name": None}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Lavoro non trovato")
    return {"message": "Fattura annullata"}


# ---------- Stats ----------

@api_router.get("/stats")
async def get_stats(user: dict = Depends(get_current_user)):
    active = await db.jobs.find({"archived": False}).to_list(1000)
    completed = await db.jobs.find({"archived": True}).to_list(1000)
    fatturato = sum(j["price"] for j in completed)
    per_tipo_map = {}
    for j in completed:
        key = str(j["type_id"]) if j.get("type_id") else "none"
        entry = per_tipo_map.setdefault(key, {"totale": 0, "count": 0})
        entry["totale"] += j["price"]
        entry["count"] += 1
    per_tipo = []
    for tid, entry in per_tipo_map.items():
        name = "Senza tipo"
        color = "#94A3B8"
        if tid != "none":
            t = await db.work_types.find_one({"_id": ObjectId(tid)})
            if t:
                name = t["name"]
                color = t.get("color", "#94A3B8")
        per_tipo.append({"type_id": tid, "name": name, "color": color, "totale": entry["totale"], "count": entry["count"]})
    per_tipo.sort(key=lambda x: x["totale"], reverse=True)
    return {
        "fatturato_completati": fatturato,
        "per_tipo": per_tipo,
        "lavori_in_corso": sum(1 for j in active if j["status"] == "in_corso"),
        "lavori_in_attesa": sum(1 for j in active if j["status"] == "in_attesa"),
        "lavori_in_revisione": sum(1 for j in active if j["status"] == "in_revisione"),
        "lavori_attivi_totali": len(active),
        "completati_totali": len(completed),
    }


# ---------- Report ----------

@api_router.get("/report")
async def get_report(request: Request, user: dict = Depends(get_current_user)):
    from_date = request.query_params.get("from")
    to_date = request.query_params.get("to")
    if not from_date or not to_date:
        raise HTTPException(status_code=400, detail="Specificare le date di inizio e fine periodo")
    if from_date > to_date:
        raise HTTPException(status_code=400, detail="Intervallo di date non valido")
    jobs = await db.jobs.find({"due_date": {"$gte": from_date, "$lte": to_date}}).sort("due_date", 1).to_list(1000)
    serialized = [await serialize_job(j) for j in jobs]
    per_tipo_map = {}
    for j in serialized:
        key = j["type_id"] or "none"
        entry = per_tipo_map.setdefault(key, {"name": j["type_name"] or "Senza tipo", "color": j["type_color"] or "#94A3B8", "totale": 0, "count": 0})
        entry["totale"] += j["price"]
        entry["count"] += 1
    per_tipo = sorted(per_tipo_map.values(), key=lambda x: x["totale"], reverse=True)
    return {
        "from": from_date,
        "to": to_date,
        "jobs": serialized,
        "totale_lavori": len(serialized),
        "valore_totale": sum(j["price"] for j in serialized),
        "fatturato_completati": sum(j["price"] for j in serialized if j["archived"]),
        "per_tipo": per_tipo,
    }


# ---------- Startup: indexes + seed ----------

async def seed_data():
    await db.users.create_index("email", unique=True)
    await db.login_attempts.create_index("identifier")

    admin_email = os.environ["ADMIN_EMAIL"].lower()
    admin_password = os.environ["ADMIN_PASSWORD"]
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "Marco (Admin)",
            "role": "admin",
            "color": "#4F46E5",
            "created_at": datetime.now(timezone.utc),
        })
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})

    old_admin_email = "iariamaarco@gmail.com"
    if admin_email != old_admin_email:
        old_admin = await db.users.find_one({"email": old_admin_email})
        if old_admin and old_admin.get("role") == "admin":
            await db.users.update_one({"email": old_admin_email}, {"$set": {"role": "member", "name": "Marco"}})

    if await db.work_types.count_documents({}) == 0:
        await db.work_types.insert_many([
            {"name": "Grafica", "color": "#EC4899"},
            {"name": "Sviluppo Web", "color": "#4F46E5"},
            {"name": "Contabilità", "color": "#F59E0B"},
            {"name": "Confezionamento", "color": "#10B981"},
            {"name": "Consulenza", "color": "#0EA5E9"},
        ])

    if await db.users.count_documents({"role": "member"}) == 0:
        await db.users.insert_many([
            {"email": "giulia.bianchi@team.it", "password_hash": hash_password("Team2026!"), "name": "Giulia Bianchi", "role": "member", "color": "#10B981", "created_at": datetime.now(timezone.utc)},
            {"email": "alessandro.serra@team.it", "password_hash": hash_password("Team2026!"), "name": "Alessandro Serra", "role": "member", "color": "#F59E0B", "created_at": datetime.now(timezone.utc)},
            {"email": "sofia.conti@team.it", "password_hash": hash_password("Team2026!"), "name": "Sofia Conti", "role": "member", "color": "#EC4899", "created_at": datetime.now(timezone.utc)},
        ])

    if await db.jobs.count_documents({}) == 0:
        types = {t["name"]: t["_id"] for t in await db.work_types.find({}).to_list(50)}
        members = {u["email"]: u["_id"] for u in await db.users.find({}).to_list(50)}
        admin = await db.users.find_one({"email": admin_email})
        today = datetime.now(timezone.utc)
        sample = [
            {"title": "Restyling logo cliente Ferretti SRL", "type": "Grafica", "assignee": "giulia.bianchi@team.it", "days": 5, "price": 850.0, "status": "in_corso", "archived": False},
            {"title": "Sito vetrina Ristorante Da Lucia", "type": "Sviluppo Web", "assignee": "alessandro.serra@team.it", "days": 12, "price": 2400.0, "status": "in_attesa", "archived": False},
            {"title": "Bilancio trimestrale Studio Bianchi", "type": "Contabilità", "assignee": "sofia.conti@team.it", "days": 3, "price": 600.0, "status": "in_revisione", "archived": False},
            {"title": "Catalogo prodotti Autunno 2026", "type": "Grafica", "assignee": "giulia.bianchi@team.it", "days": -10, "price": 1300.0, "status": "confezionato", "archived": True},
            {"title": "Consulenza marketing Hotel Bellavista", "type": "Consulenza", "assignee": "alessandro.serra@team.it", "days": -20, "price": 1800.0, "status": "confezionato", "archived": True},
        ]
        docs = []
        for s in sample:
            due = today + timedelta(days=s["days"])
            docs.append({
                "title": s["title"],
                "type_id": types[s["type"]],
                "assignee_id": members[s["assignee"]],
                "due_date": due.strftime("%Y-%m-%d"),
                "price": s["price"],
                "status": s["status"],
                "archived": s["archived"],
                "completed_at": today + timedelta(days=s["days"]) if s["archived"] else None,
                "created_by": admin["_id"],
                "created_at": today,
            })
        await db.jobs.insert_many(docs)


@app.on_event("startup")
async def startup():
    await seed_data()
    logger.info("Seed completato")


app.include_router(api_router)

frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[frontend_url, "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
