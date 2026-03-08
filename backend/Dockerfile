FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app/backend

COPY backend/requirements.txt ./requirements.txt

RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

COPY backend /app/backend

EXPOSE 3000

CMD ["sh", "-c", "PYTHONPATH=. uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-3000}"]
