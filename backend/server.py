from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
import jwt
from io import BytesIO
import pandas as pd

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Test MongoDB connection on startup
async def test_db_connection():
    try:
        await client.admin.command('ping')
        logging.info("MongoDB connection successful")
        return True
    except Exception as e:
        logging.error(f"MongoDB connection failed: {str(e)}")
        return False

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.environ.get('SECRET_KEY', 'opensoftt-dev-secret-key')
ALGORITHM = "HS256"

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "opensoftt-muhasebe"}

# Models
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    password: str
    role: str = "user"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    username: str
    password: str
    role: str = "user"

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    username: str
    role: str
    created_at: datetime

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    token: str
    user: UserResponse

class ChangePasswordRequest(BaseModel):
    username: str
    old_password: str
    new_password: str

class Customer(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    phone: Optional[str] = None
    address: Optional[str] = None
    tax_number: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CustomerCreate(BaseModel):
    name: str
    phone: Optional[str] = None
    address: Optional[str] = None
    tax_number: Optional[str] = None
    notes: Optional[str] = None

class Payment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_id: str
    customer_name: str
    amount: float
    payment_type: str  # "alacak" or "borc"
    is_paid: bool = False
    payment_date: Optional[datetime] = None
    due_date: datetime
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PaymentCreate(BaseModel):
    customer_id: str
    customer_name: str
    amount: float
    payment_type: str
    is_paid: bool = False
    payment_date: Optional[datetime] = None
    due_date: datetime
    description: Optional[str] = None

class Transaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str  # "gelir" or "gider"
    payment_method: str  # "nakit" or "pos"
    amount: float
    description: str
    transaction_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TransactionCreate(BaseModel):
    type: str
    payment_method: str
    amount: float
    description: str
    transaction_date: Optional[datetime] = None

class DashboardStats(BaseModel):
    total_receivable: float
    total_payable: float
    total_customers: int
    cash_balance: float
    pos_balance: float
    total_balance: float

# Initialize admin user
async def init_admin():
    try:
        admin = await db.users.find_one({"username": "admin"})
        if not admin:
            hashed_password = pwd_context.hash("admin123")
            admin_user = User(
                username="admin",
                password=hashed_password,
                role="admin"
            )
            doc = admin_user.model_dump()
            doc['created_at'] = doc['created_at'].isoformat()
            await db.users.insert_one(doc)
            logging.info("Admin user created: admin/admin123")
        else:
            logging.info("Admin user already exists")
    except Exception as e:
        logging.error(f"Error initializing admin user: {str(e)}")
        # Don't fail startup if admin creation fails
        pass

@app.on_event("startup")
async def startup_event():
    try:
        logging.info("Application starting up...")
        await init_admin()
        logging.info("Startup complete")
    except Exception as e:
        logging.error(f"Startup error: {str(e)}")
        # Continue startup even if initialization fails

# Auth endpoints
@api_router.post("/auth/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    user = await db.users.find_one({"username": request.username}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Kullanıcı adı veya şifre hatalı")
    
    if not pwd_context.verify(request.password, user['password']):
        raise HTTPException(status_code=401, detail="Kullanıcı adı veya şifre hatalı")
    
    if isinstance(user['created_at'], str):
        user['created_at'] = datetime.fromisoformat(user['created_at'])
    
    token = jwt.encode({"username": user['username'], "role": user['role']}, SECRET_KEY, algorithm=ALGORITHM)
    
    user_response = UserResponse(**user)
    return LoginResponse(token=token, user=user_response)

@api_router.post("/auth/change-password")
async def change_password(request: ChangePasswordRequest):
    user = await db.users.find_one({"username": request.username})
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    
    if not pwd_context.verify(request.old_password, user['password']):
        raise HTTPException(status_code=401, detail="Mevcut şifre hatalı")
    
    new_hashed = pwd_context.hash(request.new_password)
    await db.users.update_one(
        {"username": request.username},
        {"$set": {"password": new_hashed}}
    )
    return {"message": "Şifre başarıyla değiştirildi"}

# User management (admin only)
@api_router.get("/users", response_model=List[UserResponse])
async def get_users():
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    for user in users:
        if isinstance(user['created_at'], str):
            user['created_at'] = datetime.fromisoformat(user['created_at'])
    return users

@api_router.post("/users", response_model=UserResponse)
async def create_user(user_data: UserCreate):
    # Check if username exists
    existing = await db.users.find_one({"username": user_data.username})
    if existing:
        raise HTTPException(status_code=400, detail="Bu kullanıcı adı zaten mevcut")
    
    hashed_password = pwd_context.hash(user_data.password)
    user = User(username=user_data.username, password=hashed_password, role=user_data.role)
    doc = user.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.users.insert_one(doc)
    
    return UserResponse(**doc)

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    
    if user['username'] == 'admin':
        raise HTTPException(status_code=400, detail="Admin kullanıcısı silinemez")
    
    await db.users.delete_one({"id": user_id})
    return {"message": "Kullanıcı silindi"}

# Customer endpoints
@api_router.get("/customers", response_model=List[Customer])
async def get_customers():
    customers = await db.customers.find({}, {"_id": 0}).to_list(1000)
    for customer in customers:
        if isinstance(customer['created_at'], str):
            customer['created_at'] = datetime.fromisoformat(customer['created_at'])
    return customers

@api_router.post("/customers", response_model=Customer)
async def create_customer(customer_data: CustomerCreate):
    customer = Customer(**customer_data.model_dump())
    doc = customer.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.customers.insert_one(doc)
    return customer

@api_router.put("/customers/{customer_id}", response_model=Customer)
async def update_customer(customer_id: str, customer_data: CustomerCreate):
    existing = await db.customers.find_one({"id": customer_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Cari bulunamadı")
    
    update_data = customer_data.model_dump()
    await db.customers.update_one({"id": customer_id}, {"$set": update_data})
    
    updated = await db.customers.find_one({"id": customer_id}, {"_id": 0})
    if isinstance(updated['created_at'], str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    return Customer(**updated)

@api_router.delete("/customers/{customer_id}")
async def delete_customer(customer_id: str):
    result = await db.customers.delete_one({"id": customer_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Cari bulunamadı")
    return {"message": "Cari silindi"}

# Payment endpoints
@api_router.get("/payments", response_model=List[Payment])
async def get_payments(customer_id: Optional[str] = None):
    query = {}
    if customer_id:
        query["customer_id"] = customer_id
    
    payments = await db.payments.find(query, {"_id": 0}).to_list(1000)
    for payment in payments:
        if isinstance(payment['created_at'], str):
            payment['created_at'] = datetime.fromisoformat(payment['created_at'])
        if isinstance(payment['due_date'], str):
            payment['due_date'] = datetime.fromisoformat(payment['due_date'])
        if payment.get('payment_date') and isinstance(payment['payment_date'], str):
            payment['payment_date'] = datetime.fromisoformat(payment['payment_date'])
    return payments

@api_router.get("/payments/upcoming")
async def get_upcoming_payments(days: int = 7):
    """Get payments due in next N days"""
    today = datetime.now(timezone.utc)
    future_date = today + timedelta(days=days)
    
    payments = await db.payments.find({
        "is_paid": False,
        "due_date": {
            "$gte": today.isoformat(),
            "$lte": future_date.isoformat()
        }
    }, {"_id": 0}).to_list(1000)
    
    for payment in payments:
        if isinstance(payment['created_at'], str):
            payment['created_at'] = datetime.fromisoformat(payment['created_at'])
        if isinstance(payment['due_date'], str):
            payment['due_date'] = datetime.fromisoformat(payment['due_date'])
        if payment.get('payment_date') and isinstance(payment['payment_date'], str):
            payment['payment_date'] = datetime.fromisoformat(payment['payment_date'])
    
    return payments

@api_router.get("/customers/{customer_id}/summary")
async def get_customer_summary(customer_id: str):
    """Get customer's total debt and payment history"""
    customer = await db.customers.find_one({"id": customer_id}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Cari bulunamadı")
    
    payments = await db.payments.find({"customer_id": customer_id}, {"_id": 0}).to_list(1000)
    
    total_debt = 0
    total_paid = 0
    
    for payment in payments:
        if payment['payment_type'] == 'borc':
            if payment['is_paid']:
                total_paid += payment['amount']
            else:
                total_debt += payment['amount']
    
    return {
        "customer": customer,
        "total_debt": total_debt,
        "total_paid": total_paid,
        "total_payments": len(payments)
    }

@api_router.post("/payments", response_model=Payment)
async def create_payment(payment_data: PaymentCreate):
    payment = Payment(**payment_data.model_dump())
    doc = payment.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['due_date'] = doc['due_date'].isoformat()
    if doc.get('payment_date'):
        doc['payment_date'] = doc['payment_date'].isoformat()
    await db.payments.insert_one(doc)
    return payment

@api_router.put("/payments/{payment_id}", response_model=Payment)
async def update_payment(payment_id: str, payment_data: PaymentCreate):
    existing = await db.payments.find_one({"id": payment_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Ödeme bulunamadı")
    
    update_data = payment_data.model_dump()
    if update_data.get('payment_date'):
        update_data['payment_date'] = update_data['payment_date'].isoformat()
    update_data['due_date'] = update_data['due_date'].isoformat()
    
    await db.payments.update_one({"id": payment_id}, {"$set": update_data})
    
    updated = await db.payments.find_one({"id": payment_id}, {"_id": 0})
    if isinstance(updated['created_at'], str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    if isinstance(updated['due_date'], str):
        updated['due_date'] = datetime.fromisoformat(updated['due_date'])
    if updated.get('payment_date') and isinstance(updated['payment_date'], str):
        updated['payment_date'] = datetime.fromisoformat(updated['payment_date'])
    return Payment(**updated)

@api_router.delete("/payments/{payment_id}")
async def delete_payment(payment_id: str):
    result = await db.payments.delete_one({"id": payment_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Ödeme bulunamadı")
    return {"message": "Ödeme silindi"}

# Transaction endpoints
@api_router.get("/transactions", response_model=List[Transaction])
async def get_transactions():
    transactions = await db.transactions.find({}, {"_id": 0}).to_list(1000)
    for transaction in transactions:
        if isinstance(transaction['transaction_date'], str):
            transaction['transaction_date'] = datetime.fromisoformat(transaction['transaction_date'])
        if isinstance(transaction['created_at'], str):
            transaction['created_at'] = datetime.fromisoformat(transaction['created_at'])
    return transactions

@api_router.post("/transactions", response_model=Transaction)
async def create_transaction(transaction_data: TransactionCreate):
    if transaction_data.transaction_date is None:
        transaction_data.transaction_date = datetime.now(timezone.utc)
    
    transaction = Transaction(**transaction_data.model_dump())
    doc = transaction.model_dump()
    doc['transaction_date'] = doc['transaction_date'].isoformat()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.transactions.insert_one(doc)
    return transaction

@api_router.delete("/transactions/{transaction_id}")
async def delete_transaction(transaction_id: str):
    result = await db.transactions.delete_one({"id": transaction_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="İşlem bulunamadı")
    return {"message": "İşlem silindi"}

# Dashboard stats
@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats():
    # Calculate receivables and payables
    payments = await db.payments.find({}, {"_id": 0}).to_list(10000)
    
    total_receivable = sum(p['amount'] for p in payments if p['payment_type'] == 'alacak' and not p['is_paid'])
    total_payable = sum(p['amount'] for p in payments if p['payment_type'] == 'borc' and not p['is_paid'])
    
    # Count customers
    total_customers = await db.customers.count_documents({})
    
    # Calculate cash balances
    transactions = await db.transactions.find({}, {"_id": 0}).to_list(10000)
    
    cash_balance = 0
    pos_balance = 0
    
    for t in transactions:
        amount = t['amount']
        if t['type'] == 'gider':
            amount = -amount
        
        if t['payment_method'] == 'nakit':
            cash_balance += amount
        elif t['payment_method'] == 'pos':
            pos_balance += amount
    
    return DashboardStats(
        total_receivable=total_receivable,
        total_payable=total_payable,
        total_customers=total_customers,
        cash_balance=cash_balance,
        pos_balance=pos_balance,
        total_balance=cash_balance + pos_balance
    )

# Excel export
@api_router.get("/reports/export")
async def export_to_excel(report_type: str, start_date: Optional[str] = None, end_date: Optional[str] = None):
    query = {}
    
    # Add date filter if provided
    if start_date and end_date:
        query['created_at'] = {
            "$gte": start_date,
            "$lte": end_date
        }
    
    if report_type == "customers":
        customers = await db.customers.find({}, {"_id": 0}).to_list(10000)
        df = pd.DataFrame(customers)
        if len(df) > 0:
            df = df[['name', 'phone', 'address', 'tax_number', 'notes']]
            df.columns = ['Cari Adı', 'Telefon', 'Adres', 'Vergi No', 'Notlar']
    
    elif report_type == "payments":
        payments = await db.payments.find(query, {"_id": 0}).to_list(10000)
        df = pd.DataFrame(payments)
        if len(df) > 0:
            df = df[['customer_name', 'amount', 'payment_type', 'is_paid', 'due_date', 'description']]
            df.columns = ['Cari', 'Tutar', 'Tür', 'Ödendi', 'Vade Tarihi', 'Açıklama']
    
    elif report_type == "transactions":
        transactions = await db.transactions.find(query, {"_id": 0}).to_list(10000)
        df = pd.DataFrame(transactions)
        if len(df) > 0:
            df = df[['type', 'payment_method', 'amount', 'description', 'transaction_date']]
            df.columns = ['Tür', 'Ödeme Yöntemi', 'Tutar', 'Açıklama', 'Tarih']
    
    elif report_type == "summary":
        # Generate comprehensive summary report
        customers = await db.customers.find({}, {"_id": 0}).to_list(10000)
        payments = await db.payments.find({}, {"_id": 0}).to_list(10000)
        transactions = await db.transactions.find({}, {"_id": 0}).to_list(10000)
        
        # Calculate totals
        total_receivable = sum(p['amount'] for p in payments if p['payment_type'] == 'alacak' and not p['is_paid'])
        total_payable = sum(p['amount'] for p in payments if p['payment_type'] == 'borc' and not p['is_paid'])
        total_income = sum(t['amount'] for t in transactions if t['type'] == 'gelir')
        total_expense = sum(t['amount'] for t in transactions if t['type'] == 'gider')
        cash_balance = sum(t['amount'] if t['type'] == 'gelir' else -t['amount'] for t in transactions)
        
        summary_data = {
            'Kategori': [
                'Toplam Cari Sayısı',
                'Toplam Alacak',
                'Toplam Borç',
                'Net Alacak/Borç',
                'Toplam Gelir',
                'Toplam Gider',
                'Kasadaki Para',
                'Net Mali Durum'
            ],
            'Tutar': [
                f'{len(customers)} Adet',
                f'{total_receivable:.2f} ₺',
                f'{total_payable:.2f} ₺',
                f'{(total_receivable - total_payable):.2f} ₺',
                f'{total_income:.2f} ₺',
                f'{total_expense:.2f} ₺',
                f'{cash_balance:.2f} ₺',
                f'{(cash_balance + total_receivable - total_payable):.2f} ₺'
            ]
        }
        df = pd.DataFrame(summary_data)
    
    else:
        raise HTTPException(status_code=400, detail="Geçersiz rapor tipi")
    
    # Create Excel file
    output = BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Rapor')
    output.seek(0)
    
    filename = f"{report_type}_raporu_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()