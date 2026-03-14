# Async Patterns

## Route Types Comparison

| Route Type | Blocking Code | Event Loop | Use Case |
|------------|--------------|------------|----------|
| `async def` + `await` | Non-blocking | Free | Async I/O (httpx, asyncpg) |
| `def` (sync) | Runs in threadpool | Free | Sync libraries, simple ops |
| `async def` + blocking | BLOCKS EVERYTHING | Blocked | NEVER DO THIS |

## I/O Operations

### Async Database Calls

```python
# GOOD - async database
@router.get("/users/{user_id}")
async def get_user(user_id: int):
    user = await db.fetch_one("SELECT * FROM users WHERE id = $1", user_id)
    return user
```

### Sync Libraries in Async Routes

```python
from fastapi.concurrency import run_in_threadpool

@router.get("/sync-lib")
async def use_sync_library():
    # Run sync code in threadpool
    result = await run_in_threadpool(sync_client.fetch_data)
    return result
```

### HTTP Calls

```python
import httpx

# GOOD - async HTTP client
@router.get("/external")
async def call_external():
    async with httpx.AsyncClient() as client:
        response = await client.get("https://api.example.com/data")
    return response.json()
```

## CPU-Intensive Tasks

CPU-bound work blocks regardless of async/sync. Offload to workers:

```python
from fastapi import BackgroundTasks

@router.post("/process")
async def process_data(background_tasks: BackgroundTasks):
    # Queue for background processing
    background_tasks.add_task(heavy_computation, data)
    return {"status": "processing"}

# For heavy CPU work, use Celery or multiprocessing
```

## Common Mistakes

### Blocking in Async Route

```python
# BAD - blocks entire server
@router.get("/terrible")
async def terrible():
    time.sleep(10)  # NEVER do this in async route
    return {"done": True}

# GOOD - use sync route for blocking code
@router.get("/acceptable")
def acceptable():
    time.sleep(10)  # runs in threadpool
    return {"done": True}

# BEST - use async sleep
@router.get("/perfect")
async def perfect():
    await asyncio.sleep(10)
    return {"done": True}
```

### Sync ORM in Async Route

```python
# BAD
@router.get("/users")
async def get_users():
    return db.query(User).all()  # sync ORM blocks event loop

# GOOD - use async ORM or threadpool
@router.get("/users")
async def get_users():
    return await run_in_threadpool(lambda: db.query(User).all())

# BEST - use async ORM (SQLAlchemy 2.0 async)
@router.get("/users")
async def get_users():
    result = await session.execute(select(User))
    return result.scalars().all()
```

## Dependencies

Prefer async dependencies when possible:

```python
# GOOD - async dependency
async def get_current_user(token: str = Depends(oauth2_scheme)):
    user = await users_service.get_by_token(token)
    return user

# OK but less efficient - sync dependency runs in threadpool
def get_settings():
    return Settings()
```
