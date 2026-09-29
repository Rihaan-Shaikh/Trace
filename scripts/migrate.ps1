# TRACE Alembic Database Migration Script
$env:PYTHONPATH = "."
python -m alembic -c backend/alembic.ini upgrade head
