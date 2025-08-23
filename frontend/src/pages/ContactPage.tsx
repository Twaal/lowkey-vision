import React from 'react';
import { Mail, Phone, MapPin } from 'lucide-react';

const ContactPage = () => {
  // Contact form removed intentionally – currently only displaying static contact information.

  return (
    <div className="min-h-screen bg-gray-50 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Get in Touch
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Ready to transform your image analysis? We'd love to discuss how Low-Key Vision
            can accelerate your research and help you achieve your goals.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-8">Let's Connect</h2>
            <p className="text-gray-600 mb-8 leading-relaxed max-w-2xl">
              We haven't enabled the on-site contact form yet. In the meantime, reach out directly
              via email or phone. We're happy to discuss demos, partnerships, research
              collaborations, or any questions you have.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Mail className="h-6 w-6 text-teal-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">Email</h3>
                  <p className="text-gray-600">info@lowkey-vision.com</p>
                  <p className="text-gray-600">partnerships@lowkey-vision.com</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Phone className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">Phone</h3>
                  <p className="text-gray-600">+1 (555) 123-4567</p>
                  <p className="text-sm text-gray-500">Mon-Fri, 9AM-6PM PST</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MapPin className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">Location</h3>
                  <p className="text-gray-600">
                    123 Innovation Drive<br />
                    San Francisco, CA 94105<br />
                    United States
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-10 pt-8 border-t border-gray-200 max-w-md">
              <h3 className="font-medium text-gray-900 mb-4">Office Hours</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between"><span>Mon - Fri</span><span>9:00 AM - 6:00 PM</span></div>
                <div className="flex justify-between"><span>Saturday</span><span>10:00 AM - 2:00 PM</span></div>
                <div className="flex justify-between"><span>Sunday</span><span>Closed</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Information */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Research Collaboration</h3>
            <p className="text-gray-600 leading-relaxed">
              Interested in collaborating on research projects? We partner with leading institutions
              to advance medical image analysis capabilities.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Custom Solutions</h3>
            <p className="text-gray-600 leading-relaxed">
              Need specialized analysis models or workflows? Our team can develop custom solutions
              tailored to your specific research requirements.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Investment Opportunities</h3>
            <p className="text-gray-600 leading-relaxed">
              Interested in investing in the future of medical AI? Contact us to learn about
              partnership and investment opportunities.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;