"""
/api/personas — create, list, and delete a user's custom AI opponents.
A persona is reusable across debate sessions: its `instruction` is fed into
the debate prompt to shape how the AI argues.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session as DBSession

from app.core.auth import get_current_user
from app.db.session import get_db
from app.models.entities import Persona, User
from app.schemas.api import PersonaCreate, PersonaOut

router = APIRouter(prefix="/api/personas", tags=["personas"])


@router.post("", response_model=PersonaOut, status_code=status.HTTP_201_CREATED)
def create_persona(
    body: PersonaCreate,
    user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    persona = Persona(
        user_id=user.id,
        name=body.name.strip(),
        icon=body.icon,
        instruction=body.instruction.strip(),
        intensity=body.intensity,
    )
    db.add(persona)
    db.commit()
    db.refresh(persona)
    return persona


@router.get("", response_model=list[PersonaOut])
def list_personas(
    user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    return (
        db.query(Persona)
        .filter(Persona.user_id == user.id)
        .order_by(Persona.created_at.desc())
        .all()
    )


@router.delete("/{persona_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_persona(
    persona_id: int,
    user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    persona = (
        db.query(Persona)
        .filter(Persona.id == persona_id, Persona.user_id == user.id)
        .first()
    )
    if persona is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Persona not found.")
    db.delete(persona)
    db.commit()
