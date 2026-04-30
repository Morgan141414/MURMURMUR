from sqlalchemy.orm import Session

from saphena.modules.models import Notification


def create_notification(db: Session, *, account_id: int, title: str, body: str) -> Notification:
    item = Notification(account_id=account_id, title=title, body=body)
    db.add(item)
    return item

