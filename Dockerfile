
FROM python:3.10-slim

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
ENV PIP_NO_CACHE_DIR off
ENV PIP_DISABLE_PIP_VERSION_CHECK on

ARG KERAS_BACKEND_ARG=tensorflow
ENV KERAS_BACKEND=${KERAS_BACKEND_ARG}

WORKDIR /app

COPY requirements.txt .
RUN pip install --upgrade pip
RUN pip install -r requirements.txt

COPY ./app /app/app

RUN mkdir -p /app/models_store
RUN mkdir -p /app/data

EXPOSE 8000

