FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY shared ./shared
COPY ["Auth User Content/Api", "./Auth User Content/Api"]
COPY ["Fruit Content/Api", "./Fruit Content/Api"]

EXPOSE 2026 2027
