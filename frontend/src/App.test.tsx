import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { App } from './App';

vi.mock('./travelApi', () => ({
  travelApi: {
    currentUser: vi.fn().mockResolvedValue(null),
    onAuthChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    signInWithGoogle: vi.fn(),
    signOut: vi.fn(),
    listTrips: vi.fn().mockResolvedValue([]),
    deleteTrip: vi.fn()
  }
}));

describe('App', () => {
  it('renders Supabase login and trip creation entry points', async () => {
    render(<App />);

    expect(screen.getByText('여행 블로그 초안 자동화')).toBeInTheDocument();
    expect(screen.getByText('여행 기록 생성')).toBeInTheDocument();
    expect(screen.getByText('여행 지역과 여행 날짜는 사진 메타데이터로 자동 설정됩니다.')).toBeInTheDocument();
    expect(await screen.findByText('Google로 로그인')).toBeInTheDocument();
  });
});
