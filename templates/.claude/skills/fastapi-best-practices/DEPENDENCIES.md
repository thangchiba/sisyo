# Dependencies

## Validation Dependencies

Use dependencies for database/service validations:

```python
# src/posts/dependencies.py
from fastapi import Depends, HTTPException, status
from pydantic import UUID4

async def valid_post_id(post_id: UUID4) -> dict:
    """Validate post exists and return it."""
    post = await service.get_by_id(post_id)
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found"
        )
    return post

# src/posts/router.py
@router.get("/posts/{post_id}")
async def get_post(post: dict = Depends(valid_post_id)):
    return post

@router.put("/posts/{post_id}")
async def update_post(
    update_data: PostUpdate,
    post: dict = Depends(valid_post_id),
):
    return await service.update(post["id"], update_data)
```

## Chaining Dependencies

```python
# src/auth/dependencies.py
from fastapi.security import OAuth2PasswordBearer

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")

async def parse_jwt_data(
    token: str = Depends(oauth2_scheme)
) -> dict:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALG])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    return {"user_id": payload["sub"]}

async def get_current_user(
    token_data: dict = Depends(parse_jwt_data)
) -> User:
    user = await users_service.get_by_id(token_data["user_id"])
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

async def get_current_active_user(
    user: User = Depends(get_current_user)
) -> User:
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Inactive user")
    return user
```

## Ownership Validation

```python
async def valid_owned_post(
    post: dict = Depends(valid_post_id),
    user: User = Depends(get_current_user),
) -> dict:
    if post["creator_id"] != user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    return post

@router.delete("/posts/{post_id}")
async def delete_post(post: dict = Depends(valid_owned_post)):
    await service.delete(post["id"])
    return {"deleted": True}
```

## Caching Behavior

Dependencies are cached within a request. Same dependency = called once:

```python
# parse_jwt_data called only ONCE even though used in multiple deps
@router.get("/posts/{post_id}")
async def get_user_post(
    post: dict = Depends(valid_owned_post),      # uses parse_jwt_data
    user: User = Depends(get_current_active_user),  # also uses parse_jwt_data
):
    return post
```

## REST Path Variable Consistency

Use same path variable names to enable dependency chaining:

```python
# src/profiles/dependencies.py
async def valid_profile_id(profile_id: UUID4) -> dict:
    profile = await service.get_by_id(profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile

# src/creators/dependencies.py
async def valid_creator_id(
    profile: dict = Depends(valid_profile_id)  # chains from profile
) -> dict:
    if not profile["is_creator"]:
        raise HTTPException(status_code=403, detail="Not a creator")
    return profile

# Both use profile_id in path
@router.get("/profiles/{profile_id}")
async def get_profile(profile: dict = Depends(valid_profile_id)):
    return profile

@router.get("/creators/{profile_id}")  # same path var name!
async def get_creator(creator: dict = Depends(valid_creator_id)):
    return creator
```

## Prefer Async Dependencies

```python
# GOOD - async dependency
async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session() as session:
        yield session

# OK but less efficient - runs in threadpool
def get_settings() -> Settings:
    return Settings()
```
