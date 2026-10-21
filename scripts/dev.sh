#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

PIDS=()

cleanup() {
  echo -e "\n${YELLOW}Shutting down...${NC}"
  for pid in "${PIDS[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
  wait "${PIDS[@]}" 2>/dev/null || true
  echo -e "${GREEN}All services stopped.${NC}"
  exit 0
}
trap cleanup SIGINT SIGTERM EXIT

usage() {
  echo "Usage: $0 [mode]"
  echo ""
  echo "Modes:"
  echo "  all       Start everything: Docker infra + all services + web (default)"
  echo "  docker    Start only Docker infrastructure (postgres + redis)"
  echo "  services  Start only backend services (assumes Docker is running)"
  echo "  web       Start only the web frontend"
  echo "  seed      Seed the database with test data"
  echo "  stop      Stop all Docker containers"
  echo ""
  echo "Examples:"
  echo "  $0              # Start everything"
  echo "  $0 docker       # Start Docker, then run services manually"
  echo "  $0 seed         # Run after everything is up"
}

MODE="${1:-all}"

# ─── Docker Infra ────────────────────────────────────────────────
start_docker() {
  echo -e "${CYAN}[1/5] Starting Docker infrastructure...${NC}"
  docker compose up -d postgres-primary postgres-replica redis 2>&1 | tail -3

  echo -e "${CYAN}[2/5] Waiting for services to be healthy...${NC}"
  for i in {1..30}; do
    if docker compose ps | grep -q 'healthy'; then
      echo -e "${GREEN}  PostgreSQL & Redis are healthy${NC}"
      break
    fi
    sleep 2
  done
}

# ─── Install Dependencies ────────────────────────────────────────
install_deps() {
  for dir in identity-service auction-engine query-service guessx-web; do
    if [ ! -d "$dir/node_modules" ]; then
      echo -e "${YELLOW}  Installing $dir dependencies...${NC}"
      (cd "$dir" && npm install --silent 2>&1 | tail -1) &
    fi
  done
  wait
  echo -e "${GREEN}  Dependencies ready${NC}"
}

# ─── Backend Services ────────────────────────────────────────────
start_services() {
  echo -e "${CYAN}[3/5] Starting backend services...${NC}"

  (cd identity-service && npm run start:dev) &
  PIDS+=($!)
  echo -e "  Identity Service  → ${GREEN}http://localhost:3001${NC}"

  (cd auction-engine && npm run start:dev) &
  PIDS+=($!)
  echo -e "  Auction Engine    → ${GREEN}http://localhost:3002${NC}"

  (cd query-service && npm run start:dev) &
  PIDS+=($!)
  echo -e "  Query Service     → ${GREEN}http://localhost:3003${NC}"

  sleep 2
}

# ─── Web Frontend ────────────────────────────────────────────────
start_web() {
  echo -e "${CYAN}[4/5] Starting web frontend...${NC}"
  (cd guessx-web && npm run dev) &
  PIDS+=($!)
  echo -e "  Web Frontend      → ${GREEN}http://localhost:5173${NC}"
}

# ─── Status ──────────────────────────────────────────────────────
show_status() {
  echo ""
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${GREEN}  Guess X is running!${NC}"
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo -e "  Web App:          ${CYAN}http://localhost:5173${NC}"
  echo -e "  Identity Service: ${CYAN}http://localhost:3001${NC}"
  echo -e "  Auction Engine:   ${CYAN}http://localhost:3002${NC}"
  echo -e "  Query Service:    ${CYAN}http://localhost:3003${NC}"
  echo -e "  PostgreSQL:       ${CYAN}localhost:5433${NC}"
  echo -e "  Redis:            ${CYAN}localhost:6379${NC}"
  echo ""
  echo -e "  Press ${RED}Ctrl+C${NC} to stop all services"
  echo ""
}

# ─── Seed Data ───────────────────────────────────────────────────
run_seed() {
  echo -e "${CYAN}Seeding database...${NC}"
  node scripts/seed.js
  echo -e "${GREEN}Seed complete.${NC}"
}

# ─── Stop ────────────────────────────────────────────────────────
stop_all() {
  echo -e "${YELLOW}Stopping all Docker containers...${NC}"
  docker compose down
  echo -e "${GREEN}Done.${NC}"
}

# ─── Route by Mode ───────────────────────────────────────────────
case "$MODE" in
  all)
    start_docker
    install_deps
    start_services
    start_web
    show_status
    wait
    ;;
  docker)
    start_docker
    echo -e "${GREEN}Docker infrastructure ready. Run '$0 services' to start backends.${NC}"
    ;;
  services)
    install_deps
    start_services
    echo -e "${GREEN}Backends running. Run '$0 web' to start the frontend.${NC}"
    wait
    ;;
  web)
    install_deps
    start_web
    show_status
    wait
    ;;
  seed)
    run_seed
    ;;
  stop)
    stop_all
    ;;
  -h|--help|help)
    usage
    ;;
  *)
    echo -e "${RED}Unknown mode: $MODE${NC}"
    usage
    exit 1
    ;;
esac