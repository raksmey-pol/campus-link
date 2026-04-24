#!/usr/bin/env bash
set -euo pipefail

DOMAIN=""
EMAIL=""
REPO_URL=""
APP_DIR="/opt/campus-link"
BRANCH="main"
ENV_FILE=""
SKIP_CERTBOT="false"

usage() {
  cat <<'EOF'
Usage:
  ./deploy/aws/deploy.sh --domain DOMAIN --email EMAIL [options]

Required:
  --domain DOMAIN            Public domain (example: api.example.com)
  --email EMAIL              Email for Let's Encrypt notifications

Optional:
  --repo-url URL             Git repository URL to clone/pull
  --app-dir PATH             Deployment directory (default: /opt/campus-link)
  --branch NAME              Git branch to deploy (default: main)
  --env-file PATH            Path to env file for docker compose
  --skip-certbot             Skip SSL issuance (Nginx HTTP only)
  --help                     Show this help message

Examples:
  ./deploy/aws/deploy.sh --domain api.example.com --email ops@example.com
  ./deploy/aws/deploy.sh --domain api.example.com --email ops@example.com \
    --repo-url https://github.com/org/campus-link.git --branch main
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --domain)
      DOMAIN="$2"
      shift 2
      ;;
    --email)
      EMAIL="$2"
      shift 2
      ;;
    --repo-url)
      REPO_URL="$2"
      shift 2
      ;;
    --app-dir)
      APP_DIR="$2"
      shift 2
      ;;
    --branch)
      BRANCH="$2"
      shift 2
      ;;
    --env-file)
      ENV_FILE="$2"
      shift 2
      ;;
    --skip-certbot)
      SKIP_CERTBOT="true"
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1"
      usage
      exit 1
      ;;
  esac
done

if [[ -z "$DOMAIN" || -z "$EMAIL" ]]; then
  echo "Error: --domain and --email are required."
  usage
  exit 1
fi

if ! command -v sudo >/dev/null 2>&1; then
  echo "Error: sudo is required on this machine."
  exit 1
fi

if ! command -v apt-get >/dev/null 2>&1; then
  echo "Error: this script currently supports Ubuntu/Debian only."
  exit 1
fi

echo "[1/7] Installing system dependencies"
sudo apt-get update -y
sudo apt-get install -y ca-certificates curl gnupg lsb-release nginx certbot python3-certbot-nginx git

if ! command -v docker >/dev/null 2>&1; then
  echo "Installing Docker"
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker "$USER" || true
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "Installing Docker Compose plugin"
  sudo apt-get install -y docker-compose-plugin
fi

echo "[2/7] Preparing application directory"
if [[ -n "$REPO_URL" ]]; then
  if [[ ! -d "$APP_DIR/.git" ]]; then
    sudo mkdir -p "$APP_DIR"
    sudo chown -R "$USER":"$USER" "$APP_DIR"
    git clone "$REPO_URL" "$APP_DIR"
  fi
  cd "$APP_DIR"
  git fetch --all
  git checkout "$BRANCH"
  git pull --ff-only origin "$BRANCH"
else
  if [[ ! -f "$APP_DIR/docker-compose.yml" ]]; then
    echo "Error: $APP_DIR must contain docker-compose.yml when --repo-url is not provided."
    exit 1
  fi
  cd "$APP_DIR"
fi

if [[ -z "$ENV_FILE" ]]; then
  if [[ -f "$APP_DIR/.env" ]]; then
    ENV_FILE="$APP_DIR/.env"
  else
    echo "Error: env file not found. Create $APP_DIR/.env or pass --env-file."
    exit 1
  fi
fi

echo "[3/7] Deploying application containers"
docker compose --env-file "$ENV_FILE" pull || true
docker compose --env-file "$ENV_FILE" up -d --build

echo "[4/7] Writing Nginx reverse-proxy config"
TEMPLATE_PATH="$APP_DIR/deploy/aws/nginx/campus-link.conf.template"
if [[ ! -f "$TEMPLATE_PATH" ]]; then
  echo "Error: missing template file at $TEMPLATE_PATH"
  exit 1
fi

TMP_CONF="$(mktemp)"
sed "s/__DOMAIN__/$DOMAIN/g" "$TEMPLATE_PATH" > "$TMP_CONF"

sudo cp "$TMP_CONF" /etc/nginx/sites-available/campus-link.conf
rm -f "$TMP_CONF"

if [[ ! -L /etc/nginx/sites-enabled/campus-link.conf ]]; then
  sudo ln -s /etc/nginx/sites-available/campus-link.conf /etc/nginx/sites-enabled/campus-link.conf
fi

if [[ -L /etc/nginx/sites-enabled/default ]]; then
  sudo rm -f /etc/nginx/sites-enabled/default
fi

echo "[5/7] Validating and reloading Nginx"
sudo nginx -t
sudo systemctl reload nginx

if [[ "$SKIP_CERTBOT" == "false" ]]; then
  echo "[6/7] Requesting TLS certificate"
  sudo certbot --nginx -d "$DOMAIN" -m "$EMAIL" --agree-tos --no-eff-email --redirect -n
else
  echo "[6/7] Skipped TLS issuance (--skip-certbot provided)"
fi

echo "[7/7] Deployment summary"
docker compose ps
echo "Done."
echo "API URL: https://$DOMAIN"