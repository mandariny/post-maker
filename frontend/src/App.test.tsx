import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { App } from './App';

describe('App', () => {
  it('renders trip creation and upload workflow entry points', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401, statusText: 'Unauthorized' }));

    render(<App />);

    expect(screen.getByText('여행 블로그 초안 자동화')).toBeInTheDocument();
    expect(screen.getByText('여행 기록 생성')).toBeInTheDocument();
    expect(await screen.findByText('Google 로그인')).toBeInTheDocument();
  });
});
