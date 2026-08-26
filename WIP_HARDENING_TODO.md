# 🛠️ งานแก้บั๊กจากผลทดสอบสนามจริง (WIP — ยังไม่เสร็จ)

> ที่มา: ทดสอบกับ deployment จริงบน k3s (`192.168.50.96`) วันที่ 26 ส.ค. 2026
> รวม 152 เคส ผ่าน 137 ไม่ผ่าน 15 · รายงานเต็ม: https://claude.ai/code/artifact/bfd3a4d3-b8e8-411d-a424-d2165a77d099
>
> **สโคปที่ตกลงกันไว้:** ไม่ต้องทำระบบป้องกัน Teacron/Admin API และ PIN (เล่นใน local เท่านั้น)
> และไม่แตะ `verifyToken()` fallback `jwt.decode` เพราะเป็นทางที่ Google/Keycloak token เข้าระบบ — เอาออกแล้ว Google Sign-In พัง

---

## ✅ ส่วนที่แก้แล้วใน commit นี้ (compile ผ่าน `tsc --noEmit`, ยังไม่ deploy, ยังไม่ได้ทดสอบซ้ำ)

### `game-server/src/gameEngine.ts`
| แก้แล้ว | รายละเอียด |
|---|---|
| Fire cooldown | `GameEngine.FIRE_COOLDOWN_MS = 350` ตรวจใน `tankShoot()` (ก่อนหน้านี้ยิง 10 นัดได้ใน 601 ms) |
| ammo/shells ตรงกัน | เพิ่ม `grantShells()` — `shells` เป็นแหล่งความจริงเดียว, `ammo = shells.length`, เกิน `maxAmmo` ตัด**นัดเก่าสุด**ออก (SPEC §6) แทนที่จะโตไม่จำกัด (เคยเจอ ammo 6 แต่ shells 21) |
| แบนด์วิดท์ | เลิกส่ง `map` ทั้งผืนทุก tick → ส่ง `mapDelta` (เฉพาะ tile ที่เปลี่ยน) ผ่าน `setTile()` + เพิ่ม `getFullState()` สำหรับ `game_start`/คนต่อกลับ · ปัดพิกัด tank 1 ตำแหน่งทศนิยม, bullet เป็นจำนวนเต็ม · เพิ่ม `serverNow` ใน snapshot (ให้ client ใช้แก้ปัญหานาฬิกาเพี้ยน) |
| เงื่อนไขจบเกม | ใช้ `participants` (คนที่เคยเข้าแมตช์) แทนจำนวนรถถังที่เหลือ → FFA เหลือคนเดียวชนะทันที · SQUAD รอเฉพาะทีมที่มี Ghost Revival challenge เปิดค้างจริง (`revivalPendingTeams`) ไม่ใช่รอทุกทีมที่ยังไม่เคยชุบชีวิต |
| ต่อเน็ตกลับ | เพิ่ม `rekeyTank(oldId,newId)` ย้ายรถถังคันเดิมไปผูกกับ socket ใหม่ (รวมกระสุนที่ยังลอยอยู่) |
| โดรน REPAIR | คืน `false` เมื่อ HP เต็ม → ไม่เผาคูลดาวน์ทีม 25 วิ ฟรี |
| kill event | ใส่ `teamId` ของทีมที่ถูกยิงพังใน event `TANK_DESTROYED` (จำเป็นสำหรับ trigger Ghost Revival) |
| ชุบชีวิต | `reviveTeamTank()` เติมกระสุนผ่าน `grantShells` (เดิมตั้ง `ammo` ตรง ๆ ทำให้ desync) |

### `game-server/src/roomManager.ts`
| แก้แล้ว | รายละเอียด |
|---|---|
| เก็บกวาดห้องร้าง | `disposeEngine()` + `handleRoomEmpty()` — คนออกหมด = หยุด interval 30Hz, ล้าง timer ทุกตัว, กลับเป็น LOBBY และลบห้อง ad-hoc หลังว่าง 2 นาที (`arena-1`/`squad-1` คงไว้) |
| reclaim ผู้เล่น | `pendingReclaims` + logic ใน `joinRoom()` — คนเดิม (ดูจาก user id ไม่ใช่ socket.id) กลับมาภายใน 60 วิ ได้ role/ทีม/รถถังคืน และได้รับ `game_start` ย้อนหลัง + event `reclaimed` |
| validate input | ตรวจ `role` / `teamId` / `tankArchetype` กับ whitelist ใน `joinRoom()` |
| โครงสร้างรองรับงานที่เหลือ | เพิ่ม `activeFfaQuizzes`, `pingUsage`, ค่าคงที่ `RECLAIM_GRACE_MS`, `PING_*`, `VALID_*` |

### เครื่องมือทดสอบที่เพิ่มเข้ามา — `game-server/loadtests/`
รันจากเครื่องไหนก็ได้ที่มี Node 20 (ไม่ต้องลงอะไรเพิ่ม ใช้ `socket.io-client` ของ `game-server`):

```bash
cd game-server && npm install
GW=http://192.168.50.96:30080 N=60 SECS=20 node loadtests/nodeload.mjs    # โหลด 60/100/150 คน วัด Hz + แบนด์วิดท์
GW=http://192.168.50.96:30080 node loadtests/nodeload2.mjs                 # ล็อบบี้ fanout + multi-room
GW=http://192.168.50.96:30080 node loadtests/nodeload3.mjs                 # เน็ตหลุด / FFA เหลือคนเดียว / ห้องร้าง
GW=http://192.168.50.96:30080 node loadtests/nodeload4.mjs                 # synergy → MEGA LASER + timer ฝั่งเซิร์ฟเวอร์
GW=http://192.168.50.96:30080 node loadtests/nodeload5.mjs                 # ammo/shells + ช่องโกง answer_quiz
```

---

## ⛔ งานที่ยังค้าง (เรียงตามลำดับที่ควรทำ)

### 1. `server.ts` — guard payload ทุก handler + ดักครashทั้ง process  `[P0 — ยังไม่แก้]`
ปัญหา: ส่ง `socket.emit('tank_input')` เปล่า ๆ ทำให้ pod ตายทั้งเครื่อง (ยืนยันแล้ว: RESTARTS 0→1, uptime 84,241s → 53s, ทุกห้องหาย)

```
TypeError: Cannot read properties of undefined (reading 'direction')
    at RoomManager.handleTankInput (/app/dist/roomManager.js:428:50)
```

สิ่งที่ต้องทำ
- [ ] ครอบ `io.on('connection')` ทุก `socket.on(...)` ด้วย wrapper: `const on = (ev, fn) => socket.on(ev, (d) => { try { fn(d ?? {}); } catch (e) { console.error('[handler]', ev, e); } });`
- [ ] เพิ่ม `process.on('uncaughtException')` และ `process.on('unhandledRejection')` ให้ log แล้วอยู่ต่อ
- [ ] ตรวจ type ของทุกฟิลด์ที่ใช้: `direction` ต้องอยู่ใน `VALID_DIRECTIONS` (มี const ให้แล้วใน roomManager), `choiceIndex` ต้องเป็น int 0–3, `supplyType` ต้องเป็น `SHIELD`/`REPAIR`
- [ ] `POST /api/rooms`: clamp `roundTimeSeconds` เป็น 60–900 (ตอนนี้ส่ง `-5` ได้ → เกมจบทันทีที่เริ่ม)
- [ ] จุดที่ต้องแก้ทั้งหมด: `tank_input`, `join_room`, `select_tank`, `answer_quiz`, `vote_team_quiz`, `team_support_answer`, `tactical_ping`, `supporter_airdrop`, `ghost_revival_answer`

**เกณฑ์ผ่าน:** ยิงทุก event ด้วย payload `null` / `undefined` / ชนิดผิด แล้วเซิร์ฟเวอร์ยังอยู่ (`uptimeSeconds` ไม่รีเซ็ต)

### 2. ปิดช่องโกงกระสุนของโหมด FFA  `[P0 — ยังไม่แก้ ทำ struct รอไว้แล้ว]`
ปัญหาที่วัดได้: ส่ง `answer_quiz` ซ้ำ ๆ โดยไม่แตะกล่องเลย → ammo 3→8 เต็ม + ได้ออร่ากระสุนพิเศษ · ใส่ `tankId` ของศัตรู + คำตอบผิดแบบมั่นใจ → ทำให้ปืนศัตรูขัด 3 วิ · ตอบช้ากว่ากำหนด 20 วิ (โจทย์ให้ 7 วิ) ยังได้กระสุน

สิ่งที่ต้องทำ
- [ ] ใน callback `onQuizTrigger` ของ `startGame()` บันทึก session ลง `room.activeFfaQuizzes.set(socketId, { questionId, crateId, tankId, expiresAt: now + limit*1000 + 1500, timer })`
- [ ] `handleQuizAnswer()`: ถ้าไม่มี session / `questionId` ไม่ตรง / `crateId` ไม่ตรง / เลยเวลา → `socket.emit('quiz_expired')` แล้ว `return` ไม่ให้รางวัลใด ๆ · ใช้ `socket.id` เป็น tankId เสมอ **ห้ามเชื่อ `data.tankId`**
- [ ] ตั้ง `timer` ให้หมดอายุอัตโนมัติ (เคลียร์ `tank.answeringQuizId` + ปล่อยกล่อง) เมื่อไม่ตอบ
- [ ] ลบ session ทิ้งเมื่อตอบแล้ว (กันตอบซ้ำ)

**เกณฑ์ผ่าน:** `node loadtests/nodeload5.mjs` — บรรทัด `unsolicited correct answer` ต้องได้ ammo 0 → 0 และ `answered 20s AFTER the limit` ต้องได้ `newResults=0`

### 3. ต่อสาย Ghost Revival ให้ทำงานจริง  `[P1 — ยังไม่แก้]`
ปัญหา: `triggerGhostRevivalChallenge()` ไม่มีใครเรียกในโค้ดจริง (มีแต่ในไฟล์เทสต์ผ่าน `(roomManager as any)`) และไม่มีจุดใดเปลี่ยน role เป็น `GHOST`

สิ่งที่ต้องทำ
- [ ] ใน callback `onGameEvent` ของ `startGame()`: ถ้า `event.type === 'TANK_DESTROYED' && room.config.mode === 'SQUAD' && event.teamId` → เปลี่ยน role ผู้เล่นทีมนั้นเป็น `GHOST`, `engine.revivalPendingTeams.add(teamId)` แล้วเรียก `this.triggerGhostRevivalChallenge(roomId, teamId)`
- [ ] ใน `handleGhostRevivalAnswer()` ตอนสำเร็จ/ตอนหมดสิทธิ์: `engine.revivalPendingTeams.delete(teamId)` และคืน role เป็น `DRIVER`/`SUPPORT` ตามเดิม แล้วเรียก `engine.checkWinCondition()` อีกครั้ง
- [ ] ตั้ง timeout ให้ challenge (เช่น 30 วิ) ถ้าไม่สำเร็จให้ปลด `revivalPendingTeams` เพื่อไม่ให้แมตช์ค้าง
- [ ] เก็บ role เดิมไว้ใน player (เช่น `previousRole`) เพื่อคืนค่าได้ถูก

**เกณฑ์ผ่าน:** ยิงรถถังอีกทีมพัง → ผู้ช่วยทีมนั้นได้ `ghost_revival_popup`, ตอบถูก 2 ข้อติดแล้วรถถังกลับมา, ถ้าไม่รอด → `game_over` ประกาศทีมที่เหลือเป็นผู้ชนะ

### 4. เก็บรถถังไว้ให้คนที่เน็ตหลุด (ครึ่งหลังของงาน reclaim)  `[P1 — ทำฝั่ง join แล้ว ยังไม่ทำฝั่ง leave]`
ตอนนี้ `leaveRoom()` ยังลบรถถังทันที (`engine.removeTank`) ทำให้ฝั่ง `joinRoom` ไม่มีอะไรให้ reclaim

สิ่งที่ต้องทำ
- [ ] `leaveRoom()`: ถ้า `room.state === 'IN_GAME'` → **ไม่ลบรถถังทันที** ให้หยุดรถ (`setTankInput(id, null, false)`) และบันทึก `room.pendingReclaims.set(player.id, { player, tankId, expiresAt, timer })`
- [ ] `timer` ครบ 60 วิ (ค่า `RECLAIM_GRACE_MS`) แล้วยังไม่กลับ → `engine.removeTank()` + `checkWinCondition()` + ลบ entry
- [ ] เรียก `handleRoomEmpty(roomId)` เมื่อ `room.players.size === 0` (ยังไม่ได้ต่อสายเข้า `leaveRoom`)
- [ ] แจ้งเพื่อนร่วมทีมว่าพลขับหลุด (`game_event` PLAYER_DISCONNECTED + นับเวลาถอยหลัง)

**เกณฑ์ผ่าน:** `node loadtests/nodeload3.mjs` หัวข้อ B2 — ต่อกลับต้องได้ `game_start=true` และรถถังทีมยังอยู่

### 5. คนเข้าห้องหลังเกมเริ่ม  `[P1 — ยังไม่แก้]`
- [ ] `joinRoom()` ถ้า `state === 'IN_GAME'` (และไม่ใช่เคส reclaim) → ส่ง `game_start` พร้อม `getFullState()` และตั้ง role เป็น `SUPPORT` (โหมด SQUAD ให้โหวตได้เลย / FFA ให้ดูอย่างเดียว)
- [ ] หรือถ้าไม่ต้องการให้เข้ากลางเกม: ปฏิเสธพร้อม `error_message` ที่ชัดเจน **แต่ต้องไม่ปล่อยให้ค้างหน้าล็อบบี้ทั้งที่ได้รับ snapshot 30 Hz อยู่** (พฤติกรรมปัจจุบัน)

### 6. ลดทราฟฟิกล็อบบี้ O(n²)  `[P1 — ยังไม่แก้]`
วัดได้: เติมล็อบบี้ 60 คน = 18.2 MB · ทุกคนกดเลือกรถถังพร้อมกัน = **+53 MB ใน 4 วินาที** (~106 Mbit/s)

- [ ] `broadcastRoomState()`: coalesce ด้วย `room.stateTimer` (มี field รอไว้แล้ว) throttle `ROOM_STATE_THROTTLE_MS = 250`
- [ ] ตัดฟิลด์ที่ล็อบบี้ไม่ใช้ออกจาก payload ผู้เล่น (เหลือ id/name/role/teamId/tankColor/isHost/isReady)
- [ ] ระยะยาว: ส่ง event `player_updated` เฉพาะคนที่เปลี่ยน แทนการส่งรายชื่อทั้งห้อง

### 7. ping quota  `[P2 — ยังไม่แก้]`
- [ ] `handleTacticalPing()`: ใช้ `room.pingUsage` (มีแล้ว) จำกัด `PING_MAX_PER_MATCH = 6` ครั้ง/คน/แมตช์ และคูลดาวน์ `PING_COOLDOWN_MS = 5000`

### 8. ฝั่ง client  `[ยังไม่แตะเลย]`
- [ ] `App.tsx` `game_tick`: รองรับ `mapDelta` — ถ้ามี `snapshot.mapDelta?.length` ให้ clone แผนที่เดิมแล้วอัปเดตเฉพาะ tile นั้น (ตอนนี้ยังอ่าน `snapshot.map` ซึ่งจะไม่ถูกส่งมาอีกแล้ว → **ต้องแก้คู่กับข้อ gameEngine ไม่งั้นแผนที่จะไม่อัปเดตตอนอิฐพัง**)
- [ ] `App.tsx`: เปิด `reconnection: true` และเมื่อ `connect` ใหม่ ให้ re-emit `join_room` ด้วย roomId ที่จำไว้ (เก็บใน ref) เพื่อเข้าเส้นทาง reclaim + รับ event `reclaimed`
- [ ] `SquadSupportView.tsx`: เลิกเทียบ `endTime` ของเซิร์ฟเวอร์กับ `Date.now()` ของเครื่องผู้เล่น — คำนวณ offset จาก `serverNow` (snapshot ส่งมาให้แล้ว) ครั้งเดียวแล้วใช้เวลาแบบสัมพัทธ์ (มือถือที่ตั้งเวลาเพี้ยนจะโหวตไม่ทัน/เห็นเวลาเพี้ยน)
- [ ] `QuizModal.tsx`: รองรับ event `quiz_expired` จากข้อ 2 (ปิด modal + แจ้งว่าหมดเวลา)
- [ ] ตรวจว่าไม่มีที่ไหนพึ่ง `tank.ammo` แยกจาก `shells` หลังเปลี่ยนกติกา

### 9. k8s / infra  `[ยังไม่แตะ]`
- [ ] `k8s/game-deployment.yaml`: เพิ่ม `livenessProbe` + `readinessProbe` (`httpGet /api/health` port 4000) — ตอนนี้ไม่มี probe เลย pod ที่ค้างจะไม่ถูกรีสตาร์ต
- [ ] พิจารณาขยาย `cpu limit` จาก 500m (ใช้จริงสูงสุด 169m ที่ 100 คน — ยังพอ แต่ headroom น้อยถ้าเปิดหลายคาบพร้อมกัน)
- [ ] `deploy-all.sh`: บรรทัด `sshpass -p Dssi_server ssh ...` ใช้ไม่ได้จริง เพราะเซิร์ฟเวอร์เปิดเฉพาะ `publickey` (ทดสอบแล้ว: `BadAuthenticationType: allowed types: ['publickey']`) → เปลี่ยนเป็น `ssh -i ~/.ssh/id_dssi2026` และเอารหัสผ่าน plaintext ออกจากไฟล์
- [ ] `keys/token-service.pem` ถูก commit เข้า git โดยเจตนา (`.gitignore` มี `!keys/token-service.pem`) — ควรถอดออกจาก repo
- [ ] state ทั้งหมดอยู่ใน memory: pod restart = ห้องหาย + ข้อสอบที่อาจารย์เพิ่มหาย ถ้าอยากให้รอดควรเก็บ quiz bank ลงไฟล์/PVC

### 10. เทสต์  `[ยังไม่แตะ]`
ชุดเทสต์เดิมผ่าน 8/8 แต่มองไม่เห็นบั๊กข้างบนเลย เพราะสร้าง express + socket.io wiring ของตัวเองขึ้นใหม่ ไม่ได้ import `server.ts` และเรียกเมธอดภายในตรง ๆ ผ่าน `(roomManager as any)`

- [ ] แยก wiring ของ socket ออกเป็น `src/wireSockets.ts` แล้วให้ทั้ง `server.ts` และไฟล์เทสต์ใช้ตัวเดียวกัน
- [ ] เพิ่ม `test-hardening.ts`: payload ผิดรูปทุก event, `answer_quiz` ที่ไม่มี session, FFA เหลือคนเดียว, Ghost Revival, ห้องร้างถูกเก็บกวาด, ammo cap, fire cooldown
- [ ] แก้ `quizManager.getQuestions({})` ใน `test-brutal-full-room-coop.ts:43` และ `test-multi-round-exhaustive.ts:35` (เมธอดชื่อจริงคือ `getAllQuestions`)

---

## 📌 ก่อน deploy รอบหน้า
1. ข้อ 8 (client `mapDelta`) **ต้องทำคู่กับ commit นี้** ไม่งั้นแผนที่ฝั่ง client จะไม่อัปเดตเมื่ออิฐถูกทำลาย
2. `npx tsc --noEmit` ทั้ง `game-server` และ `game-client`
3. `./deploy-all.sh --ansible` แล้วรัน `loadtests/*.mjs` ทั้ง 5 ไฟล์ซ้ำ เทียบกับตัวเลขในรายงาน
4. เช็ค `curl http://192.168.50.96:30080/api/admin/stats` ว่า `uptimeSeconds` ไม่รีเซ็ต หลังยิงชุดทดสอบ payload ผิดรูป
