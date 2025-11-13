import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Microscope, Brain, BarChart3, Shield } from 'lucide-react';
import HeroVideo from '../components/HeroVideo';

const LandingPage = () => {
  return (
    <div className="min-h-screen">
      {/* Video Hero Section */}
      <HeroVideo
        videoSrc="/media/hero-cells.mp4" // PLACE your video under public/media/
        poster="/media/hero-poster.jpg"   // Optional poster image
        heading={<><span className="block text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-cyan-200 to-emerald-300">AI-Powered</span><span className="block">Cell Counting & Analysis</span></>}
        subheading="Turn microscopy images into reliable quantitative data. Fast, accurate, and accessible cell counting for research labs and biotech teams."
  primaryCta={{ label: 'Try Cell Counter YOLOv4', to: '/cell-counting' }}
        secondaryCta={{ label: 'Learn More', to: '/about' }}
      />

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Advanced AI Cell Analysis
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Purpose-built deep learning models and intuitive UX deliver professional-grade quantitative cell analysis.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center group">
              <div className="mx-auto w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mb-6 group-hover:bg-teal-200 transition-colors duration-200">
                <Microscope className="h-8 w-8 text-teal-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">High-Resolution Analysis</h3>
              <p className="text-gray-600 leading-relaxed">
                Process high-resolution images from whole slide scans, PET scans, and more.
              </p>
            </div>

            <div className="text-center group">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6 group-hover:bg-blue-200 transition-colors duration-200">
                <Brain className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">AI-Powered Intelligence</h3>
              <p className="text-gray-600 leading-relaxed">
                State-of-the-art machine learning models trained on extensive medical imaging datasets.
              </p>
            </div>

            <div className="text-center group">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6 group-hover:bg-green-200 transition-colors duration-200">
                <BarChart3 className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Detailed Statistics</h3>
              <p className="text-gray-600 leading-relaxed">
                Comprehensive metrics including cell count, viability, and more.
              </p>
            </div>

            <div className="text-center group">
              <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-6 group-hover:bg-purple-200 transition-colors duration-200">
                <Shield className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Secure & Reliable</h3>
              <p className="text-gray-600 leading-relaxed">
                Secure data handling and automatic file cleanup.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Designed for Research
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Whether you're a startup, university lab, or biotech company, our platform
              provides the tools you need for advanced image analysis.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="bg-white rounded-lg shadow-lg p-8 hover:shadow-xl transition-shadow duration-200">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Research Labs</h3>
                <p className="text-gray-600 mb-6 leading-relaxed">
                Accelerate research with automated, reproducible cell counts across large image batches.
                Ideal for academic institutions and core facilities.
              </p>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-teal-600 rounded-full mr-3"></div>
                  High-throughput batching
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-teal-600 rounded-full mr-3"></div>
                  Reproducible results
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-teal-600 rounded-full mr-3"></div>
                  Export-ready data
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-8 hover:shadow-xl transition-shadow duration-200">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Biotech Startups</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Access enterprise-grade analysis tools without the infrastructure investment.
                Scale your operations as you grow.
              </p>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mr-3"></div>
                  Cost-effective solution
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mr-3"></div>
                  No hardware required
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mr-3"></div>
                  API integration ready
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-8 hover:shadow-xl transition-shadow duration-200">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Clinical Trials</h3>
                <p className="text-gray-600 mb-6 leading-relaxed">
                Standardize quantitative cell metrics across multiple sites with consistent, validated AI models.
              </p>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-green-600 rounded-full mr-3"></div>
                  Standardized protocols
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-green-600 rounded-full mr-3"></div>
                  Multi-site consistency
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-green-600 rounded-full mr-3"></div>
                  Manual override options
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-teal-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Get Accurate Cell Counts?
          </h2>
          <p className="text-xl text-teal-100 mb-8 max-w-2xl mx-auto leading-relaxed">
            Upload a microscopy image and get fast, reproducible cell metrics in seconds.
          </p>
          <Link
            to="/cell-counting"
            className="inline-flex items-center px-8 py-4 bg-white text-teal-600 text-lg font-semibold rounded-lg hover:bg-gray-50 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
          >
            Open Cell Counter YOLOv4
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;