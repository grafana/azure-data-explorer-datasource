import React from 'react';

import { act, render, screen } from '@testing-library/react';
import KQLPreview from './KQLPreview';

describe('KQLPreview', () => {
  it('should render the query preview', async () => {
    render(<KQLPreview query="my query" />);
    // hidden by default
    expect(screen.queryByText('my query')).not.toBeVisible();
    await act(() => screen.getByText('show').click());
    expect(screen.queryByText('my query')).toBeVisible();
    // hide it again
    await act(() => screen.getByText('hide').click());
    expect(screen.queryByText('my query')).not.toBeVisible();
  });
});
