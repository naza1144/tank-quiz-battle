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

### 1. 🎨 8-Bit Retro Arcade Aesthetic & Crisp Pixel Art Icons
- **Pure Pixel Art & CRT Bezel**: ดีไซน์ UI สไตล์ตู้เกมยุค 90 พร้อมกรอบ CRT หมุดตู้เกม 4 มุม และปุ่มกด 3D Arcade
- **26+ Crisp 8-Bit Vector SVG Icons**: ดีไซน์ไอคอนเวกเตอร์แบบพิกเซล (`shape-rendering="crispEdges"`)
- **8-Bit Chiptune Synthesizer**: เพลงประกอบ BGM และเสียง Sound Effects สังเคราะห์ขึ้นแบบ Real-time ผ่าน Web Audio API (ไม่พึ่งพาไฟล์เสียงภายนอก)

### 2. 🤝 ระบบทีมเวิร์ก 6 ทีม Squad Co-op (คนขับ 1 คน + ผู้ช่วยโหวตคำถามไม่จำกัด)
- **6 ทีมสมดุล**: รองรับการแข่งขันสูงสุด 6 ทีม (`RED`, `BLUE`, `GREEN`, `YELLOW`, `PURPLE`, `CYAN`)
- **Driver (พลขับ 1 คนต่อทีม)**: ทำหน้าที่ขับรถถัง หลบกระสุน และวิ่งชนกล่องคำถาม `[?]`
- **Squad Support Console (ผู้ช่วยตอบคำถาม 🧠)**: เมื่อคนขับเก็บกล่อง คำถามจะเด้งขึ้นหน้าจอผู้ช่วยตอบเท่านั้น คนขับสามารถมีสมาธิกับการขับต่อ
- **Sequential Quiz Queue (ระบบเข้าคิวคำถาม)**: เมื่อคนขับเก็บกล่องซ้อนกัน คำถามจะถูกเก็บเข้าคิว (`squadQuizQueues`) และแสดงผลทีละข้อโดยไม่ข้ามหรือดีดทิ้ง
- **Anti-Skip Consensus Voting**: ระบบจะรอจนหมดเวลานับถอยหลัง แสดงผลเฉลยและคะแนนเสียงส่วนใหญ่ ~2.8 วินาที แล้วจึงปล่อยข้อถัดไป
- **Auto-Balance System**: ระบบกระจายนักเรียนเข้า 6 ทีมและจัดสรรพลขับให้สมดุลเท่ากันอัตโนมัติ

### 3. ⏱️ ปรับเวลาทำโจทย์ตามระดับความยาก (Difficulty Time Limits)
- **🔥 คำถามยาก (HARD)**: ให้เวลา **7 วินาที**
- **⚡ คำถามปานกลาง (MEDIUM)**: ให้เวลา **5 วินาที**
- **🟢 คำถามง่าย (EASY)**: ให้เวลา **2 วินาที** (ประลองความไว Speed Quiz)

### 4. 🗺️ ระบบสุ่มแมพไม่ซ้ำกันทุกรอบ & หน้าจอขยายใหญ่ (Procedural 20x20 Arena)
- **สมรภูมิกระชับ 20x20 Grid (640x640px)**: พื้นที่การต่อสู้กระชับ ปะทะกันรวดเร็ว ไม่เวิ้งว้าง
- **5 ธีมกลยุทธ์สุ่มทุกรอบการเล่น**:
  1. *Classic Citadel*: ป้อมปราการกลาง คลองน้ำ ทางน้ำแข็ง
  2. *Jungle Outpost*: ดงพุ่มไม้ขนาดใหญ่สำหรับการซุ่มยิง
  3. *Frozen River Crossing*: ลำน้ำคู่ขนานพร้อมสะพานน้ำแข็งสไลด์ตัว
  4. *Desert Labyrinth*: เขาวงกตอิฐและลานประลองกลาง
  5. *Procedural Symmetric Warzone*: ระบบสุ่มสิ่งกีดขวางแบบ 4-Way Mirroring สดใหม่ทุกรอบ
- **Enlarged Canvas UI**: ขยายการแสดงผลบนหน้าจอสูงสุดถึง 700px / 68vh (96vw) ชัดเจนเต็มตา

### 5. 📦 ระบบสุ่มเกิดกล่องคำถามไดนามิก (Dynamic Quiz Crates & Airdrop)
- **สุ่มเกิดใหม่ทั่วแมพ**: เมื่อรถถังเก็บกล่อง กล่องจะสุ่มย้ายไปเกิดยังพิกัดว่างใหม่ในแมพภายใน 8-12 วินาที
- **Airdrop Replenishment**: หากกล่องในสนามเหลือน้อยกว่า 6 กล่อง ระบบจะทิ้งกล่องสนับสนุนใหม่ลงมาทันที

### 6. 🏆 หน้าจอสรุปผลผู้ชนะทันทีเมื่อจบเกม (Instant Game Over Podium)
- เมื่อเหลือผู้รอดชีวิตเพียงทีมเดียว หรือเวลาหมดลง หน้าจอ **Victory Podium Modal** จะเด้งขึ้นทันที
- ฉลองชัยด้วยเสียง Fanfare, เอฟเฟกต์ **Confetti Animation**, และตารางสรุปคะแนน MVP ทั้งพลขับและทีมช่วยเหลือ

### 7. 🔒 หน้าจอจัดการห้องและคลังข้อสอบสำหรับอาจารย์ (Teacher Portal Route: `/teacher`)
- เข้าใช้งานได้ผ่าน URL `/teacher` หรือคลิกปุ่ม "ระบบอาจารย์" (ป้องกันด้วย PIN: `1990`)
- **Dashboard จัดการห้องแข่งขัน**: ตรวจสอบสถานะห้อง ลบห้องที่ไม่ได้ใช้งาน และดูจำนวนผู้เล่นแบบสด
- **คลังข้อสอบครบวงจร**: ค้นหา, กรองหมวดหมู่วิชา, เพิ่ม, แก้ไข, ลบข้อสอบ, และนำเข้าไฟล์ JSON Bulk Import
- **Open REST API Endpoints**:
  - `GET /api/quiz/questions`: ดึงรายการข้อสอบทั้งหมด (รองรับ `?category=...&difficulty=...&search=...`)
  - `GET /api/quiz/categories`: ดึงรายชื่อหมวดหมู่วิชาทั้งหมดพร้อมจำนวนข้อ
  - `GET /api/quiz/questions/:id`: ดึงข้อสอบรายข้อ
  - `POST /api/quiz/questions`: เพิ่มโจทย์ข้อสอบใหม่
  - `PUT /api/quiz/questions/:id`: แก้ไขโจทย์ข้อสอบ
  - `DELETE /api/quiz/questions/:id`: ลบโจทย์ข้อสอบ
  - `POST /api/quiz/import`: นำเข้าข้อสอบแบบชุด (JSON Array)
  - `POST /api/quiz/reset`: รีเซ็ตกลับเป็นข้อสอบเริ่มต้น

### 8. 📱 รองรับสมาร์ตโฟน 100% ป้องกันภาพกระพริบ (Mobile-Optimized & Anti-Flicker)
- **Touch-Slide Virtual D-Pad**: บังคับลากนิ้วต่อเนื่อง 8 ทิศทาง
- **GPU Anti-Flicker Fix**: กำจัดอาการกระพริบของ Canvas บนเบราว์เซอร์มือถือ (iOS Safari / Android Chrome)
- **High-Precision useRef Countdown**: ตัวนับเวลาแม่นยำสูง ไม่แกว่งหรือค้างจากการ Re-render

---

## 📂 โครงสร้างโปรเจกต์ (Project Architecture)

```text
tank-quiz-battle/
├── game-client/                     # Frontend Application (React + Vite + Tailwind)
│   ├── src/
│   │   ├── audio/soundFx.ts         # 8-Bit Multi-channel Chiptune Synthesizer
│   │   ├── components/
│   │   │   ├── PixelIcons.tsx       # 26+ Crisp 8-Bit Vector SVG Pixel Icons
│   │   │   ├── RetroCanvas.tsx      # 2D Battle City Canvas Renderer (Auto-scale)
│   │   │   ├── TouchControls.tsx    # Mobile Virtual Slide D-Pad & Large Fire Button
│   │   │   ├── SquadSupportView.tsx # Mobile-friendly Squad Voting Console
│   │   │   ├── LobbyView.tsx        # 6-Team Arcade Squad Formation & Role Picker
│   │   │   ├── RoomSelectView.tsx   # Mission Select & Subject Selection
│   │   │   ├── TeacherPortalView.tsx# PIN-Protected Teacher Dashboard & Room Manager
│   │   │   ├── TeacherQuizModal.tsx # Quiz Bank Management Modal
│   │   │   ├── QuizModal.tsx        # Single-player FFA Quiz Popup
│   │   │   ├── AuthModal.tsx        # Player Login & Guest Mode
│   │   │   └── GameOverModal.tsx    # Global Podium Victory Screen
│   │   ├── types.ts                 # Client TypeScript Types
│   │   └── App.tsx                  # Root Game Controller & Socket Listeners
│   ├── Dockerfile
│   └── nginx.conf
│
├── game-server/                     # Backend Server (Node.js + Express + Socket.io)
│   ├── src/
│   │   ├── auth.ts                  # Authentication & Guest Token Handler
│   │   ├── gameEngine.ts            # Authoritative 2D Physics, Collisions & Map Logic
│   │   ├── mapTemplates.ts          # 20x20 Procedural & Thematic Map Generators
│   │   ├── quizBank.ts              # Quiz CRUD Manager, Category Counter & Bulk Importer
│   │   ├── roomManager.ts           # 6-Team Lifecycle, Sequential Queues & Auto-balance
│   │   ├── server.ts                # HTTP Server, Open Quiz REST APIs & WebSockets
│   │   └── types.ts                 # Shared Server Types & Protocols
│   ├── test-game.ts                 # Automated Physics, Combat & Quiz Engine Unit Tests
│   ├── Dockerfile
│   └── package.json
│
├── deploy-all.sh                    # Single-Command Automated Deployment Pipeline
│
├── terraform/                       # Infrastructure as Code (Terraform for Kubernetes)
│   ├── main.tf                      # Namespaces, Deployments, Services & NodePorts
│   ├── variables.tf                 # Configuration Variables & Secrets
│   ├── outputs.tf                   # Endpoints Output
│   └── terraform.tfvars             # Production Values
│
├── ansible/                         # Configuration Management & Automation Playbook
│   ├── ansible.cfg                  # SSH & Inventory Configuration
│   ├── inventory.ini                # K3s Node Server Definitions
│   └── playbook.yml                 # Build, Export, Import & Deploy Playbook
│
├── k8s/                             # Kubernetes Manifests
│   ├── namespace.yaml
│   ├── game-server-deployment.yaml
│   ├── game-client-deployment.yaml
│   ├── ingress.yaml
│   └── service.yaml
│
├── DOCS_PROJECT_MANUAL.md           # คู่มือโครงการและสถาปัตยกรรมระบบอย่างละเอียด
└── DOCS_IAC_DEPLOYMENT.md           # คู่มือการติดตั้งระบบอัตโนมัติด้วย Terraform & Ansible
```

---

## 🚀 วิธีการติดตั้งและรันระบบ (Quick Start)

### 1. ติดตั้งแบบคำสั่งเดียวขึ้น K8s Server (Automated Pipeline)
```bash
# รันคำสั่งเดียว ทำงานอัตโนมัติครบทุกขั้นตอน (Build, Export, Ansible, K8s Rollout)
./deploy-all.sh
```

### 2. รันแบบ Local Development
```bash
# Terminal 1: Backend Server
cd game-server
npm install
npm run dev

# Terminal 2: Frontend Client
cd game-client
npm install
npm run dev
```

---

## 🌐 การเข้าใช้งานระบบ (Access Endpoints)
- **🎮 Game Client URL**: `http://192.168.50.96:30080`
- **🔒 Teacher Portal (PIN: 1990)**: `http://192.168.50.96:30080/#teacher`
- **📚 Open REST API Categories**: `http://192.168.50.96:30080/api/quiz/categories`
- **📚 Open REST API Questions**: `http://192.168.50.96:30080/api/quiz/questions`
