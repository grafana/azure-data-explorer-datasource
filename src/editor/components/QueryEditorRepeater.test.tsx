import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { QueryEditorExpressionType } from '../expressions';
import { QueryEditorRepeater } from './QueryEditorRepeater';

const props = {
  id: 'id',
  value: {
    type: QueryEditorExpressionType.Property,
    expressions: [
      {
        type: QueryEditorExpressionType.And,
      },
    ],
  },
  onChange: jest.fn(),
  children: jest.fn().mockReturnValue(<>hello</>),
};

it('renders the component', async () => {
  render(<QueryEditorRepeater {...props} />);
  expect(screen.getByText('hello')).toBeInTheDocument();
});

it('forward expressions', async () => {
  const onChange = jest.fn();
  const children = jest.fn((props) => <input data-testid="foo" onChange={props.onChange} />);
  render(<QueryEditorRepeater {...props} onChange={onChange} children={children} />);

  const c = await screen.findByTestId('foo');
  fireEvent.change(c, { target: { value: 'bar' } });

  expect(onChange).toHaveBeenCalledTimes(1);
  expect(onChange.mock.calls[0][0].expressions).toHaveLength(1);
});
