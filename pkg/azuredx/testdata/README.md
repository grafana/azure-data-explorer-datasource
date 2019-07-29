# These are

These come from dumped requests of the Azure Dataexplorer HTTP Rest v1 API.

## File / Statement

### `print_true.json`

```kusto
print true
```

### `supported_types_with_vals.json`

```kusto
print XBool = true,
 XString    = "Grafana",
 XDateTime  = datetime("2006-01-02T22:04:05.1Z"),
 XDynamic   = dynamic([{"person": "Daniel"}, {"cats": 23}, {"diagnosis": "cat problem"}]),
 XGuid      = guid(74be27de-1e4e-49d9-b579-fe0b331d3642),
 XInt       = int(2147483647),
 XLong      = long(9223372036854775807),
 XReal      = real(1.797693134862315708145274237317043567981e+308),
 XTimeSpan  = 1tick
 ```
