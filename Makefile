PLAYWRIGHT_VERSION := $(shell awk -F'"' '/"@playwright\/test"/ { print $$4; exit }' package.json)
IMAGE := mcr.microsoft.com/playwright:v$(PLAYWRIGHT_VERSION)-noble
USER_ID := $(shell id -u)
GROUP_ID := $(shell id -g)
RUN := docker run --rm --net=host --ipc=host \
	--user $(USER_ID):$(GROUP_ID) \
	--env HOME=/tmp \
	--volume "$(CURDIR):/work" \
	--workdir /work \
	$(IMAGE)
.PHONY: page lint test
page lint test: package-lock.json
	$(RUN) sh -lc 'npm ci && npm run $@'
package-lock.json: package.json
	$(RUN) npm install --package-lock-only
