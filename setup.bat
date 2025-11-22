@echo off
echo Starting MoveInSync Billing System Setup...
echo.

REM Create .env files
if not exist backend\.env (
    echo Creating backend\.env from template...
    copy backend\.env.example backend\.env
    echo Backend .env created
)

if not exist frontend\.env (
    echo Creating frontend\.env...
    echo VITE_API_URL=http://localhost:8000 > frontend\.env
    echo Frontend .env created
)

echo.
echo Starting Docker containers...
docker-compose up -d

echo.
echo Waiting for database to be ready...
timeout /t 5 /nobreak

echo.
echo Creating database tables...
docker-compose exec backend python -c "from app.db.session import Base, engine; from app.models import *; Base.metadata.create_all(bind=engine)"

echo.
echo Setup Complete!
echo.
echo Access the application:
echo   Frontend:  http://localhost:5173
echo   Backend:   http://localhost:8000
echo   API Docs:  http://localhost:8000/docs
echo.
echo Default Login:
echo   Email:     admin@moveinsync.com
echo   Password:  admin123
echo.
echo View logs:
echo   docker-compose logs -f
echo.
echo Stop services:
echo   docker-compose down
echo.
pause
