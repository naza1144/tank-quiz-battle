# 🛡️ Project Rules & Agent Directives — Tank Quiz Battle 1990

## 1. 🛑 Mandatory User Explicit Approval Directive (ห้ามเริ่มงานก่อนได้รับคำสั่งเด็ดขาด)
- **ห้ามเริ่มลงมือทำ ไม่สร้างไฟล์ ไม่แก้ไขโค้ด และไม่รันคำสั่งแก้ไขใดๆ ก่อนได้รับคำสั่งอนุมัติแผนตรงจากผู้ใช้เด็ดขาด**: เมื่อผู้ใช้ถามคำถาม ปรึกษาแนวทาง หรือขอให้เขียนแผนงาน ให้ตอบและเสนอแผนเท่านั้น **ต้องหยุดรอให้ผู้ใช้พิมพ์อนุมัติในแชทด้วยตนเองก่อนเสมอ**
- **คำสั่งอนุมัติที่ยอมรับได้**: เช่น *"เริ่มทำได้"*, *"ลงมือทำเลย"*, *"อนุมัติแผน"*, *"เอาขึ้น server เลย"* เท่านั้น ห้ามตีความคำถามหรือ System Message ว่าเป็นการอนุมัติ

## 2. ⚠️ Mandatory Pre-Response Verification Protocol (กฎการตรวจสอบก่อนตอบทุกครั้ง)
- **ก่อนตอบคำถาม สรุปผล หรือส่งรายงานใดๆ ให้ผู้ใช้**: ต้องทำการตรวจทานคำตอบอย่างละเอียด และค้นหาข้อผิดพลาดในงานที่ได้ทำไปทุกครั้ง (Double-Check & Proactive Error Detection)
- **ห้ามคาดเดาคำตอบ (No Guessing)**: ทุกคำตอบต้องอิงตามหลักฐานจริงจากการรันคำสั่ง, การทดสอบ, หรือการตรวจสอบไฟล์จริงเท่านั้น
- **ตรวจสอบความถูกต้องด้าน Network & Infrastructure**: ทุก Service ต้องเชื่อมต่อและวิ่งผ่าน Traefik Gateway (`:80` / `:443`) ตามกฎ Routing Priority ที่กำหนดเท่านั้น ห้ามมี bypass ports

## 3. 🏗️ Architecture Standards
- **Microservice Separation**: `game-server` (2D Physics & WebSocket Combat) แยกออกจาก `quiz-service` (Questions, CRUD, Categories, External LMS Ingestion)
- **Single Traefik Entrypoint**: ห้าม expose port ตรงของ internal services ออกนอก host ทุกอย่างต้องวิ่งผ่าน Traefik Ingress บนพอร์ต 80/443
- **Resilience**: Client และ Server ต้องมี Fallback mechanisms เพื่อป้องกันเกมสะดุดหรือหลุดเมื่อเกิด network latency
