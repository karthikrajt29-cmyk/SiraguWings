.PHONY: dev install migrate lint

install:
	pip install -r requirements.txt

dev:
	uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

migrate:
	@echo "Run: psql $$DATABASE_URL -f migrations/001_add_missing_tables.sql"

lint:
	python -m py_compile app/main.py && echo "Syntax OK"
