package log

import (
	hclog "github.com/hashicorp/go-hclog"
)

var Print = hclog.New(&hclog.LoggerOptions{
	Name:  "azuredx-datasource",
	Level: hclog.LevelFromString("DEBUG"),
})
