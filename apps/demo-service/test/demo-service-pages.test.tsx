import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HomepageContent } from '../components/homepage-content';
import { QuestionnaireContent } from '../components/questionnaire-content';
import { resetDemoJourney } from '../components/demo-tracker';
import { WayfinderContent } from '../components/wayfinder-content';

describe('demo service pages', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    resetDemoJourney();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 202,
        text: vi.fn().mockResolvedValue(''),
      }),
    );
  });

  it('opens urgent support from the homepage', async () => {
    render(<HomepageContent />);

    fireEvent.click(screen.getByText('Open urgent support options'));

    await waitFor(() => {
      expect(screen.getByTestId('homepage-status')).toHaveTextContent(
        'Urgent support options opened',
      );
    });
  });

  it('recommends a professional support route from the wayfinder', async () => {
    render(<WayfinderContent />);

    fireEvent.click(screen.getByText('I think I need professional support'));

    await waitFor(() => {
      expect(screen.getByTestId('wayfinder-status')).toHaveTextContent(
        'Recommended pathway: Professional support.',
      );
    });

    expect(screen.getByText('Move into a referral or appointment pathway')).toBeInTheDocument();
  });

  it('routes a guided questionnaire user to self-help', async () => {
    render(<QuestionnaireContent />);

    fireEvent.click(screen.getByText('Start questionnaire'));

    await waitFor(() => {
      expect(screen.getByText('Next')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Next'));

    await waitFor(() => {
      expect(screen.getByRole('slider')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByRole('slider'), { target: { value: '2' } });
    fireEvent.click(screen.getByText('Next'));

    await waitFor(() => {
      expect(
        screen.getByLabelText('Start with self-help tools and resources'),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText('Start with self-help tools and resources'));
    fireEvent.click(screen.getByText('See my recommendation'));

    await waitFor(() => {
      expect(
        screen.getByText('Start with practical tools you can use right away'),
      ).toBeInTheDocument();
    });
  });
});
