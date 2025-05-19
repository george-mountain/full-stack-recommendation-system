build:
	docker compose up --build -d --remove-orphans

up:
	docker compose up -d

up-v:
	docker compose up

down:
	docker compose down

down-v:
	docker compose down -v

status:
	docker ps -a

show-logs:
	docker compose logs

server-logs:
	docker compose logs app


restart:
	docker compose restart

prune:
	docker system prune

remove-images:
	@read -p "WARNING: This will remove all Docker images. Are you sure you want to continue? (y/N) " confirm; \
	if [ "$$confirm" = "y" ] || [ "$$confirm" = "Y" ]; then \
		docker rmi -f $$(docker images -a -q); \
	else \
		echo "Operation canceled."; \
	fi


remove-volumes:
	@read -p "WARNING: This will remove all Docker volumes and data maybe lost. Are you sure you want to continue? (y/N) " confirm; \
	if [ "$$confirm" = "y" ] || [ "$$confirm" = "Y" ]; then \
		docker volume rm $$(docker volume ls -q); \
	else \
		echo "Operation canceled."; \
	fi

stop-container:
	@read -p "Enter the container ID to stop: " container_id; \
	if [ -n "$$container_id" ]; then \
		docker stop $$container_id; \
	else \
		echo "Container ID is required."; \
	fi

remove-container:
	@read -p "Enter the container ID to remove: " container_id; \
	if [ -n "$$container_id" ]; then \
		docker rm $$container_id; \
	else \
		echo "Container ID is required."; \
	fi

install:
	pip install --upgrade pip && \
	pip install -r packages.txt && \
	npm install --save-dev prettier

format:
	find -name '*.py' -exec isort {} + && \
	black --preview . && \
	npx prettier --write "**/*.{js,jsx}"

lint:
	black --check .


test:
	python -m pytest -vv --cov=tests