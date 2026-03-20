import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DemoFlow } from '../components/demo-flow';

describe('DemoFlow', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 202,
      }),
    );
  });

  it('routes a user to an endpoint after the intake steps', async () => {
    render(<DemoFlow />);

    fireEvent.click(screen.getByText('Find support now'));
    fireEvent.click(screen.getByText('Next'));
    fireEvent.change(screen.getByRole('slider'), { target: { value: '8' } });
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByLabelText('Move toward professional support or referral'));
    fireEvent.click(screen.getByText('See my support route'));

    await waitFor(() => {
      expect(screen.getByTestId('demo-status')).toHaveTextContent(
        'Endpoint determined: medical_referral.',
      );
    });
  });

  it('completes the self-help endpoint action', async () => {
    render(<DemoFlow />);

    fireEvent.click(screen.getByText('Find support now'));
    fireEvent.click(screen.getByText('Next'));
    fireEvent.change(screen.getByRole('slider'), { target: { value: '2' } });
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByLabelText('Start with self-help tools and resources'));
    fireEvent.click(screen.getByText('See my support route'));

    await waitFor(() => {
      expect(screen.getByText('Open self-help plan')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Open self-help plan'));

    await waitFor(() => {
      expect(screen.getByTestId('demo-status')).toHaveTextContent(
        'Primary endpoint action completed: self_help.',
      );
    });
  });
});
