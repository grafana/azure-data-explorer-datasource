import { ResponseParser } from './response_parser';

describe('ResponseParser', () => {
  it('Parse query responses for metrics', () => {
    const mockedResponse = {
      data: [
        {
          columns: [
            {
              text: 'print_0',
            },
            {
              text: 'print_1',
            },
            {
              text: 'print_2',
            },
          ],
          rows: [['hello', 'doctor', 'name', 'continue', 'yesterday', 'tomorrow']],
          type: 'table',
          refId: 'A',
          meta: {
            KustoError: '',
            RawQuery: "print 'hello', 'doctor', 'name', 'continue', 'yesterday', 'tomorrow'",
            TimeNotASC: false,
          },
        },
      ],
    };

    const mockedParsedResponse = [
      {
        text: 'hello',
      },
      {
        text: 'doctor',
      },
      {
        text: 'name',
      },
      {
        text: 'continue',
      },
      {
        text: 'yesterday',
      },
      {
        text: 'tomorrow',
      },
    ];

    const rp = new ResponseParser();
    const parsedResponse = rp.processVariableQueryResult(mockedResponse);
    expect(parsedResponse).toStrictEqual(mockedParsedResponse);
  });

  it('Parse query responses for metrics', () => {
    const mockedResponse = {
      data: [
        {
          columns: [
            {
              text: 'cheese',
            },
            {
              text: 'cities',
            },
          ],
          rows: [
            ['gouda', 'Paris'],
            ['chedder', 'New York'],
            ['mozza', 'Rome'],
            ['old', 'Warsaw'],
            ['squeaky', 'Montreal'],
          ],
          type: 'table',
          refId: 'A',
          meta: {
            KustoError: '',
            RawQuery: "print 'hello', 'doctor', 'name', 'continue', 'yesterday', 'tomorrow'",
            TimeNotASC: false,
          },
        },
      ],
    };

    const mockedParsedResponse = [
      { text: 'gouda' },
      { text: 'Paris' },
      { text: 'chedder' },
      { text: 'New York' },
      { text: 'mozza' },
      { text: 'Rome' },
      { text: 'old' },
      { text: 'Warsaw' },
      { text: 'squeaky' },
      { text: 'Montreal' },
    ];

    const rp = new ResponseParser();
    const parsedResponse = rp.processVariableQueryResult(mockedResponse);
    expect(parsedResponse).toStrictEqual(mockedParsedResponse);
  });
});
