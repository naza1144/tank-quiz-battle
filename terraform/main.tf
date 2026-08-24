terraform {
  required_version = ">= 1.5.0"
  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.35.0"
    }
  }
}

provider "kubernetes" {
  config_path = pathexpand(var.kubeconfig_path)
}

# 1. Namespace
resource "kubernetes_namespace" "game" {
  metadata {
    name = var.namespace
    labels = {
      app       = "tank-quiz-battle"
      managed-by = "terraform"
    }
  }
}

# 2. Game Server Deployment
resource "kubernetes_deployment_v1" "game_server" {
  metadata {
    name      = "game-server"
    namespace = kubernetes_namespace.game.metadata[0].name
    labels = {
      app = "game-server"
    }
  }

  spec {
    replicas = var.server_replicas

    selector {
      match_labels = {
        app = "game-server"
      }
    }

    template {
      metadata {
        labels = {
          app = "game-server"
        }
      }

      spec {
        container {
          name              = "server"
          image             = var.server_image
          image_pull_policy = "IfNotPresent"

          port {
            name           = "http"
            container_port = 4000
          }

          env {
            name  = "PORT"
            value = "4000"
          }

          env {
            name  = "JWT_SECRET"
            value = var.jwt_secret
          }

          resources {
            requests = {
              cpu    = "100m"
              memory = "128Mi"
            }
            limits = {
              cpu    = "500m"
              memory = "512Mi"
            }
          }
        }
      }
    }
  }
}

# 3. Game Server ClusterIP Service
resource "kubernetes_service_v1" "game_server" {
  metadata {
    name      = "game-server"
    namespace = kubernetes_namespace.game.metadata[0].name
    labels = {
      app = "game-server"
    }
  }

  spec {
    selector = {
      app = "game-server"
    }

    port {
      name        = "http"
      port        = 4000
      target_port = 4000
    }

    type = "ClusterIP"
  }
}

# 4. Game Server NodePort Service (Direct API access)
resource "kubernetes_service_v1" "game_server_nodeport" {
  metadata {
    name      = "game-server-nodeport"
    namespace = kubernetes_namespace.game.metadata[0].name
    labels = {
      app = "game-server"
    }
  }

  spec {
    selector = {
      app = "game-server"
    }

    port {
      name        = "http"
      port        = 4000
      target_port = 4000
      node_port   = var.server_nodeport
    }

    type = "NodePort"
  }
}

# 5. Game Client Deployment
resource "kubernetes_deployment_v1" "game_client" {
  metadata {
    name      = "game-client"
    namespace = kubernetes_namespace.game.metadata[0].name
    labels = {
      app = "game-client"
    }
  }

  spec {
    replicas = var.client_replicas

    selector {
      match_labels = {
        app = "game-client"
      }
    }

    template {
      metadata {
        labels = {
          app = "game-client"
        }
      }

      spec {
        container {
          name              = "client"
          image             = var.client_image
          image_pull_policy = "IfNotPresent"

          port {
            name           = "http"
            container_port = 80
          }

          resources {
            requests = {
              cpu    = "50m"
              memory = "64Mi"
            }
            limits = {
              cpu    = "250m"
              memory = "256Mi"
            }
          }
        }
      }
    }
  }
}

# 6. Game Client ClusterIP Service
resource "kubernetes_service_v1" "game_client" {
  metadata {
    name      = "game-client"
    namespace = kubernetes_namespace.game.metadata[0].name
    labels = {
      app = "game-client"
    }
  }

  spec {
    selector = {
      app = "game-client"
    }

    port {
      name        = "http"
      port        = 80
      target_port = 80
    }

    type = "ClusterIP"
  }
}

# 7. Game Client NodePort Service
resource "kubernetes_service_v1" "game_client_nodeport" {
  metadata {
    name      = "game-client-nodeport"
    namespace = kubernetes_namespace.game.metadata[0].name
    labels = {
      app = "game-client"
    }
  }

  spec {
    selector = {
      app = "game-client"
    }

    port {
      name        = "http"
      port        = 80
      target_port = 80
      node_port   = var.nodeport
    }

    type = "NodePort"
  }
}
