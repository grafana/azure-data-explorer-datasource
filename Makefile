DSNAME=grafana-azure-data-explorer-datasource
GO = GO111MODULE=on go
OS=$(shell go env GOHOSTOS)
ARCH=$(shell go env GOHOSTARCH)
ifeq ($(OS),windows)
  EXT=.exe
else
  EXT=
endif
all: build

test:
	mkdir -p coverage
	go test ./pkg/... -v -cover -coverprofile=coverage/cover.out
	go tool cover -html=coverage/cover.out -o coverage/coverage.html

vendor:
	$(GO) get -u .../pkg
	$(GO) mod vendor

fmt:
	$(GO) fmt .../pkg

test-in-docker: build-container
	docker run --rm \
	  --network host \
		-v "${PWD}":/go/src/github.com/grafana/${DSNAME}\
		-w /go/src/github.com/grafana/${DSNAME} \
		plugin-builder make test

build:
	go build -o ./dist/${DSNAME}_${OS}_${ARCH}${EXT} -a -tags netgo -ldflags '-w' ./pkg

build-dev:
	go build -o ./dist/${DSNAME}_${OS}_${ARCH}${EXT} -a -tags netgo -ldflags ./pkg

build-linux:
	GOOS=linux go build -o ./dist/${DSNAME}_linux_${ARCH}${EXT} -a -tags netgo -ldflags '-w' ./pkg

build-darwin:
	GOOS=darwin go build -o ./dist/${DSNAME}_${OS}_${ARCH}${EXT} -a -tags netgo -ldflags '-w' ./pkg

build-dev:
	go build -o ./dist/${DSNAME}_${OS}_${ARCH}${EXT} ./pkg

build-win:
	go build -o ./dist/${DSNAME}_${OS}_${ARCH}${EXT} -a -tags netgo -ldflags '-w' ./pkg

build-in-circleci: build-in-circleci-linux build-in-circleci-windows

build-in-circleci-linux:
	go build -o /output/${DSNAME}_${OS}_${ARCH}${EXT} -a -tags netgo -ldflags '-w' ./pkg

build-in-circleci-windows:
	CGO_ENABLED=1 GOOS=windows CC=/usr/bin/x86_64-w64-mingw32-gcc \
	PKG_CONFIG_PATH=/usr/lib/pkgconfig_win \
	go build -o /output/${DSNAME}_${OS}_${ARCH}${EXT} -a -tags netgo -ldflags '-w' ./pkg

build-in-docker: build-container
	docker run --rm \
		-v "${PWD}":/go/src/github.com/grafana/${DSNAME} \
		-w /go/src/github.com/grafana/${DSNAME} \
		plugin-builder make build

build-in-docker-win: build-container
	docker run --rm \
		-e "CGO_ENABLED=1" -e "GOOS=windows" \
		-e "CC=/usr/bin/x86_64-w64-mingw32-gcc" -e "PKG_CONFIG_PATH=/usr/lib/pkgconfig_win" \
		-v "${PWD}":/go/src/github.com/grafana/${DSNAME} \
		-w /go/src/github.com/grafana/${DSNAME} \
		plugin-builder make build-win

build-container:
	docker build --tag plugin-builder .

build-container-rebuild:
	docker build --tag plugin-builder --no-cache=true .

.PHONY: vendor
