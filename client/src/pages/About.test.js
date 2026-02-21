//Aashim Mahindroo, A0265890R

//Based on the directions of my user stories and recommended testing methods like equivalence partitioning and boundary value analysis, Github Copilot generates initial test code for this file.
//Then I manually review the code and make necessary adjustments like adjusting mocks and assertions, ensuring test isolation, etc. to ensure accuracy and relevance to the project requirements.

import React from 'react';
import { render } from '@testing-library/react';
import About from './About';
import Layout from './../components/Layout';

jest.mock('./../components/Layout', () => {
  return jest.fn(() => null);
});

describe('About Page Logic', () => {
  
  //Aashim Mahindroo, A0265890R
  test('Configuration Logic: Should pass specific title to Layout wrapper', () => {
    render(<About />);

    expect(Layout).toHaveBeenCalledWith(
      expect.objectContaining({ title: "About us - Ecommerce app" }),
      expect.anything()
    );
  });

});