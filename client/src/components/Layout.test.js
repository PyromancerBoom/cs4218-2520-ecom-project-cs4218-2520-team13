//Aashim Mahindroo, A0265890R

//Based on the directions of my user stories and recommended testing methods like equivalence partitioning and boundary value analysis, Github Copilot generates initial test code for this file.
//Then I manually review the code and make necessary adjustments like adjusting mocks and assertions, ensuring test isolation, etc. to ensure accuracy and relevance to the project requirements.

import React from 'react';
import { render, screen } from '@testing-library/react';
import Layout from './Layout';
import { Helmet } from 'react-helmet';

jest.mock('react-helmet', () => ({
  Helmet: ({ children }) => <div data-testid="helmet-mock">{children}</div>
}));

jest.mock('./Header', () => () => <div data-testid="header" />);
jest.mock('./Footer', () => () => <div data-testid="footer" />);
jest.mock('react-hot-toast', () => ({ Toaster: () => <div /> }));

describe('Layout Logic Tests', () => {

  //Aashim Mahindroo, A0265890R
  test('Partition 1 (Defaults): Should use all defaultProps for SEO when no inputs provided', () => {
    render(<Layout>Content</Layout>);
    
    const helmetContent = screen.getByTestId('helmet-mock');
    
    expect(helmetContent).toHaveTextContent("Ecommerce app - shop now");
    
    expect(helmetContent.querySelector('meta[name="description"][content="mern stack project"]')).toBeInTheDocument();
    expect(helmetContent.querySelector('meta[name="keywords"][content="mern,react,node,mongodb"]')).toBeInTheDocument();
    expect(helmetContent.querySelector('meta[name="author"][content="Techinfoyt"]')).toBeInTheDocument();
  });

  //Aashim Mahindroo, A0265890R
  test('Partition 2 (Custom): Should override ALL SEO defaults when props are provided', () => {
    const customProps = {
      title: "My Custom Title",
      description: "My Desc",
      keywords: "Key, Word",
      author: "Me"
    };

    render(<Layout {...customProps}>Content</Layout>);
    
    const helmetContent = screen.getByTestId('helmet-mock');

    expect(helmetContent).toHaveTextContent("My Custom Title");

    expect(helmetContent.querySelector('meta[name="description"][content="My Desc"]')).toBeInTheDocument();
    expect(helmetContent.querySelector('meta[name="keywords"][content="Key, Word"]')).toBeInTheDocument();
    expect(helmetContent.querySelector('meta[name="author"][content="Me"]')).toBeInTheDocument();
    
    expect(helmetContent.querySelector('meta[name="author"][content="Techinfoyt"]')).not.toBeInTheDocument();
  });

  //Aashim Mahindroo, A0265890R
  test('Wrapper Logic: Should correctly inject children into the main container', () => {
    render(
      <Layout>
        <div data-testid="test-child">I am a child</div>
      </Layout>
    );

    const main = screen.getByRole('main');
    const child = screen.getByTestId('test-child');
    
    expect(main).toContainElement(child);
  });
});