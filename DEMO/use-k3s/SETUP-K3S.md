# ติดตั้ง Sudhood บน k3s — ครั้งแรก

> อัปเดต 19 ส.ค. 2569 · **ทางติดตั้งคือ Terraform** สคริปต์ `create-secrets.sh` / `deploy.sh` /
> `import-realm.sh` / `build-images.sh` ถูกแทนไปแล้ว และขั้น "คัดลอก client secret จาก
> Keycloak ด้วยมือ" ที่เอกสารรุ่นก่อนบอกว่า automate ไม่ได้ **หายไปทั้งขั้น**
>
> เหตุผลของแต่ละการตัดสินใจอยู่ใน [`../terraform/README.md`](../terraform/README.md) ไฟล์นี้คือลำดับที่ต้องทำ

---

## ภาพรวม — `terraform apply` ครั้งเดียวทำอะไรให้

1. build image ทั้ง 5 (`token-service`, `m0-identity`, `m10-platform`, `m1-curriculum`, `m9-thesis`) แล้ว push เข้า registry ในเครื่อง — **tag เป็น hash ของซอร์ส** ซอร์สเปลี่ยน pod จึง roll จริง
2. สุ่มรหัสผ่าน 9 ตัว + สร้าง RSA signing key เป็น Kubernetes Secret — **ไม่มี `.env` แล้ว ไม่มีใครพิมพ์รหัสเข้าไป**
3. ออกใบรับรอง TLS จาก CA ของเราเอง แล้วผูกเป็น `TLSStore` ชื่อ `default` — route ทั้ง 18 เส้นได้ใบเดียวกัน
4. กาง manifest ทั้งชุดผ่าน kustomize + apply `k8s/gateway/traefik-ha.yaml` (2 replica + redirect http→https)
5. รอ Keycloak ขึ้น แล้ว Job `keycloak-init` สร้าง realm `sudhood` + **บอก** client secret ที่ Terraform สุ่มไว้ให้ Keycloak
6. คืน prompt ตอนพร้อมจริง ไม่ใช่ตอนยังไม่พร้อม

---

## 1. เตรียมเครื่อง — ขั้นเดียวที่ต้อง root และทำครั้งเดียวตลอดชีพ

```bash
sudo apt-get update && sudo apt-get install -y docker.io unzip && sudo usermod -aG docker $USER && curl -sfL https://get.k3s.io | sh - && mkdir -p ~/.kube && sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config && sudo chown $(id -u):$(id -g) ~/.kube/config && chmod 600 ~/.kube/config
```

ทำให้ `kubectl` ใช้ได้ถาวรโดยไม่ต้อง sudo:

```bash
echo 'export KUBECONFIG=$HOME/.kube/config' >> ~/.bashrc && source ~/.bashrc
```

> `kubectl` ที่มากับ k3s อ่าน `/etc/rancher/k3s/k3s.yaml` ก่อนอย่างอื่น และไฟล์นั้น root อ่านได้คนเดียว
> ผลคือ `kubectl get nodes` ตอบ permission denied ทั้งที่คลัสเตอร์ปกติดี

แล้วบอก containerd ว่า registry ในเครื่องเป็น HTTP ธรรมดา — **ข้ามขั้นนี้แล้ว pod ทุกตัวจะ `ImagePullBackOff`** เพราะ containerd ต่อ HTTPS กับทุก registry เว้นแต่จะสั่งเป็นอย่างอื่น และ registry นี้ไม่มีใบรับรอง

```bash
printf 'mirrors:\n  "localhost:5000":\n    endpoint:\n      - "http://localhost:5000"\n' | sudo tee /etc/rancher/k3s/registries.yaml >/dev/null && sudo systemctl restart k3s
```

จากนั้น **logout/login ใหม่** ให้กลุ่ม `docker` มีผล (ssh ออกแล้วเข้าใหม่ก็พอ — กลุ่มผูกกับ process ตอน login ไม่ใช่ตอนรัน ไม่ต้อง reboot)

เช็คก่อนไปต่อ:

```bash
systemctl is-active k3s && kubectl get nodes && docker ps >/dev/null && echo "docker ok (ไม่ต้อง sudo)"
```

---

## 2. ติดตั้ง Terraform (ไม่ต้อง root)

```bash
mkdir -p ~/.local/bin && cd /tmp && VER=$(curl -s https://checkpoint-api.hashicorp.com/v1/check/terraform | python3 -c 'import sys,json;print(json.load(sys.stdin)["current_version"])') && curl -sSO "https://releases.hashicorp.com/terraform/${VER}/terraform_${VER}_linux_amd64.zip" && curl -sSO "https://releases.hashicorp.com/terraform/${VER}/terraform_${VER}_SHA256SUMS" && grep "linux_amd64.zip$" "terraform_${VER}_SHA256SUMS" | sha256sum -c - && unzip -oq "terraform_${VER}_linux_amd64.zip" -d ~/.local/bin
```

ตรวจ checksum ด้วย ไม่ได้เชื่อไฟล์ที่โหลดมาเฉย ๆ

---

## 3. ตั้งค่าที่ยังต้องกรอกเอง (ทางเลือก ข้ามได้)

```bash
cd DEMO/terraform/01-platform && cp terraform.tfvars.example terraform.tfvars
```

มีสองเรื่องในไฟล์นี้ ไม่ใส่เลยก็ขึ้นครบ

| เรื่อง | ใส่แล้วได้อะไร | ไม่ใส่แล้วเป็นอย่างไร |
|---|---|---|
| `google_client_id` / `google_client_secret` | มีปุ่ม login ด้วย Google | ระบบขึ้นครบ แค่ไม่มีปุ่ม Google |
| `app_host` / `auth_host` / `node_ip` | เข้าจากเครื่องอื่นในวง LAN ได้ | อยู่ที่ `https://localhost/` เท่านั้น |

**Google เป็นค่าเดียวในระบบทั้งหมดที่คนยังต้องกรอกเอง** เพราะ Google เป็นคนออกให้ ไม่มีอะไรสุ่มแทนได้ · วิธีสร้าง client อยู่ใน [`../GUIDE_GOOGLE_AUTH.md`](../GUIDE_GOOGLE_AUTH.md)

🔴 **redirect URI ที่ลงทะเบียนกับ Google ต้องตรงกับโหมดที่ใช้** — Keycloak เทียบเป็นสตริงตรงตัว

```text
ไม่ตั้ง auth_host   →  https://localhost/realms/sudhood/broker/google/endpoint
ตั้ง auth_host      →  https://<auth_host>/realms/sudhood/broker/google/endpoint
```

Google **ไม่รับเลข IP และไม่รับ http** — ชื่อโฮสต์แบบ `auth.192-168-50-96.sslip.io` จึงถูกใช้ ไม่ต้องมี DNS ของตัวเองและไม่ต้องแก้ `/etc/hosts` บนเครื่องลูกข่าย · IP อยู่ในชื่อ ถ้า DHCP แจก IP ใหม่จะพังทั้งชุด (ชื่อโฮสต์ + ใบรับรอง + การลงทะเบียนกับ Google พร้อมกัน) — **จอง IP ตายตัวก่อนพึ่งวิธีนี้**

---

## 4. `terraform apply`

```bash
cd DEMO/terraform/01-platform && terraform init && terraform apply
```

รันซ้ำได้เสมอ ครั้งที่สองจะขึ้น `No changes` เพราะเทียบกับของจริงทุกครั้ง

ครั้งแรกใช้เวลาส่วนใหญ่ไปกับ build image และ Keycloak cold start (สร้าง schema 40 วินาทีขึ้นไป)

---

## 5. อ่านรหัสผ่าน + ติดตั้ง CA

ไม่มีใครพิมพ์รหัสเข้าไป เพราะฉะนั้นต้องถามกลับ

```bash
terraform output -raw keycloak_admin_password
```

```bash
terraform output urls
```

ติดตั้ง CA ให้เครื่องที่จะเปิดเบราว์เซอร์ (ทำครั้งเดียวต่อเครื่อง) — ไม่ติดตั้งก็ใช้ได้แต่เบราว์เซอร์ขึ้นคำเตือนทุกครั้ง

```bash
terraform output -raw ca_certificate > /tmp/sudhood-ca.crt && sudo cp /tmp/sudhood-ca.crt /usr/local/share/ca-certificates/sudhood-ca.crt && sudo update-ca-certificates
```

> ใบรับรองสาธารณะออกให้ไม่ได้ — Let's Encrypt ต้องยิงเข้าพอร์ต 80 จากอินเทอร์เน็ต (HTTP-01) หรือคุมโซน DNS (DNS-01) วง LAN ทำไม่ได้ทั้งสองทาง นี่เป็นข้อเท็จจริงของเครือข่าย ไม่ใช่ช่องว่างของ config

---

## 6. ตรวจว่าใช้งานได้จริง

```bash
cd DEMO/use-k3s && GATEWAY=https://localhost scripts/verify.sh
```

ตรวจ 11 ข้อผ่าน gateway รวม **ข้อที่ต้องไม่ผ่าน**: request ที่ไม่มี token ต้องได้ 401 และ `/internal/*` ต้องเข้าไม่ถึงจากนอกคลัสเตอร์ (404) สองข้อนี้คือข้อที่จับ routing ผิดได้จริง — ข้อบวกอย่าง health check จะยังผ่านอยู่ดีแม้ auth middleware หลุด

🔴 **ต้องใส่ `GATEWAY=https://localhost`** — ค่าเริ่มต้นในสคริปต์ยังเป็น `http://localhost` ซึ่งตอนนี้ถูก Traefik เด้ง `301` ไป https ทุกเส้น ผลคือทุกข้อที่คาด `200` จะรายงานว่าไม่ผ่านทั้งที่ระบบปกติ (ค้างอยู่ใน `STATUS.md` หัวข้อ "เหลือทำ")

เช็คมือเพิ่ม:

```bash
curl -sS https://localhost/.well-known/jwks.json | python3 -m json.tool
```

```bash
curl -i https://localhost/api/v1/identity/me
```

ต้องได้ `401` — ถูกต้องแล้ว เพราะไม่มี token

---

## 7. สามขั้นที่ยังต้องทำมือ — และไม่มีอะไรเตือนถ้าลืม

### 7.1 สร้าง database login ต่อ service (เฉพาะคลัสเตอร์ที่ PVC มีอยู่ก่อนแล้ว)

ไฟล์ใน `postgres/init/` รันเฉพาะตอน data directory ว่าง คลัสเตอร์ที่เคยขึ้นมาแล้วต้องยิงเข้า pod เอง ไม่งั้น `M0_DATABASE_URL` ใน Secret จะอ้าง role ที่ไม่มีจริง แล้ว initContainer `migrate` ล้มตอน connect

```bash
kubectl -n sudhood exec -i deploy/postgres -- bash -s < postgres/init/02-service-users.sh
```

### 7.2 บังคับ append-only ให้ตาราง audit

ต้องรันหลัง M0 สร้างตารางเสร็จ (สคริปต์ตั้ง ownership แล้ว `REVOKE UPDATE/DELETE` ซึ่งเอ่ยชื่อตาราง จึงทำตอน bootstrap ไม่ได้) ก่อนรัน `m0_service` ลบแถว audit ได้

```bash
kubectl -n sudhood exec -i deploy/postgres -- bash -s < postgres/harden-audit.sh
```

### 7.3 บัญชี admin ใบแรก

`identity.account` ว่างตอนติดตั้งใหม่ และ **การ login ไม่ให้สิทธิ์** — `AUTO_PROVISION_ACCOUNTS=true` ทำให้คนที่ login ด้วย `@ubu.ac.th` ครั้งแรกได้ record สถานะ `PENDING` **ไม่มี role** ยังเข้าไม่ได้ แต่โผล่ในรายชื่อให้แอดมินอนุมัติ

> Google พิสูจน์ได้ว่าใครเป็นเจ้าของอีเมล แต่บอกไม่ได้ว่าเป็นนักศึกษาหรืออาจารย์ การสร้าง record ยืนยันแค่ข้อแรก ส่วน role ยังต้องมีคนตัดสิน

ใบแรกจึงต้อง bootstrap ด้วย token ที่เซ็นจากในpod ของ token-service — `admin` endpoint ตรวจ role จาก token ไม่ได้ตรวจจากฐานข้อมูล

```bash
kubectl -n sudhood exec deploy/token-service -- python -c 'import config, main; from keys import KeyRing; main.keyring = KeyRing(config.JWT_KEYS_DIR, config.JWT_ACTIVE_KID); print(main.issue_access_token({"account_id": "bootstrap", "email": "you@ubu.ac.th", "roles": ["admin"], "account_type": "STAFF"}))'
```

> ⚠️ ท่านี้ทำงานได้ตอนก่อนย้ายมา Terraform และ **ยังไม่ได้รันซ้ำหลังย้าย** — `keyring` ถูกสร้างใน `lifespan` ของ FastAPI จึงต้องประกอบเองแบบข้างบน ถ้าใช้ไม่ได้ให้ดู `STATUS.md` หัวข้อ "ทางออก token สำหรับ dev" ซึ่งยังเป็นงานค้าง

แล้วสร้างบัญชีจริง:

```bash
curl -X POST https://localhost/api/v1/identity/admin/users \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"email":"somchai@ubu.ac.th","name_th_first":"สมชาย","name_th_last":"ใจดี","type":"FACULTY","roles":["faculty","teacher"]}'
```

สำหรับเครื่อง dev เปิด seed ได้: แก้ `k8s/config.yaml` ให้ `SEED_DEMO_ACCOUNTS: "true"` แล้ว `terraform apply` (config hash เปลี่ยน pod จึง roll เอง) — ได้ 3 บัญชี admin/faculty/student **ห้ามเปิดบน production**

---

## เข้าใช้งาน

```text
https://localhost/hub/        หน้ากลาง — login แล้วเลือกโมดูล
```

login เสร็จจะกลับมาที่หน้านี้ (`LOGIN_SUCCESS_REDIRECT`) แล้วเลือกเข้า `/account/` หรือ `/console/` ได้ทั้งคู่โดยไม่ต้อง login ซ้ำ — หน้า hub เขียน token ให้ทั้งสองแอปพร้อมกัน เพราะแต่ละแอปอ่านจาก sessionStorage คนละ key แต่อยู่ origin เดียวกัน

| ปลายทาง | ที่อยู่ |
|---|---|
| หน้ากลาง | `https://localhost/hub/` หรือ `https://<app_host>/hub/` |
| Account Center (M0) | `/account/` |
| Platform Console (M10) | `/console/` |
| Keycloak admin | `https://<auth_host>/` — ถ้าไม่ตั้ง `auth_host` ใช้ `scripts/port-forward.sh` แล้วเข้า `http://localhost:8080` |
| MinIO console | `http://<node_ip>:30901` (NodePort ไม่ผ่าน gateway ไม่มี TLS) |
| pgAdmin | `scripts/port-forward.sh` → `http://localhost:5050` |

---

## ถอนระบบ

```bash
cd DEMO/use-k3s && scripts/teardown.sh
```

หยุด workload แต่เก็บ PVC ไว้ — บัญชี, realm, และ signing key อยู่ครบ `terraform apply` กลับมาได้เหมือนเดิม

ล้างจริง (ข้อมูลหายหมด):

```bash
scripts/teardown.sh --with-data
```

> `terraform destroy` **จะไม่ผ่าน** โดยเจตนา — `signing-key.tf` และ `images.tf` มี `prevent_destroy` คร่อมไว้
> เสีย signing key = token ทุกใบที่เคยออกยืนยันไม่ได้อีก ทุกคนหลุด login พร้อมกัน และ Terraform
> จะสร้างคีย์ใหม่ให้เงียบ ๆ โดยไม่มีอะไรฟ้อง

---

## ภาคผนวก — ทางสคริปต์เดิม (ไม่แนะนำ)

สคริปต์ยังอยู่ในโฟลเดอร์และยังรันได้ แต่ **ห้ามผสมกับคลัสเตอร์ที่ Terraform สร้าง**

🔴 `scripts/create-secrets.sh` อ่าน `.env` แล้วเขียนทับ `sudhood-secrets` ด้วยรหัสที่ไม่ตรงกับที่ Postgres/Keycloak/MinIO ถูกสร้างมา ผลคือทั้งระบบล็อกอินไม่ได้พร้อมกัน และ `terraform plan` จะไม่เห็นอะไรผิดเลยเพราะ Terraform ไม่รู้จักสคริปต์นั้น · ย้ายมา Terraform แล้วให้ `rm DEMO/use-k3s/.env`

สคริปต์ที่ยังควรใช้ต่อ เพราะเป็นการ **ตรวจ/แก้** ไม่ใช่การ **สร้าง**:

| script | ทำอะไร |
|---|---|
| `verify.sh` | ตรวจ 11 ข้อผ่าน gateway (ใส่ `GATEWAY=https://localhost`) |
| `load-test.sh` | ยิงโหลดด้วย fortio จากในคลัสเตอร์ ดู HPA ตอบสนอง |
| `port-forward.sh` | เปิด Keycloak / pgAdmin / service ตรง ๆ สำหรับ debug |
| `reset-login.sh` | ล้าง Keycloak session + refresh token ใน Redis |
| `restart.sh` | roll deployment ด้วยมือ (Terraform roll ให้เองแล้วเมื่อ config หรือซอร์สเปลี่ยน) |
| `teardown.sh` | ถอนระบบ |

---

## 📎 ต่อจากนี้

- [`../terraform/README.md`](../terraform/README.md) — เหตุผลการออกแบบ, state, กับดักที่เจอมาแล้ว, รายการก่อนขึ้น production
- [`README.md`](README.md) — งานที่ทำบ่อย + แก้ปัญหา
- [`STATUS.md`](STATUS.md) — ทำถึงไหน เหลืออะไร
- [`ADD_SERVICE.md`](ADD_SERVICE.md) — เพิ่ม service ใหม่เข้า cluster
