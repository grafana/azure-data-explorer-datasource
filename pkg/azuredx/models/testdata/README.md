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

### `nulls_in_table.json`

```kusto
print XBool = bool(null),
 XDateTime  = datetime(null),
 XDynamic   = dynamic(null),
 XGuid      = guid(null),
 XInt       = int(null),
 XLong      = long(null),
 XReal      = real(null),
 XTimeSpan  = time(null)
```

### `multi_label_multi_value_time_table.json`

```kusto
range Timestamp from datetime(2000-01-01 00:00:00Z) to datetime(2000-01-01 00:02:00Z) step 30s
  | extend Person = dynamic(["Torkel", "Daniel", "Kyle", "Sofia"])
  | extend Place  = dynamic(["EU",     "EU",     "US",   "EU"])
  | mvexpand Person, Place
  | extend HatInventory = rand(5)
  | extend PetCount     = rand(1)
  | project Timestamp, tostring(Person), tostring(Place), HatInventory, PetCount;
```

### `timeseries_too_many_datetime.json`

```kusto
range Timestamp from datetime(2000-01-01 00:00:00Z) to datetime(2000-01-01 00:02:00Z) step 30s
  | extend Person = dynamic(["Torkel", "Daniel", "Kyle", "Sofia"])
  | extend Place  = dynamic(["EU",     "EU",     "US",   "EU"])
  | mvexpand Person, Place
  | extend HatInventory = rand(5)
  | extend PetCount     = rand(1)
  | extend ADate        = datetime(2000-01-01 00:00:00Z)
  | project Timestamp, tostring(Person), tostring(Place), HatInventory, PetCount, ADate;
```

### `timeseries_no_value.json`

```kusto
range Timestamp from datetime(2000-01-01 00:00:00Z) to datetime(2000-01-01 00:02:00Z) step 30s
  | extend Person = dynamic(["Torkel", "Daniel", "Kyle", "Sofia"])
  | extend Place  = dynamic(["EU",     "EU",     "US",   "EU"])
  | mvexpand Person, Place
  | project Timestamp, tostring(Person), tostring(Place);
```

### `adx_timeseries_multi_label_mulit_value.json`

```kusto
let T = range Timestamp from ago(5m) to now() step 30s
  | extend Person = dynamic(["Torkel", "Daniel", "Kyle", "Sofia"])
  | extend Place  = dynamic(["EU",     "EU",     "US",   "EU"])
  | mvexpand Person, Place
  | extend HatInventory = rand(5)
  | extend PetCount     = rand(1)
  | project Timestamp, tostring(Person), tostring(Place), HatInventory, PetCount;

let Series = T | make-series avg(HatInventory), avg(PetCount) on Timestamp from ago(5m) to now() step 30s by Person, Place;
Series
```

### `adx_timeseries_null_value_column`

Note: The decompose forecast argument number '1' is too low resulting in a null values. When all the values are null,
the object is null in the response.

```kusto
let T = range Timestamp from $__timeFrom to ($__timeTo + -30m) step 1m
  | extend   Person = dynamic(["Torkel", "Daniel", "Kyle", "Sofia"])
  | extend   Place  = dynamic(["EU",     "EU",     "US",   "EU"])
  | mvexpand Person, Place
  | extend   HatInventory = rand(5)
  | project  Timestamp, tostring(Person), tostring(Place), HatInventory;

T | make-series avg(HatInventory) default=double(null) on Timestamp from $__timeFrom to $__timeTo step 1m by Person, Place
  | extend series_decompose_forecast(avg_HatInventory, 1) | project-away *residual, *baseline, *seasonal
```
