# 🎮 Tank Quiz Battle - Multi-Domain Routing & Isolation

ระบบเกมได้แยก Domain และ Route ออกจากระบบ **`sudhood3`** เดิม 100% เพื่อไม่ให้เกิดปัญหา Path ชนกัน (No Port/Path Collision)

---

## 🌐 ตาราง URL เข้าใช้งาน (แยกอิสระจากกันอย่างสมบูรณ์):

| บริการ / ระบบ | URL สำหรับเข้าใช้งาน | หน้าที่ |
|---|---|---|
| 🕹️ **Tank Quiz Game (หลัก)** | **[https://tank.192-168-50-96.sslip.io/](https://tank.192-168-50-96.sslip.io/)** | หน้าเล่นเกมยิงรถถัง & ห้อง Lobby |
| 🕹️ **Tank Quiz Game (สำรอง)** | **[https://game.192-168-50-96.sslip.io/](https://game.192-168-50-96.sslip.io/)** | โดเมนสำรองสำหรับเข้าเกม |
| 🔌 **Tank Game (NodePort Direct)** | **[http://192.168.50.96:30080/](http://192.168.50.96:30080/)** | เข้าตรงผ่าน NodePort โดยไม่ต้องผ่าน Domain |
| 🎓 **sudhood3 (ระบบเดิม)** | **[https://sudhood.192-168-50-96.sslip.io/hub/](https://sudhood.192-168-50-96.sslip.io/hub/)** | ระบบ ERP / Hub นักศึกษาเดิม (ไม่ถูกกระทบ) |
| 🔐 **Keycloak SSO** | **[https://auth.192-168-50-96.sslip.io/](https://auth.192-168-50-96.sslip.io/)** | Identity Provider (Google OAuth) |

---

## 🔒 Google Cloud Console Redirect URIs:
- `https://auth.192-168-50-96.sslip.io/realms/sudhood/broker/google/endpoint`
