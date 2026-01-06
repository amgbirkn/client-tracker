from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from .database import Base, engine
from . import models, schemas
from .auth import get_db, hash_password, verify_password, create_access_token, get_current_user

app = FastAPI(title="Client Tracker API")

Base.metadata.create_all(bind=engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"ok": True}

@app.post("/auth/signup", response_model=schemas.Token)
def signup(payload: schemas.UserCreate, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == payload.email.lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already in use")

    if len(payload.password.encode("utf-8")) > 72:
        raise HTTPException(status_code=400, detail="Password too long (max 72 characters)")

    user = models.User(
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return {"access_token": create_access_token(user.id), "token_type": "bearer"}

@app.post("/auth/login", response_model=schemas.Token)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = (
        db.query(models.User)
        .filter(models.User.email == form.username.lower())
        .first()
    )
    if not user or not verify_password(form.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Invalid credentials")

    return {
        "access_token": create_access_token(user.id),
        "token_type": "bearer",
    }

@app.post("/clients", response_model=schemas.ClientOut)
def create_client(
    payload: schemas.ClientCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    client = models.Client(
        owner_id=user.id,
        name=payload.name,
        email=payload.email,
    )
    db.add(client)
    db.commit()
    db.refresh(client)
    return client

@app.get("/clients", response_model=list[schemas.ClientOut])
def list_clients(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    return (
        db.query(models.Client)
        .filter(models.Client.owner_id == user.id)
        .order_by(models.Client.created_at.desc())
        .all()
    )

@app.post("/invoices", response_model=schemas.InvoiceOut)
def create_invoice(
    payload: schemas.InvoiceCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    client = (
        db.query(models.Client)
        .filter(models.Client.id == payload.client_id, models.Client.owner_id == user.id)
        .first()
    )
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    invoice = models.Invoice(
        client_id=payload.client_id,
        title=payload.title,
        amount=payload.amount,
        due_date=payload.due_date,
        is_paid=False,
    )
    db.add(invoice)
    db.commit()
    db.refresh(invoice)
    return invoice

@app.get("/invoices", response_model=list[schemas.InvoiceOut])
def list_invoices(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    return (
        db.query(models.Invoice)
        .join(models.Client)
        .filter(models.Client.owner_id == user.id)
        .order_by(models.Invoice.created_at.desc())
        .all()
    )

@app.patch("/invoices/{invoice_id}/toggle-paid", response_model=schemas.InvoiceOut)
def toggle_invoice_paid(
    invoice_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    invoice = (
        db.query(models.Invoice)
        .join(models.Client)
        .filter(models.Invoice.id == invoice_id, models.Client.owner_id == user.id)
        .first()
    )
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    invoice.is_paid = not invoice.is_paid
    db.commit()
    db.refresh(invoice)
    return invoice

