# Database Patterns

## Naming Conventions

| Convention | Rule | Example |
|------------|------|---------|
| Tables | `lower_case_snake`, singular | `post`, `user_playlist` |
| Group by module | prefix with module | `payment_account`, `payment_bill` |
| Datetime columns | `_at` suffix | `created_at`, `updated_at` |
| Date columns | `_date` suffix | `birth_date`, `due_date` |

## SQLAlchemy Index Naming

```python
from sqlalchemy import MetaData

POSTGRES_INDEXES_NAMING_CONVENTION = {
    "ix": "%(column_0_label)s_idx",
    "uq": "%(table_name)s_%(column_0_name)s_key",
    "ck": "%(table_name)s_%(constraint_name)s_check",
    "fk": "%(table_name)s_%(column_0_name)s_fkey",
    "pk": "%(table_name)s_pkey",
}

metadata = MetaData(naming_convention=POSTGRES_INDEXES_NAMING_CONVENTION)
```

## SQL-First Approach

Let database do the heavy lifting:

```python
from sqlalchemy import select, func, text, desc

async def get_posts_with_creator(
    creator_id: UUID4,
    limit: int = 10,
    offset: int = 0
) -> list[dict]:
    query = (
        select(
            posts.c.id,
            posts.c.title,
            posts.c.slug,
            # Build JSON in database
            func.json_build_object(
                text("'id', profiles.id"),
                text("'name', profiles.name"),
                text("'username', profiles.username"),
            ).label("creator"),
        )
        .select_from(posts.join(profiles, posts.c.owner_id == profiles.c.id))
        .where(posts.c.owner_id == creator_id)
        .order_by(desc(posts.c.created_at))
        .limit(limit)
        .offset(offset)
    )
    return await database.fetch_all(query)
```

## Alembic Migrations

### Config

```ini
# alembic.ini
file_template = %%(year)d-%%(month).2d-%%(day).2d_%%(slug)s
```

Generates: `2024-01-15_add_user_email_index.py`

### Migration Best Practices

1. **Always reversible** - include `downgrade()` function
2. **Descriptive names** - `add_posts_title_idx`, not `update_1`
3. **Static structure** - only data can be dynamic, not schema

```python
# Good migration
def upgrade():
    op.add_column('users', sa.Column('avatar_url', sa.String(500)))
    op.create_index('users_email_idx', 'users', ['email'])

def downgrade():
    op.drop_index('users_email_idx', 'users')
    op.drop_column('users', 'avatar_url')
```

## Async Database Setup

```python
# src/database.py
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.ENVIRONMENT == "local",
)

async_session = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
```

## Query Patterns

### Pagination

```python
from pydantic import BaseModel

class PaginationParams(BaseModel):
    limit: int = 10
    offset: int = 0

async def get_paginated(
    session: AsyncSession,
    params: PaginationParams
) -> list[Post]:
    result = await session.execute(
        select(Post)
        .order_by(Post.created_at.desc())
        .limit(params.limit)
        .offset(params.offset)
    )
    return result.scalars().all()
```

### Eager Loading

```python
from sqlalchemy.orm import selectinload

# Avoid N+1 queries
async def get_posts_with_comments(session: AsyncSession):
    result = await session.execute(
        select(Post)
        .options(selectinload(Post.comments))
    )
    return result.scalars().all()
```
