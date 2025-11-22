"# MoveInSync Unified Billing & Reporting Platform

A comprehensive billing and reporting system for multi-client, multi-vendor employee commute operations.

## 🎯 Project Overview

This system handles complex billing scenarios across multiple clients, vendors, and billing models (Package, Trip-based, and Hybrid), generating accurate, auditable reports for all stakeholders.

## ✨ Features

### Core Functionality
- ✅ **Multi-tenant Architecture** - Strict data isolation between clients
- ✅ **Role-Based Access Control** - Admin, Vendor, Employee, Finance, Operations roles
- ✅ **Multiple Billing Models** - Package, Trip-based, and Hybrid models
- ✅ **Automated Billing Engine** - Calculates trip fares with overage charges
- ✅ **Incentive Management** - Automatic calculation of employee incentives
- ✅ **Invoice Generation** - Separate invoices for clients and vendors
- ✅ **Invoice PDFs** - Server-rendered PDF exports with line-item breakdowns
- ✅ **Comprehensive Reporting** - Monthly summaries, trip exports, analytics

### Security & Authentication
- ✅ **JWT-based Authentication** - Secure token-based auth
- ✅ **Password Hashing** - Bcrypt encryption
- ✅ **Tenant Middleware** - Automatic data filtering per client
- ✅ **API Security** - Protected endpoints with authorization

### Performance & Scalability
- ✅ **Optimized Queries** - Indexed database fields
- ✅ **Redis Analytics Cache** - Dashboard stats & reports cached with TTL-based invalidation
- ✅ **Async Processing** - Background task support via Celery
- ✅ **Pagination** - Efficient data loading

### Monitoring & Error Handling
- ✅ **Global Exception Handling** - Graceful error responses
- ✅ **Logging** - Structured logging for debugging
- ✅ **Health Checks & Metrics** - `/health` plus `/metrics` Prometheus endpoint with latency histograms
- ✅ **Data Validation** - Pydantic schemas for request/response validation

## 🏗️ Architecture

### Backend (FastAPI + PostgreSQL)
```
backend/
├── app/
│   ├── api/v1/endpoints/     # API route handlers
│   ├── core/                 # Configuration & security
│   ├── db/                   # Database session
│   ├── models/               # SQLAlchemy ORM models
│   ├── services/             # Business logic (BillingEngine)
│   ├── middleware/           # Tenant isolation middleware
│   └── main.py              # FastAPI application
├── requirements.txt
└── Dockerfile
```

### Frontend (React + TypeScript + Tailwind CSS)
```
frontend/
├── src/
│   ├── components/          # Reusable UI components
│   ├── pages/              # Page components
│   ├── services/           # API client
│   ├── types/              # TypeScript interfaces
│   └── App.tsx
├── package.json
└── Dockerfile
```

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for local dev)
- Python 3.11+ (for local dev)
- PostgreSQL 15+ (for local dev)

### Using Docker (Recommended)

1. **Clone the repository**
```bash
git clone <repository-url>
cd moveinsync
```

2. **Start all services**
```bash
docker-compose up -d
```

This will start:
- PostgreSQL (port 5432)
- Redis (port 6379)
- Backend API (port 8000)
- Frontend (port 5173)

3. **Access the application**
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Manual Setup

#### Backend Setup

1. **Create virtual environment**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. **Install dependencies**
```bash
pip install -r requirements.txt
```

3. **Configure environment**
```bash
cp .env.example .env
# Edit .env with your database credentials
```

4. **Create database**
```bash
# Using PostgreSQL
createdb moveinsync_billing
```

5. **Run migrations**
```bash
# Create tables
python -c "from app.db.session import Base, engine; from app.models import *; Base.metadata.create_all(bind=engine)"
```

6. **Start server**
```bash
uvicorn app.main:app --reload
```

#### Frontend Setup

1. **Install dependencies**
```bash
cd frontend
npm install
```

2. **Configure environment**
```bash
cp .env.example .env
```

3. **Start development server**
```bash
npm run dev
```

## 📊 Database Schema

### Key Tables
- **users** - System users with role-based access
- **clients** - Corporate client organizations
- **vendors** - Transportation service providers
- **employees** - Client employees using the service
- **billing_models** - Vendor billing configurations
- **trips** - Individual trip records
- **invoices** - Generated billing invoices
- **incentives** - Employee incentive records

## 🔧 API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login and get token
- `GET /api/v1/auth/me` - Get current user

### Clients
- `GET /api/v1/clients` - List all clients
- `POST /api/v1/clients` - Create client
- `GET /api/v1/clients/{id}` - Get client details

### Vendors
- `GET /api/v1/vendors` - List vendors
- `POST /api/v1/vendors` - Create vendor
- `GET /api/v1/vendors/{id}` - Get vendor details

### Trips
- `GET /api/v1/trips` - List trips (with filters)
- `POST /api/v1/trips` - Create trip
- `PATCH /api/v1/trips/{id}/complete` - Complete trip with fare calculation

### Billing Models
- `GET /api/v1/billing-models` - List billing models
- `POST /api/v1/billing-models` - Create billing model

### Invoices
- `GET /api/v1/invoices` - List invoices
- `POST /api/v1/invoices` - Generate invoice
- `GET /api/v1/invoices/{id}/pdf` - Download signed PDF for an invoice

### Reports
- `GET /api/v1/reports/client/{id}/monthly` - Client monthly report
- `GET /api/v1/reports/vendor/{id}/monthly` - Vendor payable report
- `GET /api/v1/reports/employee/{id}/incentives` - Employee incentives
- `GET /api/v1/reports/export/trips` - Export trips to Excel

### Dashboard
- `GET /api/v1/dashboard/stats` - Dashboard statistics
- `GET /api/v1/dashboard/trip-trends` - Trip trends chart data

## 💡 Billing Engine

### Algorithm Complexity Analysis

**Time Complexity:**
- Single trip calculation: O(1)
- Monthly invoice generation: O(n) where n = number of trips
- Incentive calculation: O(m) where m = number of employee trips

**Space Complexity:**
- Trip storage: O(n) for n trips
- Invoice generation: O(1) additional space
- Database indexes: O(log n) for query optimization

### Billing Models

#### 1. Package Model
- Fixed monthly cost
- Included trips/kilometers
- Overage charges for extra km/hours
```python
fare = monthly_cost + (extra_km * extra_km_rate) + (extra_hours * extra_hour_rate)
```

#### 2. Trip-Based Model
- Pay per trip
- Variable rates for distance and duration
```python
fare = cost_per_trip + (distance * cost_per_km) + (duration * cost_per_hour)
```

#### 3. Hybrid Model
- Combination of package and trip-based
- Base package + per-trip charges

## 🔒 Security Features

### Authentication & Authorization
- JWT tokens with expiration
- Password hashing with bcrypt
- Role-based access control (RBAC)
- Protected API endpoints

### Data Security
- SQL injection prevention (SQLAlchemy ORM)
- XSS protection (React auto-escaping)
- CORS configuration
- Environment variable secrets

### Multi-Tenancy
- Client ID-based data isolation
- Tenant middleware for automatic filtering
- Secure client data separation

## 🎨 UI Features

### Dashboard
- Real-time statistics cards
- Trip trends visualization (Line charts)
- Revenue tracking
- Pending invoice alerts

### Data Tables
- Sortable columns
- Status indicators
- Pagination
- Filter capabilities

### Forms
- Input validation
- Error handling
- Loading states
- Success/error notifications

## 📈 System Monitoring

### Health Checks
```bash
curl http://localhost:8000/health
```

### Logging
- Structured logging with Python logging module
- Request/response logging
- Error tracking

### Metrics
- API response times (via `X-Response-Time` header + Prometheus histograms)
- Database query performance
- Cache hit/miss counters
- User activity
- Report generation latency buckets

## 🧪 Testing

### Backend Tests
```bash
cd backend
pytest tests/ -v --cov=app
```

### Frontend Tests
```bash
cd frontend
npm run test
```

## 📦 Deployment

### Production Build

**Backend:**
```bash
cd backend
docker build -t moveinsync-backend .
docker run -p 8000:8000 moveinsync-backend
```

**Frontend:**
```bash
cd frontend
npm run build
# Serve dist/ folder with nginx or similar
```

### Environment Variables (Production)
```bash
# Backend
DATABASE_URL=postgresql://user:pass@host:5432/db
REDIS_URL=redis://host:6379/0
SECRET_KEY=<strong-random-key>
ENVIRONMENT=production

# Frontend
VITE_API_URL=https://api.yourdomain.com
```

## 🔄 System Trade-offs

### Database Choice (PostgreSQL)
**Pros:** ACID compliance, complex queries, JSON support
**Cons:** Higher resource usage than NoSQL
**Rationale:** Financial data requires ACID guarantees

### Monolithic API Structure
**Pros:** Simpler deployment, easier development
**Cons:** Harder to scale individual components
**Mitigation:** Modular design ready for microservices split

### Client-side State Management
**Pros:** Better UX, reduced server load
**Cons:** More client complexity
**Rationale:** Better user experience for dashboard

## 🐛 Error Handling

### Backend
- Global exception handler for unexpected errors
- Validation errors with detailed messages
- Database connection error recovery
- Graceful degradation

### Frontend
- API error interceptors
- User-friendly error messages
- Automatic token refresh
- Fallback UI states

## 📝 Code Quality

### Backend Standards
- PEP 8 compliance
- Type hints with Pydantic
- Docstrings for complex functions
- Modular service layer

### Frontend Standards
- TypeScript strict mode
- ESLint configuration
- Component composition
- Functional React patterns

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License.

## 👥 Team

Built for MoveInSync - Employee Commute Solutions

## 📞 Support

For issues and questions, please create an issue in the repository.

---

**Note:** This is a demonstration project showcasing full-stack development capabilities including:
- RESTful API design
- Database modeling
- Authentication & authorization
- Billing algorithm implementation
- React/TypeScript frontend
- Docker containerization
- Production-ready architecture" 
