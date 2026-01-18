import React from 'react';
import { Microscope, Brain, Users, Target, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const AboutPage = () => {
  return (
    <div className="min-h-screen bg-white py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-20">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Focused Cell Analytics For
            <span className="block text-teal-600">Immortal Cell Lines</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
            Lowkey Vision delivers fast, precise, and reproducible cell counting and viability analysis
            for common immortal cell lines like HeLa, HEK293, CHO, and Jurkat, eliminating manual tallies
            and spreadsheet fatigue.
          </p>
        </div>

        <div className="mb-20">
          <div className="bg-gradient-to-br from-teal-50 to-blue-50 rounded-2xl p-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Mission</h2>
                <p className="text-lg text-gray-700 mb-6 leading-relaxed">
                  Automate routine microscopy quantification so scientists can think instead of tally.
                  We remove friction in viability checks for high-usage cell lines.
                </p>
                <p className="text-lg text-gray-700 leading-relaxed">
                  Starting with robust Trypan blue exclusion counting, we are expanding toward
                  morphology-aware metrics (cell size, circularity), colony detection, and label‑free
                  viability estimation, always emphasizing reproducibility and transparency.
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

        <div className="mb-20">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Purpose-Built Stack For Cell Quantification
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-sm hover:shadow-md transition-shadow duration-200">
                <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center mx-auto mb-6">
                  <Brain className="h-6 w-6 text-teal-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Detection & Viability Models</h3>
                <p className="text-gray-600 leading-relaxed">
                  Detect and classify suspension cells with high accuracy.
                </p>
              </div>
            </div>

            <div className="text-center">
              <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-sm hover:shadow-md transition-shadow duration-200">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-6">
                  <Microscope className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Cloud Processing</h3>
                <p className="text-gray-600 leading-relaxed">
                  GPU-backed workers to complete the task in
                  seconds without local setup.
                </p>
              </div>
            </div>

            <div className="text-center">
              <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-sm hover:shadow-md transition-shadow duration-200">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-6">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Researcher UX</h3>
                <p className="text-gray-600 leading-relaxed">
                  Fast in-browser annotation, and exportable audit trails.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-20">
          <div className="bg-gray-50 rounded-2xl p-12">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                Roadmap For Quantitative Cell Biology
              </h2>
              <p className="text-lg text-gray-700 max-w-4xl mx-auto mb-8 leading-relaxed">
                Extensible modular services enable rapid addition of analysis modes: multi-stain
                viability fusion, morphology statistics, colony / spheroid detection, confluent area
                tracking, and temporal growth curves.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Immortal Cell Line Counting</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Robust detection & viability on HeLa, HEK293, CHO, Jurkat and similar lines with
                  stain-aware preprocessing and batch automation.
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm border-2 border-teal-200">
                <h3 className="text-lg font-semibold text-teal-700 mb-3">Trypan Blue Viability</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Automated alive / dead detection with per-class counts, viability %, and exportable
                  QC metrics for notebook integration.
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm border-2 border-blue-200">
                <h3 className="text-lg font-semibold text-blue-700 mb-3">Upcoming: Dye-free viability</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Using deep learning to estimate cell viability from brightfield images alone,
                  eliminating the need for dyes.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center">
          <div className="bg-teal-600 rounded-2xl p-12 text-white">
            <h2 className="text-3xl font-bold mb-6">
              Ready to Accelerate Your Research?
            </h2>
            <p className="text-xl text-teal-100 mb-8 max-w-2xl mx-auto leading-relaxed">
              Join leading research institutions and biotech companies using Lowkey Vision
              to transform their image analysis workflows.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/cell-counting-v8"
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