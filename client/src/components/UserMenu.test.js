import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import UserMenu from './UserMenu';

const renderUserMenu = (initialPath = '/') =>
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <UserMenu />
    </MemoryRouter>
  );

describe('UserMenu', () => {
  describe('Structure and content', () => {
    let container;

    beforeEach(() => {
      ({ container } = renderUserMenu());
    });

    // Wei Sheng, A0259272X
    it('renders without crashing', () => {
      expect(container).toBeTruthy();
    });

    // Wei Sheng, A0259272X
    it('displays a "Dashboard" heading', () => {
      expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    });

    // Wei Sheng, A0259272X
    it('renders exactly two navigation links', () => {
      expect(screen.getAllByRole('link')).toHaveLength(2);
    });

    // Wei Sheng, A0259272X
    it('renders Profile link before Orders link', () => {
      const [first, second] = screen.getAllByRole('link');
      expect(first).toHaveTextContent('Profile');
      expect(second).toHaveTextContent('Orders');
    });

    // Wei Sheng, A0259272X
    it('renders expected container structure with text-center and list-group classes', () => {
      expect(container.querySelector('.text-center')).toBeInTheDocument();
      expect(container.querySelector('.list-group')).toBeInTheDocument();
    });
  });

  describe('Navigation link hrefs', () => {
    beforeEach(() => {
      renderUserMenu();
    });

    // Wei Sheng, A0259272X
    test.each([
      ['Profile', '/dashboard/user/profile'],
      ['Orders', '/dashboard/user/orders'],
    ])('%s link points to %s', (name, href) => {
      expect(screen.getByRole('link', { name })).toHaveAttribute('href', href);
    });
  });

  describe('Navigation link CSS classes', () => {
    beforeEach(() => {
      renderUserMenu();
    });

    // Wei Sheng, A0259272X
    test.each([['Profile'], ['Orders']])(
      '%s link has list-group-item and list-group-item-action classes',
      (name) => {
        expect(screen.getByRole('link', { name })).toHaveClass(
          'list-group-item',
          'list-group-item-action'
        );
      }
    );
  });

  describe('Active link state (NavLink)', () => {
    describe('when on /dashboard/user/profile', () => {
      beforeEach(() => {
        renderUserMenu('/dashboard/user/profile');
      });

      // Wei Sheng, A0259272X
      it('Profile link is active and has aria-current="page"', () => {
        const link = screen.getByRole('link', { name: 'Profile' });
        expect(link).toHaveClass('active');
        expect(link).toHaveAttribute('aria-current', 'page');
      });

      // Wei Sheng, A0259272X
      it('Orders link is not active', () => {
        expect(screen.getByRole('link', { name: 'Orders' })).not.toHaveClass('active');
      });
    });

    describe('when on /dashboard/user/orders', () => {
      beforeEach(() => {
        renderUserMenu('/dashboard/user/orders');
      });

      // Wei Sheng, A0259272X
      it('Orders link is active and has aria-current="page"', () => {
        const link = screen.getByRole('link', { name: 'Orders' });
        expect(link).toHaveClass('active');
        expect(link).toHaveAttribute('aria-current', 'page');
      });

      // Wei Sheng, A0259272X
      it('Profile link is not active', () => {
        expect(screen.getByRole('link', { name: 'Profile' })).not.toHaveClass('active');
      });
    });

    describe('when on an unrelated route', () => {
      beforeEach(() => {
        renderUserMenu('/some/other/page');
      });

      // Wei Sheng, A0259272X
      it('no link is active', () => {
        screen.getAllByRole('link').forEach((link) => {
          expect(link).not.toHaveClass('active');
        });
      });
    });
  });
});
