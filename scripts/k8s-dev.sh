#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

CLUSTER="${KIND_CLUSTER:-youflix}"
IMAGE="${K8S_IMAGE:-youflix-backend:latest}"
OVERLAY="k8s/overlays/local"
NAMESPACE="youflix-backend"
SECRETS="$OVERLAY/.env.secrets"
SECRETS_EXAMPLE="$OVERLAY/.env.secrets.example"
CONTEXT="kind-${CLUSTER}"

wait_for_docker() {
  local attempts=0
  until docker info >/dev/null 2>&1; do
    attempts=$((attempts + 1))
    if [ "$attempts" -ge 30 ]; then
      echo "Docker is not responding. Start Docker Desktop and try again." >&2
      exit 1
    fi
    echo "Waiting for Docker..."
    sleep 2
  done
}

ensure_secrets() {
  if [ ! -f "$SECRETS" ]; then
    if [ -f "$SECRETS_EXAMPLE" ]; then
      cp "$SECRETS_EXAMPLE" "$SECRETS"
      echo "Created $SECRETS from the example file. Edit it if you need real credentials."
    else
      echo "Missing $SECRETS" >&2
      exit 1
    fi
  fi
}

cmd_up() {
  wait_for_docker
  ensure_secrets

  if ! kind get clusters 2>/dev/null | grep -qx "$CLUSTER"; then
    echo "Creating Kind cluster '$CLUSTER'..."
    kind create cluster --name "$CLUSTER"
  fi

  kubectl config use-context "$CONTEXT" >/dev/null

  echo "Building $IMAGE..."
  docker build -f Dockerfile.prod -t "$IMAGE" .

  echo "Loading image into Kind..."
  kind load docker-image "$IMAGE" --name "$CLUSTER"

  echo "Applying $OVERLAY..."
  kubectl apply -k "$OVERLAY"

  echo "Waiting for API rollout..."
  kubectl -n "$NAMESPACE" rollout status deploy/youflix-backend-api --timeout=180s
  kubectl -n "$NAMESPACE" rollout status deploy/youflix-backend-worker --timeout=180s

  echo
  kubectl -n "$NAMESPACE" get pods
  echo
  echo "Stack is up. Forward the API with:"
  echo "  kubectl -n $NAMESPACE port-forward svc/youflix-backend-api 3000:80"
}

cmd_down() {
  wait_for_docker

  if kubectl config get-contexts -o name 2>/dev/null | grep -qx "$CONTEXT"; then
    kubectl config use-context "$CONTEXT" >/dev/null
  fi

  if kubectl get namespace "$NAMESPACE" >/dev/null 2>&1; then
    echo "Deleting $OVERLAY..."
    kubectl delete -k "$OVERLAY" --ignore-not-found=true --wait=false
    echo "Deleting namespace $NAMESPACE..."
    kubectl delete namespace "$NAMESPACE" --ignore-not-found=true --wait=true --timeout=120s
  else
    echo "Namespace $NAMESPACE is not present."
  fi

  echo "Kind cluster '$CLUSTER' was left running. Remove it with:"
  echo "  kind delete cluster --name $CLUSTER"
}

case "${1:-}" in
  up) cmd_up ;;
  down) cmd_down ;;
  *)
    echo "Usage: $0 up|down" >&2
    exit 1
    ;;
esac
