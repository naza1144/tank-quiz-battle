variable "kubeconfig_path" {
  type        = string
  description = "Path to the kubeconfig file for cluster connection"
  default     = "~/.kube/config"
}

variable "namespace" {
  type        = string
  description = "Kubernetes namespace for the Tank Quiz Game"
  default     = "game"
}

variable "server_image" {
  type        = string
  description = "Container image for Game Server"
  default     = "docker.io/library/tank-game-server:latest"
}

variable "client_image" {
  type        = string
  description = "Container image for Game Client"
  default     = "docker.io/library/tank-game-client:latest"
}

variable "client_replicas" {
  type        = number
  description = "Number of replicas for Game Client"
  default     = 2
}

variable "server_replicas" {
  type        = number
  description = "Number of replicas for Game Server"
  default     = 1
}

variable "nodeport" {
  type        = number
  description = "NodePort service port for Game Client access"
  default     = 30080
}

variable "server_nodeport" {
  type        = number
  description = "NodePort service port for Game Server API access"
  default     = 30400
}

variable "jwt_secret" {
  type        = string
  description = "Secret key for JWT validation"
  default     = "tank-battle-quiz-secret-2026"
}
