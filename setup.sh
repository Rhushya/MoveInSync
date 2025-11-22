#!/bin/bash

echo "🚀 Starting MoveInSync Billing System Setup..."

# Create .env files from examples
if [ ! -f backend/.env ]; then
    echo "📝 Creating backend/.env from template..."
    cp backend/.env.example backend/.env
    # Generate a random secret key
    SECRET_KEY=$(openssl rand -hex 32)
    sed -i "s/your-secret-key-change-in-production-use-openssl-rand-hex-32/$SECRET_KEY/g" backend/.env
    echo "✅ Backend .env created with generated SECRET_KEY"
fi

if [ ! -f frontend/.env ]; then
    echo "📝 Creating frontend/.env from template..."
    echo "VITE_API_URL=http://localhost:8000" > frontend/.env
    echo "✅ Frontend .env created"
fi

echo "🐳 Starting Docker containers..."
docker-compose up -d

echo "⏳ Waiting for database to be ready..."
sleep 5

echo "🗄️  Creating database tables..."
docker-compose exec backend python -c "from app.db.session import Base, engine; from app.models import *; Base.metadata.create_all(bind=engine)" 2>/dev/null || true

echo "👤 Creating default admin user..."
docker-compose exec backend python -c "
from app.db.session import SessionLocal
from app.models.user import User, UserRole
from app.core.security import get_password_hash

db = SessionLocal()
existing_admin = db.query(User).filter(User.email == 'admin@moveinsync.com').first()

if not existing_admin:
    admin = User(
        email='admin@moveinsync.com',
        hashed_password=get_password_hash('admin123'),
        full_name='System Administrator',
        role=UserRole.ADMIN,
        is_active=True
    )
    db.add(admin)
    db.commit()
    print('✅ Admin user created: admin@moveinsync.com / admin123')
else:
    print('ℹ️  Admin user already exists')

db.close()
" 2>/dev/null || echo "⚠️  Could not create admin user (will be created on first API call)"

echo ""
echo "✨ Setup Complete!"
echo ""
echo "🌐 Access the application:"
echo "   Frontend:  http://localhost:5173"
echo "   Backend:   http://localhost:8000"
echo "   API Docs:  http://localhost:8000/docs"
echo ""
echo "🔐 Default Login:"
echo "   Email:     admin@moveinsync.com"
echo "   Password:  admin123"
echo ""
echo "📊 View logs:"
echo "   docker-compose logs -f"
echo ""
echo "🛑 Stop services:"
echo "   docker-compose down"
echo ""
