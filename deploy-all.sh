#!/usr/bin/env bash
# ==============================================================================
# 🕹️ TANK QUIZ BATTLE 1990 — SINGLE-COMMAND AUTOMATED DEPLOYMENT SCRIPT
# Provisions Infrastructure & Deploys Application to Kubernetes via Ansible/Terraform
# ==============================================================================

set -e

# ANSI Color Codes
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
NC='\033[0m'

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export PATH="$HOME/.local/bin:$HOME/.cache/sudhood-ansible/bin:$PATH"
export ANSIBLE_CONFIG="$ROOT_DIR/ansible/ansible.cfg"
export ANSIBLE_LOCAL_TEMP="$ROOT_DIR/ansible/.ansible_tmp"
mkdir -p "$ROOT_DIR/ansible/.ansible_tmp"

echo -e "${CYAN}===================================================================${NC}"
echo -e "${YELLOW}  🕹️ TANK QUIZ BATTLE 1990 — AUTOMATED K8S DEPLOYMENT PIPELINE  ${NC}"
echo -e "${CYAN}===================================================================${NC}"

MODE="${1:---all}"

echo -e "\n${PURPLE}[STEP 1/5] Checking Tooling Prerequisites...${NC}"
command -v docker >/dev/null 2>&1 || { echo -e "${RED}Error: docker is not installed.${NC}"; exit 1; }
command -v kubectl >/dev/null 2>&1 || { echo -e "${RED}Error: kubectl is not installed.${NC}"; exit 1; }
command -v ansible-playbook >/dev/null 2>&1 || { echo -e "${YELLOW}Notice: ansible-playbook found at ~/.local/bin/ansible-playbook${NC}"; }
command -v terraform >/dev/null 2>&1 || { echo -e "${YELLOW}Notice: terraform found at ~/.local/bin/terraform${NC}"; }

echo -e "${GREEN}✓ All CLI prerequisites verified!${NC}"

if [[ "$MODE" == "--terraform" ]]; then
  echo -e "\n${PURPLE}[TERRAFORM PIPELINE] Building & Packaging Containers...${NC}"
  docker build -t tank-quiz-service:latest "$ROOT_DIR/quiz-service"
  docker build -t tank-game-client:latest "$ROOT_DIR/game-client"
  docker build -t tank-game-server:latest "$ROOT_DIR/game-server"
  docker save tank-quiz-service:latest -o /tmp/tank-quiz-service.tar
  docker save tank-game-client:latest -o /tmp/tank-game-client.tar
  docker save tank-game-server:latest -o /tmp/tank-game-server.tar

  echo -e "\n${PURPLE}[TERRAFORM PIPELINE] Transferring images to K8s node...${NC}"
  # โหนด k3s เปิดรับเฉพาะ publickey (sshpass ใช้ไม่ได้จริง: allowed types: ['publickey'])
  # เปลี่ยนปลายทาง/คีย์ได้ผ่าน env: K3S_SSH_HOST, K3S_SSH_KEY
  K3S_SSH_HOST="${K3S_SSH_HOST:-dssi-2026@192.168.50.96}"
  K3S_SSH_KEY="${K3S_SSH_KEY:-$HOME/.ssh/id_dssi2026}"
  if [[ ! -f "$K3S_SSH_KEY" ]]; then
    echo -e "${RED}Error: ไม่พบ SSH key ที่ $K3S_SSH_KEY (ตั้ง env K3S_SSH_KEY ให้ชี้ไฟล์ที่ถูกต้อง)${NC}"
    exit 1
  fi
  scp -i "$K3S_SSH_KEY" -o StrictHostKeyChecking=no /tmp/tank-quiz-service.tar /tmp/tank-game-client.tar /tmp/tank-game-server.tar "$K3S_SSH_HOST:/tmp/"
  ssh -i "$K3S_SSH_KEY" -o StrictHostKeyChecking=no "$K3S_SSH_HOST" "sudo k3s ctr images import /tmp/tank-quiz-service.tar && sudo k3s ctr images import /tmp/tank-game-client.tar && sudo k3s ctr images import /tmp/tank-game-server.tar"

  echo -e "\n${PURPLE}[TERRAFORM PIPELINE] Applying Terraform Infrastructure...${NC}"
  cd "$ROOT_DIR/terraform"
  terraform init
  terraform apply -auto-approve
  cd "$ROOT_DIR"

elif [[ "$MODE" == "--ansible" || "$MODE" == "--all" ]]; then
  echo -e "\n${PURPLE}[ANSIBLE PIPELINE] Executing Automated Playbook...${NC}"
  cd "$ROOT_DIR/ansible"
  ansible-playbook -i inventory.ini playbook.yml
  cd "$ROOT_DIR"
fi

echo -e "\n${PURPLE}[FINAL VERIFICATION] Verifying Pods & REST APIs...${NC}"
kubectl get pods -n game --kubeconfig ~/.kube/config || true

echo -e "\n${CYAN}===================================================================${NC}"
echo -e "${GREEN}🎉 ALL SYSTEMS DEPLOYED & OPERATIONAL (TRAEFIK GATEWAY)!${NC}"
echo -e "${YELLOW}  🎮 Game URL        : http://tank.192-168-50-96.sslip.io${NC}"
echo -e "${YELLOW}  🔒 Teacher Portal  : http://tank.192-168-50-96.sslip.io/teacher${NC}"
echo -e "${YELLOW}  📚 Open REST API   : http://tank.192-168-50-96.sslip.io/api/quiz/categories${NC}"
echo -e "${YELLOW}  🩺 Quiz Health     : http://tank.192-168-50-96.sslip.io/api/quiz/health${NC}"
echo -e "${CYAN}===================================================================${NC}"

