# Sudhood บน k3s — คู่มือใช้งาน

ชุดเดียวกับ [`../use-docker-compose/`](../use-docker-compose/) แต่รันบน Kubernetes โค้ด service เหมือนกันทุกบรรทัด ต่างกันแค่ชั้น orchestration

> อัปเดต 19 ส.ค. 2569 · **การ deploy ย้ายไป [`../terraform/`](../terraform/) แล้ว** โฟลเดอร์นี้เหลือหน้าที่ถือ manifest, โค้ด service, และสคริปต์ตรวจ/แก้ · ติดตั้งครั้งแรกอ่าน [`SETUP-K3S.md`](SETUP-K3S.md)

---

## 📋 สารบัญ

1. [ต่างจากฝั่ง compose ยังไง](#-ต่างจากฝั่ง-compose-ยังไง)
2. [Quick start](#-quick-start)
3. [โครงไฟล์](#-โครงไฟล์)
4. [งานที่ทำบ่อย](#-งานที่ทำบ่อย)
5. [เข้าถึง service](#-เข้าถึง-service)
6. [แก้ปัญหาที่พบบ่อย](#-แก้ปัญหาที่พบบ่อย)
7. [ก่อนขึ้นใช้งานจริง](#-ก่อนขึ้นใช้งานจริง)

---

## 🔍 ต่างจากฝั่ง compose ยังไง

หน้าที่ของแต่ละ service ไม่เปลี่ยนเลย — Keycloak ยังเป็น identity broker, Token Service ยังเป็นคนออก JWT ใบเดียวที่ระบบเชื่อถือ, M0 ยังเป็นเจ้าของข้อมูลบัญชี อ่านภาพรวมได้จาก [`../use-docker-compose/README.md`](../use-docker-compose/README.md) ซึ่งยังใช้อธิบายสถาปัตยกรรมได้ทั้งหมด

ที่เปลี่ยนคือวิธี deploy:

| เรื่อง | docker compose | k3s |
|---|---|---|
| นิยาม service | `docker-compose.yaml` + `*/compose.yaml` | `k8s/*.yaml` + `kustomization.yaml` |
| network | `auth-net` bridge | cluster DNS ใน namespace `sudhood` |
| Traefik | container ของเราเอง + file provider | Traefik ที่ k3s ให้มา + `IngressRoute`/`Middleware` CRD |
| routing config | `traefik/dynamic/*.yaml` | `k8s/traefik/*.yaml` |
| ความลับ | `.env` ส่งเข้า container ตรง ๆ | Terraform สุ่มเอง 9 ค่า เขียนเป็น `Secret` — ไม่มี `.env` แล้ว |
| config ไม่ลับ | อยู่ใน `.env` ปนกับความลับ | แยกไป `k8s/config.yaml` commit ได้ |
| volume | docker named volume | PVC บน StorageClass `local-path` |
| image | compose build ให้ตอน `up` | Terraform build + push เข้า registry `localhost:5000` · tag เป็น hash ของซอร์ส |
| port ที่เห็นจากเครื่อง | `ports:` ใน compose | Traefik ถือ `:80`/`:443` ส่วนที่เหลือใช้ `port-forward` |
| TLS | ไม่มี — http ล้วน | **https ทุกเส้น** ใบรับรองจาก CA ของเราเอง · http เด้ง `301` ที่ entrypoint |
| scale | `replicas:` ในไฟล์ | HPA ที่ 80% CPU (`k8s/availability.yaml`) + PodDisruptionBudget |

**ชื่อ service ใน cluster ตั้งให้ตรงกับชื่อ container เดิมทุกตัว** (`postgres`, `redis`, `keycloak`, `minio`, `nats`, `token-service`, `m0-identity`, `m10-platform`) เพราะงั้น env อย่าง `M0_INTERNAL_URL=http://m0-identity:8000` ใช้ค่าเดิมได้ ไม่ต้องแก้โค้ดแม้แต่บรรทัดเดียว

---

## 🚀 Quick start

**การ deploy อยู่ที่ [`../terraform/`](../terraform/) แล้ว** ไม่ใช่ที่โฟลเดอร์นี้ — เครื่องใหม่อ่าน [`SETUP-K3S.md`](SETUP-K3S.md) ก่อน (มีขั้นเตรียมเครื่องที่ต้อง root ครั้งเดียว)

```bash
cd DEMO/terraform/01-platform && terraform init && terraform apply
```

```bash
cd DEMO/use-k3s && GATEWAY=https://localhost scripts/verify.sh
```

`apply` build image → push เข้า registry → สร้าง Secret + signing key → กาง manifest → ออกใบรับรอง TLS → สร้าง realm ให้ครบในคำสั่งเดียว รันซ้ำได้ ครั้งที่สองขึ้น `No changes`

🔴 **อย่ารัน `scripts/create-secrets.sh` หรือ `scripts/deploy.sh` บนคลัสเตอร์ที่ Terraform สร้าง** — ตัวแรกเขียนทับ `sudhood-secrets` ด้วยรหัสจาก `.env` เก่าที่ไม่ตรงกับที่ Postgres/Keycloak/MinIO ถูกสร้างมา ทั้งระบบล็อกอินไม่ได้พร้อมกันและ `terraform plan` ไม่เห็นว่าอะไรผิด · ย้ายมา Terraform แล้วให้ `rm .env`

---

## 📂 โครงไฟล์

```text
use-k3s/
├── kustomization.yaml        # base ที่ ../terraform/ อ่านไปกาง (apply -k . ตรง ๆ ก็ได้ แต่จะไม่มี Secret)
├── .env.example              # ของทางสคริปต์เดิม — Terraform ไม่ใช้ไฟล์นี้แล้ว
│
├── k8s/
│   ├── namespace.yaml
│   ├── config.yaml           # ConfigMap sudhood-config
│   ├── postgres.yaml         # Deployment + Service + PVC
│   ├── redis.yaml
│   ├── keycloak.yaml
│   ├── pgadmin.yaml
│   ├── minio.yaml          # object storage + Job สร้าง bucket/key ต่อ service
│   ├── nats.yaml           # event bus (JetStream) + Job สร้าง stream
│   ├── token-service.yaml
│   ├── m0-identity.yaml    # + initContainer migrate + OPA sidecar
│   ├── m10-platform.yaml   # + OPA sidecar · เสิร์ฟ /console และ /hub
│   ├── m1-curriculum.yaml  # ของเพื่อน — ยกมารันเท่านั้น
│   ├── m9-thesis.yaml      # ของเพื่อน
│   ├── m10-rbac.yaml       # สิทธิ์อ่าน pod/hpa ของ M10 (อ่าน Secret ไม่ได้)
│   ├── availability.yaml   # HPA + PodDisruptionBudget ของทั้งสแตก
│   ├── observability.yaml  # ServiceMonitor — ปิดเป็นค่าเริ่มต้น ต้องมี prometheus-operator
│   ├── gateway/
│   │   └── traefik-ha.yaml       # 2 replica + redirect http→https (อยู่ kube-system
│   │                             #  จึงไม่อยู่ใน kustomization — Terraform apply แยก)
│   └── traefik/
│       ├── middlewares.yaml      # jwt-auth, cors, rate-limit, chain-standard
│       └── ingressroutes.yaml    # routing table 18 เส้น ทุกเส้น websecure + tls: {}
│
├── scripts/                  # เหลือไว้ "ตรวจและแก้" ส่วนการ "สร้าง" ย้ายไป ../terraform/
│   ├── lib.sh                # helper ที่ตัวอื่น source
│   ├── verify.sh             # ตรวจ 11 ข้อผ่าน gateway — GATEWAY=https://localhost
│   ├── load-test.sh          # ยิงโหลดด้วย fortio ดู HPA ตอบสนอง
│   ├── port-forward.sh       # เปิด Keycloak/pgAdmin/service ตรง ๆ
│   ├── reset-login.sh        # ล้าง Keycloak session + refresh token
│   ├── restart.sh            # roll deployment ด้วยมือ
│   ├── teardown.sh           # ถอนระบบ (เก็บ PVC เป็นค่าเริ่มต้น)
│   └── (build-images · create-secrets · create-signing-key · deploy · import-realm
│        · setup-google-idp — ถูก Terraform แทนแล้ว เก็บไว้เป็นทางถอย ห้ามผสมกัน)
│
├── token-service/            # โค้ด service — สำเนาของโฟลเดอร์นี้เอง
├── m0-service/               #   แต่ละตัวมี policy/ ของตัวเองอยู่ข้างใน
├── m10-service/              #   + console/ (React) + hub/ (หน้ากลาง)
├── m1-curriculum-service/    # ของเพื่อน
├── m9-service/               # ของเพื่อน
├── keycloak/                 # realm-export.json
├── minio/                    # setup-buckets.sh → ConfigMap ผ่าน kustomize
├── nats/                     # init-streams.sh
└── postgres/                 # init/ (database + service login) + harden-audit.sh
```

### สองฝั่งมีต้นฉบับของตัวเอง — และไม่มีอะไร sync ให้

โฟลเดอร์นี้ถือสำเนาโค้ด service ของตัวเองครบ เพื่อให้ยกไปทั้งก้อนหรือเก็บไว้เดี่ยว ๆ ได้
โดยไม่ต้องมี `../use-docker-compose` อยู่ด้วย **ราคาที่ต้องจ่ายคือแก้ฝั่งเดียวไม่พอ**
สองฝั่งนี้เคยห่างกัน 28 ไฟล์มาแล้ว (Alembic, MinIO, per-service OPA, React ทั้งสองตัว
ลงแต่ฝั่ง compose) และ `keycloak/` ก็ยัง drift อยู่จริง ๆ ตอนนี้

แก้อะไรใต้โฟลเดอร์ service ฝั่งไหนก็ตาม ให้เช็คด้วย

```bash
for d in token-service m0-service m10-service \
         m1-curriculum-service m9-service minio nats postgres; do
  diff -r --exclude=compose.yaml --exclude=node_modules --exclude=dist \
    ../use-docker-compose/$d ./$d
done
```

`compose.yaml` เป็นไฟล์เดียวที่ควรต่างกันจริง — มันคือวิธีที่ฝั่ง compose ต่อสาย service
ส่วนของที่นี่คือ manifest ใน `k8s/`

สคริปต์ใน `minio/`, `nats/`, `postgres/init/` ยังเป็นไฟล์จริง ไม่ได้ถูกก็อปเป็น string ใน YAML
— kustomize อ่านไปทำ ConfigMap ตอน apply เพราะงั้นแก้ไฟล์เดียวจบ และ lint/test ได้เหมือนเดิม

---

## 🔧 งานที่ทำบ่อย

### แก้โค้ด service แล้วอยากเห็นผล

```bash
cd ../terraform/01-platform && terraform apply
```

`images.tf` hash ทั้งต้นไม้ซอร์สของแต่ละ service แล้วเอา 12 ตัวแรกมาเป็น tag — **ซอร์สเปลี่ยน tag เปลี่ยน pod template เปลี่ยน pod จึง roll เอง** และ service ที่ไม่ได้แก้เป็น no-op จริง ไม่ build ซ้ำ

ถ้า tag คงที่ (`:local` แบบเดิม) การ deploy จะเงียบ ๆ ไม่ทำอะไรเลย — template ไม่เปลี่ยน Deployment ไม่ roll และ `IfNotPresent` ก็ใช้ image ที่ cache ไว้ใต้ tag เดิม ผลคือคลัสเตอร์รันโค้ดของสัปดาห์ที่แล้วในขณะที่ `plan` บอกว่าตรงหมด

### แก้ config ที่ไม่ลับ

แก้ `k8s/config.yaml` แล้ว

```bash
cd ../terraform/01-platform && terraform apply
```

`manifests.tf` hash ทั้ง `config.yaml` และค่าที่ Terraform patch ทับ แล้วใส่เป็น annotation บน pod template ของทุก Deployment — config เปลี่ยน → template เปลี่ยน → Kubernetes roll ด้วยเหตุผลปกติของมันเอง **ไม่มีใครต้องจำว่าต้อง restart**

🔴 **`kubectl apply -k .` เฉย ๆ ไม่มีผล** — ค่าจาก `envFrom: configMapRef` ถูกฉีดเข้า process
ตอน pod เกิดครั้งเดียว แก้ ConfigMap แล้ว pod ที่รันอยู่ไม่รับรู้ และ `apply` ก็ไม่ roll
ให้เพราะ Deployment spec ไม่ได้เปลี่ยน มันจึงเงียบ: `kubectl get cm` เห็นค่าใหม่
แต่ `kubectl exec -- printenv` ยังเป็นค่าเก่า

เคยเสียเวลาไปกับเรื่องนี้จริง ตอนย้าย `LOGIN_SUCCESS_REDIRECT` ไป `/hub/` — ConfigMap
เปลี่ยนแล้วแต่ token-service ยังส่งคนไป `/console/` อยู่ชั่วโมงกว่า ดูเหมือน Traefik
route ผิด ทั้งที่ route ถูกตั้งแต่แรก เช็คเร็ว ๆ ได้ด้วย

```bash
kubectl -n sudhood exec deploy/token-service -- printenv LOGIN_SUCCESS_REDIRECT
```

### อ่าน / เปลี่ยนความลับ

ไม่มีใครพิมพ์รหัสเข้าไปแล้ว จึงต้องถามกลับ

```bash
cd ../terraform/01-platform && terraform output -raw keycloak_admin_password
```

หมุนค่าใหม่: `terraform taint` ตัวที่ต้องการแล้ว `apply` — **ยกเว้น signing key** ที่มี `prevent_destroy` คร่อมไว้ (เสียไปแล้ว token ทุกใบที่เคยออกยืนยันไม่ได้อีก ทุกคนหลุด login พร้อมกัน)

`KEYCLOAK_ADMIN_PASSWORD` เปลี่ยนหลัง deploy แรกไม่มีผล — Keycloak เขียน admin ลงฐานข้อมูลตอนบูตครั้งแรกและไม่อัปเดตจาก environment อีกเลย

### แก้ OPA policy

ไม่มี OPA กลางแล้ว — **แต่ละ service ถือ engine ของตัวเอง** เป็น sidecar ใน pod ตัวเอง
โดยโหลด policy ที่ติดมาใน image ของ service นั้น (`<service>/policy/*.rego`)

```bash
vim m0-service/policy/authz.rego                       # แก้ policy ของ M0
cd ../terraform/01-platform && terraform apply         # ซอร์สเปลี่ยน → image ใหม่ → pod roll
```

policy เดินทางไปกับ image เพราะ policy กับโค้ดควรเป็นเวอร์ชันเดียวกัน — rollback ที่คืน
endpoint ของสัปดาห์ก่อนแต่ทิ้งกฎสิทธิ์ของสัปดาห์นี้ไว้ เป็นความพังที่ควรออกแบบไม่ให้เกิด

init container `copy-policy` ยก `policy/` ออกจาก image ไปไว้ใน emptyDir ให้ sidecar อ่าน
ที่ไม่ใช้ ConfigMap เพราะ ConfigMap volume สร้าง symlink ผ่านไดเรกทอรี `..data` แล้ว OPA
เดินเจอ `authz.rego` ซ้ำสามรอบ ฟ้อง `multiple default rules found` แล้วไม่ขึ้นเลย

ทดสอบ policy บนเครื่องเปล่าได้ ไม่ต้องมีคลัสเตอร์

```bash
docker run --rm -v "$PWD/m0-service/policy:/p" openpolicyagent/opa test /p -v
```

### แก้ routing

แก้ `k8s/traefik/ingressroutes.yaml` แล้ว `kubectl apply -k .` — Traefik อ่าน CRD ใหม่ทันที ไม่ต้อง restart อะไร

### ดู log

```bash
kubectl -n sudhood logs -f deploy/token-service
```

### ดูสถานะรวม

```bash
kubectl -n sudhood get pods,svc,ingressroute,pvc
```

---

## 🌐 เข้าถึง service

Traefik ของ k3s ถือ `:80`/`:443` อยู่แล้ว **ทุกเส้นเป็น https** — http ได้ `301` ไม่ใช่ 404 และไม่ใช่คำตอบ

ติดตั้ง CA ครั้งเดียวต่อเครื่องก่อน ไม่งั้นเบราว์เซอร์และ `curl` จะไม่เชื่อใบรับรอง

```bash
cd ../terraform/01-platform && terraform output -raw ca_certificate > /tmp/sudhood-ca.crt && sudo cp /tmp/sudhood-ca.crt /usr/local/share/ca-certificates/sudhood-ca.crt && sudo update-ca-certificates
```

| ปลายทาง | วิธีเข้า |
|---|---|
| API ทุก service | `https://localhost/api/v1/...` |
| login flow | `https://localhost/auth/login` |
| JWKS | `https://localhost/.well-known/jwks.json` |
| หน้ากลางหลัง login | `https://localhost/hub/` |
| Account Center (M0) | `https://localhost/account/` |
| Platform Console (M10) | `https://localhost/console/` |
| จากเครื่องอื่นในวง LAN | ตั้ง `app_host`/`auth_host` ใน `terraform.tfvars` แล้วใช้ `https://<app_host>/...` |
| MinIO console | `http://<node_ip>:30901` (NodePort ไม่ผ่าน gateway ไม่มี TLS) |
| Keycloak admin | `https://<auth_host>/` — ไม่ตั้ง `auth_host` ก็ `scripts/port-forward.sh` → `http://localhost:8080` |
| pgAdmin | `scripts/port-forward.sh` → `http://localhost:5050` |
| service ตรง ๆ (debug) | `scripts/port-forward.sh` → `:8100`, `:7100` |
| Traefik dashboard | **เข้าไม่ได้ตามที่ตั้งไว้ตอนนี้** — `api.dashboard: true` ทำให้ dashboard พร้อมให้ router เรียก แต่ chart ไม่ผูกเข้า entrypoint เว้นแต่เปิด `api.insecure` วัดแล้วบน chart 40.1.4: port-forward ไป `:8080` ได้ `/ping` 200 แต่ `/dashboard/` 404 · ดูทางเลือกในคอมเมนต์ของ `k8s/gateway/traefik-ha.yaml` |

OPA ไม่มีอยู่ในตารางนี้เพราะไม่มี Service ให้ forward — แต่ละ engine ผูก `127.0.0.1:8181`
ในpod ของตัวเอง ถ้าต้องถามตรง ๆ ให้ forward ผ่าน pod ที่มันอยู่ (port-forward ทำงานใน
network namespace ของ pod จึงถึง loopback ได้ ต่างจากที่อื่นที่ถึงไม่ได้เลย)

```bash
kubectl -n sudhood port-forward deploy/m0-identity 8181:8181
kubectl -n sudhood port-forward deploy/m10-platform 8182:8181
```

Keycloak ได้ IngressRoute เฉพาะเมื่อตั้ง `auth_host` — `lan-hosts.tf` สร้างให้ตอนนั้น เพราะกฎ `Host()` ที่มี placeholder อยู่ข้างในคือกฎที่ไม่ match อะไรเลย จึงเขียนไว้ใน `ingressroutes.yaml` ล่วงหน้าไม่ได้

`KC_HOSTNAME` คือค่าที่ Keycloak ประทับลง claim `iss` และใช้สร้าง redirect ทุกอัน — เปลี่ยน host แล้วต้องแก้ redirect URI ที่ลงทะเบียนกับ Google ด้วย · `app_host`/`auth_host` สองตัวขับ 6 ค่าใน ConfigMap + redirect URI ของ Keycloak + SAN ในใบรับรอง พร้อมกัน จึงไม่ต้องแก้ 6 ที่

pgAdmin กับ Keycloak ไม่มี route ผ่าน gateway โดยเจตนา — console ของฐานข้อมูลกับ IdP ไม่ควรอยู่ห่างจากการเป็น public แค่ route ที่ตั้งผิดอันเดียว

---

## 🐛 แก้ปัญหาที่พบบ่อย

### `kubectl` ตอบ permission denied ทั้งที่ k3s รันอยู่

`kubectl` ที่มากับ k3s อ่าน `/etc/rancher/k3s/k3s.yaml` ก่อนอย่างอื่น และไฟล์นั้นเป็น root-only แก้ครั้งเดียวจบ:

```bash
mkdir -p ~/.kube && sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config && sudo chown $(id -u):$(id -g) ~/.kube/config && chmod 600 ~/.kube/config && echo 'export KUBECONFIG=$HOME/.kube/config' >> ~/.bashrc
```

script ทุกตัวในนี้จัดการเรื่องนี้ให้เองอยู่แล้ว ปัญหาจะเจอตอนพิมพ์ `kubectl` เองเท่านั้น

### pod ค้างที่ `ImagePullBackOff`

containerd ต่อ HTTPS กับทุก registry เว้นแต่จะสั่งเป็นอย่างอื่น และ registry ในเครื่องไม่มีใบรับรอง — ขั้นเตรียมเครื่องใน `SETUP-K3S.md` ถูกข้ามไป

```bash
printf 'mirrors:\n  "localhost:5000":\n    endpoint:\n      - "http://localhost:5000"\n' | sudo tee /etc/rancher/k3s/registries.yaml >/dev/null && sudo systemctl restart k3s
```

เช็คว่า image อยู่ใน registry จริง: `curl -s http://localhost:5000/v2/_catalog`

### `verify.sh` ไม่ผ่านทุกข้อ แต่ระบบดูปกติ

ค่าเริ่มต้นของสคริปต์ยังเป็น `http://localhost` ซึ่งถูกเด้ง `301` ไป https ทุกเส้น

```bash
GATEWAY=https://localhost scripts/verify.sh
```

### pod ค้างที่ `CreateContainerConfigError`

Secret หรือ key ใน Secret ไม่มี ดูว่าขาดตัวไหน:

```bash
kubectl -n sudhood describe pod -l app.kubernetes.io/name=token-service | tail -20
```

ส่วนใหญ่คือลืมรัน `scripts/create-secrets.sh`

### token-service ไม่ ready — `/ready` ตอบ `keycloak: false`

ยังไม่ได้ import realm หรือ realm ชื่อไม่ตรง

```bash
cd ../terraform/01-platform && terraform apply
```

realm ถูกสร้างโดย Job `keycloak-init` ไม่ใช่ `import-realm.sh` แล้ว — ดู log ว่ามันจบงานหรือยัง

```bash
kubectl -n sudhood logs job/keycloak-init --tail=30
```

ถ้า Job login เข้า Keycloak ไม่ได้ สาเหตุที่พบบ่อยคือเปลี่ยน `KEYCLOAK_ADMIN_PASSWORD` หลัง deploy แรก (Keycloak ไม่อัปเดต admin จาก environment อีกเลยหลังบูตครั้งแรก) · Job จะบอกสาเหตุนี้ใน log เอง

### login แล้วได้ 403 "No Sudhood account exists"

ทำงานถูกต้อง — ยืนยันตัวตนกับ Google ผ่านแล้วแต่ยังไม่มีบัญชีในระบบ **การ login ไม่สร้างบัญชี** ต้องให้ admin สร้างก่อน หรือเปิด `SEED_DEMO_ACCOUNTS: "true"` ใน `k8s/config.yaml` สำหรับ dev

### PVC ค้างที่ `Pending`

`local-path` ใช้ `WaitForFirstConsumer` — PVC จะยัง Pending จนมี pod มาใช้จริง ถ้า pod ก็ Pending ด้วย ให้ดู `kubectl -n sudhood describe pod <name>`

### Keycloak ขึ้นช้า / ดูเหมือนค้าง

cold start สร้าง schema ใช้เวลา 40 วินาทีขึ้นไป `startupProbe` เผื่อไว้ถึง ~200 วินาที ดูความคืบหน้าที่ `kubectl -n sudhood logs -f deploy/keycloak`

---

## ⚠️ ก่อนขึ้นใช้งานจริง

รายการเต็มที่เป็นเรื่องของการ deploy อยู่ใน [`../terraform/README.md`](../terraform/README.md#ก่อนขึ้น-production-จริง) (state, remote backend, registry, HA, สำรองข้อมูล) ตารางนี้เก็บเฉพาะที่เป็นเรื่องของสแตกนี้เอง

| รายการ | สถานะ |
|---|---|
| **HTTPS** | ✅ ทำแล้ว — route ทั้ง 18 เส้นเป็น `websecure` + `tls: {}` · http เด้ง `301` ที่ entrypoint · `COOKIE_SECURE=true` เมื่อตั้ง `app_host` · **แต่ใบรับรองมาจาก CA ของเราเอง** ทุกเครื่องต้องติดตั้ง CA ครั้งหนึ่ง |
| **Alembic migrations** | ✅ ทำแล้ว — initContainer `migrate` รัน `upgrade head && alembic check` ไม่ใช่ `create_all` แล้ว |
| **image tag / pull policy** | ✅ `IfNotPresent` + registry `localhost:5000` · tag เป็น hash ของซอร์ส · **แต่ `localhost` ของ worker คือของมันเอง** พอมี node ที่สองต้องรื้อ |
| **scale** | ✅ token-service scale ได้แล้ว (signing key อยู่ใน Secret ไม่ใช่ PVC ReadWriteOnce) · HPA 2→6 ที่ 80% CPU |
| **Keycloak `start-dev`** | ❌ ต้องเปลี่ยนเป็น `start` + hostname/TLS จริง |
| **Secret** | ❌ base64 ไม่ใช่การเข้ารหัส · ใครอ่าน Secret ในnamespace ได้ = อ่าน signing key ได้ = ปลอม token เป็นใครก็ได้ ควรไป sealed-secrets หรือ external store |
| **NetworkPolicy** | ❌ ยังไม่มี — pod ไหนในnamespace ก็คุยกับ `/internal/*` ของ M0 ได้ ตอนนี้กันด้วย `X-Internal-Key` ชั้นเดียวและ key ใช้ร่วมกันทุก service |
| **ServiceMonitor** | ❌ ปิดเป็นค่าเริ่มต้น (`enable_service_monitors = false`) ต้องติดตั้ง prometheus-operator CRD ก่อน · service ยังเปิด `/metrics` อยู่ แต่ไม่มีใคร scrape |
| **`SEED_DEMO_ACCOUNTS` · `DEBUG`** | ต้องเป็น `"false"` ทั้งคู่ (ตอนนี้เป็น `false` แล้วใน `k8s/config.yaml`) |
| **`AUTO_PROVISION_ACCOUNTS`** | ตอนนี้ `true` — สร้าง record `PENDING` ไม่มี role ให้คนที่ login ครั้งแรก ตั้งใจให้เป็นแบบนี้ แต่ต้องรู้ว่ามันเปิดอยู่ |
| **rate limit source** | key ด้วย remote address ตรง ๆ ถ้ามี load balancer มาคั่นข้างหน้า ต้องตั้ง `ipStrategy.depth` คู่กับ `trustedIPs` ไม่งั้น limit จะนับ IP ของ LB ตัวเดียว |
| **สำรองข้อมูล** | ❌ PVC ของ Postgres และ signing key ใน state — สองอย่างนี้หายแล้วกู้ไม่ได้ `local-path` reclaim เป็น `Delete` |

---

## 📎 เอกสารที่เกี่ยวข้อง

- [`SETUP-K3S.md`](SETUP-K3S.md) — ติดตั้งครั้งแรกแบบละเอียด
- [`ADD_SERVICE.md`](ADD_SERVICE.md) — เพิ่ม service ใหม่ (m1–m9) เข้า cluster
- [`../use-docker-compose/README.md`](../use-docker-compose/README.md) — ชุด compose สำหรับทีมที่ใช้ Windows + คำอธิบายสถาปัตยกรรม
- [`../use-docker-compose/SERVICE_INTEGRATION_GUIDE.md`](../use-docker-compose/SERVICE_INTEGRATION_GUIDE.md) — JWT middleware, OPA client, M0 API (ส่วนที่ไม่เกี่ยวกับ orchestration ใช้ได้ทั้งสองฝั่ง)
- [`../GUIDE_GOOGLE_AUTH.md`](../GUIDE_GOOGLE_AUTH.md) — ตั้งค่า Google OAuth (ใช้ได้ทั้งสองฝั่ง)
- [`../../architecture/overview.md`](../../architecture/overview.md) — สถาปัตยกรรมภาพรวมทั้งระบบ
