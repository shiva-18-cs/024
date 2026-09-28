from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.entities import User
from app.schemas.schemas import UserOut, UserCreate
from app.core.security import get_password_hash
from app.api.deps import get_current_user

router = APIRouter(prefix="/users", tags=["User Management"])

@router.get("", response_model=List[UserOut])
def list_users(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "CORPORATE MANAGEMENT":
        raise HTTPException(status_code=403, detail="User management access is restricted to Corporate Management")
    users = db.query(User).all()
    res = []
    for u in users:
        item = UserOut.model_validate(u)
        item.mine_name = u.mine.name if u.mine else None
        item.contractor_name = u.contractor.company_name if u.contractor else None
        res.append(item)
    return res

@router.post("", response_model=UserOut)
def create_user(payload: UserCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    existing = db.query(User).filter(
        (User.username == payload.username) | (User.email == payload.email)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username or email already exists")

    user_dict = payload.model_dump()
    raw_pwd = user_dict.pop("password")
    user = User(**user_dict, hashed_password=get_password_hash(raw_pwd))
    db.add(user)
    db.commit()
    db.refresh(user)

    item = UserOut.model_validate(user)
    item.mine_name = user.mine.name if user.mine else None
    item.contractor_name = user.contractor.company_name if user.contractor else None
    return item
