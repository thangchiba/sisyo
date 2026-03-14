# Pydantic Guide

## Schema Design

### Request Validation

```python
from enum import StrEnum
from pydantic import BaseModel, Field, EmailStr, AnyUrl, field_validator
import re

class UserRole(StrEnum):
    ADMIN = "admin"
    USER = "user"
    GUEST = "guest"

class UserCreate(BaseModel):
    username: str = Field(min_length=1, max_length=128, pattern="^[A-Za-z0-9-_]+$")
    email: EmailStr
    age: int | None = Field(ge=18, default=None)
    role: UserRole = UserRole.USER
    website: AnyUrl | None = None

    @field_validator("username")
    @classmethod
    def username_lowercase(cls, v: str) -> str:
        return v.lower()
```

### Password Validation

```python
STRONG_PASSWORD_PATTERN = r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$"

class UserCreate(BaseModel):
    password: str

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if not re.match(STRONG_PASSWORD_PATTERN, v):
            raise ValueError(
                "Password must contain at least one lowercase, "
                "one uppercase, one digit, and one special character"
            )
        return v
```

## Custom Base Model

```python
from datetime import datetime
from zoneinfo import ZoneInfo
from pydantic import BaseModel, ConfigDict
from fastapi.encoders import jsonable_encoder

def datetime_to_gmt_str(dt: datetime) -> str:
    if not dt.tzinfo:
        dt = dt.replace(tzinfo=ZoneInfo("UTC"))
    return dt.strftime("%Y-%m-%dT%H:%M:%S%z")

class CustomModel(BaseModel):
    model_config = ConfigDict(
        json_encoders={datetime: datetime_to_gmt_str},
        populate_by_name=True,
        from_attributes=True,  # for ORM mode
    )

    def serializable_dict(self, **kwargs):
        """Return dict with only serializable fields."""
        return jsonable_encoder(self.model_dump())
```

## Settings Management

Split settings by domain:

```python
# src/auth/config.py
from pydantic_settings import BaseSettings

class AuthConfig(BaseSettings):
    JWT_ALG: str = "HS256"
    JWT_SECRET: str
    JWT_EXP: int = 5  # minutes
    REFRESH_TOKEN_EXP: int = 60 * 24 * 30  # 30 days
    SECURE_COOKIES: bool = True

auth_settings = AuthConfig()

# src/config.py
from pydantic import PostgresDsn, RedisDsn
from pydantic_settings import BaseSettings

class Config(BaseSettings):
    DATABASE_URL: PostgresDsn
    REDIS_URL: RedisDsn | None = None
    ENVIRONMENT: str = "production"
    CORS_ORIGINS: list[str] = []

settings = Config()
```

## Response Models

```python
# Separate input/output schemas
class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: UUID4
    username: str
    email: EmailStr
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class UserInDB(UserResponse):
    hashed_password: str  # internal only, never expose
```

## Nested Objects

```python
class Author(BaseModel):
    id: UUID4
    name: str

class PostResponse(BaseModel):
    id: UUID4
    title: str
    author: Author  # nested object
    tags: list[str] = []
```

## Validation Error Messages

ValueError in Pydantic schemas becomes 422 Unprocessable Entity:

```python
class ProfileCreate(BaseModel):
    username: str

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        if v.lower() in ["admin", "root", "system"]:
            raise ValueError("Username is reserved")
        return v

# Response: {"detail": [{"loc": ["body", "username"], "msg": "Username is reserved", "type": "value_error"}]}
```
