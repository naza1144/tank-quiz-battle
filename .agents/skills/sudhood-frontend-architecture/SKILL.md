---
name: sudhood-frontend-architecture
description: สถาปัตยกรรมและมาตรฐานการพัฒนา UI React Frontend และ Web Apps ในโปรเจกต์ Sudhood ERP ตามคู่มือ UI_react_frontend.md และ mockup_generate_guide.md
---

# สถาปัตยกรรมและการพัฒนา UI React Frontend (Sudhood ERP Web Apps)

> **แหล่งความจริงกลาง:** ถอดแบบและสอดคล้อง 100% กับ [`generator/guide/UI_react_frontend.md`](../../generator/guide/UI_react_frontend.md) และ [`mockup_generate_guide.md`](../../mockup_generate_guide.md)
> เพื่อให้ทุกโมดูลในระบบ ERP บริหารหลักสูตรมีมาตรฐานเดียวกันและภาพถ่ายหน้าจอสามารถใช้แทนกันได้

---

## 1. กฎเหล็ก 5 ข้อของ UI (ห้ามละเมิดเด็ดขาด)

| กฎ | ข้อกำหนด | เหตุผล |
|---|---|---|
| **1. ห้ามใช้ Emoji ใน UI ทางการ** | ห้ามใส่ Emoji ในปุ่ม, หัวตาราง, การ์ด, หรือ Badge สถานะ — ใช้ **Lucide Icon หรือ ข้อความที่เป็นทางการ** | ERP มหาวิทยาลัยต้องการความเป็นมืออาชีพและความสอดคล้องกับ Mockup |
| **2. ล็อกสีประจำโมดูล (Module Color)** | ใช้สีที่กำหนดไว้เท่านั้น ห้ามเปลี่ยนสีโมดูลตามใจชอบ (ดูตาราง §2) | ผู้ใช้ต้องทราบว่าอยู่โมดูลใดจากสี Accent โดยไม่ต้องอ่านชื่อ |
| **3. ห้ามใช้ External CDN** | ห้ามโหลด Tailwind CDN หรือ Google Fonts CDN ผ่านเน็ต — ต้องใช้ **Bundled CSS / Local Static Files** | ป้องกันระบบพังระหว่างการสอบ/นำเสนอบน Local Offline Demo หรือห้องแล็บที่ไม่มีเน็ต |
| **4. มีหน้ากลางรวมบริการ (Central Hub)** | ทุกระบบต้องเชื่อมโยงกลับไปยัง **Main Hub** (`overview_state_diagram.puml` / `mockup/main page/index.html`) | ผู้ใช้และกรรมการสามารถสลับไปยังโมดูลอื่น (M0, M1, M3, M4, M8, M9, M10) ได้จากหน้าจอเดียว |
| **5. Traceability 1:1 กับ State Diagram** | 1 State ใน `module_state_diagram*.puml` = 1 หน้าจอ/View · ทุก Alternative Flow ใน Use Case ต้องมี Error State จริง | ป้องกันการสร้างหน้าที่ไม่มีในข้อกำหนด และกรรมการใช้ตรวจความครบถ้วน |

---

## 2. ตารางสีประจำโมดูล (Module Colors)

| โมดูล / ระบบ | สีหลัก (Module Color) | ตัวอย่างการใช้งาน |
|---|---|---|
| **M0 · บัญชี / โปรไฟล์** | `Blue` (`#2563eb`) | Account Center, User Profile |
| **M0 Admin & M10 Audit** | `Slate` (`#475569`) | User Management, Audit Log |
| **M1 · หลักสูตร (Curriculum)** | `Violet` (`#7c3aed`) | จัดการเล่มหลักสูตร, PLO/CLO |
| **M1 · จัดตารางเรียน (Planning)**| `Teal` (`#0d9488`) | จัดตารางเรียน, ตารางห้อง |
| **M3 · ข้อมูลอาจารย์ (Faculty)** | `Orange` (`#ea580c`) | โปรไฟล์อาจารย์, ผลงานวิชาการ |
| **M4 · รับสมัคร & ทะเบียน (Registry)**| **`Green`** (`#16a34a`) | สมัครเรียน, งานทะเบียน, สัมภาษณ์ |
| **M8 · สหกิจศึกษา (Co-op)** | `Amber` (`#d97706`) | นักศึกษา, อาจารย์นิเทศ, สถานประกอบการ |
| **M9 · โครงงาน/วิทยานิพนธ์** | `Pink` (`#db2777`) | หัวข้อโครงงาน, แต่งตั้งกรรมการ |

> [!IMPORTANT]
> **ห้ามนำสีประจำโมดูลไปปนกับ Semantic Status Color:**
> - `Green` = ผ่านการอนุมัติ / ปกติ (`ACTIVE`, `APPROVED`, `PASS`)
> - `Amber` = รอดำเนินการ / รอพินิจ / ลาพัก (`PENDING`, `SUBMITTED`, `LEAVE`)
> - `Red` = ปฏิเสธ / ไม่ผ่าน / พ้นสภาพ (`REJECTED`, `EXPELLED`, `FAIL`)
> - `Gray` = ร่าง / ลาออก / ยกเลิก (`DRAFT`, `RESIGNED`, `CANCELLED`)

---

## 3. โครงสร้าง M4 Sub-apps (Registry & Admissions)

ในโมดูล M4 ประกอบด้วย 3 บริการย่อยที่สอดคล้องกับ `mockup/m4/` และ Functional Requirements:

1. **Applicant Portal (ผู้สมัครเรียน — UC-01/02):**
   - **ฟอร์มสมัครเรียน (`ApplyForm`):** กรอกข้อมูลผู้สมัคร, เลือกหลักสูตร, แนบเอกสาร (Transcript, บัตรประชาชน ≤ 5MB), ตรวจสอบ Validation
   - **ติดตามสถานะ (`StatusTracker`):** แสดง Timeline สถานะการสมัคร (ยื่นใบสมัคร → นัดสัมภาษณ์ → ผลการคัดเลือก)
2. **Registrar Back-office (งานทะเบียน — UC-03/04/05):**
   - **รายการใบสมัคร (`ApplicationList`):** กรองสถานะ, ค้นหา, ดูผลสัมภาษณ์, นำเข้าข้อมูลผู้ผ่านการคัดเลือก
   - **รายการนักศึกษา (`StudentList`):** ค้นหารหัสนักศึกษา/ชื่อ, แสดงสถานะ, ปีที่เข้า, อาจารย์ที่ปรึกษา, ปุ่มปรับสถานะ (Audit Log)
   - **สร้างระเบียนนักศึกษา (`ImportStudent`):** ผูกรหัสนักศึกษากับ Account ID ของ M0 แบบ 1:1
3. **Interview Portal (ศูนย์จัดการสัมภาษณ์ — UC-06):**
   - **คิวสัมภาษณ์ประจำวัน (`InterviewQueue`):** แยก Online (ลิงก์ห้องประชุม) และ Onsite (ห้องสอบ), เรียกคิว, ข้ามคิว
   - **ห้องสัมภาษณ์และการประเมิน (`InterviewRoom`):** กรอกคะแนน 0–100 พร้อมคำนวณผล ผ่าน/ไม่ผ่าน อัตโนมัติ (เกณฑ์ 50 คะแนน) พร้อมบันทึกความเห็น

---

## 4. โครงสร้างทางเทคนิค (Tech Stack)

```
DEMO/use-k3s/<service>/
├── <service>-app/               # React 18 + Vite 5
│   ├── package.json
│   ├── vite.config.js          # base: '/<service>/'
│   ├── index.html
│   └── src/
│       ├── styles.css          # Design System + Colors
│       ├── api.js              # Token & API Client
│       ├── components/
│       │   ├── HeaderNav.jsx   # Top Bar + Navigation (No Emojis)
│       │   ├── MainHub.jsx     # Central Service Catalog
│       │   └── ...             # Feature Views
│       ├── App.jsx             # State-based View Manager
│       └── main.jsx
├── Dockerfile                  # Multi-stage: Node build -> Python runtime
└── main.py                     # app.mount("/<service>", StaticFiles(...))
```

---

## 5. การจัดการ Token และ SSO Lifecycle

- **เก็บ Token:** ใช้ `sessionStorage.getItem('sudhood.account.token')` ป้องกัน Token ตกค้างในเครื่องแล็บสาธารณะ
- **URL Fragment Interceptor:** ดึง Token หลัง Redirect จาก Keycloak ด้วย `window.location.hash` (`#access_token=...`) แล้วล้าง URL ทันทีด้วย `window.history.replaceState`
