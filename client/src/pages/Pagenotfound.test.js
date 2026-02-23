//Aashim Mahindroo, A0265890R

//Based on the directions of my user stories and recommended testing methods like equivalence partitioning and boundary value analysis, Github Copilot generates initial test code for this file.
//Then I manually review the code and make necessary adjustments like adjusting mocks and assertions, ensuring test isolation, etc. to ensure accuracy and relevance to the project requirements.

import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Pagenotfound from './Pagenotfound';
import Layout from './../components/Layout';

jest.mock('./../components/Layout', () => ({ children, title }) => (
  <div data-testid="layout-mock" title={title}>{children}</div>
));

describe('PageNotFound Logic', () => {
  
  //Aashim Mahindroo, A0265890R
  test('Configuration Logic: Passes correct title to Layout', () => {
    render(
      <BrowserRouter>
        <Pagenotfound />
      </BrowserRouter>
    );

    const layout = screen.getByTestId('layout-mock');
    expect(layout).toHaveAttribute('title', 'go back- page not found');
  });

  //Aashim Mahindroo, A0265890R
  test('Navigation Logic: "Go Back" link points to Home ("/")', () => {
    render(
      <BrowserRouter>
        <Pagenotfound />
      </BrowserRouter>
    );

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/');
  });

});