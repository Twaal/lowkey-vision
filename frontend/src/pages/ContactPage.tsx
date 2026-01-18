import React, { useMemo, useState } from 'react';
import { Mail, MapPin } from 'lucide-react';

const ContactPage = () => {
  const [formValues, setFormValues] = useState({
    name: '',
    email: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const isSubmitDisabled = useMemo(() => {
    return isSubmitting || !formValues.name.trim() || !formValues.email.trim();
  }, [formValues.email, formValues.name, isSubmitting]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setToast(null);

    try {
      const response = await fetch('https://formsubmit.co/ajax/lowkey-vision@protonmail.com', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          name: formValues.name,
          email: formValues.email,
          message: formValues.message,
          _subject: 'New early access inquiry from Lowkey Vision site',
          _template: 'table',
        }),
      });

      if (response.ok) {
        setToast({ type: 'success', message: 'Thanks! Your early access request has been sent.' });
        setFormValues({ name: '', email: '', message: '' });
      } else {
        const errorText = await response.text();
        setToast({ type: 'error', message: errorText || 'Unable to submit your request.' });
      }
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Unable to submit your request.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Get in Touch
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            We'd love to discuss how Lowkey Vision
            can accelerate your research and help you achieve your goals.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-8">Let's Connect</h2>
            <p className="text-gray-600 mb-8 leading-relaxed max-w-2xl">
              We're inviting researchers to request exclusive early access to Lowkey Vision. Use
              the form below to share your details, or reach out directly via email. We're happy to
              discuss demos, partnerships, research collaborations, or any questions you have.
            </p>
            <form
              className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-10"
              onSubmit={handleSubmit}
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Request Early Access</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-sm font-medium text-gray-700">Full name</span>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formValues.name}
                    onChange={handleChange}
                    className="mt-2 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
                    placeholder="required"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-gray-700">Email</span>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formValues.email}
                    onChange={handleChange}
                    className="mt-2 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
                    placeholder="you@institution.edu"
                  />
                </label>
                <label className="block md:col-span-2">
                  <span className="text-sm font-medium text-gray-700">Message</span>
                  <textarea
                    name="message"
                    rows={4}
                    value={formValues.message}
                    onChange={handleChange}
                    className="mt-2 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
                    placeholder="Tell us about your research focus and how you'd like to use Lowkey Vision."
                  />
                </label>
              </div>
              <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <p className="text-xs text-gray-500">
                  We will get back to you as soon as possible.
                </p>
                <button
                  type="submit"
                  disabled={isSubmitDisabled}
                  className="inline-flex items-center justify-center rounded-md bg-teal-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting ? 'Sending…' : 'Request Early Access'}
                </button>
              </div>
              {toast && (
                <div
                  className={`mt-4 rounded-md px-4 py-3 text-sm ${toast.type === 'success' ? 'bg-teal-50 text-teal-700' : 'bg-red-50 text-red-700'}`}
                  role="status"
                >
                  {toast.message}
                </div>
              )}
            </form>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Mail className="h-6 w-6 text-teal-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">Email</h3>
                  <p className="text-gray-600">lowkey-vision@protonmail.com</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MapPin className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">Location</h3>
                  <p className="text-gray-600">
                    Gaustadalléen 21,<br />
                    Oslo, 0349<br />
                    Norway
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