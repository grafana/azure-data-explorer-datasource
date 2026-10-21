#!/bin/bash

function exit_if_fail {
  command=$@
  echo "Executing '$command'"
  eval $command
  rc=$?
  if [ $rc -ne 0 ]; then
      echo "'$command' returned $rc."
      exit $rc
  fi
}

go get -u github.com/mgechev/revive

# Install the version pinned in tools/go.mod (golangci-lint v2.15.0).
exit_if_fail go -C tools install github.com/golangci/golangci-lint/v2/cmd/golangci-lint

# In v2, gofmt is a formatter and unused replaces the retired unused-code linters.
exit_if_fail $(go env GOPATH)/bin/golangci-lint fmt --diff --enable=gofmt ./pkg/...
exit_if_fail $(go env GOPATH)/bin/golangci-lint run --timeout 10m --default none \
  --enable=ineffassign \
  --enable=unconvert \
  --enable=unused ./pkg/...

exit_if_fail go vet ./pkg/...

exit_if_fail revive -formatter stylish -config ./scripts/revive.toml
