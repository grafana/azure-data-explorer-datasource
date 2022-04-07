## Running e2e tests locally

### 1. Set up credentials file

- Since the e2e tests needs to set up the datasource, it expects credentials (and any other settings that may be required) in 
`<rootDir>/provisioning/datasources/adx.yaml`. 
- Symlink or copy `adx.yaml` with the following layout.

```yaml
apiVersion: 1
datasources:
  -jsonData:
    clientId:
    clusterUrl:
    tenantId:
  secureJsonData:
    clientSecret:
   ```

### 2. Build the frontend

- run `yarn install` 
- run `yarn build` or `yarn watch`

### 3. Build the backend

- run `mage -v`

### 4. Run the correct version of Grafana

- Run the same version of core Grafana as the target @grafana/e2e version. 

Example to run v8.2.6 in docker in localhost:3000, make sure you are running the command from your adx folder, or change `$PWD` for the full path to your `azure-data-explorer-datasource` folder.

```
bash
docker run --rm  -p 3000:3000 --name=grafana --env GF_PLUGINS_ALLOW_LOADING_UNSIGNED_PLUGINS=grafana-azure-data-explorer-datasource --volume "$PWD:/var/lib/grafana/plugins" grafana/grafana:8.2.6
```

### 5. Run the e2e tests
- Run one of the e2e scripts in package.json, e.g. `yarn run e2e:open`

## Troubleshooting

If you run into issues while following these steps, and especially if you already had the plugin installed and built from before, try removing the `node_modules` and `dist` folder and repeating steps 2 and 3. 

Finally, if you have results inconsistent locally and on drone, and if you have permissions, you can check the CI generated mp4: go to google cloud console, select grafanalabs-global project, go to Cloud Storage, plugin-ci bucket and search for the plugin name and the PR number. Finally check the artifacts to see the video executing the e2e tests.
