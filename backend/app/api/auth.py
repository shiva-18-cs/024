from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import verify_password, create_access_token
from app.models.entities import User, UserRole
from app.schemas.schemas import Token, LoginRequest, UserOut
from app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=Token)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(
        (User.username == payload.username_or_email) | (User.email == payload.username_or_email)
    ).first()

    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password"
        )

    token = create_access_token(subject=user.id, role=user.role)
    user_out = UserOut.model_validate(user)
    if user.mine:
        user_out.mine_name = user.mine.name
    if user.contractor:
        user_out.contractor_name = user.contractor.company_name

    return Token(access_token=token, token_type="bearer", user=user_out)

@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    user_out = UserOut.model_validate(current_user)
    if current_user.mine:
        user_out.mine_name = current_user.mine.name
    if current_user.contractor:
        user_out.contractor_name = current_user.contractor.company_name
    return user_out

@router.post("/switch-role/{role_name}", response_model=Token)
def switch_role(role_name: str, db: Session = Depends(get_db)):
    """
    Convenience endpoint for governance evaluation: switch actively to any role user.
    """
    user = db.query(User).filter(User.role == role_name).first()
    if not user:
        # Fallback to corporate management if role not found
        user = db.query(User).filter(User.role == UserRole.CORPORATE.value).first() or db.query(User).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="No user found for role")

    token = create_access_token(subject=user.id, role=user.role)
    user_out = UserOut.model_validate(user)
    if user.mine:
        user_out.mine_name = user.mine.name
    if user.contractor:
        user_out.contractor_name = user.contractor.company_name

    return Token(access_token=token, token_type="bearer", user=user_out)

@router.get("/demo-users")
def get_demo_users(db: Session = Depends(get_db)):
    users = db.query(User).all()
    res = []
    for u in users:
        res.append({
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "full_name": u.full_name,
            "role": u.role,
            "mine_name": u.mine.name if u.mine else None,
            "contractor_name": u.contractor.company_name if u.contractor else None,
            "default_password": "Password@123"
        })
    return res
