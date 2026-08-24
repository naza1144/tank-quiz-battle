# 📑 คู่มือและเอกสารประกอบโครงงานระบบ Tank Quiz Battle 1990
## ระบบเกมเพื่อการศึกษาแบบเรียลไทม์ (Educational Real-time Multiplayer Gamification System)

---

## 1. บทนำและวัตถุประสงค์ของโครงการ (Introduction & Objectives)

**Tank Quiz Battle 1990** เป็นระบบเว็บแอปพลิเคชันเกมยิงรถถังแบบผู้เล่นหลายคนแบบเรียลไทม์ (Real-time Multiplayer 2D Canvas) ที่ถูกพัฒนาขึ้นโดยมีวัตถุประสงค์เพื่อ:
1. **แก้ปัญหาความไม่กระตือรือร้นในการทำแบบฝึกหัดของนักเรียน**: โดยนำกลไก Gamification "ตอบคำถามเพื่อแลกกระสุนสำหรับใช้ต่อสู้ (Quiz-for-Ammo)" มาเป็นแรงจูงใจในการเรียนรู้
2. **ส่งเสริมการทำงานร่วมกันเป็นทีม (Squad Co-op Collaboration)**: รองรับห้องเรียนขนาดใหญ่ที่มีนักเรียนมากถึง 60+ คน โดยแบ่งบทบาทเป็น **พลขับ (Driver)** และ **ผู้ช่วยตอบคำถามประจำทีม (Support Crew)** ที่ใช้ระบบการลงคะแนนเสียงส่วนใหญ่ (Majority Consensus Voting)
3. **เปิดโอกาสให้อาจารย์ผู้สอนสามารถกำหนดเนื้อหาได้เอง (Custom Subject & Open REST API)**: อาจารย์สามารถเพิ่ม แก้ไข นำเข้าชุดข้อสอบของแต่ละวิชาเรียน และเลือกวิชาประจำห้องประลองได้ตามต้องการ
4. **รองรับอุปกรณ์ที่หลากหลาย (Cross-Platform & Mobile Friendly)**: ใช้งานได้สมบูรณ์ทั้งบนคอมพิวเตอร์ แท็บเล็ต และสมาร์ตโฟน โดยไม่ต้องติดตั้งแอปพลิเคชันเพิ่มเติม

---

## 2. สถาปัตยกรรมระบบ (System Architecture)

ระบบถูกออกแบบด้วยสถาปัตยกรรม **Client-Server แบบแยกส่วน (Decoupled & Standalone Architecture)**:

```
+-----------------------------------------------------------------------------------+
|                              KUBERNETES / K3S CLUSTER                             |
|                                                                                   |
|  [ Ingress / NodePort: 30080 ]                                                    |
|           │                                                                       |
|           ├──▶ [ game-client ] (Nginx + React 18 + Vite + Tailwind + Canvas)     |
|           │        │                                                              |
|           │        ▼ WebSockets (Socket.io) / REST APIs                           |
|           │                                                                       |
|           └──▶ [ game-server ] (Node.js + Express + Socket.io Engine)             |
|                    ├── GameEngine (Authoritative 2D Physics & 60 FPS Tick)        |
|                    ├── RoomManager (Squad Auto-Balance & State Machine)           |
|                    └── QuizManager (In-Memory CRUD, REST APIs, JSON Bulk Engine)   |
+-----------------------------------------------------------------------------------+
```

### 2.1 ส่วนประกอบของระบบ (Core Components)

1. **Frontend (game-client)**:
   - **React 18 + TypeScript + Vite**: โครงสร้างคอมโพเนนต์ที่รวดเร็วและปลอดภัยต่อ Type
   - **HTML5 2D Canvas Renderer (`RetroCanvas.tsx`)**: เรนเดอร์สมรภูมิรถถัง แอนิเมชันกระสุน ระเบิด และแผนที่แบบ 60 FPS ปรับสัดส่วนพอดีหน้าจออัตโนมัติ
   - **8-Bit Chiptune Audio Synthesizer (`soundFx.ts`)**: สังเคราะห์คลื่นเสียง (Square, Triangle, White Noise) แบบเรียลไทม์ผ่าน Web Audio API
   - **Virtual Slide D-Pad & Touch Controls (`TouchControls.tsx`)**: แผงควบคุมเสมือนบนหน้าจอมือถือ รองรับการลากเลี้ยว 8 ทิศทางและระบบสั่น Haptic Feedback
   - **Squad Support Console (`SquadSupportView.tsx`)**: หน้าจอโหวตตอบคำถามของลูกทีม รองรับตัวเลือกขนาดใหญ่และแสดงผลการโหวตแบบสด

2. **Backend (game-server)**:
   - **Authoritative Game Physics Engine (`gameEngine.ts`)**: คำนวณตำแหน่งการเคลื่อนที่ การชน (AABB Collision) การทำลายกำแพงอิฐ และการคำนวณผลการยิงที่ฝั่งเซิร์ฟเวอร์ ป้องกันการโกง
   - **Room & Matchmaking Manager (`roomManager.ts`)**: จัดการห้องแข่งขัน การเลือกทีม (Red, Blue, Green, Yellow) การเลือกบทบาท และระบบกระจายทีมสมดุล (Auto-Balance)
   - **Quiz Bank Manager & REST APIs (`quizBank.ts`, `server.ts`)**: คลังข้อสอบ จัดการโจทย์ แยกหมวดหมู่วิชา พร้อมเปิด REST APIs ให้ระบบภายนอกเรียกใช้งาน

---

## 3. กลไกการทำงานของเกม (Game Mechanics & Rules)

```
[ คนขับรถถัง (Driver) ] ──▶ วิ่งชนกล่องคำถาม [?] บนแผนที่
                                 │
                                 ▼
                     [ ระบบเปิดรอบโหวตคำถาม (3-5 วินาที) ]
                                 │
           ┌─────────────────────┴─────────────────────┐
           ▼                                           ▼
[ ผู้ช่วยตอบคนที่ 1 โหวต ]                 [ ผู้ช่วยตอบคนที่ 2, 3..N โหวต ]
           │                                           │
           └─────────────────────┬─────────────────────┘
                                 ▼
                    [ รวมคะแนนเสียงข้างมาก (Consensus) ]
                                 │
             ┌───────────────────┴───────────────────┐
             ▼ (โหวตถูก)                             ▼ (โหวตผิด)
  • ส่งกระสุน +3 ถึง +5 นัดให้คนขับ       • ไม่ได้รับกระสุน
  • ได้รับคะแนนทีม + โบนัส                • ติดสตัน 1.5 วินาที
```

1. **การเริ่มต้นเกม**: รถถังทุกคันจะเริ่มด้วยกระสุน 0 นัด
2. **การเก็บกล่องคำถาม**: เมื่อคนขับชนกล่อง `[?]` จะเกิดรอบโหวตคำถามขึ้นทันที โดยคำถามจะแสดงผลเฉพาะหน้าจอของทีมสนับสนุนเท่านั้น
3. **การโหวตเสียงส่วนมาก**: สมาชิกในทีมช่วยกันกดโหวตตัวเลือก A, B, C หรือ D ภายในเวลานับถอยหลัง (3-5 วินาทีตามระดับความยาก)
4. **การสรุปผลและเฉลย**: เมื่อหมดเวลา ระบบจะเลือกข้อที่มีคะแนนโหวตสูงสุด หากตอบถูกต้องคนขับจะได้รับกระสุนเพื่อใช้ยิงทำลายรถถังฝ่ายตรงข้าม

---

## 4. รายละเอียด Open REST API Specification (สำหรับอาจารย์)

### 4.1 ตาราง Endpoints

| Method | Endpoint | คำอธิบาย | พารามิเตอร์ / Body |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/quiz/questions` | ดึงรายการข้อสอบทั้งหมด | `?category=...&difficulty=...&search=...` |
| `GET` | `/api/quiz/categories` | ดึงรายชื่อวิชาทั้งหมดพร้อมจำนวนข้อ | - |
| `GET` | `/api/quiz/questions/:id` | ดึงข้อสอบรายข้อตาม ID | `id` (path parameter) |
| `POST` | `/api/quiz/questions` | เพิ่มโจทย์คำถามใหม่ | JSON Object ของข้อสอบ |
| `PUT` | `/api/quiz/questions/:id` | แก้ไขโจทย์คำถาม | JSON Object ของข้อสอบที่ต้องการแก้ |
| `DELETE` | `/api/quiz/questions/:id` | ลบโจทย์คำถาม | `id` (path parameter) |
| `POST` | `/api/quiz/import` | นำเข้าข้อสอบแบบชุด (Bulk Import) | `{ questions: [...], mode: "append" \| "replace" }` |
| `POST` | `/api/quiz/reset` | รีเซ็ตกลับเป็นโจทย์มาตรฐาน | - |

---

## 5. การติดตั้งและดูแลระบบ (Deployment & Operations)

- **Kubernetes Namespace**: `game`
- **NodePort Service**: Port `30080` (หรือผ่าน Ingress Traefik)
- **การทดสอบ Unit Test**: คำสั่ง `npm test` ใน `game-server` (ผ่านการทดสอบ 100%)
- **Source Code Repository**: [https://github.com/naza1144/tank-quiz-battle](https://github.com/naza1144/tank-quiz-battle) (Branch: `main`)

---

*เอกสารฉบับนี้จัดทำขึ้นสำหรับสรุปผลการพัฒนาระบบ Tank Quiz Battle 1990 ฉบับสมบูรณ์*
