# Building and releasing

## How to build the Azure Data Explorer (ADX) data source plugin locally

## Dependencies

Make sure you have the following dependencies installed first:

- [Git](https://git-scm.com/)
- [Go](https://golang.org/dl/) (see [go.mod](../go.mod#L3) for minimum required version)
- [Mage](https://magefile.org/)
- [Node.js (Long Term Support)](https://nodejs.org)
- [Yarn](https://yarnpkg.com)

## Frontend

1. Install dependencies

   ```bash
   yarn install --pure-lockfile
   ```

2. Build plugin in development mode or run in watch mode

   ```bash
   yarn dev
   ```

   or

   ```bash
   yarn watch
   ```

3. Build plugin in production mode

   ```bash
   yarn build
   ```

## Backend

1. Build the backend binaries

   ```bash
   mage -v
   ```

## Build a release for the Azure Data Explorer data source plugin

You need to have commit rights to the GitHub repository to publish a release.

1. Update the version number in the `package.json` file.
2. Update the `CHANGELOG.md` with the changes containted in the release.
3. Commit the changes to master and push to GitHub.
4. Create a release branch locally that follows the convention v(major).(minor).x, leaving the patch as `x`. For example:

   ```bash
   git checkout -b v3.3.x
   ```

5. Push the new branch to GitHub

   ```bash
   git push origin v3.3.x
   ```

6. This triggers the [release pipeline on CircleCI](https://app.circleci.com/pipelines/github/grafana/azure-data-explorer-datasource). There are two steps in the pipeline that need a manual approval to proceed. Find your release build and wait until it reaches the `approve_release` step.
7. Click on the step and choose approve. Then wait until it reaches the `publish_to_gcom` step.
8. Click approve and check that the release is published to [grafana.com](https://grafana.com/grafana/plugins/grafana-azure-data-explorer-datasource).
9. Test the published version of the plugin either locally or on a Hosted Grafana instance.
