import { Chance } from 'chance';
import { ConfigEditorProps } from 'components/ConfigEditor';
import { EditorMode } from 'types';

export const mockConfigEditorProps = (optionsOverrides?: Partial<ConfigEditorProps>): ConfigEditorProps => ({
  options: {
    uid: '',
    id: Chance().integer({ min: 0 }),
    orgId: Chance().integer({ min: 0 }),
    name: Chance().word(),
    typeLogoUrl: Chance().url(),
    type: Chance().word(),
    access: Chance().word(),
    url: Chance().url(),
    user: Chance().name(),
    database: Chance().word(),
    basicAuth: true,
    basicAuthUser: Chance().name(),
    isDefault: true,
    typeName: '',
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
      application: Chance().word(),
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
