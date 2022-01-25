## Running e2e tests locally

1. Since the e2e tests needs to set up the datasource, it expects credentials (and any other settings that may be required) in 
`<rootDir>/provisioning/datasources/adx.yaml`. 
2. Symlink or copy `adx.yaml`
3. `yarn install` and build/watch grafana-azure-data-explorer-datasource frontend
4. Run the same version of core Grafana as the target @grafana/e2e version. Example to run v8.2.6 in docker in localhost:3000:
   ```
   docker run --rm  -p 3000:3000 --name=grafana --env GF_PLUGINS_ALLOW_LOADING_UNSIGNED_PLUGINS=grafana-azure-data-explorer-datasource --volume "{path to project}/azure-data-explorer-datasource:/var/lib/grafana/plugins" grafana/grafana:8.2.6
    ```
5. Run one of the e2e scripts in package.json, e.g. `yarn run e2e:open` 