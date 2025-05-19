### Project Structure

#### Backend API structure
.
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI app, routers
│   ├── core/
│   │   ├── __init__.py
│   │   └── config.py           # Settings and configurations
│   ├── db/
│   │   ├── __init__.py
│   │   ├── base_class.py       # Base for SQLAlchemy models
│   │   ├── models.py           # SQLAlchemy ORM models (User, Movie, Rating)
│   │   ├── session.py          # Async database session setup
│   │   └── crud.py             # CRUD operations
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── movie.py            # Pydantic schemas for movies
│   │   ├── rating.py           # Pydantic schemas for ratings
│   │   ├── user.py             # Pydantic schemas for users
│   │   └── token.py            # Pydantic schemas for JWT tokens
│   ├── api/
│   │   ├── __init__.py
│   │   ├── deps.py             # Dependencies (e.g., get_db, get_current_user)
│   │   └── v1/
│   │       ├── __init__.py
│   │       ├── api.py          # API router aggregation
│   │       └── endpoints/
│   │           ├── __init__.py
│   │           ├── users.py
│   │           ├── movies.py
│   │           ├── ratings.py
│   │           └── recommendations.py
│   ├── services/
│   │   ├── __init__.py
│   │   └── recommender/
│   │       ├── __init__.py
│   │       ├── model.py        # GRU4Rec Keras model definition
│   │       ├── predict.py      # Prediction logic
│   │       ├── preprocessing.py # Data preprocessing for training/prediction
│   │       └── train.py        # Training script for the model
│   ├── worker/
│   │   ├── __init__.py
│   │   ├── celery_app.py       # Celery app instance and beat schedule
│   │   └── tasks.py            # Celery tasks (e.g., model training)
│   └── security.py             # Password hashing and JWT utilities
├── data/                         # To store movielens raw data (optional, for initial seeding)
│   └── ml-1m/                    # Extracted movielens data (if downloaded)
├── models_store/                 # To save trained Keras models
│   └── gru4rec_model.keras       # Example saved model
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
└── .env_example                  # Example environment variables



#### Fronted structure
recommendation-frontend/
├── node_modules/
├── public/
└── src/
    ├── assets/
    ├── components/
    │   ├── Admin/
    │   │   └── AdminPage.jsx
    │   ├── Auth/
    │   │   └── AuthForm.jsx
    │   ├── Common/
    │   │   ├── DisplayAverageRating.jsx
    │   │   ├── LoadingSpinner.jsx
    │   │   ├── MessageBox.jsx
    │   │   ├── MovieCard.jsx
    │   │   ├── RatingModal.jsx
    │   │   └── StarRatingInput.jsx
    │   └── Icons/
    │       ├── ArrowLeftIcon.jsx
    │       ├── FilmIcon.jsx
    │       ├── FilterIcon.jsx
    │       ├── HomeIcon.jsx
    │       ├── LockIcon.jsx
    │       ├── LogOutIcon.jsx
    │       ├── MenuIcon.jsx
    │       ├── SearchIcon.jsx
    │       ├── SettingsIcon.jsx
    │       ├── StarIcon.jsx
    │       ├── ThumbsUpIcon.jsx
    │       ├── TrashIcon.jsx
    │       ├── UploadCloudIcon.jsx
    │       ├── UserIcon.jsx
    │       └── XIcon.jsx
    ├── contexts/
    │   ├── AppContext.jsx
    │   └── AuthContext.jsx
    ├── Layout/
    │   ├── Footer.jsx
    │   └── Navbar.jsx
    └── pages/
    |   ├── HomePage.jsx
    |   └── MovieDetailPage.jsx
    └── services/
    |    ├── ApiService.js
    |   
    |
    └── styles/
        ├── index.css
        


### Setup the configurations

```bash
cp .env.example .env
```

#### Start the backend API container

```bash

docker compose up --buiild 

```

or using Makefile

```bash

make build

```


#### Run data population script

Run the command below to populate your database with movie lens dataset. You will need this for the intial model training.

```bash
docker compose exec app python /app/scripts/seed_db.py

```

#### Start Frontend service

Navigate to the frontend folder;

```bash
cd recommendation-frontend/

```

Install the necessary dependencies

```bash
npm install

```

Run the frontend app

```bash
npm run dev
```

#### Access Service Endpoints
Access the services via the following endpoints

Backend api: http://127.0.0.1:8000/docs

Frontend: http://localhost:5173/

PGADMIN: http://localhost:5050/  

default credentials to login to PGADMIN unless changed:
email: admin@admin.com
password: admin1234

#### Accessing Frontend as Admin Users:

In the frontend, register as an admin with the email: `admin@example.com`. Then, login with this user. Go to the admin page.

In the admin page, you can upload movies, you can retrain the recommendation system model etc.
