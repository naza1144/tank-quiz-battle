# 🛠️ งานแก้บั๊กจากผลทดสอบสนามจริง

> ที่มา: ทดสอบกับ deployment จริงบน k3s (`192.168.50.96`) วันที่ 26 ส.ค. 2026
> รวม 152 เคส ผ่าน 137 ไม่ผ่าน 15 · รายงานเต็ม: https://claude.ai/code/artifact/bfd3a4d3-b8e8-411d-a424-d2165a77d099
>
> **สโคปที่ตกลงกันไว้:** ไม่ต้องทำระบบป้องกัน Teacron/Admin API และ PIN (เล่นใน local เท่านั้น)
> และไม่แตะ `verifyToken()` fallback `jwt.decode` เพราะเป็นทางที่ Google/Keycloak token เข้าระบบ — เอาออกแล้ว Google Sign-In พัง

---

## ✅ รอบที่ 1 (commit `1f55236`) — แก้ engine + roomManager

| หัวข้อ | รายละเอียด |
|---|---|
| Fire cooldown | `GameEngine.FIRE_COOLDOWN_MS = 350` ตรวจใน `tankShoot()` (ก่อนหน้านี้ยิง 10 นัดได้ใน 601 ms) |
| ammo/shells ตรงกัน | `grantShells()` — `shells` เป็นแหล่งความจริงเดียว, `ammo = shells.length`, เกิน `maxAmmo` ตัดนัดเก่าสุด (SPEC §6) |
| แบนด์วิดท์ | เลิกส่ง `map` ทั้งผืนทุก tick → `mapDelta` ผ่าน `setTile()` + `getFullState()` · ปัดพิกัด · เพิ่ม `serverNow` |
| เงื่อนไขจบเกม | ใช้ `participants` แทนจำนวนรถถังที่เหลือ · SQUAD รอเฉพาะทีมที่มี revival challenge เปิดค้าง |
| ต่อเน็ตกลับ | `rekeyTank(oldId,newId)` ย้ายรถถังคันเดิมไปผูกกับ socket ใหม่ |
| โดรน REPAIR | คืน `false` เมื่อ HP เต็ม → ไม่เผาคูลดาวน์ทีม 25 วิ ฟรี |
| kill event | ใส่ `teamId` ใน `TANK_DESTROYED` |
| เก็บกวาดห้องร้าง | `disposeEngine()` + `handleRoomEmpty()` |
| reclaim (ครึ่งแรก) | `pendingReclaims` + logic ฝั่ง `joinRoom()` |
| validate input | ตรวจ `role` / `teamId` / `tankArchetype` กับ whitelist |

---

## ✅ รอบที่ 2 — งานที่เหลือทั้งหมด (deploy แล้ว ทดสอบบน k3s จริงแล้ว)

### 1. `server.ts` — guard payload ทุก handler + ดักครashทั้ง process ✅
- wrapper `on(event, fn)` ครอบทุก `socket.on`: payload `null`/`undefined` → `{}` และ error ไม่หลุดไปฆ่า process
- `process.on('uncaughtException')` / `('unhandledRejection')` — log แล้วอยู่ต่อ
- ตรวจชนิดทุกฟิลด์: `direction` ∈ `VALID_DIRECTIONS`, `choiceIndex`/`selectedIndex` เป็น int 0–3, `supplyType` ∈ `SHIELD|REPAIR`, พิกัด ping ต้องเป็นตัวเลขจริง
- `POST /api/rooms`: clamp `roundTimeSeconds` เป็น 60–900 และ `maxTanks` 2–6 (เดิมส่ง `-5` ได้)
- `handleTankInput()` ใน roomManager กันซ้ำอีกชั้น (จุดที่ทำ pod ตายจริง)

**ผลทดสอบจริง:** `loadtests/nodeload6.mjs` ยิง 510 payload ผิดรูปใส่ทุก event → `uptimeSeconds` ไม่รีเซ็ต ✅

### 2. ปิดช่องโกงกระสุนของโหมด FFA ✅
- `openFfaQuizSession()` บันทึก session (`questionId`/`crateId`/`tankId`/`expiresAt`/`timer`) ทุกครั้งที่เปิดโจทย์
- `handleQuizAnswer()` รับเฉพาะคำตอบที่ตรง session และยังไม่หมดเวลา ไม่งั้นส่ง `quiz_expired` แล้วไม่ให้รางวัล
- ใช้ `session.tankId` เสมอ **ไม่เชื่อ `data.tankId`** → ยิงควิซใส่ศัตรูไม่ได้อีก
- ลบ session ทิ้งเมื่อตอบแล้ว (กันตอบซ้ำ) · timer หมดอายุอัตโนมัติ + `engine.expireQuiz()` ปลดล็อกกล่อง

**ผลทดสอบจริง:** `nodeload5.mjs` — `unsolicited correct answer: ammo 0 -> 0` ✅ · `answered 20s AFTER the 5s limit: newResults=0` ✅

### 3. ต่อสาย Ghost Revival ให้ทำงานจริง ✅
- `onGameEvent`: `TANK_DESTROYED` + SQUAD + `teamId` → `beginGhostRevival()`
- `beginGhostRevival()` เปลี่ยน role ทั้งทีมเป็น `GHOST` (เก็บ `previousRole` ไว้คืนค่า) แล้วเรียก challenge
- `triggerGhostRevivalChallenge()` เพิ่มทีมเข้า `revivalPendingTeams` + ตั้ง timeout 30 วิเอง
  → **นี่คือบั๊กที่ทำให้เทสต์เดิมพัง:** เดิมแมตช์จบตั้งแต่ตอบข้อแรกเสร็จ คำตอบข้อสองเลยถูกทิ้ง
- `endGhostRevival()` ปลด `revivalPendingTeams`, คืน role, เรียก `checkWinCondition()` ทั้งกรณีสำเร็จและหมดเวลา
- ชุบได้ทีมละครั้ง — เช็คจาก `tank.hasUsedRevival`

### 4. เก็บรถถังไว้ให้คนที่เน็ตหลุด (ครึ่งหลัง) ✅
- `leaveRoom()` ตอน `IN_GAME`: ไม่ลบรถถัง — จอดรถ + `setTankDisconnected(true)` + บันทึก `pendingReclaims` 60 วิ
- ครบเวลาแล้วไม่กลับ → `removeTank()` + `checkWinCondition()`
- แจ้งเพื่อนร่วมทีมด้วย `game_event` `PLAYER_DISCONNECTED`
- เรียก `handleRoomEmpty()` เมื่อคนออกหมด
- **FFA:** รถที่จอดรอไม่ถูกนับเป็นคู่แข่ง (`isDisconnected`) → เหลือคนเดียวชนะทันที ไม่ต้องรอ 60 วิ
- **`rekeyTank()` ลบ id เก่าออกจาก `participants`** — เดิมนับเป็นผู้เล่นคนที่สอง ทำให้แมตช์จบทันทีที่ต่อกลับ
- **guest id คงที่:** `guestSession()` รับ `guestId` จาก handshake (client เก็บใน localStorage)
  เดิม guest ได้ id ใหม่ทุกครั้งที่ต่อ → reclaim หาเจ้าของเดิมไม่เจอ

**ผลทดสอบจริง:** `loadtests/nodeload7.mjs` ผ่านครบ 8/8 — ได้ `reclaimed`, รถถังคันเดิม, role เดิม, `game_start` ย้อนหลัง, snapshot ต่อเนื่อง ✅

### 5. คนเข้าห้องหลังเกมเริ่ม ✅
`joinRoom()` ตอน `IN_GAME` (ไม่ใช่ reclaim) → role `SUPPORT` + ส่ง `game_start` พร้อม `getFullState()` + `error_message` อธิบาย

### 6. ลดทราฟฟิกล็อบบี้ O(n²) ✅
- `broadcastRoomState()` coalesce ด้วย `room.stateTimer` throttle 250 ms
- payload ผู้เล่นเหลือเฉพาะฟิลด์ที่ล็อบบี้ใช้ (id/socketId/name/avatar/role/teamId/tankArchetype/tankColor/isHost/isReady)

**ผลทดสอบจริง (`nodeload2.mjs`):** เติมล็อบบี้ 60 คน 18.2 MB → **6.8 MB** · กดเลือกรถถังพร้อมกัน 53 MB/4s → **1.3 MB/4s**

### 7. ping quota ✅
`handleTacticalPing()` จำกัด 6 ครั้ง/คน/แมตช์ + คูลดาวน์ 5 วิ

### 8. ฝั่ง client ✅
- `App.tsx` `game_tick`: clone แผนที่แล้วแปะ `mapDelta` ทีละ tile
- `App.tsx`: `reconnection: true` (retry ไม่จำกัด, backoff 0.5–5 วิ) + re-emit `join_room` ด้วย `joinedRoomIdRef` ตอน connect ใหม่ + รับ event `reclaimed`
- `App.tsx`: ส่ง `guestId` ที่เก็บใน localStorage ไปกับ handshake
- `App.tsx`: เก็บ `serverClockOffsetMs` จาก `snapshot.serverNow`
- `SquadSupportView.tsx`: นับเวลาถอยหลังด้วย `serverNow()` แทน `Date.now()` ของเครื่องผู้เล่น
- `App.tsx`: รับ `quiz_expired` → ปิด QuizModal
- ตรวจแล้วว่าไม่มีที่ไหนใน `src/` ตั้ง `tank.ammo` ตรง ๆ อีก (เหลือแต่ผ่าน `grantShells`)

### 9. k8s / infra ✅ (บางส่วน)
- `k8s/game-deployment.yaml`: เพิ่ม `livenessProbe` + `readinessProbe` ทั้ง game-server (`/api/health`) และ game-client (`/`)
- ขยาย cpu limit ของ game-server 500m → 1000m
- `deploy-all.sh`: เอา `sshpass -p Dssi_server` และรหัสผ่าน plaintext ออก ใช้ `ssh -i $K3S_SSH_KEY` (ตั้งค่าได้ด้วย env `K3S_SSH_HOST` / `K3S_SSH_KEY`)
- `game-client/Dockerfile`: เอา `COPY public ./public` ออก — ไม่มีโฟลเดอร์นี้ในรีโป build จาก clone ใหม่พังทุกครั้ง
- เพิ่ม `.gitattributes` บังคับ `*.sh` เป็น LF (autocrlf ทำสคริปต์พังบน Linux)

### 10. เทสต์ ✅
- แก้ `quizManager.getQuestions({})` → `getAllQuestions()` ใน `test-brutal-full-room-coop.ts` และ `test-multi-round-exhaustive.ts`
- แก้ทุกที่ที่ตั้ง `tank.ammo = N` ตรง ๆ ในไฟล์เทสต์ → `engine.grantAmmo(tankId, N)` (เมธอด public ใหม่)
- เพิ่ม `loadtests/run-all-tests.sh` รันชุดเทสต์ทั้ง 7 ไฟล์รวดเดียวพร้อมสรุปผล
- เพิ่ม `loadtests/nodeload6.mjs` (payload ผิดรูป) และ `loadtests/nodeload7.mjs` (reclaim ด้วย token เดิม)

**ผลรัน:** `sh loadtests/run-all-tests.sh` → **7/7 PASS**

---

## ⛔ ยังค้างอยู่ (ตัดสินใจไม่ทำในรอบนี้)

- `keys/token-service.pem` ยังอยู่ในรีโป (`.gitignore` มี `!keys/token-service.pem`) — การถอดออกต้องหมุนคีย์ใหม่ ควรทำพร้อมกันทีเดียว
- state ทั้งหมดอยู่ใน memory: pod restart = ห้องหาย + ข้อสอบที่อาจารย์เพิ่มหาย ถ้าอยากให้รอดต้องเก็บ quiz bank ลงไฟล์/PVC
- แยก wiring ของ socket ออกเป็น `src/wireSockets.ts` ให้ `server.ts` และไฟล์เทสต์ใช้ร่วมกัน — ตอนนี้ไฟล์เทสต์ยังสร้าง express + socket.io wiring ของตัวเอง จึงไม่ครอบคลุม guard ใน `server.ts` (ครอบคลุมด้วย `nodeload6.mjs` ที่ยิงเซิร์ฟเวอร์จริงแทน)
- `test-multi-round-exhaustive.ts` ไวต่อ timing: quiz `timeLimitSeconds: 1` อาจพลาดเมื่อรันพร้อมชุดอื่นในเครื่องเดียว รันเดี่ยวผ่านเสมอ

---

## 🧪 วิธีรันชุดทดสอบ

```bash
cd game-server && npm install

# ชุดเทสต์ในเครื่อง (7 ไฟล์)
sh loadtests/run-all-tests.sh

# ชุดทดสอบกับ deployment จริง
GW=http://192.168.50.96:30080 N=60 SECS=20 node loadtests/nodeload.mjs   # โหลด 60 คน วัด Hz + แบนด์วิดท์
GW=http://192.168.50.96:30080 node loadtests/nodeload2.mjs               # ล็อบบี้ fanout + multi-room
GW=http://192.168.50.96:30080 node loadtests/nodeload3.mjs               # เน็ตหลุด / FFA เหลือคนเดียว / ห้องร้าง
GW=http://192.168.50.96:30080 node loadtests/nodeload4.mjs               # synergy → MEGA LASER + timer ฝั่งเซิร์ฟเวอร์
GW=http://192.168.50.96:30080 node loadtests/nodeload5.mjs               # ammo/shells + ช่องโกง answer_quiz
GW=http://192.168.50.96:30080 node loadtests/nodeload6.mjs               # payload ผิดรูปทุก event (กัน pod ตาย)
GW=http://192.168.50.96:30080 node loadtests/nodeload7.mjs               # reclaim รถถังด้วย token เดิม
```

> หมายเหตุ: `nodeload2.mjs` หัวข้อ B และ `nodeload3.mjs` หัวข้อ B2/D มีบรรทัดสรุปที่ hardcode ข้อความ
> "actual: ..." ไว้ตั้งแต่ตอนเขียน ให้ดูค่าจริงในบรรทัดตัวเลขข้างบนแทน (`game_over=true`, `engine=false`)
> การทดสอบ reclaim ที่ถูกต้องอยู่ใน `nodeload7.mjs` ซึ่งต่อกลับด้วย token เดิมเหมือน client จริง

---

## 📊 ตัวเลขจากการทดสอบบน k3s หลัง deploy รอบนี้

| หัวข้อ | ก่อน | หลัง |
|---|---|---|
| payload ผิดรูป 510 ครั้ง | pod ตาย (RESTARTS 0→1) | uptime ไม่รีเซ็ต |
| แผนที่ในแพ็กเก็ต | 59% ของทุก tick | 0% (ส่งเฉพาะ `mapDelta`) |
| egress 60 คนในแมตช์ | 152 Mbit/s | 59 Mbit/s (7.0 MB/s), 30.1 Hz, ไม่มี stall |
| เติมล็อบบี้ 60 คน | 18.2 MB | 6.8 MB |
| เลือกรถถังพร้อมกัน 60 คน | +53 MB / 4 วิ | +1.3 MB / 4 วิ |
| ยิงควิซรัว ๆ โดยไม่แตะกล่อง | ammo 3→8 + ออร่าพิเศษ | ammo 0→0 |
| ตอบช้ากว่ากำหนด 20 วิ | ยังได้กระสุน | `newResults=0` |
| FFA เหลือคนเดียว | ต้องรอหมดเวลา 300 วิ | `game_over=true` ทันที |
| ห้องร้าง | loop 30Hz วนตลอดไป | `engine=false`, ลบห้อง ad-hoc ใน 2 นาที |
| ต่อเน็ตกลับใน 60 วิ | เสียรถถังถาวร | ได้รถถัง + role + snapshot คืนครบ |
