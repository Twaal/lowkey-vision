import React from 'react';
import { Microscope, Brain, Users, Target, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const AboutPage = () => {
  return (
    <div className="min-h-screen bg-white py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="text-center mb-20">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Advancing Medical Research Through
            <span className="block text-teal-600">AI-Powered Image Analysis</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
            Low-Key Vision is revolutionizing medical image analysis by making advanced AI tools
            accessible to research labs, biotech startups, and clinical researchers worldwide.
          </p>
        </div>

        {/* Mission Section */}
        <div className="mb-20">
          <div className="bg-gradient-to-br from-teal-50 to-blue-50 rounded-2xl p-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Mission</h2>
                <p className="text-lg text-gray-700 mb-6 leading-relaxed">
                  We believe that groundbreaking medical research shouldn't be limited by access to
                  expensive hardware or complex software. Our cloud-based platform democratizes
                  advanced image analysis, enabling researchers to focus on discovery rather than
                  technical barriers.
                </p>
                <p className="text-lg text-gray-700 leading-relaxed">
                  From tumor segmentation to cell counting and morphological analysis, we're building
                  the comprehensive toolkit that medical researchers need to accelerate their work
                  and drive meaningful clinical outcomes.
                </p>
              </div>
              <div className="flex justify-center">
                <div className="grid grid-cols-2 gap-6">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Target className="h-8 w-8 text-teal-600" />
                    </div>
                    <p className="text-sm font-medium text-gray-700">Precision Analytics</p>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Brain className="h-8 w-8 text-blue-600" />
                    </div>
                    <p className="text-sm font-medium text-gray-700">AI Innovation</p>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Microscope className="h-8 w-8 text-green-600" />
                    </div>
                    <p className="text-sm font-medium text-gray-700">Research Focus</p>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Users className="h-8 w-8 text-purple-600" />
                    </div>
                    <p className="text-sm font-medium text-gray-700">Collaboration</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Technology Section */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Cutting-Edge Technology Stack
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-sm hover:shadow-md transition-shadow duration-200">
                <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center mx-auto mb-6">
                  <Brain className="h-6 w-6 text-teal-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Deep Learning Models</h3>
                <p className="text-gray-600 leading-relaxed">
                  State-of-the-art convolutional neural networks trained on extensive medical
                  imaging datasets for precise tumor detection and segmentation.
                </p>
              </div>
            </div>

            <div className="text-center">
              <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-sm hover:shadow-md transition-shadow duration-200">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-6">
                  <Microscope className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Cloud Infrastructure</h3>
                <p className="text-gray-600 leading-relaxed">
                  Scalable, secure cloud architecture ensuring fast processing times and
                  reliable results for researchers worldwide.
                </p>
              </div>
            </div>

            <div className="text-center">
              <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-sm hover:shadow-md transition-shadow duration-200">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-6">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">User-Centric Design</h3>
                <p className="text-gray-600 leading-relaxed">
                  Intuitive interfaces designed by and for researchers, making complex
                  analysis workflows accessible to users of all technical backgrounds.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Vision Section */}
        <div className="mb-20">
          <div className="bg-gray-50 rounded-2xl p-12">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                Building the Future of Medical Analysis
              </h2>
              <p className="text-lg text-gray-700 max-w-4xl mx-auto mb-8 leading-relaxed">
                Our platform is designed for extensibility and growth. While we're launching with
                tumor segmentation, our architecture supports a wide range of analysis types
                including cell counting, morphological analysis, and custom model integration.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">PET Scan Tumor Segmentation</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Advanced AI models for precise tumor detection, segmentation, and statistical analysis
                  in microscope images.
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm border-2 border-teal-200">
                <h3 className="text-lg font-semibold text-teal-700 mb-3">Trypan Blue Cell Counting</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Automated cell detection and counting across multiple cell types with morphological
                  classification and viability assessment.
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm border-2 border-blue-200">
                <h3 className="text-lg font-semibold text-blue-700 mb-3">Future: Morphology Analysis</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Comprehensive morphological analysis including shape descriptors, texture analysis,
                  and phenotypic characterization.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <div className="bg-teal-600 rounded-2xl p-12 text-white">
            <h2 className="text-3xl font-bold mb-6">
              Ready to Accelerate Your Research?
            </h2>
            <p className="text-xl text-teal-100 mb-8 max-w-2xl mx-auto leading-relaxed">
              Join leading research institutions and biotech companies using Low-Key Vision
              to transform their image analysis workflows.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/tumor-segmentation"
                className="inline-flex items-center px-8 py-4 bg-white text-teal-600 text-lg font-semibold rounded-lg hover:bg-gray-50 transition-all duration-200 shadow-lg"
              >
                Try Our Demo
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center px-8 py-4 border-2 border-white text-white text-lg font-semibold rounded-lg hover:bg-white hover:text-teal-600 transition-all duration-200"
              >
                Get in Touch
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;