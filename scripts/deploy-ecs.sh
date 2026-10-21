#!/usr/bin/env bash

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

load_env_file() {
  local env_file="$1"
  if [[ -f "$env_file" ]]; then
    while IFS= read -r line || [[ -n "$line" ]]; do
      [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
      if [[ "$line" =~ ^([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]]; then
        local key="${BASH_REMATCH[1]}"
        local val="${BASH_REMATCH[2]}"
        # strip enclosing quotes if present
        val="${val%\"}"
        val="${val#\"}"
        val="${val%\'}"
        val="${val#\'}"
        if [[ -z "${!key:-}" ]]; then
          export "$key"="$val"
        fi
      fi
    done < "$env_file"
  fi
}

load_env_file "$ROOT/.env.production"
load_env_file "$ROOT/.env"

require_command() {
  local name="$1"
  if ! command -v "$name" >/dev/null 2>&1; then
    echo "::error::Required command is not installed: $name" >&2
    exit 1
  fi
}

require_command aws
require_command jq

# Configuration with intelligent defaults for standalone and CI/CD runs
IMAGE_REPOSITORY_PREFIX="${IMAGE_REPOSITORY_PREFIX:-ghcr.io/yasterlij/takelow}"
IMAGE_TAG="${IMAGE_TAG:-${GITHUB_SHA:-latest}}"
ECS_CLUSTER="${ECS_CLUSTER:-takelow-cluster}"

ECS_IDENTITY_SERVICE="${ECS_IDENTITY_SERVICE:-identity-service}"
ECS_AUCTION_SERVICE="${ECS_AUCTION_SERVICE:-auction-engine}"
ECS_QUERY_SERVICE="${ECS_QUERY_SERVICE:-query-service}"
ECS_WEB_SERVICE="${ECS_WEB_SERVICE:-takelow-web}"

ECS_IDENTITY_CONTAINER="${ECS_IDENTITY_CONTAINER:-identity-service}"
ECS_AUCTION_CONTAINER="${ECS_AUCTION_CONTAINER:-auction-engine}"
ECS_QUERY_CONTAINER="${ECS_QUERY_CONTAINER:-query-service}"
ECS_WEB_CONTAINER="${ECS_WEB_CONTAINER:-takelow-web}"

DRY_RUN=false
WAIT_FOR_STABLE=true
REGISTER_ONLY=false
RUN_MIGRATION=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN=true
      ;;
    --no-wait)
      WAIT_FOR_STABLE=false
      ;;
    --register-only)
      REGISTER_ONLY=true
      ;;
    --run-migration)
      RUN_MIGRATION=true
      ;;
    --tag)
      IMAGE_TAG="$2"
      shift
      ;;
    --cluster)
      ECS_CLUSTER="$2"
      shift
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
  esac
  shift
done

echo "=========================================="
echo " Guess X ECS Deployment"
echo " Cluster:    $ECS_CLUSTER"
echo " Prefix:     $IMAGE_REPOSITORY_PREFIX"
echo " Image Tag:  $IMAGE_TAG"
echo " Dry Run:    $DRY_RUN"
echo "=========================================="

register_from_template() {
  local template_file="$1"
  local image="$2"
  local container_name="$3"

  if [[ ! -f "$template_file" ]]; then
    echo "::error::Template file '$template_file' not found" >&2
    exit 1
  fi

  local rendered_json
  rendered_json="$({
    jq \
      --arg image "$image" \
      --arg container "$container_name" \
      --arg region "${AWS_REGION:-${AWS_DEFAULT_REGION:-us-east-1}}" \
      --arg execRole "${ECS_EXECUTION_ROLE_ARN:-}" \
      --arg taskRole "${ECS_TASK_ROLE_ARN:-}" \
      '
        (.executionRoleArn = if $execRole != "" then $execRole else .executionRoleArn end)
        | (.taskRoleArn = if $taskRole != "" then $taskRole else .taskRoleArn end)
        | .containerDefinitions |= map(
            if .name == $container then .image = $image else . end
            | if .logConfiguration?.options?.["awslogs-region"] == "${AWS_REGION}" then
                .logConfiguration.options["awslogs-region"] = $region
              else . end
          )
      ' "$template_file"
  })"

  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[DRY-RUN] Register task definition from $template_file -> $image"
    return 0
  fi

  local reg_arn
  reg_arn="$({
    aws ecs register-task-definition \
      --cli-input-json "$rendered_json" \
      --query 'taskDefinition.taskDefinitionArn' \
      --output text
  })"

  echo "Registered task definition: $reg_arn"
}

deploy_service() {
  local service_name="$1"
  local container_name="$2"
  local image="$3"

  echo "Deploying service '$service_name' with container '$container_name' -> $image"

  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[DRY-RUN] Verified deployment plan for '$service_name' (container: '$container_name') -> $image"
    return 0
  fi

  local task_definition_arn
  task_definition_arn="$({
    aws ecs describe-services \
      --cluster "$ECS_CLUSTER" \
      --services "$service_name" \
      --query 'services[0].taskDefinition' \
      --output text 2>/dev/null || echo "None"
  })"

  if [[ -z "$task_definition_arn" || "$task_definition_arn" == "None" ]]; then
    echo "::warning::Service '$service_name' not found in cluster '$ECS_CLUSTER'. Attempting template registration."
    local tpl="$ROOT/ecs/task-definitions/${container_name}.json"
    if [[ -f "$tpl" ]]; then
      register_from_template "$tpl" "$image" "$container_name"
    else
      echo "::error::No task definition template found at $tpl" >&2
      exit 1
    fi
    return 0
  fi

  local task_definition_json
  task_definition_json="$({
    aws ecs describe-task-definition \
      --task-definition "$task_definition_arn" \
      --query 'taskDefinition' \
      --output json
  })"

  local updated_task_definition_json
  updated_task_definition_json="$({
    jq \
      --arg image "$image" \
      --arg container "$container_name" \
      '
        del(
          .taskDefinitionArn,
          .revision,
          .status,
          .requiresAttributes,
          .compatibilities,
          .registeredAt,
          .registeredBy,
          .deregisteredAt
        )
        | .containerDefinitions |= map(
            if .name == $container then .image = $image else . end
          )
      ' <<<"$task_definition_json"
  })"

  if ! jq -e --arg container "$container_name" '.containerDefinitions[] | select(.name == $container)' <<<"$updated_task_definition_json" >/dev/null; then
    echo "::error::Container '$container_name' was not found in task definition '$task_definition_arn'" >&2
    exit 1
  fi

  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[DRY-RUN] Would register updated task definition for '$service_name' with image '$image'"
    echo "[DRY-RUN] Would update service '$service_name' in cluster '$ECS_CLUSTER'"
    return 0
  fi

  local new_task_definition_arn
  new_task_definition_arn="$({
    aws ecs register-task-definition \
      --cli-input-json "$updated_task_definition_json" \
      --query 'taskDefinition.taskDefinitionArn' \
      --output text
  })"

  aws ecs update-service \
    --cluster "$ECS_CLUSTER" \
    --service "$service_name" \
    --task-definition "$new_task_definition_arn" \
    >/dev/null

  echo "Updated '$service_name' to task definition '$new_task_definition_arn'"
}

if [[ "$RUN_MIGRATION" == "true" ]]; then
  echo "Running database migration standalone task..."
  MIGRATE_IMAGE="$IMAGE_REPOSITORY_PREFIX/identity-service:$IMAGE_TAG"
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[DRY-RUN] Would run standalone migration task with image '$MIGRATE_IMAGE'"
  else
    register_from_template "$ROOT/ecs/task-definitions/migrate.json" "$MIGRATE_IMAGE" "migrate"
    echo "To run the migration task on Fargate, execute:"
    echo "  aws ecs run-task --cluster $ECS_CLUSTER --task-definition takelow-migrate --launch-type FARGATE --network-configuration 'awsvpcConfiguration={subnets=[\$SUBNET],securityGroups=[\$SG],assignPublicIp=ENABLED}'"
  fi
fi

if [[ "$REGISTER_ONLY" == "true" ]]; then
  echo "Registering task definitions from templates..."
  register_from_template "$ROOT/ecs/task-definitions/identity-service.json" "$IMAGE_REPOSITORY_PREFIX/identity-service:$IMAGE_TAG" "$ECS_IDENTITY_CONTAINER"
  register_from_template "$ROOT/ecs/task-definitions/auction-engine.json" "$IMAGE_REPOSITORY_PREFIX/auction-engine:$IMAGE_TAG" "$ECS_AUCTION_CONTAINER"
  register_from_template "$ROOT/ecs/task-definitions/query-service.json" "$IMAGE_REPOSITORY_PREFIX/query-service:$IMAGE_TAG" "$ECS_QUERY_CONTAINER"
  register_from_template "$ROOT/ecs/task-definitions/takelow-web.json" "$IMAGE_REPOSITORY_PREFIX/takelow-web:$IMAGE_TAG" "$ECS_WEB_CONTAINER"
  echo "Task definitions registered successfully."
  exit 0
fi

deploy_service "$ECS_IDENTITY_SERVICE" "$ECS_IDENTITY_CONTAINER" "$IMAGE_REPOSITORY_PREFIX/identity-service:$IMAGE_TAG"
deploy_service "$ECS_AUCTION_SERVICE" "$ECS_AUCTION_CONTAINER" "$IMAGE_REPOSITORY_PREFIX/auction-engine:$IMAGE_TAG"
deploy_service "$ECS_QUERY_SERVICE" "$ECS_QUERY_CONTAINER" "$IMAGE_REPOSITORY_PREFIX/query-service:$IMAGE_TAG"
deploy_service "$ECS_WEB_SERVICE" "$ECS_WEB_CONTAINER" "$IMAGE_REPOSITORY_PREFIX/takelow-web:$IMAGE_TAG"

if [[ "$WAIT_FOR_STABLE" == "true" && "$DRY_RUN" == "false" ]]; then
  echo "Waiting for ECS services to become stable..."
  aws ecs wait services-stable \
    --cluster "$ECS_CLUSTER" \
    --services \
      "$ECS_IDENTITY_SERVICE" \
      "$ECS_AUCTION_SERVICE" \
      "$ECS_QUERY_SERVICE" \
      "$ECS_WEB_SERVICE"
fi

echo "ECS deployment completed successfully."