# 🛠️ คู่มือการติดตั้งระบบด้วย Terraform & Ansible บน Kubernetes (IaC Guide)
## ระบบ Tank Quiz Battle 1990 — Single-Command Production Deployment

ระบบนี้ได้รับการออกแบบให้ติดตั้งและบริหารจัดการบน **Kubernetes Cluster (k3s)** โดยตรงตามหลักการ **Infrastructure as Code (IaC)** และ **Configuration Management Automation** โดย**ไม่พึ่งพา Docker Compose ใน Production** พร้อมทั้งมีสคริปต์รันคำสั่งเดียวติดตั้งได้ทั้งระบบทันที

---

## 🚀 1. การรันคำสั่งเดียวติดตั้งทั้งระบบ (Single-Command Automated Run)

ผู้ดูแลระบบหรืออาจารย์สามารถรันคำสั่งเดียวเพื่อ Build Image, นำเข้าสู่ Kubernetes Container Runtime, ติดตั้ง Workloads ทั้งหมด และตรวจสอบสถานะพร้อมใช้งาน:

```bash
# รันติดตั้งแบบ Full Automation ผ่าน Ansible & Kubernetes
./deploy-all.sh

# หรือระบุให้รันผ่าน Terraform โดยตรง
./deploy-all.sh --terraform

# หรือระบุให้รันผ่าน Ansible Playbook
./deploy-all.sh --ansible
```

---

## 📂 2. โครงสร้างโฟลเดอร์ Infrastructure as Code

```text
tank-quiz-battle/
├── deploy-all.sh               # สคริปต์ควบคุมการ Deploy อัตโนมัติในคำสั่งเดียว
│
├── terraform/                  # Infrastructure as Code (HashiCorp Terraform)
│   ├── main.tf                 # กำหนด Namespace, Deployments, Services, NodePorts
│   ├── variables.tf            # ตัวแปรระบบ (Kubeconfig, Replicas, Ports, Secret)
│   ├── outputs.tf              # แสดง URL เข้าใช้งานเกมและ API เมื่อเสร็จสิ้น
│   └── terraform.tfvars        # ค่า Config เริ่มต้นสำหรับ Production Cluster
│
├── ansible/                    # Configuration Management & Automation Playbook
│   ├── ansible.cfg             # ตั้งค่าการเชื่อมต่อ SSH, Timeout, และ Privilege Escalation
│   ├── inventory.ini           # ระบุเป้าหมาย Master Node (IP: 192.168.50.96)
│   ├── playbook.yml            # Main Playbook (Phase 1: Build Local -> Phase 2: Deploy K8s)
│   └── roles/
│       └── game_deploy/
│           ├── tasks/main.yml  # Tasks นำเข้า Container Image, Apply Manifests, Rollout Status
│           └── vars/main.yml   # ตัวแปรประจำ Role (Ports, Paths, Namespaces)
│
└── k8s/
    ├── game-deployment.yaml    # Workloads ใน Namespace game (game-client, game-server)
    ├── quiz-platform.yaml      # Workloads ใน Namespace quiz (quiz-service, quiz-manager-portal)
    └── identity-platform.yaml  # Workloads ใน Namespace identity (account-service)
```

---

## 🏗️ 3. รายละเอียดการทำงานของแต่ละเครื่องมือ

### 🅰️ Terraform Pipeline (`terraform/`)

Terraform ทำหน้าที่จัดการ State และ Lifecycle ของทรัพยากรหลักบน Kubernetes:
- `kubernetes_namespace.game`: สร้าง Namespace `game` แบบ Isolated
- `kubernetes_deployment_v1.game_server`: Deploy เซิร์ฟเวอร์ Node.js + Socket.io พร้อม Env JWT
- `kubernetes_deployment_v1.game_client`: Deploy Nginx React Client (2 Replicas สำหรับ High Availability)
- `kubernetes_service_v1.game_server` & `game_client`: สร้าง Internal ClusterIP
- `kubernetes_service_v1.game_client_nodeport`: เปิด NodePort `30080` สำหรับให้นักเรียนและอาจารย์เข้าเล่น
- `kubernetes_service_v1.game_server_nodeport`: เปิด NodePort `30400` สำหรับการดึง Open REST API โดยตรง

**คำสั่งรันแบบ Manual:**
```bash
cd terraform
terraform init
terraform plan
terraform apply -auto-approve
```

---

### 🅱️ Ansible Automation Pipeline (`ansible/`)

Ansible ทำหน้าที่ประสานงานระหว่างเครื่อง Local และคลัสเตอร์ Server แบบ Zero-Touch:
1. **Phase 1 (Localhost)**:
   - สั่ง Build Docker Images สำหรับทุก Microservices
   - บันทึกเป็นไฟล์ Archive `.tar` เพื่อเตรียมส่งขึ้นคลัสเตอร์
2. **Phase 2 (Remote K3s Node: 192.168.50.96)**:
   - ถ่ายโอนไฟล์ Image Tarball ไปยัง Server ผ่าน SSH
   - สั่ง `k3s ctr images import` นำเข้า Image สู่ Container Runtime โดยตรง
   - Apply Kubernetes Manifests ทั้ง 3 แพลตฟอร์ม (`game-deployment.yaml`, `quiz-platform.yaml`, `identity-platform.yaml`)
   - รอจนกระทั่ง Pods ทุกตัวอยู่ในสถานะ `Running 1/1`
   - รัน Automated Smoke Tests ตรวจสอบ Health Check ครบทุก Service

**คำสั่งรันแบบ Manual:**
```bash
cd ansible
ansible-playbook -i inventory.ini playbook.yml
```

---

## 🌐 4. จุดเข้าใช้งานจริงบน Production Cluster ผ่าน Traefik Ingress Gateway

ทุก Service ให้บริการผ่าน Traefik Gateway เดียวกันบนพอร์ต 80 และ 443 (HTTPS) โดยอัตโนมัติ:

| บริการ / Microservice | Production URL / Endpoint | Namespace | Priority | รายละเอียด |
| :--- | :--- | :---: | :---: | :--- |
| **🎮 Game Application** | `https://tank.192-168-50-96.sslip.io/` | `game` | 230 | React 18 SPA (2 Replicas, Nginx) |
| **🕹️ Realtime Combat Engine** | `https://tank.192-168-50-96.sslip.io/socket.io/` | `game` | 240 | WebSocket 2D Physics Engine |
| **🩺 Game Server Health** | `https://tank.192-168-50-96.sslip.io/api/health` | `game` | 240 | Health Check ของ Game Server |
| **📚 Open Quiz REST API** | `https://tank.192-168-50-96.sslip.io/api/quiz/questions` | `quiz` | 250 | ดึง/จัดการคลังข้อสอบ |
| **🩺 Quiz Service Health** | `https://tank.192-168-50-96.sslip.io/api/quiz/health` | `quiz` | 250 | Health Check ของ Quiz Service |
| **🔑 External LMS Sync API** | `POST .../api/quiz/sync` | `quiz` | 250 | API ซิงค์ข้อสอบ (Header `X-API-Key`) |
| **📝 Quiz Manager Portal** | `https://tank.192-168-50-96.sslip.io/quiz-portal/` | `quiz` | 235 | Standalone Portal สำหรับอาจารย์ (Google OAuth RBAC) |
| **👤 Identity & RBAC Service** | `https://tank.192-168-50-96.sslip.io/api/account/` | `identity` | 248 | Google SSO, 3NF Academic Directory |
| **🩺 Account Service Health** | `https://tank.192-168-50-96.sslip.io/api/account/health` | `identity` | 248 | Health Check ของ Account Service |

---

## 🧪 5. การตรวจสอบสถานะระบบบนเครื่อง Server (Cluster Verification)

```bash
# ตรวจสอบสถานะ Pods ครบทั้ง 3 Namespaces (game, quiz, identity)
sudo k3s kubectl get pods -n game
sudo k3s kubectl get pods -n quiz
sudo k3s kubectl get pods -n identity

# ตรวจสอบ IngressRoutes ทั้งหมดที่ Traefik ควบคุม
sudo k3s kubectl get ingressroutes -A

# ทดสอบยิง Health Check ผ่าน Traefik Gateway ทุก Services
curl -k -s https://tank.192-168-50-96.sslip.io/api/health
curl -k -s https://tank.192-168-50-96.sslip.io/api/quiz/health
curl -k -s https://tank.192-168-50-96.sslip.io/api/account/health
curl -k -s -I https://tank.192-168-50-96.sslip.io/quiz-portal/
curl -k -s -I https://tank.192-168-50-96.sslip.io/

# ทดสอบซิงค์ข้อสอบจาก External LMS (Teacher API)
curl -k -X POST https://tank.192-168-50-96.sslip.io/api/quiz/sync \
  -H "Content-Type: application/json" \
  -H "X-API-Key: tank-quiz-api-key-2026" \
  -d '{"providerId":"LMS","questions":[{"questionTh":"1+1=?","options":["1","2","3","4"],"correctIndex":1}]}'
```

---
*จัดทำขึ้นเพื่อให้การนำระบบขึ้นเซิร์ฟเวอร์ด้วย Kubernetes Multi-Namespace Architecture และ Traefik Ingress เป็นไปอย่างถูกต้อง มีเสถียรภาพ และตรงตามระบบจริงใน Production 100%*

