import { Chance } from 'chance';
import { ConfigEditorProps } from 'components/ConfigEditor';
import { EditorMode } from 'types';

export const mockConfigEditorProps = (optionsOverrides?: Partial<ConfigEditorProps>): ConfigEditorProps => ({
  options: {
    id: Chance().integer({ min: 0 }),
    orgId: Chance().integer({ min: 0 }),
    name: Chance().word(),
    typeLogoUrl: Chance().url(),
    type: Chance().word(),
    access: Chance().word(),
    url: Chance().url(),
    password: Chance().word(),
    user: Chance().name(),
    database: Chance().word(),
    basicAuth: true,
    basicAuthPassword: Chance().string(),
    basicAuthUser: Chance().name(),
    isDefault: true,
    jsonData: {
      defaultDatabase: Chance().word(),
      minimalCache: Chance().integer({ min: 0 }),
      defaultEditorMode: EditorMode.Raw,
      queryTimeout: Chance().word(),
      dataConsistency: Chance().word(),
      cacheMaxAge: Chance().word(),
      dynamicCaching: true,
      useSchemaMapping: false,
      enableUserTracking: true,
      clusterUrl: Chance().url(),
      tenantId: Chance().guid(),
      clientId: Chance().guid(),
    },
    readOnly: true,
    withCredentials: true,
    secureJsonFields: {
      someAuthStuff: Chance().pickone([true, false]),
    },
  },
  onOptionsChange: jest.fn(),
  ...optionsOverrides,
});
