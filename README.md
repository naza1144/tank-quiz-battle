# 🎮 TANK QUIZ BATTLE 1990 (เกมยิงรถถังตอบโจทย์แลกกระสุน)

เว็บแอปพลิเคชันเกมยิงรถถังแบบ Real-time Multiplayer 2D Canvas สไตล์คลาสสิก **Battle City (Tank 1990)** ผสมผสานระบบ Gamification เพื่อการศึกษา โดยมีหัวใจหลักคือ **"การได้กระสุนต้องตอบคำถาม Quiz Multiple Choice ให้ถูกต้อง"**

รองรับทั้ง **Google OAuth Authentication** จาก Infrastructure เดิม และโหมดทดลองเล่น (Guest Play) อย่างราบรื่น

---

## ✨ จุดเด่นและฟีเจอร์หลัก (Key Features)

1. **🎨 Retro 2D Canvas Battle City Engine**:
   - จำลองกราฟิกและฟิสิกส์คลาสสิก: กำแพงอิฐทำลายได้ (Brick), กำแพงเหล็กกันกระสุน (Steel), พุ่มไม้พรางตัว (Bush), แม่น้ำ (Water), พื้นน้ำแข็ง (Ice)
   - ระบบเสียงสังเคราะห์ 8-bit Retro Sound Synthesizer ผ่าน Web Audio API (เสียงยิง, เสียงชน, เสียงระเบิด, เสียงตอบถูก/ผิด, เพลงชัยชนะ)

2. **❓ Quiz-for-Ammo Mechanic (ตอบโจทย์แลกกระสุน)**:
   - รถถังเริ่มต้นด้วย **0 กระสุน**
   - ผู้เล่นต้องขับรถถังไปเก็บ **กล่องคำถาม [?] (Quiz Crate)** บนแมพ
   - หน้าต่างโจทย์ Multiple Choice จะป๊อปอัปขึ้นมา (มีจับเวลา 15 วินาที):
     - **ตอบถูก**: ได้รับกระสุน +3 ถึง +5 นัดทันที + คะแนน + โอกาสได้บัฟเกราะกำบัง (Shield)
     - **ตอบผิด**: ไม่ได้กระสุน + ติดสตันชั่วคราว 1.5 วินาที

3. **🤝 โหมดการเล่นหลากหลาย (Game Modes - 4 ถึง 6 คัน)**:
   - **FFA (Free-for-All Battle Royale)**: ทุกคนขับรถถังประลองเดี่ยว ใครรอดคนสุดท้ายเป็นผู้ชนะ (Last Tank Standing)
   - **Squad Co-op (คนขับ 1 คน + เพื่อนช่วยตอบโจทย์)**:
     - **Tank Commander (คนขับ)**: บังคับรถถังในสนามรบบนหน้าจอหลัก
     - **Support Crew (เพื่อนร่วมทีม)**: เปิดหน้าจอบนมือถือหรือแท็บเล็ตเพื่อตอบคำถามอย่างต่อเนื่อง ช่วยส่งกระสุนและเกราะให้คนขับแบบเรียลไทม์

4. **🦾 เลือกรุ่นและปรับแต่งรถถัง (Tank Classes & Customization)**:
   - **Standard Tank**: สมดุล 2 HP, ความเร็วปานกลาง, พลังทำลาย 1 DMG
   - **Scout Speed**: เคลื่อนที่ไวมาก เก็บกล่องคำถามได้เร็ว, 1 HP
   - **Heavy Panzer**: เกราะหนา 4 HP, ยิงแรง 2 DMG, เคลื่อนที่ช้า
   - **Long Sniper**: ยิงกระสุนความเร็วสูงระยะไกล, 2 DMG, 1 HP
   - เลือกสีสกินรถถังได้ตามใจชอบ

5. **🤖 AI Bot Fillers**:
   - หากผู้เล่นไม่ครบ 4-6 คน หัวหน้าห้องสามารถกดเพิ่ม AI Bot (Easy / Medium / Hard) ได้ทันที

6. **🔐 Integrated Authentication Layer**:
   - เชื่อมต่อกับ **Keycloak + Token Service** เพื่อล็อกอินผ่าน **Google OAuth 2.0**
   - มีระบบ Guest Fast Play สำหรับการทดสอบในเครื่องทันที

---

## 📂 โครงสร้างโปรเจกต์ (Project Structure)

```text
.
├── game-client/              # React + Vite + TypeScript + Tailwind + HTML5 Canvas
│   ├── src/
│   │   ├── audio/soundFx.ts  # 8-bit Web Audio Synthesizer
│   │   ├── components/       # RetroCanvas, QuizModal, SquadSupportView, LobbyView, etc.
│   │   ├── types.ts          # Client types
│   │   └── App.tsx           # Main controller
│   ├── Dockerfile
│   └── nginx.conf
│
├── game-server/              # Node.js + TypeScript + Express + Socket.io Server
│   ├── src/
│   │   ├── auth.ts           # JWT / JWKS Token Verification
│   │   ├── gameEngine.ts     # Authoritative 2D Physics, Collisions & Tick Loop
│   │   ├── mapTemplates.ts   # Battle City 24x24 Map Grid
│   │   ├── quizBank.ts       # Question Bank (Math, Science, English, Logic, General)
│   │   ├── roomManager.ts    # Room Lifecycle & Matchmaking
│   │   └── server.ts         # Server Entrypoint & REST APIs
│   ├── test-game.ts          # Automated Physics & Quiz Test Suite
│   └── Dockerfile
│
├── DEMO/use-k3s/             # Original Infra & Token-Service
│   ├── token-service/        # Adapted FastAPI Token Service with Google OAuth
│   ├── keycloak/             # Keycloak Realm Export
│   └── k8s/                  # Base manifests
│
├── k8s/                      # Kubernetes / k3s Game Manifests
│   └── game-deployment.yaml
│
├── docker-compose.yml        # All-in-one Compose stack (Traefik, Game, Keycloak, Postgres, Redis)
└── keys/                     # RSA Signing Key for JWT
```

---

## 🚀 วิธีการรันระบบ (Quick Start)

### วิธีที่ 1: รันเฉพาะ Game Client & Server แบบรวดเร็ว (Local Dev)

**1. เริ่มต้น Game Server:**
```bash
cd game-server
npm install
npm run dev
# Game Server จะรันที่ http://localhost:4000
```

**2. เริ่มต้น Game Client:**
```bash
cd game-client
npm install
npm run dev
# เปิดเบราว์เซอร์เข้าที่ http://localhost:3000
```

---

### วิธีที่ 2: รันระบบเต็มรูปแบบด้วย Docker Compose

รันคำสั่งเดียวเพื่อยกทั้งสแตก (Traefik + Game Client + Game Server + Token Service + Keycloak + Postgres + Redis):

```bash
docker compose up --build
```

- **เว็บแอปพลิเคชันเกม**: `http://localhost` หรือ `http://localhost:3000`
- **Traefik Gateway**: `http://localhost:80`
- **Traefik Dashboard**: `http://localhost:8081`
- **Keycloak Console**: `http://localhost:8080` (admin / admin)
- **Token Service**: `http://localhost:8100/auth/docs`

---

### วิธีที่ 3: Deploy บน k3s / Kubernetes

```bash
kubectl apply -f k8s/game-deployment.yaml
```

---

## 🕹️ การควบคุม (Game Controls)

- **เดิน / เคลื่อนที่**: ปุ่มลูกศร `↑` `↓` `←` `→` หรือปุ่ม `W` `A` `S` `D`
- **ยิงกระสุน**: ปุ่ม `Spacebar` หรือ `Enter` (บนมือถือใช้ปุ่ม Virtual FIRE)
- **บนมือถือ / แท็บเล็ต**: มีหน้าจอ **Virtual D-Pad และปุ่มยิง Touch Controls** อัตโนมัติ

---

## 🧪 การทดสอบระบบ (Running Tests)

รันชุดทดสอบฟิสิกส์และการตอบคำถามแลกกระสุน:
```bash
cd game-server
npm test
```
