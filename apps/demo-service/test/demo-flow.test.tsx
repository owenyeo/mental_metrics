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
        json: async () => ({ accepted: ['event-1'] }),
      }),
    );
  });

  it('walks through identification and screening actions', async () => {
    render(<DemoFlow />);

    fireEvent.click(screen.getByText('Identify demo user'));
    fireEvent.change(screen.getByLabelText('Distress score'), {
      target: { value: '8' },
    });
    fireEvent.click(screen.getByText('Complete screening'));

    await waitFor(() =>
      expect(screen.getByTestId('demo-status')).toHaveTextContent(
        'Screening completed. Tier result: unwell.',
      ),
    );
  });

  it('supports referral completion flow', async () => {
    render(<DemoFlow />);

    fireEvent.click(screen.getByText('Start referral'));
    fireEvent.click(screen.getByText('Complete referral'));

    await waitFor(() => {
      expect(screen.getByTestId('demo-status')).toHaveTextContent(
        'Referral completed and appointment booked.',
      );
    });
  });
});
