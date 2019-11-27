DSNAME=grafana-azure-data-explorer-datasource
all: build

test:
	mkdir -p coverage
	go test ./pkg/... -v -cover -coverprofile=coverage/cover.out
	go tool cover -html=coverage/cover.out -o coverage/coverage.html

vendor:
	GO111MODULE=on go mod vendor

test-in-docker: build-container
	docker run --rm \
	  --network host \
		-v "${PWD}":/go/src/github.com/grafana/${DSNAME}\
		-w /go/src/github.com/grafana/${DSNAME} \
		plugin-builder make test

build:
	GOOS=linux GOARCH=amd64 go build -o ./dist/${DSNAME}_linux_amd64 -a -tags netgo -ldflags '-w' ./pkg

build-darwin:
	GOOS=darwin GOARCH=amd64 go build -o ./dist/${DSNAME}_darwin_amd64 -a -tags netgo -ldflags '-w' ./pkg

build-dev:
	GOOS=linux GOARCH=amd64 go build -o ./dist/${DSNAME}_linux_amd64 ./pkg

build-win:
	GOOS=windows GOARCH=amd64 go build -o ./dist/${DSNAME}_windows_amd64.exe -a -tags netgo -ldflags '-w' ./pkg

build-in-circleci: build-in-circleci-linux build-in-circleci-windows

build-in-circleci-linux:
	GOOS=linux GOARCH=amd64 go build -o /output/${DSNAME}_linux_amd64 -a -tags netgo -ldflags '-w' ./pkg

build-in-circleci-windows:
	CGO_ENABLED=1 GOOS=windows CC=/usr/bin/x86_64-w64-mingw32-gcc \
	PKG_CONFIG_PATH=/usr/lib/pkgconfig_win \
	GOOS=windows GOARCH=amd64 go build -o /output/${DSNAME}_windows_amd64.exe -a -tags netgo -ldflags '-w' ./pkg

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
