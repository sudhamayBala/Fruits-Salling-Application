FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN python -c "from pathlib import Path; files = [Path('Auth User Content/Api/main.py'), Path('Fruit Content/Api/main.py')]; missing = [str(file) for file in files if not file.is_file()]; assert not missing, f'Missing backend source files in Docker build context: {missing}'"

EXPOSE 10000

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-10000}"]
