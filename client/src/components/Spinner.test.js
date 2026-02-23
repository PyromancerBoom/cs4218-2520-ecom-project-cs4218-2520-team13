//Aashim Mahindroo, A0265890R

//Based on the directions of my user stories and recommended testing methods like equivalence partitioning and boundary value analysis, Github Copilot generates initial test code for this file.
//Then I manually review the code and make necessary adjustments like adjusting mocks and assertions, ensuring test isolation, etc. to ensure accuracy and relevance to the project requirements.

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import Spinner from './Spinner';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: '/current-page' }),
}));

describe('Spinner Logic Tests', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockNavigate.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  //Aashim Mahindroo, A0265890R
  test('Countdown Logic: Decrements count visible to user', () => {
    render(<Spinner />);
    
    expect(screen.getByText(/3 second/i)).toBeInTheDocument();

    act(() => jest.advanceTimersByTime(1000));
    expect(screen.getByText(/2 second/i)).toBeInTheDocument();
  });

  //Aashim Mahindroo, A0265890R
  test('Default Partition: Redirects to /login with state after 3 seconds', () => {
    render(<Spinner />);

    act(() => jest.advanceTimersByTime(3000));

    expect(mockNavigate).toHaveBeenCalledWith('/login', {
      state: '/current-page',
    });
  });

  //Aashim Mahindroo, A0265890R
  test('Custom Partition: Redirects to /{path} prop after 3 seconds', () => {
    render(<Spinner path="dashboard" />);

    act(() => jest.advanceTimersByTime(3000));

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard', {
      state: '/current-page',
    });
  });

  //Aashim Mahindroo, A0265890R
  test('Cleanup Logic: Does not redirect if component unmounts early', () => {
    const { unmount } = render(<Spinner />);

    act(() => jest.advanceTimersByTime(2000));
    
    unmount();

    act(() => jest.advanceTimersByTime(2000));

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});