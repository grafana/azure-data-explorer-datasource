# Contributing

## Signed commits are required

> [!IMPORTANT]
> All commits must be [signed](https://docs.github.com/en/authentication/managing-commit-signature-verification/signing-commits) (GPG, SSH, or S/MIME) to be merged into this repository. Pull requests with unsigned commits will need to be re-committed with signatures before they can be merged.

# Building and releasing

## How to build the Azure Data Explorer (ADX) data source plugin locally

## Dependencies

Make sure you have the following dependencies installed first:

- [Git](https://git-scm.com/)
- [Go](https://golang.org/dl/) (see [go.mod](../go.mod#L3) for minimum required version)
- [Mage](https://magefile.org/)
- [Node.js v24](https://nodejs.org)
- [npm](https://npmjs.com)

## Frontend

1. Install dependencies

   ```bash
   npm install
   ```

2. Build plugin in development mode or run in watch mode

   ```bash
   npm run dev
   ```

3. Build plugin in production mode

   ```bash
   npm run build
   ```

## Backend

1. Build the backend binaries

   ```bash
   mage -v
   ```

## Data Source Configuration Schema

`pkg/schema/dsconfig.json` is the **single source of truth** for the data source's
configuration surface — every field a user can set, where it is stored (`root`,
`jsonData`, `secureJsonData`), its type, validation rules and UI hints. It is consumed by
provisioning tooling, documentation and automation.

The schema format is defined and documented by [`grafana/dsconfig`](https://github.com/grafana/dsconfig/tree/main/dsconfig):

- [README](https://github.com/grafana/dsconfig/tree/main/dsconfig#readme) — concepts and a worked example for each field shape (root / jsonData / secret / array / virtual), plus current gaps and limitations.
- [`schema.md`](https://github.com/grafana/dsconfig/blob/main/dsconfig/schema.md) — full property reference.
- [`schema.json`](https://github.com/grafana/dsconfig/blob/main/dsconfig/schema.json) — the JSON Schema `dsconfig.json` validates against. It is pinned via the `$schema` key at the top of our file, so editors autocomplete from it; bump that URL when you bump `github.com/grafana/dsconfig/schema` in `go.mod`.

The rest of this section covers only what is specific to this repository.

### Layout

| File in `pkg/schema/` | Description |
| --------------------- | ----------- |
| `dsconfig.json` | Source of truth — **edit this** |
| `dsconfig_test.go` | Wires the schema into the shared conformance suite; also holds `SecureKeys` |
| `*.gen.json` | Generated artifacts — **never hand-edit**; `npm run build` copies them into `dist/schema/` via `webpack.config.ts` |

### Adding a new settings option

1. **Declare the field** in `pkg/schema/dsconfig.json` under `fields`, and add its `id` to
   the appropriate `groups[].fieldRefs` entry. Field ids follow the `<target>_<key>`
   convention, e.g. `jsonData_clusterUrl`.
2. **Add the matching Go field** to `DatasourceSettings` in `pkg/azuredx/models/settings.go` with a json tag equal
   to the schema `key`. This parity is enforced in both directions — a field in the schema
   but not the struct (or vice versa) fails the test suite. Secrets
   (`target: secureJsonData`) are the exception: they get no struct field, but their key
   must be added to `SecureKeys` in `pkg/schema/dsconfig_test.go`.
3. **Regenerate the artifacts** and commit them with your change:

   ```bash
   go generate ./pkg/schema/...
   ```

4. **Verify**:

   ```bash
   go test ./pkg/schema/...
   ```

This repo does not ship provisioning examples yet, so `settings.examples.gen.json` is
empty. To add them, set `SettingsExamples` on the `schema.PluginUnderTest` value in
`pkg/schema/dsconfig_test.go` — one worked configuration per auth type is the usual
shape. Use placeholders like `REPLACE_WITH_PASSWORD`, never real credentials.

### When the conformance suite fails

Most failures are self-explanatory from the assertion message. The three you are most
likely to hit:

- `SchemaArtifactInSync` — a `.gen.json` file has drifted. Run `go generate ./pkg/schema/...` and commit the result.
- `JSONDataMatchesStruct` / `JSONDataTypesMatchStruct` — the schema and `DatasourceSettings` disagree on keys or types. Update whichever side is behind.
- `SecureValuesMatchLoadSettings` — the schema's `secureJsonData` fields and `SecureKeys` disagree.

## Build a release for the Azure Data Explorer data source plugin

You need to have commit rights to the GitHub repository to publish a release.

1. Update the version number in the `package.json` file.
2. Update the `CHANGELOG.md` by copy and pasting the relevant PRs from [Github's Release drafter interface](https://github.com/grafana/azure-data-explorer-datasource/releases/new) or by running `npm run generate-release-notes`.
3. PR the changes.
4. Once merged, follow the Drone release process that you can find [here](https://github.com/grafana/integrations-team/wiki/Plugin-Release-Process#drone-release-process)
