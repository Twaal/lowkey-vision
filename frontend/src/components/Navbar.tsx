import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, Menu, X, Eye } from 'lucide-react';

const Navbar = () => {
  const [isUseCasesOpen, setIsUseCasesOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const useCases = [
    { name: 'Cell Counter YOLOv4', path: '/cell-counting', available: true },
  ];

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 backdrop-blur-sm bg-white/95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 group">
            <div className="p-2 bg-teal-600 rounded-lg group-hover:bg-teal-700 transition-colors duration-200">
              <Eye className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">LKv</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {/* Use Cases Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsUseCasesOpen(!isUseCasesOpen)}
                className="flex items-center space-x-1 px-3 py-2 text-gray-700 hover:text-teal-600 transition-colors duration-200"
              >
                <span className="font-medium">Use Cases</span>
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isUseCasesOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isUseCasesOpen && (
                <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-10">
                  {useCases.map((useCase, index) => (
                    <div key={index}>
                      {useCase.available ? (
                        <Link
                          to={useCase.path}
                          onClick={() => setIsUseCasesOpen(false)}
                          className="block px-4 py-3 text-gray-700 hover:bg-teal-50 hover:text-teal-600 transition-colors duration-150"
                        >
                          {useCase.name}
                        </Link>
                      ) : (
                        <div className="block px-4 py-3 text-gray-400 cursor-not-allowed">
                          {useCase.name}
                          <span className="text-xs text-gray-400 ml-2">Coming Soon</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Link
              to="/about"
              className={`px-3 py-2 font-medium transition-colors duration-200 ${
                isActive('/about') ? 'text-teal-600' : 'text-gray-700 hover:text-teal-600'
              }`}
            >
              About
            </Link>
            
            <Link
              to="/contact"
              className={`px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors duration-200 font-medium ${
                isActive('/contact') ? 'bg-teal-700' : ''
              }`}
            >
              Contact
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-md text-gray-700 hover:text-teal-600 hover:bg-gray-100 transition-colors duration-200"
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4">
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="font-medium text-gray-900 px-3 py-2">Use Cases</div>
                {useCases.map((useCase, index) => (
                  <div key={index}>
                    {useCase.available ? (
                      <Link
                        to={useCase.path}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="block px-6 py-2 text-gray-700 hover:bg-teal-50 hover:text-teal-600 transition-colors duration-150"
                      >
                        {useCase.name}
                      </Link>
                    ) : (
                      <div className="block px-6 py-2 text-gray-400">
                        {useCase.name}
                        <span className="text-xs text-gray-400 ml-2">Coming Soon</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              <Link
                to="/about"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-3 py-2 text-gray-700 hover:text-teal-600 font-medium transition-colors duration-200"
              >
                About
              </Link>
              
              <Link
                to="/contact"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block mx-3 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors duration-200 font-medium text-center"
              >
                Contact
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Overlay for dropdown */}
      {isUseCasesOpen && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setIsUseCasesOpen(false)}
        />
      )}
    </nav>
  );
};

export default Navbar;