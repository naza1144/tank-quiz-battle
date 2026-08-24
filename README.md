# 🕹️ TANK QUIZ BATTLE 1990 (เกมยิงรถถังตอบโจทย์แลกกระสุน)
### 🚀 8-Bit Retro Arcade • Squad Co-op Consensus • Teacher Quiz Open API • Standalone Multiplayer

[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.x-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.x-38bdf8.svg)](https://tailwindcss.com/)
[![Socket.io](https://img.shields.io/badge/Socket.io-4.x-black.svg)](https://socket.io/)
[![Kubernetes](https://img.shields.io/badge/k3s-Kubernetes-326ce5.svg)](https://k3s.io/)

**Tank Quiz Battle 1990** คือเว็บแอปพลิเคชันเกมยิงรถถังแบบ Real-time Multiplayer สไตล์ตู้เกมอาร์เคดยุค 90 (Battle City 1990) ผสมผสานระบบ **Gamification เพื่อการศึกษาในห้องเรียนจริง** หัวใจหลักของเกมคือ **"การได้กระสุนต้องตอบคำถาม Quiz Multiple Choice ให้ถูกต้อง"** โดยออกแบบมาเพื่อรองรับนักเรียนได้มากถึง 60+ คนพร้อมกันในแต่ละห้องเรียน ใช้งานได้ทั้งบนคอมพิวเตอร์ แท็บเล็ต และสมาร์ตโฟน 100%

---

## 🌟 จุดเด่นและระบบสำคัญ (Key Features)

### 1. 🎨 8-Bit Retro Arcade Aesthetic & Crisp Pixel Art Icons
- **Pure Pixel Art & CRT Overlay**: ดีไซน์ UI สไตล์ตู้เกมยุค 90 พร้อมกรอบสแกนไลน์ CRT, หมุดตู้เกม 4 มุม, คาน Bezel, และปุ่มกด 3D Arcade
- **No OS Emojis**: เปลี่ยน Emoji ทั้งหมดในเกมเป็น **26+ Crisp 8-Bit Vector SVG Icons** (`shape-rendering="crispEdges"`)
- **8-Bit Chiptune Synthesizer**: เพลงประกอบ BGM และเสียง Sound Effects 11 เสียงสังเคราะห์ขึ้นแบบ Real-time ผ่าน Web Audio API (ไม่พึ่งพาไฟล์เสียงภายนอก)

### 2. 🤝 ระบบทีมเวิร์ก Squad Co-op (คนขับ 1 คน + ผู้ช่วยโหวตคำถามไม่จำกัด)
- **Driver (พลขับ 1 คนต่อทีม)**: ทำหน้าที่ขับรถถัง หลบกระสุน และวิ่งชนกล่องคำถาม `[?]`
- **Squad Support Console (ผู้ช่วยตอบคำถาม 🧠)**: เมื่อคนขับเก็บกล่อง คำถามจะเด้งขึ้นหน้าจอผู้ช่วยตอบเท่านั้น คนขับสามารถมีสมาธิกับการขับต่อ
- **Majority Consensus Voting (โหวตเสียงส่วนมาก)**: นับถอยหลัง 3-5 วินาที รวมคะแนนโหวตข้อที่คนในทีมเลือกมากที่สุด หากตอบถูกจะส่งกระสุนไปให้คนขับทันที
- **Auto-Balance System**: ระบบกระจายนักเรียนเข้า 4 ทีม (Red, Blue, Green, Yellow) ให้สมดุลเท่ากันอัตโนมัติ

### 3. 👥 Human-Only Classroom Multiplayer (100% นักเรียนจริง)
- ตัดระบบ AI Bot ออกจากเกมอย่างสมบูรณ์ เพื่อให้นักเรียนในห้องเรียนทุกคนมีส่วนร่วมในการแข่งขันและทำงานเป็นทีมอย่างแท้จริง

### 4. 📚 ระบบ Teacher Quiz Bank & Open REST APIs (สำหรับอาจารย์)
- **คลังข้อสอบในเกม (`TeacherQuizModal.tsx`)**: อาจารย์สามารถเพิ่ม ลบ แก้ไขข้อสอบ กำหนดเวลาตอบ (3-15 วิ) และกระสุนรางวัลได้
- **Custom Subject per Room**: เมื่อสร้างห้อง สามารถเลือกหมวดหมู่วิชา (คณิตศาสตร์, วิทยาศาสตร์, ภาษาอังกฤษ, โค้ดดิ้ง หรือวิชาที่อาจารย์เพิ่มเอง)
- **JSON Bulk Import / Export**: นำเข้าและสำเนาชุดข้อสอบทั้งวิชาได้ในคลิกเดียว
- **Open REST API Endpoints**:
  - `GET /api/quiz/questions`: ดึงรายการข้อสอบทั้งหมด (รองรับ `?category=...&difficulty=...&search=...`)
  - `GET /api/quiz/categories`: ดึงรายชื่อหมวดหมู่วิชาทั้งหมดพร้อมจำนวนข้อ
  - `GET /api/quiz/questions/:id`: ดึงข้อสอบรายข้อ
  - `POST /api/quiz/questions`: เพิ่มโจทย์ข้อสอบใหม่
  - `PUT /api/quiz/questions/:id`: แก้ไขโจทย์ข้อสอบ
  - `DELETE /api/quiz/questions/:id`: ลบโจทย์ข้อสอบ
  - `POST /api/quiz/import`: นำเข้าข้อสอบแบบชุด (JSON Array)
  - `POST /api/quiz/reset`: รีเซ็ตกลับเป็นข้อสอบเริ่มต้น

### 5. 📱 รองรับสมาร์ตโฟนและแท็บเล็ต 100% (Mobile-First)
- **Touch-Slide Virtual D-Pad**: วางนิ้วโป้งแล้วเลื่อนลากบังคับรถถังได้ต่อเนื่อง 8 ทิศทาง
- **Large FIRE Button**: ปุ่มยิง 96px ขนาดใหญ่อยู่ตำแหน่งนิ้วโป้งขวา
- **Thumb-Friendly Voting UI**: ปุ่มตัวเลือก A, B, C, D ความสูง 58px+ แตะง่ายด้วยมือเดียว
- **Haptic Vibration**: มีการสั่นเตือนเมื่อกดปุ่มหรือเปลี่ยนทิศทาง (สำหรับอุปกรณ์ที่รองรับ)

### 6. ⚡ Standalone Architecture & Isolated Cluster Deployment
- ระบบทำงานแยกลอยเป็นของตัวเอง 100% ไม่พึ่งพาเซอร์วิสภายนอก
- รันบน Kubernetes / k3s (`namespace: game`) บนคลัสเตอร์เซิร์ฟเวอร์

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
│   │   │   ├── LobbyView.tsx        # 90s Arcade Squad Formation & Role Picker
│   │   │   ├── RoomSelectView.tsx   # Mission Select & Subject Selection
│   │   │   ├── TeacherQuizModal.tsx # Quiz Bank Management & API Reference Modal
│   │   │   ├── QuizModal.tsx        # Single-player FFA Quiz Popup
│   │   │   ├── AuthModal.tsx        # Player Login & Guest Mode
│   │   │   └── GameOverModal.tsx    # Podium Victory Screen
│   │   ├── types.ts                 # Client TypeScript Types
│   │   └── App.tsx                  # Root Game Controller & Socket Listeners
│   ├── Dockerfile
│   └── nginx.conf
│
├── game-server/                     # Backend Server (Node.js + Express + Socket.io)
│   ├── src/
│   │   ├── auth.ts                  # Authentication & Guest Token Handler
│   │   ├── gameEngine.ts            # Authoritative 2D Physics, Collisions & Map Logic
│   │   ├── mapTemplates.ts          # Battle City 24x24 Map Grid Generator
│   │   ├── quizBank.ts              # Quiz CRUD Manager, Category Counter & Bulk Importer
│   │   ├── roomManager.ts           # Room Lifecycle, Squad Auto-balance & Matchmaking
│   │   ├── server.ts                # HTTP Server, Open Quiz REST APIs & WebSockets
│   │   └── types.ts                 # Shared Server Types & Protocols
│   ├── test-game.ts                 # Automated Physics, Combat & Quiz Engine Unit Tests
│   └── Dockerfile
│
├── k8s/                             # Kubernetes Manifests
│   └── game-deployment.yaml         # Deployment & NodePort Service (Namespace: game)
│
├── docker-compose.yml               # Local Multi-container Deployment
└── README.md                        # Documentation
```

---

## 🚀 วิธีการติดตั้งและรันระบบ (Quick Start)

### วิธีที่ 1: รันเพื่อพัฒนาในเครื่อง (Local Development)

**1. เริ่มต้น Game Server:**
```bash
cd game-server
npm install
npm run dev
# Server จะทำงานที่ http://localhost:4000
```

**2. เริ่มต้น Game Client:**
```bash
cd game-client
npm install
npm run dev
# Client จะทำงานที่ http://localhost:3000
```

---

### วิธีที่ 2: รันผ่าน Docker Compose

```bash
docker compose up --build
```
- เข้าใช้งานเกมได้ที่: `http://localhost:3000` (หรือ `http://localhost`)

---

### วิธีที่ 3: Deploy บน Kubernetes / k3s Cluster

```bash
# 1. Build และ Import Image
docker build -t tank-game-client:latest game-client
docker build -t tank-game-server:latest game-server

# 2. Deploy Manifest
kubectl apply -f k8s/game-deployment.yaml -n game

# 3. ตรวจสอบสถานะ Pods
kubectl get pods -n game
```

- เข้าใช้งานเกมผ่าน NodePort: `http://<SERVER_IP>:30080`

---

## 🌐 ตัวอย่างการใช้งาน Open Quiz REST API (สำหรับอาจารย์)

### 1. ดึงข้อสอบตามหมวดวิชา
```bash
curl -X GET "http://192.168.50.96:30080/api/quiz/questions?category=MATH"
```

### 2. ดึงรายชื่อวิชาทั้งหมด
```bash
curl -X GET "http://192.168.50.96:30080/api/quiz/categories"
```

### 3. เพิ่มข้อสอบใหม่
```bash
curl -X POST "http://192.168.50.96:30080/api/quiz/questions" \
  -H "Content-Type: application/json" \
  -d '{
    "category": "PHYSICS",
    "categoryTh": "ฟิสิกส์",
    "questionTh": "หน่วย SI ของแรงคือข้อใด?",
    "options": ["จูล", "นิวตัน", "วัตต์", "พาสคาล"],
    "correctIndex": 1,
    "explanationTh": "หน่วยของแรงคือ นิวตัน (N)",
    "timeLimitSeconds": 4,
    "rewardAmmo": 3,
    "difficulty": "MEDIUM"
  }'
```

### 4. นำเข้าชุดข้อสอบแบบ JSON (Bulk Import)
```bash
curl -X POST "http://192.168.50.96:30080/api/quiz/import" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "append",
    "questions": [
      {
        "category": "CS101",
        "categoryTh": "วิทยาการคำนวณ",
        "questionTh": "คำสั่งใดใช้พิมพ์ข้อความใน Python?",
        "options": ["echo()", "print()", "System.out()", "console.log()"],
        "correctIndex": 1,
        "explanationTh": "ภาษา Python ใช้ฟังก์ชัน print()",
        "timeLimitSeconds": 4,
        "rewardAmmo": 3
      }
    ]
  }'
```

---

## 🕹️ การควบคุมเกม (Controls)

| การกระทำ | บนคอมพิวเตอร์ (PC / Laptop) | บนมือถือ / แท็บเล็ต (Mobile / Tablet) |
| :--- | :--- | :--- |
| **ขับรถถัง** | ปุ่มลูกศร `↑` `↓` `←` `→` หรือ `W` `A` `S` `D` | เลื่อนลากบน **Virtual Slide D-Pad** |
| **ยิงกระสุน** | `Spacebar` หรือ `Enter` | แตะปุ่มกลมสีแดง **FIRE!** |
| **ตอบคำถาม** | คลิกเลือกช้อยส์ A, B, C, D | แตะช้อยส์ขนาดใหญ่ A, B, C, D |
| **สื่อสารทางวิทยุ** | คลิกปุ่ม Cheer ด้านล่าง | แตะปุ่ม Quick Radio Cheering |

---

## 🧪 การทดสอบระบบ (Automated Tests)

รันชุดทดสอบความถูกต้องของฟิสิกส์ การชน การคำนวณคะแนน และคลังข้อสอบ:
```bash
cd game-server
npm test
```

---

## 📄 License & Credits
- **Project**: Tank Quiz Battle 1990 (Gamification for Education)
- **Repository**: [https://github.com/naza1144/tank-quiz-battle](https://github.com/naza1144/tank-quiz-battle)
- **Author**: Educational Technology & Software Engineering Team
