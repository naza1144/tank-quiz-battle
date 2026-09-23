# 🕹️ TANK QUIZ BATTLE 1990 (เกมยิงรถถังตอบโจทย์แลกกระสุน)
### 🚀 8-Bit Retro Arcade • 6-Team Squad Co-op • Procedural Maps • Teacher Portal • Standalone Multiplayer

[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.x-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.x-38bdf8.svg)](https://tailwindcss.com/)
[![Socket.io](https://img.shields.io/badge/Socket.io-4.x-black.svg)](https://socket.io/)
[![Kubernetes](https://img.shields.io/badge/k3s-Kubernetes-326ce5.svg)](https://k3s.io/)

**Tank Quiz Battle 1990** คือเว็บแอปพลิเคชันเกมยิงรถถังแบบ Real-time Multiplayer สไตล์ตู้เกมอาร์เคดยุค 90 (Battle City 1990) ผสมผสานระบบ **Gamification เพื่อการศึกษาในห้องเรียนจริง** หัวใจหลักของเกมคือ **"การได้กระสุนต้องตอบคำถาม Quiz Multiple Choice ให้ถูกต้อง"** โดยออกแบบมาเพื่อรองรับนักเรียนได้มากถึง 60+ คนพร้อมกันในแต่ละห้องเรียน ใช้งานได้สมบูรณ์ทั้งบนคอมพิวเตอร์ แท็บเล็ต และสมาร์ตโฟน 100%

---

## 🌟 จุดเด่นและระบบสำคัญ (Key Features)

### 1. ⚡ ท่าไม้ตายร่วมมือ (Ultimate Synergy Beam)
- **เกจสะสมพลัง (Synergy Streak)**: ผู้ช่วยตอบถูกต่อเนื่อง **3 ข้อติด (Streak x3)** ชาร์จเกจไม้ตายเต็ม 100% ทันที
- **วิธียิง**: พลขับกดปุ่ม **`[E]`** บนคีย์บอร์ด หรือแตะปุ่ม **`[⚡ LASER]`** บนหน้าจอสัมผัส
- **อานุภาพ**: ยิงลำแสงพลาสมา **ระเบิดทำลายบล็อกอิฐ (`BRICK`) ทุกก้อน** ในแนวเส้นตรง และ **สร้างความเสียหายทะลวงเกราะ 3 DMG (Piercing Damage)** แก่รถถังศัตรูทุกคันที่ขวางทาง พร้อมเอฟเฟกต์หน้าจอสั่น 16px และเสียงเลเซอร์ 8-Bit

### 2. 🛸 โดรนหย่อนเสบียงยุทธวิธี (Supporter Airdrop Supply Drone)
- **แผงควบคุมโดรน (Tactical Airdrop Dock)**: ติดตั้งในหน้าจอ `SquadSupportView` ของผู้ช่วยรบ ให้เลือกส่งเสบียงสนับสนุนพลขับ (คูลดาวน์ทีม 25s):
  1. 🛡️ **BARRIER (4.5s)**: สร้างม่านพลังงานอมตะ 4.5 วินาทีรอบตัวรถถังพลขับ
  2. 💚 **REPAIR (+1 HP)**: ซ่อมแซมฟื้นฟูพลังชีวิตรถถังทันที +1 HP
- **กระสุนมาจากการทำ Quiz เท่านั้น**: ตัดการแจกกระสุนฟรี เพื่อบังคับให้พลขับต้องเก็บกล่องและพึ่งพาพลังปัญญาของผู้ช่วยรบ 100%

### 3. 👻 ระบบวิญญาณผู้ช่วยหลังตาย & ชุบชีวิต (Ghost Revival Protocol)
- **สถานะวิญญาณรบ (Ghost State)**: ถ้ารถถังของทีมถูกยิงทำลาย ผู้เล่นทุกคนในทีมจะเข้าสู่โหมด Ghost พร้อมหน้าต่างท้าทายพิเศษ **`GHOST REVIVAL PROTOCOL`**
- **เงื่อนไขการคืนชีพ**: ผู้ช่วยต้องตอบคำถามท้าทายให้ **ถูก 2 ข้อติด (Streak 2/2)** เพื่อ **ชุบชีวิตรถถังกลับมาสู้ใหม่ได้ทันที (2 HP + โล่คุ้มกัน 4s)** (จำกัด 1 ครั้งต่อทีมต่อแมตช์)

### 4. 🎨 8-Bit Retro Arcade Aesthetic & Visual Polish
- **Pure Pixel Art & CRT Bezel**: ดีไซน์ UI สไตล์ตู้เกมยุค 90 พร้อมฟิลเตอร์เส้นสแกนไลน์ CRT 1990 หมุดตู้เกม 4 มุม (เปิด/ปิดได้ด้วยปุ่ม `[📺 CRT]`)
- **Dynamic Screen Shake**: ระบบสั่นไหวของ Canvas ตามความรุนแรงของแรงระเบิดและแรงกระแทก
- **8-Bit Pixel Particle Pool**: ละอองฝุ่นตีนตะขาบ (Tread Dust), สะเก็ดไฟกระสุนสะท้อน (Sparks), ควันลูกไฟระเบิด (Smoke), ผลึกน้ำแข็ง CRYO
- **8-Bit Chiptune Synthesizer**: เพลงประกอบ BGM และเสียง Sound Effects สังเคราะห์ขึ้นแบบ Real-time ผ่าน Web Audio API (ไม่พึ่งพาไฟล์เสียงภายนอก)

### 5. 🤝 ระบบทีมเวิร์ก 6 ทีม Squad Co-op (คนขับ 1 คน + ผู้ช่วยโหวตคำถามไม่จำกัด)
- **6 ทีมสมดุล**: รองรับการแข่งขันสูงสุด 6 ทีม (`RED`, `BLUE`, `GREEN`, `YELLOW`, `PURPLE`, `CYAN`)
- **Driver (พลขับ 1 คนต่อทีม)**: ทำหน้าที่ขับรถถัง หลบกระสุน และวิ่งชนกล่องคำถาม `[?]`
- **Squad Support Console (ผู้ช่วยตอบคำถาม 🧠)**: เมื่อคนขับเก็บกล่อง คำถามจะเด้งขึ้นหน้าจอผู้ช่วยตอบเท่านั้น คนขับสามารถมีสมาธิกับการขับต่อ
- **Sequential Quiz Queue (ระบบเข้าคิวคำถาม)**: เมื่อคนขับเก็บกล่องซ้อนกัน คำถามจะถูกเก็บเข้าคิว (`squadQuizQueues`) และแสดงผลทีละข้อโดยไม่ข้ามหรือดีดทิ้ง
- **Anti-Skip Consensus Voting**: ระบบจะรอจนหมดเวลานับถอยหลัง แสดงผลเฉลยและคะแนนเสียงส่วนใหญ่ ~2.8 วินาที แล้วจึงปล่อยข้อถัดไป
- **Auto-Balance System**: ระบบกระจายนักเรียนเข้า 6 ทีมและจัดสรรพลขับให้สมดุลเท่ากันอัตโนมัติ

### 6. ⏱️ ปรับเวลาทำโจทย์ตามระดับความยาก (Difficulty Time Limits)
- **🔥 คำถามยาก (HARD)**: ให้เวลา **7 วินาที**
- **⚡ คำถามปานกลาง (MEDIUM)**: ให้เวลา **5 วินาที**
- **🟢 คำถามง่าย (EASY)**: ให้เวลา **2 วินาที** (ประลองความไว Speed Quiz)

### 7. 🗺️ ระบบสุ่มแมพไม่ซ้ำกันทุกรอบ & หน้าจอขยายใหญ่ (Procedural 28x28 Arena)
- **สมรภูมิ 28x28 Grid (896x896px)**: พื้นที่การต่อสู้กว้างขวาง ปะทะกันรวดเร็ว ไม่เวิ้งว้าง
- **5 ธีมกลยุทธ์สุ่มทุกรอบการเล่น**:
  1. *Classic Citadel*: ป้อมปราการกลาง คลองน้ำ ทางน้ำแข็ง
  2. *Jungle Outpost*: ดงพุ่มไม้ขนาดใหญ่สำหรับการซุ่มยิง
  3. *Frozen River Crossing*: ลำน้ำคู่ขนานพร้อมสะพานน้ำแข็งสไลด์ตัว
  4. *Desert Labyrinth*: เขาวงกตอิฐและลานประลองกลาง
  5. *Procedural Symmetric Warzone*: ระบบสุ่มสิ่งกีดขวางแบบ 4-Way Mirroring สดใหม่ทุกรอบ

### 8. 🔒 ระบบจัดการคลังข้อสอบสำหรับอาจารย์ (Standalone Teacher Portal: `/quiz-portal`)
- เข้าใช้งานได้ผ่าน URL `/quiz-portal` หรือคลิกปุ่มเข้าสู่ระบบอาจารย์ (ยืนยันตัวตนผ่าน Google OAuth SSO)
- **ระบบสิทธิ์ RBAC (Role-Based Access Control)**: ตรวจสอบสิทธิ์ผ่าน `account-service` เฉพาะบัญชีบทบาท `TEACHER` หรือ `ADMIN` เท่านั้น
- **Offline Resilience Queue**: เมื่อเน็ตเวิร์กระหว่างไมโครเซอร์วิสสะดุด ระบบจะพักคำสั่งเพิ่ม/แก้ไข/ลบข้อสอบไว้ในคิว LocalStorage อัตโนมัติ พร้อมแสดง Badge สถานะรอซิงก์ และมี Background Heartbeat ตรวจสอบและ Flush ส่งข้อมูลทันทีที่เซอร์วิสกลับมาทำงาน
- **คลังข้อสอบครบวงจร**: ค้นหา, กรองหมวดหมู่วิชา, กำหนดระดับความยาก (EASY/MEDIUM/HARD), ตั้งค่าเวลาและรางวัลกระสุน, พร้อมรองรับ JSON Bulk Import
- **Open REST API Endpoints**:
  - `GET /api/quiz/questions`: ดึงรายการข้อสอบทั้งหมด (รองรับ `?category=...&difficulty=...&search=...`)
  - `GET /api/quiz/categories`: ดึงรายชื่อหมวดหมู่วิชาทั้งหมดพร้อมจำนวนข้อ
  - `GET /api/quiz/questions/:id`: ดึงข้อสอบรายข้อ
  - `POST /api/quiz/questions`: เพิ่มโจทย์ข้อสอบใหม่ (ต้องมีสิทธิ์ Teacher/Admin)
  - `PUT /api/quiz/questions/:id`: แก้ไขโจทย์ข้อสอบ
  - `DELETE /api/quiz/questions/:id`: ลบโจทย์ข้อสอบ
  - `POST /api/quiz/import`: นำเข้าข้อสอบแบบชุด (JSON Array)
  - `POST /api/quiz/reset`: รีเซ็ตกลับเป็นข้อสอบเริ่มต้น

### 9. 📱 รองรับสมาร์ตโฟน 100% ป้องกันภาพกระพริบ (Mobile-Optimized & Anti-Flicker)
- **Touch-Slide Virtual D-Pad**: บังคับลากนิ้วต่อเนื่อง 8 ทิศทาง
- **Large Action Buttons**: ปุ่มยิง FIRE และปุ่มไม้ตาย `[⚡ LASER]` ชัดเจน
- **GPU Anti-Flicker Fix**: กำจัดอาการกระพริบของ Canvas บนเบราว์เซอร์มือถือ (iOS Safari / Android Chrome)
- **High-Precision useRef Countdown**: ตัวนับเวลาแม่นยำสูง ไม่แกว่งหรือค้างจากการ Re-render

### 10. 📖 สมุดคู่มือสนามรบเปิดอ่านได้ตลอดเวลา (In-Game Tactical Field Manual)
- คลิกปุ่ม **`[📖 คู่มือการเล่น]`** ได้จากทุกหน้าจอ (Lobby, Room Select, Game HUD)
- อธิบายครบทุกระบบ: วิธีควบคุม, คลาสรถถัง 4 สาย, กระสุนพิเศษ 4 ธาตุ, ไม้ตายเลเซอร์, โดรนเสบียง, ระบบวิญญาณชุบชีวิต และเทคนิคการรบ

### 11. 🔐 ระบบยืนยันตัวตน Google OAuth SSO & 3NF Academic Directory
- **Google OAuth 2.0 (RS256 JWT)**: รองรับการล็อกอินด้วยบัญชี Google ทางการศึกษา (@ubu.ac.th หรือองค์กร)
- **3NF Master Academic Directory (`account-service`)**: โครงสร้างฐานข้อมูลมาตรฐานแบบ 3NF จัดเก็บข้อมูลคณะ (Faculties), ภาควิชา (Departments), กลุ่มเรียน (Sections), คำนำหน้า (Titles), และบทบาท (Roles)
- **Guest Mode**: เข้าเล่นแบบทดลองเล่นได้ทันที 1-Click โดยไม่ต้องลงทะเบียน

---

## 📂 โครงสร้างโปรเจกต์และไมโครเซอร์วิส (Microservices Architecture)

```text
tank-quiz-battle/
├── game-client/                     # [Microservice 1] Student Canvas Web SPA (React 18 + Nginx Port 80)
│   ├── src/
│   │   ├── audio/soundFx.ts         # 8-Bit Multi-channel Chiptune Synthesizer
│   │   ├── components/
│   │   │   ├── PixelIcons.tsx       # 26+ Crisp 8-Bit Vector SVG Pixel Icons
│   │   │   ├── RetroCanvas.tsx      # 2D Battle City Canvas Renderer with CRT & Particles
│   │   │   ├── TouchControls.tsx    # Mobile Virtual Slide D-Pad & Ultimate Laser Button
│   │   │   ├── SquadSupportView.tsx # Mobile-friendly Squad Voting Console & Airdrop Dock
│   │   │   ├── LobbyView.tsx        # 6-Team Arcade Squad Formation & Role Picker
│   │   │   ├── RoomSelectView.tsx   # Mission Select & Subject Selection
│   │   │   ├── GameGuideModal.tsx   # Interactive In-Game Field Manual (7 Tabs)
│   │   │   ├── QuizModal.tsx        # Single-player FFA Quiz Popup
│   │   │   ├── AuthModal.tsx        # Player Login & Guest Mode
│   │   │   └── GameOverModal.tsx    # Global Podium Victory Screen
│   │   ├── types.ts                 # Client TypeScript Types
│   │   └── App.tsx                  # Root Game Controller & Socket Listeners
│   ├── Dockerfile
│   └── nginx.conf
│
├── game-server/                     # [Microservice 2] Authoritative 2D Combat Engine (Port 4000)
│   ├── src/
│   │   ├── quizClient.ts            # Cross-Container Quiz Client + Fallback Memory Cache
│   │   ├── auth.ts                  # Authentication & Guest Token Handler
│   │   ├── googleAuth.ts            # Google OAuth & Identity Provider Integration
│   │   ├── gameEngine.ts            # Authoritative 2D Physics, Mega Laser & Ghost Revival Logic
│   │   ├── mapTemplates.ts          # 28x28 Procedural & Thematic Map Generators
│   │   ├── roomManager.ts           # 6-Team Lifecycle, Sequential Queues & Auto-balance
│   │   ├── server.ts                # HTTP Server, Game Hub & WebSockets
│   │   └── types.ts                 # Shared Server Types & Protocols
│   ├── Dockerfile
│   └── package.json
│
├── quiz-service/                    # [Microservice 3] Quiz Bank & Assessment Engine (Port 4001)
│   ├── src/
│   │   ├── quizBank.ts              # Quiz CRUD, Category Counter, Difficulty Calculation
│   │   ├── externalAdapter.ts       # External School LMS Adapter & Score Webhook Reporter
│   │   ├── server.ts                # REST API Server, Health Probe & API Key Ingestion
│   │   └── types.ts                 # Shared Quiz & External Provider Types
│   └── Dockerfile
│
├── account-service/                 # [Microservice 4] 3NF Identity, Directory & RBAC Engine (Port 4005)
│   ├── src/
│   │   ├── accountDirectory.ts      # 3NF Master Academic Directory (Faculties, Depts, Roles)
│   │   ├── server.ts                # REST API Server, Google Token Verifier, Profile Hydration
│   │   └── types.ts                 # Identity & Academic Directory Types
│   └── Dockerfile
│
├── quiz-manager-portal/             # [Microservice 5] Standalone Teacher & Admin Portal (Port 4008/5000)
│   ├── src/
│   │   ├── public/index.html        # Responsive Teacher SPA with Offline Resilience Queue
│   │   └── server.ts                # Standalone Static Web Server & Health Check
│   └── Dockerfile
│
├── deploy-all.sh                    # Automated Kubernetes Deployment Script
├── traefik-dynamic.yaml             # Traefik Gateway Priority Routing Configuration
├── docker-compose.yml               # Local Development 6-Container Decoupled Stack
├── terraform/                       # Infrastructure as Code (Terraform for Kubernetes)
├── ansible/                         # Configuration Management & Automation Playbook
├── k8s/                             # Kubernetes Manifests for Production K3s Node
│   ├── game-deployment.yaml         # game-server & game-client (Namespace: game)
│   ├── quiz-platform.yaml           # quiz-service & quiz-manager-portal (Namespace: quiz)
│   └── identity-platform.yaml       # account-service (Namespace: identity)
├── DOCS_PROJECT_MANUAL.md           # คู่มือโครงการและสถาปัตยกรรมระบบอย่างละเอียด
└── DOCS_IAC_DEPLOYMENT.md           # คู่มือการติดตั้งระบบอัตโนมัติด้วย Terraform & Ansible
```

---

## 🧪 การทดสอบระบบอัตโนมัติ (Automated Test Battery)

รันชุดทดสอบครอบคลุมทุกระบบแบบครบ 100%:

```bash
cd game-server
npx tsx test-google-auth.ts
npx tsx test-brutal-full-room-coop.ts
npx tsx test-multi-round-exhaustive.ts
npx tsx test-exhaustive-all-modes.ts
npx tsx test-multiplayer-full.ts
npx tsx test-socket-multiplayer.ts
npx tsx test-spec-features.ts
npx tsx test-game.ts
```

---

## 🚀 วิธีการติดตั้งและรันระบบ (Quick Start)

### 1. ติดตั้งขึ้น Production K8s Server ผ่าน Traefik Gateway (Automated Pipeline)
```bash
# รันคำสั่งเดียว ทำงานอัตโนมัติครบทุกขั้นตอน (Build, Export, Ansible, K8s Rollout)
./deploy-all.sh
```

### 2. รันแบบคำสั่งเดียวด้วย Docker Compose (พร้อม Healthcheck & Smoke Test)
```bash
# รันคำสั่งเดียว Build, Up, และ Smoke Test ทุก Microservices ผ่าน Traefik Gateway (:80) อัตโนมัติ
./run-compose.sh

# หรือสั่งการด้วย Docker Compose มาตรฐาน:
docker compose up -d --build
```

**Local Ports & URLs (เมื่อรันด้วย Docker Compose):**
- **🎮 Game Client (หลัก)**: [http://localhost/](http://localhost/)
- **🔒 Teacher Portal**: [http://localhost/#teacher](http://localhost/#teacher) *(PIN: `1990`)*
- **📚 Quiz Manager Portal**: [http://localhost/portal](http://localhost/portal)
- **🩺 Traefik Ingress Dashboard**: [http://localhost:8081](http://localhost:8081)
- **🛡️ OPA Engine Policy**: [http://localhost:8181/v1/data/tankquiz/authz](http://localhost:8181/v1/data/tankquiz/authz)

---

## 🌐 จุดเข้าใช้งานจริงบนเซิร์ฟเวอร์ (Production Endpoints: 192.168.50.96)

ทุก Request เข้าใช้งานผ่าน **Traefik Ingress Gateway (Port :80 / :443)** บนคลัสเตอร์ Kubernetes จริง:

- **🎮 Game Client (หน้าเว็บเกมหลัก)**: [http://tank.192-168-50-96.sslip.io](http://tank.192-168-50-96.sslip.io) หรือ `https://tank.192-168-50-96.sslip.io`
- **🔒 Teacher Quiz Portal (ระบบอาจารย์)**: [http://tank.192-168-50-96.sslip.io/quiz-portal/](http://tank.192-168-50-96.sslip.io/quiz-portal/)
- **📚 Open Quiz REST API (Categories)**: [http://tank.192-168-50-96.sslip.io/api/quiz/categories](http://tank.192-168-50-96.sslip.io/api/quiz/categories)
- **📚 Open Quiz REST API (Questions)**: [http://tank.192-168-50-96.sslip.io/api/quiz/questions](http://tank.192-168-50-96.sslip.io/api/quiz/questions)
- **👤 Account & Directory Health**: [http://tank.192-168-50-96.sslip.io/api/account/health](http://tank.192-168-50-96.sslip.io/api/account/health)
- **🩺 Quiz Service Health Probe**: [http://tank.192-168-50-96.sslip.io/api/quiz/health](http://tank.192-168-50-96.sslip.io/api/quiz/health)
- **🩺 Game Server Health Probe**: [http://tank.192-168-50-96.sslip.io/api/health](http://tank.192-168-50-96.sslip.io/api/health)
- **🔑 External LMS Sync API**: `POST http://tank.192-168-50-96.sslip.io/api/quiz/sync` (Header `X-API-Key: tank-quiz-api-key-2026`)

