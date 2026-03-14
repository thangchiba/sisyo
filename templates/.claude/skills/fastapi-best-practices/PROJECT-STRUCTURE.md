# Project Structure

## Domain-Based Organization

```
fastapi-project/
├── alembic/                    # migrations
├── src/
│   ├── auth/                   # auth domain
│   │   ├── router.py           # endpoints
│   │   ├── schemas.py          # pydantic models
│   │   ├── models.py           # db models
│   │   ├── service.py          # business logic
│   │   ├── dependencies.py     # route dependencies
│   │   ├── config.py           # local config
│   │   ├── constants.py        # error codes, enums
│   │   ├── exceptions.py       # custom exceptions
│   │   └── utils.py            # helpers
│   ├── posts/                  # posts domain
│   │   └── ... (same structure)
│   ├── aws/                    # external service
│   │   ├── client.py           # API client
│   │   ├── schemas.py
│   │   └── ...
│   ├── config.py               # global config
│   ├── models.py               # shared models
│   ├── exceptions.py           # global exceptions
│   ├── database.py             # db connection
│   └── main.py                 # app initialization
├── tests/
│   ├── auth/
│   ├── posts/
│   └── conftest.py
├── requirements/
│   ├── base.txt
│   ├── dev.txt
│   └── prod.txt
├── .env
└── alembic.ini
```

## File Responsibilities

| File | Purpose |
|------|---------|
| `router.py` | All endpoints for the module |
| `schemas.py` | Pydantic request/response models |
| `models.py` | SQLAlchemy/database models |
| `service.py` | Business logic, DB operations |
| `dependencies.py` | FastAPI dependencies |
| `constants.py` | Enums, error codes |
| `config.py` | Environment-specific settings |
| `exceptions.py` | Custom HTTP exceptions |
| `utils.py` | Pure utility functions |

## Main App Setup

```python
# src/main.py
from fastapi import FastAPI
from src.auth.router import router as auth_router
from src.posts.router import router as posts_router
from src.config import settings

app_configs = {"title": "My API"}

# Hide docs in production
if settings.ENVIRONMENT not in ("local", "staging"):
    app_configs["openapi_url"] = None

app = FastAPI(**app_configs)

app.include_router(auth_router, prefix="/auth", tags=["Auth"])
app.include_router(posts_router, prefix="/posts", tags=["Posts"])
```

## Cross-Module Imports

Always use explicit module names to avoid confusion:

```python
# GOOD
from src.auth import constants as auth_constants
from src.auth import service as auth_service
from src.notifications import service as notification_service

# BAD
from src.auth.constants import *
from ..auth import service  # relative imports can be confusing
```
