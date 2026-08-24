output "namespace" {
  value       = kubernetes_namespace.game.metadata[0].name
  description = "Deployed Kubernetes Namespace"
}

output "game_client_nodeport_url" {
  value       = "http://192.168.50.96:${var.nodeport}"
  description = "Direct NodePort Access URL for Game Client"
}

output "game_server_api_url" {
  value       = "http://192.168.50.96:${var.server_nodeport}/api/quiz/categories"
  description = "Direct NodePort Access URL for Game Server Open REST APIs"
}

output "client_replicas" {
  value       = var.client_replicas
  description = "Running Client Pod Count"
}
