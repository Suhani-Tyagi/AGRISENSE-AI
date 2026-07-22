from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from ..database import get_db
from ..models import User, ForumQuestion, ForumAnswer
from ..schemas import ForumQuestionCreate, ForumQuestionResponse, ForumAnswerCreate, ForumAnswerResponse
from ..auth import get_current_user

router = APIRouter(prefix="/forum", tags=["forum"])

@router.get("/", response_model=List[ForumQuestionResponse])
def get_forum_questions(
    crop_type: Optional[str] = None,
    region: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(ForumQuestion)
    if crop_type:
        query = query.filter(ForumQuestion.crop_type.ilike(f"%{crop_type}%"))
    if region:
        query = query.filter(ForumQuestion.region.ilike(f"%{region}%"))
    
    questions = query.order_by(ForumQuestion.created_at.desc()).all()
    
    # Map users' names/roles to responses
    response_questions = []
    for q in questions:
        answers_responses = []
        for a in q.answers:
            answers_responses.append(ForumAnswerResponse(
                id=a.id,
                question_id=a.question_id,
                user_id=a.user_id,
                user_name=a.user.name,
                user_role=a.user.role,
                answer_text=a.answer_text,
                is_extension_officer=a.is_extension_officer,
                created_at=a.created_at
            ))
        
        response_questions.append(ForumQuestionResponse(
            id=q.id,
            user_id=q.user_id,
            user_name=q.user.name,
            user_role=q.user.role,
            crop_type=q.crop_type,
            region=q.region,
            question_text=q.question_text,
            created_at=q.created_at,
            answers=answers_responses
        ))
    return response_questions

@router.post("/question", response_model=ForumQuestionResponse)
def create_question(
    data: ForumQuestionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    new_q = ForumQuestion(
        user_id=current_user.id,
        crop_type=data.crop_type,
        region=data.region,
        question_text=data.question_text
    )
    db.add(new_q)
    db.commit()
    db.refresh(new_q)
    
    return ForumQuestionResponse(
        id=new_q.id,
        user_id=new_q.user_id,
        user_name=current_user.name,
        user_role=current_user.role,
        crop_type=new_q.crop_type,
        region=new_q.region,
        question_text=new_q.question_text,
        created_at=new_q.created_at,
        answers=[]
    )

@router.post("/question/{question_id}/answer", response_model=ForumAnswerResponse)
def create_answer(
    question_id: int,
    data: ForumAnswerCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    q = db.query(ForumQuestion).filter(ForumQuestion.id == question_id).first()
    if not q:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found"
        )
    
    # Determine if answering user is extension officer / MFO
    is_officer = 1 if current_user.role == "finance_officer" else 0
    
    new_a = ForumAnswer(
        question_id=question_id,
        user_id=current_user.id,
        answer_text=data.answer_text,
        is_extension_officer=is_officer
    )
    db.add(new_a)
    db.commit()
    db.refresh(new_a)
    
    return ForumAnswerResponse(
        id=new_a.id,
        question_id=new_a.question_id,
        user_id=new_a.user_id,
        user_name=current_user.name,
        user_role=current_user.role,
        answer_text=new_a.answer_text,
        is_extension_officer=new_a.is_extension_officer,
        created_at=new_a.created_at
    )
