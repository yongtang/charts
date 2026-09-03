PLAYWRIGHT_VERSION := $(shell awk -F'"' '/"@playwright\/test"/ { print $$4; exit }' package.json)
IMAGE := mcr.microsoft.com/playwright:v$(PLAYWRIGHT_VERSION)-noble

.PHONY: apply verify

apply:
	docker run --rm \
		--user "$$(id -u):$$(id -g)" \
		-e HOME=/tmp \
		-v "$$PWD:/work" \
		-w /work \
		$(IMAGE) \
		bash -lc 'npm install --ignore-scripts --cache /tmp/npm && npm run apply'

verify:
	docker run --rm \
		--ipc=host \
		-e CI=1 \
		-v "$$PWD:/src:ro" \
		$(IMAGE) \
		bash -lc 'cp -a /src /work && cd /work && npm ci && npm run verify'
