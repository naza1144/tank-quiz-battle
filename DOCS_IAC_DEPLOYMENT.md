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
    └── game-deployment.yaml    # Kubernetes Workload Manifests
```

---

## 🏗️ 3. รายละเอียดการทำงานของแต่ละเครื่องมือ

### 🅰️ Terraform Pipeline (`terraform/`)

Terraform ทำหน้าที่จัดการ State และ Lifecycle ของทรัพยากรบน Kubernetes:
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
   - สั่ง Build Docker Images (`tank-game-client` และ `tank-game-server`)
   - บันทึกเป็นไฟล์ Archive `.tar` เพื่อเตรียมส่งขึ้นคลัสเตอร์
2. **Phase 2 (Remote K3s Node: 192.168.50.96)**:
   - ถ่ายโอนไฟล์ Image Tarball ไปยัง Server ผ่าน SSH
   - สั่ง `k3s ctr images import` นำเข้า Image สู่ Container Runtime โดยตรง
   - Apply Kubernetes Manifests และสั่ง `rollout restart`
   - รอจนกระทั่ง Pods ทุกตัวอยู่ในสถานะ `Running 1/1`
   - ทดสอบ Health Check ของ Open REST API ที่ `http://127.0.0.1:30080/api/quiz/categories`

**คำสั่งรันแบบ Manual:**
```bash
cd ansible
ansible-playbook -i inventory.ini playbook.yml
```

---

## 🌐 4. จุดเข้าใช้งานหลังการติดตั้ง (Access Endpoints)

| บริการ | URL / Port | รายละเอียด |
| :--- | :--- | :--- |
| **🎮 Game Application** | `http://192.168.50.96:30080` | หน้าเว็บแอปพลิเคชันเกมยิงรถถัง (PC / Mobile) |
| **📚 Open Quiz REST API** | `http://192.168.50.96:30080/api/quiz/categories` | API คลังข้อสอบสำหรับอาจารย์ |
| **🌐 Ingress Host** | `http://tank.192-168-50-96.sslip.io` | เข้าใช้งานผ่าน Traefik IngressRoute |

---

## 🧪 5. การตรวจสอบสถานะระบบ (Health Check & Verification)

```bash
# ตรวจสอบสถานะ Pods ทั้งหมดใน Namespace game
kubectl get pods -n game -o wide

# ตรวจสอบ Services และ NodePort
kubectl get svc -n game

# ทดสอบยิง API คลังข้อสอบ
curl -s http://192.168.50.96:30080/api/quiz/categories
```

---
*จัดทำขึ้นเพื่อให้การนำระบบขึ้นเซิร์ฟเวอร์ด้วย Kubernetes, Terraform และ Ansible เป็นไปอย่างสะดวก รวดเร็ว และเป็นมาตรฐานสากล*
