# Backend

Django REST Framework backend for Digital Census Portal.

## Setup

1. Create virtual environment:
```bash
python -m venv venv
venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Configure environment variables in `.env`:
```
DATABASE_URL=postgresql://user:password@localhost:5432/census_portal
FIREBASE_PROJECT_ID=your-project-id
SECRET_KEY=your-secret-key
```

4. Run migrations:
```bash
python manage.py migrate
```

5. Create superuser:
```bash
python manage.py createsuperuser
```

6. Run server:
```bash
python manage.py runserver
```
