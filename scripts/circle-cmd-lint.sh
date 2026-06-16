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

# preferred method for linter install
curl -sfL https://raw.githubusercontent.com/golangci/golangci-lint/master/install.sh| sh -s -- -b $(go env GOPATH)/bin v1.21.0

# use golangci-when possible
exit_if_fail $(go env GOPATH)/bin/golangci-lint run --deadline 10m --disable-all \
  --enable=deadcode\
  --enable=gofmt\
  --enable=ineffassign\
  --enable=structcheck\
  --enable=unconvert\
  --enable=varcheck

exit_if_fail go vet ./pkg/...

exit_if_fail revive -formatter stylish -config ./scripts/revive.toml
