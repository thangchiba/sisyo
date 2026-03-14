---
name: fastapi-best-practices
description: FastAPI project structure, async patterns, Pydantic schemas, dependency injection, and database patterns. Use when building FastAPI backends, creating REST APIs, or reviewing Python web service code.
---

# FastAPI Best Practices

## Quick Start

```python
# Domain-based structure (recommended for scalable projects)
src/
├── auth/
│   ├── router.py      # endpoints
│   ├── schemas.py     # pydantic models
│   ├── models.py      # db models
│   ├── service.py     # business logic
│   ├── dependencies.py
│   └── exceptions.py
├── posts/
│   └── ...
├── config.py          # global config
├── database.py        # db connection
└── main.py            # FastAPI app init
```

## Core Principles

### 1. Async Routes Done Right

```python
# BAD - blocks event loop
@router.get("/bad")
async def bad_route():
    time.sleep(10)  # blocks everything!
    return {"ok": True}

# GOOD - sync route runs in threadpool
@router.get("/good")
def good_route():
    time.sleep(10)  # runs in separate thread
    return {"ok": True}

# BEST - truly async
@router.get("/best")
async def best_route():
    await asyncio.sleep(10)  # non-blocking
    return {"ok": True}
```

### 2. Pydantic Validation

```python
from pydantic import BaseModel, Field, EmailStr

class UserCreate(BaseModel):
    username: str = Field(min_length=1, max_length=128, pattern="^[A-Za-z0-9-_]+$")
    email: EmailStr
    age: int = Field(ge=18, default=None)
```

### 3. Dependencies for Validation

```python
async def valid_post_id(post_id: UUID4) -> dict:
    post = await service.get_by_id(post_id)
    if not post:
        raise PostNotFound()
    return post

@router.get("/posts/{post_id}")
async def get_post(post: dict = Depends(valid_post_id)):
    return post
```

## Detailed Guides

| Topic | File | When to Use |
|-------|------|-------------|
| Project Structure | [PROJECT-STRUCTURE.md](PROJECT-STRUCTURE.md) | Starting new project, organizing modules |
| Async Patterns | [ASYNC-PATTERNS.md](ASYNC-PATTERNS.md) | I/O operations, CPU tasks, blocking code |
| Pydantic Usage | [PYDANTIC-GUIDE.md](PYDANTIC-GUIDE.md) | Schema design, validation, config |
| Dependencies | [DEPENDENCIES.md](DEPENDENCIES.md) | Auth, validation, reusable logic |
| Database | [DATABASE.md](DATABASE.md) | SQLAlchemy, migrations, naming |

## Import Conventions

```python
# Cross-module imports - use explicit module names
from src.auth import constants as auth_constants
from src.notifications import service as notification_service
from src.posts.constants import ErrorCode as PostsErrorCode
```

## Testing Setup

```python
import pytest
from httpx import AsyncClient, ASGITransport
from src.main import app

@pytest.fixture
async def client():
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as client:
        yield client

@pytest.mark.asyncio
async def test_endpoint(client: AsyncClient):
    resp = await client.post("/posts")
    assert resp.status_code == 201
```

## Code Quality

Use `ruff` for linting and formatting:

```bash
ruff check --fix src
ruff format src
```
