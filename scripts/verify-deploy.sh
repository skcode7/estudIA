#!/usr/bin/env bash
# Verifica que la imagen de producción de la API arranque, aplique migraciones y responda health.
# Requiere: docker, curl, y el entorno local de postgres levantado (docker compose up -d).
set -euo pipefail

PROJECT_NAME="estudia"
IMAGE_TAG="${PROJECT_NAME}/api:verify"
VERIFY_CONTAINER="${PROJECT_NAME}-api-verify"
VERIFY_DB="${PROJECT_NAME}_verify_deploy"
POSTGRES_CONTAINER="estudia-postgres"
API_PORT=3001
NETWORK="estudia_default"
HEALTH_URL="http://localhost:${API_PORT}/api/v1/health"
DATABASE_URL="postgresql://estudia:estudia@${POSTGRES_CONTAINER}:5432/${VERIFY_DB}?schema=public"

cleanup() {
  echo "==> Limpiando contenedor y base de verificación..."
  docker rm -f "${VERIFY_CONTAINER}" >/dev/null 2>&1 || true
  docker exec "${POSTGRES_CONTAINER}" psql -U estudia -d postgres -c "DROP DATABASE IF EXISTS \"${VERIFY_DB}\";" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "==> Verificando que ${POSTGRES_CONTAINER} esté corriendo..."
if ! docker ps --format '{{.Names}}' | grep -qx "${POSTGRES_CONTAINER}"; then
  echo "ERROR: ${POSTGRES_CONTAINER} no está corriendo."
  echo "Levanta el entorno local con: docker compose up -d"
  exit 1
fi

echo "==> Creando base de verificación: ${VERIFY_DB}"
docker exec "${POSTGRES_CONTAINER}" psql -U estudia -d postgres \
  -c "DROP DATABASE IF EXISTS \"${VERIFY_DB}\";"
docker exec "${POSTGRES_CONTAINER}" psql -U estudia -d postgres \
  -c "CREATE DATABASE \"${VERIFY_DB}\";"

echo "==> Build de imagen de producción (${IMAGE_TAG})..."
docker build -f apps/api/Dockerfile -t "${IMAGE_TAG}" .

echo "==> Arrancando contenedor de verificación..."
docker run -d --name "${VERIFY_CONTAINER}" \
  --network "${NETWORK}" \
  -p "${API_PORT}:${API_PORT}" \
  -e DATABASE_URL="${DATABASE_URL}" \
  "${IMAGE_TAG}"

echo "==> Esperando health endpoint (${HEALTH_URL})..."
for i in $(seq 1 90); do
  if curl -sf "${HEALTH_URL}" >/dev/null 2>&1; then
    echo "==> Health check OK:"
    curl -sf "${HEALTH_URL}"
    echo
    exit 0
  fi
  sleep 2
done

echo "ERROR: Health check no respondió en 180s. Últimos logs:"
docker logs "${VERIFY_CONTAINER}"
exit 1
