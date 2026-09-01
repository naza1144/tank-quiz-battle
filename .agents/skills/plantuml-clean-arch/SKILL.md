---
name: plantuml-clean-arch
description: >-
  Generates clean, minimalist, professional, human-architect-grade PlantUML
  architecture diagrams without AI-slop, floating lines, or Graphviz layout glitches.
  Enforces detailed end-to-end data flow annotations (protocols, ports, payloads, cache TTL, ingress priorities).
---

# 📐 Clean PlantUML Architecture Skill (Enterprise Standard)

This skill provides guidelines, styling rules, and reusable templates for creating high-clarity, production-grade System Architecture Diagrams in PlantUML that look hand-crafted by a Principal Cloud Architect with exhaustive technical metadata.

---

## 🚫 1. Anti-AI-Slop & Professionalism Principles

1. **No Rainbow/Gaudy Palettes**: Use neutral, cohesive corporate palettes inspired by AWS, GCP, and Stripe architectural diagrams (Slate Gray `#0F172A`, Muted Blue `#1E293B`, Soft Borders `#94A3B8`, Light Card Backgrounds `#FFFFFF` / `#F8FAFC`).
2. **No Emoji Clutter**: Avoid sprinkling emojis on every label. Use crisp technical terms and component basenames.
3. **Typography & Spacing**: Use clean sans-serif fonts (`Helvetica, Arial, sans-serif` or `Segoe UI`), font size 10-12px, with `roundCorner 3-4` and `shadowing false`.

---

## ⚡ 2. Fixing Floating Lines & Routing Glitches

### The Root Cause of Disconnected/Floating Lines:
- Using `interface` (circle socket) inside nested `package` blocks while using `linetypes ortho` or `!pragma layout smetana` causes Graphviz to miscalculate anchor offsets, drawing arrows *next* to the target without attaching.

### The Correct Enterprise Solution:
- **Direct Component-to-Component Connections**: Route from the Ingress Controller or Route Rule box directly into the target component/pod.
- **Route Rule Sub-Components**: Model Gateway routes as dedicated sub-components inside the Ingress package, and draw arrows straight down into the respective application pods below.

```plantuml
' ✅ CORRECT: Clean direct connections
TraefikGateway -down-> Route_Frontend
Route_Frontend -down-> Pod_Client_Engine : "ClusterIP: game-client:80"

' ❌ AVOID: Floating interface socket
interface "Route: /" as IngressSocket
TraefikGateway -> IngressSocket
IngressSocket -> Pod_Client_Engine
```

---

## 📝 3. Mandatory Line Details & Protocol Semantics

Every line in the architecture must provide technical depth:
1. **Transport Protocol & Security**: e.g., `HTTPS (Port 443, TLS 1.3)`, `WSS (Binary Engine.IO)`, `HTTP/1.1 REST (Internal ClusterIP)`.
2. **Ingress Rule & Priority**: e.g., `Priority: 250 | PathPrefix: /api/quiz`.
3. **Payload / Data Semantics**: e.g., `60Hz World State Broadcast`, `POST /api/quiz/sync (JSON Array)`.
4. **Resilience & Caching**: e.g., `In-Memory Cache (TTL: 300s, Auto-Sync: 30s)`.

---

## 🏗️ 4. Master Clean Architecture Template

```plantuml
@startuml
skinparam backgroundColor #FFFFFF
skinparam packageStyle rectangle
skinparam roundCorner 4
skinparam shadowing false
skinparam defaultFontName "Segoe UI, Tahoma, Arial, sans-serif"
skinparam defaultFontSize 11
skinparam defaultTextAlignment center

' --- High-Detail Enterprise Architecture Palette ---
skinparam ArrowColor #1B4F72
skinparam ArrowThickness 1.3
skinparam ArrowFontSize 9
skinparam ArrowFontColor #154360

skinparam package {
    BorderThickness 1.2
    BorderColor #7F8C8D
    FontColor #1A5276
    FontSize 12
    FontStyle bold
    BackgroundColor #F8F9FA
}

skinparam node {
    BorderThickness 1.2
    BorderColor #5D6D7E
    BackgroundColor #FFFFFF
    FontColor #1C2833
    FontSize 11
}

skinparam component {
    BorderThickness 1.0
    BorderColor #5D6D7E
    BackgroundColor #FFFFFF
    FontColor #17202A
    FontSize 10
}

title **ENTERPRISE SYSTEM ARCHITECTURE — [PROJECT_NAME]**\n<size:10><color:#5D6D7E>Detailed End-to-End Data Flow, Transport Protocols & Microservices Communication Map</color></size>\n

' 1. CLIENT LAYER
package "Tier 1: Client & Consumer Presentation Tier" as PresentationTier {
    node "Player Client (SPA)\n[Browser Runtime]\n--\n• React 18 + Canvas Engine (60 FPS)\n• WebSocket Client" as Client_Player #EBF5FB
    node "Admin Portal\n[Browser Runtime]\n--\n• PIN/JWT Protected Dashboard" as Client_Admin #EBF5FB
    node "External System\n[Third-Party Server]\n--\n• API Integration / Webhooks" as External_System #FCF3CF
}

' 2. INGRESS & GATEWAY LAYER
package "Tier 2: Edge Gateway Tier (Port :80 / :443)" as GatewayTier #EBF5FB {
    component "Traefik Ingress Gateway\n(TLS 1.3 Termination • Reverse Proxy)" as Gateway #D4E6F1

    package "Traefik IngressRoute Rules" as Routes #FFFFFF {
        component "Route: Frontend SPA\nPriority: 230 | Path: /" as Route_Web #F8FAFC
        component "Route: Core Real-Time API\nPriority: 240 | Path: /api, /socket.io" as Route_API #F8FAFC
        component "Route: Dedicated Microservice\nPriority: 250 | Path: /api/service" as Route_Micro #F8FAFC
    }

    Gateway -down-> Route_Web : "Internal Dispatch"
    Gateway -down-> Route_API : "Internal Dispatch"
    Gateway -down-> Route_Micro : "Internal Dispatch"
}

Client_Player -down-> Gateway : "1. HTTPS (Port 443) -> Initial Page Load\n2. WSS (Port 443) -> Real-time Socket Sync"
Client_Admin -down-> Gateway : "HTTPS REST (Port 443)\n• Header: Bearer JWT / PIN"
External_System -down-> Gateway : "HTTPS REST API (Port 443)\n• Header: X-API-Key Ingestion"

' 3. APPLICATION MICROSERVICES TIER
package "Tier 3: Application Microservices Tier (Kubernetes)" as AppTier #FFFFFF {
    package "Pod: Frontend Client [Nginx • Port 80]" as Pod_Web #FEFDE8 {
        component "Nginx Web Server" as Engine_Web #FFF9C4
    }
    package "Pod: Core Real-Time Server [Node.js • Port 4000]" as Pod_API #E8F8F5 {
        component "Real-Time WebSocket Hub" as Engine_API #D1F2EB
        component "Internal Microservice Client\n(Memory Cache TTL 5m)" as Client_Internal #D1F2EB
        Engine_API -down-> Client_Internal
    }
    package "Pod: Domain Microservice [Node.js • Port 4001]" as Pod_Micro #E8F6F3 {
        component "Domain REST Controller" as Engine_Micro #D0ECE7
    }
}

Route_Web -down-> Engine_Web : "HTTP/1.1 Proxy -> http://frontend.svc:80\n• Delivers Static SPA Bundles"
Route_API -down-> Engine_API : "HTTP/1.1 & WSS -> http://api.svc:4000\n• Real-Time Game Loop & State Sync"
Route_Micro -down-> Engine_Micro : "HTTP/1.1 REST -> http://microservice.svc:4001\n• Business Domain Operations"

Client_Internal -right-> Engine_Micro : "Internal ClusterIP REST (HTTP/1.1)\n• URL: http://microservice:4001/api/data\n• In-Memory Cache (TTL: 300s)"

' 4. INFRASTRUCTURE & IAC TIER
package "Tier 4: Infrastructure as Code & Platform Tier" as InfraTier #F2F4F4 {
    component "deploy-all.sh" as Script_Deploy #EAEDED
    component "Terraform Provider" as Tool_TF #EAEDED
    component "Ansible Automation" as Tool_Ansible #EAEDED
    component "K3s Control Plane" as Platform_K8s #EAEDED

    Script_Deploy -right-> Tool_TF : "Provisions K8s Resources"
    Script_Deploy -right-> Tool_Ansible : "Builds & Ingests Images"
    Tool_Ansible -right-> Platform_K8s : "Rolls Out Workloads"
}

Platform_K8s ..> AppTier : "Schedules, Monitors & Auto-heals Pods"

@enduml
```
