import React from 'react';

import { render, screen } from '@testing-library/react';
import KQLPreview from './KQLPreview';

describe('KQLPreview', () => {
  it('should render the query preview', () => {
    render(<KQLPreview query="my query" />);
    // hidden by default
    expect(screen.queryByText('my query')).not.toBeVisible();
    screen.getByText('show').click();
    expect(screen.queryByText('my query')).toBeVisible();
    // hide it again
    screen.getByText('hide').click();
    expect(screen.queryByText('my query')).not.toBeVisible();
  });
});
