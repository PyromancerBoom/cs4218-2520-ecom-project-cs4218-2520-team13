//Aashim Mahindroo, A0265890R

//Based on the directions of my user stories and recommended testing methods like equivalence partitioning and boundary value analysis, Github Copilot generates initial test code for this file.
//Then I manually review the code and make necessary adjustments like adjusting mocks and assertions, ensuring test isolation, etc. to ensure accuracy and relevance to the project requirements.

import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Footer from './Footer';

const renderFooter = () => {
  return render(
    <BrowserRouter>
      <Footer />
    </BrowserRouter>
  );
};

describe('Footer Component', () => {
  describe('Copyright Text Display', () => {
    //Aashim Mahindroo, A0265890R
    test('should render the copyright text "All Rights Reserved © TestingComp"', () => {
      renderFooter();
      const copyrightText = screen.getByText(/All Rights Reserved © TestingComp/i);
      expect(copyrightText).toBeInTheDocument();
    });

    //Aashim Mahindroo, A0265890R
    test('should render copyright text with "text-center" className', () => {
      renderFooter();
      const copyrightHeading = screen.getByRole('heading', { level: 4 });
      expect(copyrightHeading).toHaveClass('text-center');
    });
  });

  describe('Navigation Links', () => {
    //Aashim Mahindroo, A0265890R
    test('should render About link', () => {
      renderFooter();
      const aboutLink = screen.getByRole('link', { name: /About/i });
      expect(aboutLink).toBeInTheDocument();
    });

    //Aashim Mahindroo, A0265890R
    test('should render Contact link', () => {
      renderFooter();
      const contactLink = screen.getByRole('link', { name: /Contact/i });
      expect(contactLink).toBeInTheDocument();
    });

    //Aashim Mahindroo, A0265890R
    test('should render Privacy Policy link', () => {
      renderFooter();
      const policyLink = screen.getByRole('link', { name: /Privacy Policy/i });
      expect(policyLink).toBeInTheDocument();
    });

    //Aashim Mahindroo, A0265890R
    test('should render all three navigation links (About, Contact, Privacy Policy)', () => {
      renderFooter();
      const links = screen.getAllByRole('link');
      expect(links).toHaveLength(3);
    });
  });

  describe('Link Routes', () => {
    //Aashim Mahindroo, A0265890R
    test('should navigate About link to "/about" route', () => {
      renderFooter();
      const aboutLink = screen.getByRole('link', { name: /About/i });
      expect(aboutLink).toHaveAttribute('href', '/about');
    });

    //Aashim Mahindroo, A0265890R
    test('should navigate Contact link to "/contact" route', () => {
      renderFooter();
      const contactLink = screen.getByRole('link', { name: /Contact/i });
      expect(contactLink).toHaveAttribute('href', '/contact');
    });

    //Aashim Mahindroo, A0265890R
    test('should navigate Privacy Policy link to "/policy" route', () => {
      renderFooter();
      const policyLink = screen.getByRole('link', { name: /Privacy Policy/i });
      expect(policyLink).toHaveAttribute('href', '/policy');
    });
  });

  describe('Footer Layout and Styling', () => {
    //Aashim Mahindroo, A0265890R
    test('should render footer container with "footer" className', () => {
      const { container } = renderFooter();
      const footerDiv = container.querySelector('.footer');
      expect(footerDiv).toBeInTheDocument();
    });

    //Aashim Mahindroo, A0265890R
    test('should render links paragraph with "text-center mt-3" className', () => {
      renderFooter();
      const paragraph = screen.getByText((content, element) => {
        return element.tagName.toLowerCase() === 'p' && element.className.includes('text-center');
      });
      expect(paragraph).toHaveClass('text-center', 'mt-3');
    });

    //Aashim Mahindroo, A0265890R
    test('should render links separated by "|" character', () => {
      renderFooter();
      const paragraph = screen.getByText(/About/i).closest('p');
      expect(paragraph.textContent).toContain('About|Contact|Privacy Policy');
    });
  });

  describe('Component Structure', () => {
    //Aashim Mahindroo, A0265890R
    test('should use Link component from react-router-dom', () => {
      renderFooter();
      const links = screen.getAllByRole('link');
      links.forEach(link => {
        expect(link.tagName).toBe('A');
      });
    });

    //Aashim Mahindroo, A0265890R
    test('should render heading as h4 element', () => {
      renderFooter();
      const heading = screen.getByRole('heading', { level: 4 });
      expect(heading).toBeInTheDocument();
      expect(heading.tagName).toBe('H4');
    });
  });
});
