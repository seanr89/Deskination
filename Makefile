.DEFAULT_GOAL := help

SHELL := /bin/bash
COMPOSE := docker compose

API_DIR := src/services/booking-api
API_PROJECT := $(API_DIR)/booking-api.csproj
API_TEST_PROJECT := src/services/booking-api.Tests/BookingApi.Tests.csproj
UI_DIR := src/clients/desk-ui

.PHONY: help install build build-api build-ui \
        docker-build up docker-up down docker-down logs docker-logs docker-reset \
        dev dev-docker dev-api dev-ui \
        lint test test-api test-ui test-e2e clean

help: ## Show available Makefile targets
	@echo "Deskination (FlexDesk) — Available Make Targets"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z0-9_-]+:.*##/ { printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

install: ## Restore .NET packages and install frontend npm dependencies
	dotnet restore $(API_PROJECT)
	dotnet restore $(API_TEST_PROJECT)
	cd $(UI_DIR) && npm ci

build: build-api build-ui ## Build both the .NET Booking API and React UI client

build-api: ## Build the .NET 10 Booking API
	dotnet build $(API_PROJECT)

build-ui: ## Type-check and build the React/Vite UI client
	cd $(UI_DIR) && ([ -d node_modules ] || npm ci) && npm run lint && npm run build

docker-build: ## Build Docker Compose service images
	$(COMPOSE) build

up: docker-up ## Alias for docker-up
docker-up: ## Start PostgreSQL and Booking API containers in the background
	$(COMPOSE) up -d --build

down: docker-down ## Alias for docker-down
docker-down: ## Stop and remove all Docker Compose containers
	$(COMPOSE) --profile dev down

logs: docker-logs ## Alias for docker-logs
docker-logs: ## Tail Docker Compose logs for running services
	$(COMPOSE) --profile dev logs -f

docker-reset: ## Stop containers and remove persisted database volumes
	$(COMPOSE) --profile dev down -v

dev: ## Run PostgreSQL + Booking API via Docker Compose and desk-ui locally in dev mode
	@set -e; \
	cleanup() { \
		echo ""; \
		echo "Stopping Docker Compose dev services..."; \
		$(COMPOSE) stop postgres booking-api >/dev/null 2>&1 || true; \
	}; \
	trap cleanup EXIT INT TERM; \
	$(COMPOSE) up -d --build postgres booking-api; \
	echo "Booking API available at http://localhost:$${BOOKING_API_PORT:-8080}"; \
	echo "Starting FlexDesk UI dev server at http://localhost:3000..."; \
	cd $(UI_DIR) && ([ -d node_modules ] || npm ci) && npm run dev

dev-docker: ## Run the full stack (postgres, booking-api, desk-ui) inside Docker Compose
	$(COMPOSE) --profile dev up --build

dev-api: ## Run PostgreSQL and Booking API via Docker Compose in the foreground
	$(COMPOSE) up --build postgres booking-api

dev-ui: ## Run the React/Vite UI client dev server locally
	cd $(UI_DIR) && ([ -d node_modules ] || npm ci) && npm run dev

lint: ## Run TypeScript type checks and .NET build verification
	cd $(UI_DIR) && ([ -d node_modules ] || npm ci) && npm run lint
	dotnet build $(API_PROJECT) --no-restore

test: test-api test-ui test-e2e ## Run all backend integration, frontend unit, and Playwright E2E tests

test-api: ## Run .NET xUnit integration tests for booking-api
	dotnet test $(API_TEST_PROJECT)

test-ui: ## Run Vitest unit tests for desk-ui
	cd $(UI_DIR) && ([ -d node_modules ] || npm ci) && npm test

test-e2e: ## Run Playwright end-to-end tests for desk-ui
	cd $(UI_DIR) && ([ -d node_modules ] || npm ci) && npm run test:e2e

clean: ## Remove .NET build outputs and frontend dist directory
	dotnet clean $(API_PROJECT)
	dotnet clean $(API_TEST_PROJECT)
	rm -rf $(UI_DIR)/dist
