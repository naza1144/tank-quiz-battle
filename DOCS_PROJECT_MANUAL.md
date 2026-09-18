# 📑 คู่มือและเอกสารประกอบโครงงานระบบ Tank Quiz Battle 1990
## ระบบเกมเพื่อการศึกษาแบบเรียลไทม์ (Educational Real-time Multiplayer Gamification System)

---

## 1. บทนำและวัตถุประสงค์ของโครงการ (Introduction & Objectives)

**Tank Quiz Battle 1990** เป็นระบบเว็บแอปพลิเคชันเกมยิงรถถังแบบผู้เล่นหลายคนแบบเรียลไทม์ (Real-time Multiplayer 2D Canvas) สไตล์ตู้เกมอาร์เคดยุค 90 ที่ถูกพัฒนาขึ้นโดยมีวัตถุประสงค์เพื่อ:
1. **แก้ปัญหาความไม่กระตือรือร้นในการทำแบบฝึกหัดของนักเรียน**: โดยนำกลไก Gamification "ตอบคำถามเพื่อแลกกระสุนสำหรับใช้ต่อสู้ (Quiz-for-Ammo)" มาเป็นแรงจูงใจในการเรียนรู้
2. **ส่งเสริมการทำงานร่วมกันเป็นทีม (6-Team Squad Co-op Collaboration)**: รองรับห้องเรียนขนาดใหญ่ที่มีนักเรียนมากถึง 60+ คน โดยแบ่งบทบาทเป็น **พลขับ (Driver)** และ **ผู้ช่วยตอบคำถามประจำทีม (Support Crew)** ที่ใช้ระบบการลงคะแนนเสียงส่วนใหญ่ (Majority Consensus Voting)
3. **เปิดโอกาสให้อาจารย์ผู้สอนสามารถกำหนดเนื้อหาได้เอง (Custom Subject & Open REST API)**: อาจารย์สามารถเพิ่ม แก้ไข นำเข้าชุดข้อสอบของแต่ละวิชาเรียน และเลือกวิชาประจำห้องประลองได้ตามต้องการ
4. **รองรับอุปกรณ์ที่หลากหลาย (Cross-Platform & Mobile Friendly)**: ใช้งานได้สมบูรณ์ทั้งบนคอมพิวเตอร์ แท็บเล็ต และสมาร์ตโฟน โดยไม่ต้องติดตั้งแอปพลิเคชันเพิ่มเติม

---

## 2. สถาปัตยกรรมระบบ (System Architecture)

ระบบถูกออกแบบด้วยสถาปัตยกรรม **Decoupled Microservices & Traefik Single Gateway Architecture** บน Kubernetes K3s Cluster:

```text
+-----------------------------------------------------------------------------------------------+
|                                  KUBERNETES / K3S CLUSTER (192.168.50.96)                     |
|                                                                                               |
|  [ TRAEFIK INGRESS GATEWAY (Port :80 / :443) - Host: tank.192-168-50-96.sslip.io ]            |
|           │                                                                                   |
|           ├──▶ Path: / (Priority 230)           ==▶ [ game-client ] (Nginx SPA Port 80)       |
|           │                                         Namespace: game                           |
|           │                                                                                   |
|           ├──▶ Path: /api, /socket.io, /auth    ==▶ [ game-server ] (2D Physics Port 4000)    |
|           │    (Priority 240)                       Namespace: game                           |
|           │                                              │                                    |
|           │                                              ▼ Cross-Container REST API           |
|           │                                         http://quiz-service.quiz.svc:4001         |
|           │                                                                                   |
|           ├──▶ Path: /api/quiz (Priority 250)   ==▶ [ quiz-service ] (Quiz Bank Port 4001)    |
|           │                                         Namespace: quiz                           |
|           │                                                                                   |
|           ├──▶ Path: /api/account (Priority 248)==▶ [ account-service ] (3NF RBAC Port 4005)  |
|           │                                         Namespace: identity                       |
|           │                                                                                   |
|           └──▶ Path: /quiz-portal (Priority 235)==▶ [ quiz-manager-portal ] (Teacher UI: 4008)|
|                                                     Namespace: quiz                           |
+-----------------------------------------------------------------------------------------------+
```

### 2.1 ส่วนประกอบของระบบ (Core Microservices & Components)

1. **Frontend Game Client (`game-client` | Namespace: `game` | Port 80)**:
   - **React 18 + TypeScript + Vite + Nginx**: โครงสร้างคอมโพเนนต์ที่รวดเร็วและปลอดภัยต่อ Type
   - **HTML5 2D Canvas Renderer (`RetroCanvas.tsx`)**: เรนเดอร์สมรภูมิรถถัง แอนิเมชันกระสุน ระเบิด และแผนที่แบบ 60 FPS
   - **8-Bit Chiptune Audio Synthesizer (`soundFx.ts`)**: สังเคราะห์คลื่นเสียงแบบเรียลไทม์ผ่าน Web Audio API
   - **Virtual Slide D-Pad & Touch Controls (`TouchControls.tsx`)**: แผงควบคุมเสมือนบนหน้าจอมือถือ รองรับการลากเลี้ยว 8 ทิศทาง
   - **Squad Support Console (`SquadSupportView.tsx`)**: หน้าจอโหวตตอบคำถามและควบคุมโดรนส่งเสบียง

2. **Core Game Server (`game-server` | Namespace: `game` | Port 4000)**:
   - **Authoritative Game Physics Engine (`gameEngine.ts`)**: คำนวณตำแหน่งการเคลื่อนที่ การชน (AABB Collision) และ Mega Laser Piercing
   - **Room & Matchmaking Manager (`roomManager.ts`)**: จัดการห้องแข่งขัน การเลือก 6 ทีม การเลือกบทบาท และระบบกระจายทีมสมดุล (Auto-Balance)
   - **Quiz Client (`quizClient.ts`)**: ยิงเรียกข้อสอบจาก `quiz-service` ข้าม Namespace แบบ On-Demand (`/api/quiz/random`) พร้อม Fallback Memory Cache 100%

3. **Standalone Quiz Microservice (`quiz-service` | Namespace: `quiz` | Port 4001)**:
   - **Open REST API & Assessment Engine (`server.ts`)**: จัดการโจทย์ข้อสอบ, แยกหมวดหมู่วิชา, และสุ่มตามความยาก
   - **External LMS Adapter (`externalAdapter.ts`)**: รองรับให้อาจารย์ยิงข้อสอบจากระบบโรงเรียนเข้ามาผ่าน API Key (`POST /api/quiz/sync`)
   - **Student Score Webhooks**: ส่งผลคะแนนเก็บของนักเรียนกลับไปยังระบบอาจารย์อัตโนมัติ

4. **Account & 3NF Identity Microservice (`account-service` | Namespace: `identity` | Port 4005)**:
   - **3NF Master Academic Directory (`accountDirectory.ts`)**: โครงสร้างฐานข้อมูลมาตรฐาน 3NF รองรับโครงสร้างองค์กรทางการศึกษา (Faculties, Departments, Sections, Titles)
   - **Token Provisioning & Verification**: รองรับ Google OAuth 2.0 (RS256 JWT) และ Role-Based Access Control (RBAC: ADMIN, TEACHER, STUDENT)

5. **Standalone Quiz Manager Portal (`quiz-manager-portal` | Namespace: `quiz` | Port 4008)**:
   - **Standalone Teacher & Admin Web UI**: หน้าเว็บสำหรับอาจารย์และผู้ดูแลระบบแยกเป็นอิสระ ไม่ผูกติดกับ Game Server
   - **Offline Resilience Engine**: มี Pending Queue ในตัว บันทึกคำสั่งเพิ่ม/แก้ไข/ลบข้อสอบไว้ในคิวสำรองเมื่อเน็ตเวิร์กสะดุด และมี Auto-retry Sync เมื่อระบบกลับมาพร้อมใช้งาน

---

## 3. แผนภาพความสัมพันธ์ของข้อมูล (Entity-Relationship Diagram — ERD)

```mermaid
erDiagram
    CATEGORY ||--o{ QUIZ_QUESTION : "classifies"
    CATEGORY ||--o{ ROOM : "subject filter"
    CATEGORY ||--o{ QUIZ_CRATE : "determines question"
    EXTERNAL_PROVIDER ||--o{ QUIZ_QUESTION : "supplies (LMS Sync)"
    QUIZ_QUESTION ||--o{ SQUAD_QUIZ_SESSION : "queried in"
    QUIZ_QUESTION ||--o{ STUDENT_SCORE_REPORT : "evaluates"

    ROOM ||--|{ TEAM : "houses (up to 6)"
    ROOM ||--|{ PLAYER : "contains"
    ROOM ||--o{ QUIZ_CRATE : "spawns on grid"

    TEAM ||--|{ PLAYER : "squad members"
    TEAM ||--o| TANK : "controls"
    TEAM ||--o{ SQUAD_QUIZ_SESSION : "votes on"

    PLAYER ||--o| TANK : "drives"
    PLAYER ||--o{ STUDENT_SCORE_REPORT : "records score"

    CATEGORY {
        string id PK "e.g. MATH, SCIENCE"
        string nameTh
        string description
        int questionCount
    }

    QUIZ_QUESTION {
        string id PK
        string category_id FK
        string provider_id FK
        text questionTh
        text questionEn
        json options
        int correctIndex
        string difficulty "EASY, MEDIUM, HARD"
        int timeLimitSeconds "2s, 5s, 7s"
        int rewardAmmo "3..5"
        int bonusPoints
        text explanationTh
        string source "LOCAL, EXTERNAL"
    }

    EXTERNAL_PROVIDER {
        string id PK "e.g. Teacher_Somchai_LMS"
        string name
        string apiKey
        string endpointUrl
        string webhookUrl
        timestamp lastSyncAt
    }

    STUDENT_SCORE_REPORT {
        string id PK
        string question_id FK
        string player_id FK
        string team_id FK
        boolean is_correct
        float time_spent_seconds
        boolean reported_to_lms
        timestamp created_at
    }

    ROOM {
        string id PK
        string name
        string mode "FFA, SQUAD"
        string state "LOBBY, STARTING, IN_GAME, GAME_OVER"
        string category_id FK
        int max_tanks
        int round_time_seconds
        timestamp created_at
    }

    TEAM {
        string id PK "RED, BLUE, GREEN, YELLOW, PURPLE, CYAN"
        string room_id FK
        string color_hex
        int total_score
        int quiz_streak
        boolean is_alive
        string driver_player_id FK
        boolean has_used_revival
        int ghost_streak
    }

    PLAYER {
        string id PK
        string room_id FK
        string team_id FK
        string socket_id
        string display_name
        string email
        string role "DRIVER, SUPPORT, GHOST"
        string tank_archetype "STANDARD, SCOUT, HEAVY, SNIPER"
        boolean is_host
        boolean is_ready
        int score
        int kills
    }

    TANK {
        string id PK
        string player_id FK
        string team_id FK
        float x
        float y
        int hp
        int max_hp
        int ammo
        int max_ammo
        string special_ammo "NORMAL, FIRE, ICE, BOUNCE, LASER"
        string direction "UP, DOWN, LEFT, RIGHT"
        boolean is_invulnerable
        boolean is_destroyed
    }

    QUIZ_CRATE {
        string id PK
        string room_id FK
        string category_id FK
        float x
        float y
        boolean is_active
        timestamp respawn_at
    }

    SQUAD_QUIZ_SESSION {
        string id PK
        string team_id FK
        string question_id FK
        string status "VOTING, RESOLVED, QUEUED"
        json votes_data
        int majority_choice
        boolean is_correct
        timestamp opened_at
        timestamp expires_at
    }
```

---

## 4. กลไกการทำงานของเกม (Game Mechanics & Rules)

```
[ คนขับรถถัง (Driver) ] ──▶ วิ่งชนกล่องคำถาม [?] บนแผนที่
                                 │
                                 ▼
                     [ ระบบเปิดรอบโหวตคำถาม (2, 5, 7 วินาที) ]
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

### 3.1 กฎกติกาและการควบคุมเวลาตามระดับความยาก:
- **🔥 คำถามยาก (HARD)**: ให้เวลาตอบ **7 วินาที** (โจทย์คำนวณหลายขั้นตอน, ฟิสิกส์, ตรรกศาสตร์)
- **⚡ คำถามปานกลาง (MEDIUM)**: ให้เวลาตอบ **5 วินาที** (โจทย์วิเคราะห์, ไวยากรณ์, วิทยาศาสตร์ทั่วไป)
- **🟢 คำถามง่าย (EASY)**: ให้เวลาตอบ **2 วินาที** (ประลองความไว Speed Quiz, ทายศัพท์)

### 3.2 กฎการเข้าคิวคำถาม (Sequential Question Queuing):
- หากคนขับเก็บกล่องคำถามมากกว่า 1 กล่องในขณะที่คำถามก่อนหน้ายังไม่หมดเวลา คำถามใหม่จะถูกนำเข้าคิวรอ (`squadQuizQueues`)
- เมื่อเวลานับถอยหลังของข้อปัจจุบันสิ้นสุดลง ระบบจะสรุปผล แสดงเฉลย ~2.8 วินาที และเปิดคำถามข้อถัดไปในคิวโดยอัตโนมัติ

---

## 5. รายละเอียด Open REST API Specification

ระบบแยก API ออกเป็น Microservices สองชุดหลักที่ให้บริการผ่าน Traefik Gateway:

### 5.1 Quiz Service Endpoints (`/api/quiz`)

| Method | Endpoint | คำอธิบาย | พารามิเตอร์ / Body |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/quiz/questions` | ดึงรายการข้อสอบทั้งหมด | `?category=...&difficulty=...&search=...` |
| `GET` | `/api/quiz/categories` | ดึงรายชื่อวิชาทั้งหมดพร้อมจำนวนข้อ | - |
| `GET` | `/api/quiz/questions/:id` | ดึงข้อสอบรายข้อตาม ID | `id` (path parameter) |
| `POST` | `/api/quiz/questions` | เพิ่มโจทย์คำถามใหม่ | JSON Object ของข้อสอบ |
| `PUT` | `/api/quiz/questions/:id` | แก้ไขโจทย์คำถาม | JSON Object ของข้อสอบที่ต้องการแก้ |
| `DELETE` | `/api/quiz/questions/:id` | ลบโจทย์คำถาม | `id` (path parameter) |
| `POST` | `/api/quiz/import` | นำเข้าข้อสอบแบบชุด (Bulk Import) | `{ questions: [...], mode: "append" \| "replace" }` |
| `POST` | `/api/quiz/sync` | ซิงค์ข้อสอบจาก External LMS (Teacher API) | Header: `X-API-Key: <KEY>`, Body: `{ providerId, questions }` |
| `POST` | `/api/quiz/reset` | รีเซ็ตกลับเป็นโจทย์มาตรฐาน | - |
| `GET` | `/api/quiz/health` | Health Check ของ Quiz Service | - |

### 5.2 Account & Identity Service Endpoints (`/api/account`)

| Method | Endpoint | คำอธิบาย | พารามิเตอร์ / Body |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/account/login` | ยืนยันตัวตน Google OAuth Token และแปลงเป็น In-Game JWT | `{ credential: "<GOOGLE_ID_TOKEN>" }` |
| `POST` | `/api/account/hydrate` | ดึงประวัติการศึกษา/สิทธิ์แบบเต็ม (3NF Hydration) | `{ email: "..." }` |
| `GET` | `/api/account/profile` | ดึงโปรไฟล์ผู้ใช้ปัจจุบันพร้อม Role & Permissions | Header: `Authorization: Bearer <JWT>` |
| `GET` | `/api/account/directory/faculties` | ดึงรายชื่อคณะทั้งหมดในสถาบัน | - |
| `GET` | `/api/account/directory/departments` | ดึงรายชื่อสาขา/ภาควิชาตามสังกัด | `?facultyId=...` |
| `GET` | `/api/account/health` | Health Check ของ Account Service | - |

---

## 6. ระบบโครงสร้างข้อมูลสถานศึกษา 3NF และการควบคุมสิทธิ์ (Identity & RBAC)

ระบบ `account-service` ปฏิบัติตามมาตรฐานการจัดระเบียบฐานข้อมูลระดับ **Third Normal Form (3NF)** ปราศจากข้อมูลซ้ำซ้อนและแยกบทบาทการเข้าถึงตามหลัก Principle of Least Privilege:

### 6.1 โครงสร้างระดับ 3NF Academic Directory

```text
FACULTY (คณะ)
  └── DEPARTMENT (ภาควิชา / สาขา)
        └── SECTION (กลุ่มเรียน / ตอนเรียน)
              └── STUDENT_PROFILE (รหัสนักศึกษา, ปีที่เข้าศึกษา)
```

```text
TITLE (คำนำหน้าชื่อ / ยศทางวิชาการ: นาย, น.ส., ดร., ผศ.ดร.)
ROLE (STUDENT, TEACHER, ADMIN, GUEST)
  └── PERMISSION (game:play, quiz:write, portal:teacher, admin:all)
```

### 6.2 กลไก Token Hydration (Google SSO ➔ 3NF Context)
1. เมื่อผู้ใช้ล็อกอินผ่าน **Google OAuth 2.0** ทาง Client จะส่ง Google ID Token มายัง `POST /api/account/login`
2. `account-service` ตรวจสอบความถูกต้องของ Signature กับ Google Auth Server
3. ทำการ **Hydrate** ข้อมูลจาก 3NF Directory:
   - ตรวจสอบอีเมลกับตาราง `UserAccount`
   - ตรวจจับสิทธิ์ `Role` (`TEACHER`, `ADMIN`, `STUDENT`)
   - ผูกโยงข้อมูลการศึกษา/ตำแหน่งวิชาการ (`Faculty`, `Department`, `Section`, `PositionTitle`)
4. ออก **RS256/HS256 Session JWT** ที่บรรจุ Claims ครบถ้วน เพื่อให้ `game-server` และ `quiz-manager-portal` ตรวจสอบสิทธิ์ได้แบบ Stateless

---

## 7. การดูแลและควบคุมระบบผ่าน Standalone Quiz Manager Portal (`/quiz-portal`)

ระบบแยกหน้าพอร์ทัลจัดการข้อสอบสำหรับคณาจารย์ออกมาเป็น Micro-Frontend / Standalone Web Service ที่ทำงานอิสระอย่างสมบูรณ์:

- **URL เข้าใช้งาน**:
  - `https://tank.192-168-50-96.sslip.io/quiz-portal/`
  - `http://192.168.50.96/quiz-portal/`
- **ระบบยืนยันตัวตน**: **Google OAuth 2.0 Single Sign-On (SSO)** พร้อมระบบ RBAC จาก `account-service`
  - อนุญาตเฉพาะผู้ใช้ที่มี Role เป็น `TEACHER` หรือ `ADMIN` เท่านั้น
  - ระบบเดิมที่ใช้รหัส PIN `1990` ได้รับการยกระดับความปลอดภัยเป็น OAuth 2.0 Token Verification อย่างสมบูรณ์
- **ฟังก์ชันหลักของ Portal**:
  1. **Question Bank CRUD**: เพิ่ม, แก้ไข, ลบโจทย์ข้อสอบแยกตามหมวดหมู่วิชา พร้อมตัวเลือกและคำอธิบายเฉลย
  2. **Bulk JSON Importer**: นำเข้าข้อสอบชุดใหญ่ด้วยการ Paste ข้อมูลรูปแบบ JSON
  3. **Offline Resilience Queue**: เมื่อเน็ตเวิร์กของอาจารย์หรือเซิร์ฟเวอร์ปลายทางมีปัญหา ระบบจะเก็บคำสั่งเข้า Offline Queue ใน Local Storage และส่งซ้ำอัตโนมัติ (Exponential Backoff Auto-Retry) เมื่อการเชื่อมต่อกลับมาเป็นปกติ
  4. **Open REST API Viewer**: คัดลอก Endpoint URL เพื่อนำไปเชื่อมโยงกับ External LMS ภายนอกได้ทันที

---

## 8. กลไกความต่อเนื่องในการทำงาน (Fault Isolation & High Availability)

สถาปัตยกรรม Microservices 3 Namespaces รับประกันว่า:
1. **เมื่อ Game Server หยุดทำงานชั่วคราว**: อาจารย์ยังสามารถเปิดใช้งาน `/quiz-portal` เพื่อตรวจทาน ออกข้อสอบ และซิงค์ข้อมูลข้อสอบได้ 100%
2. **เมื่อ Quiz Service หยุดทำงานชั่วคราว**: ห้องเกมที่กำลังดำเนินอยู่จะสลับไปใช้ **Fallback Question Cache** ในหน่วยความจำ ทำให้การแข่งขันไม่สะดุดและผู้เล่นไม่หลุดออกจากเกม
3. **เมื่อ Account Service ปิดปรับปรุง**: ผู้เล่นที่ถือ Token อยู่แล้วยังคงเล่นเกมต่อได้จนกว่า Session จะหมดอายุ

