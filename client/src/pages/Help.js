import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FaChevronLeft, FaEnvelope } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import ContactForm from '../components/blocks/ContactForm';

const Help = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [openAccordion, setOpenAccordion] = useState(null);
  const [showContactForm, setShowContactForm] = useState(false);
  const { t } = useTranslation();

  const toggleAccordion = (index) => {
    setOpenAccordion(openAccordion === index ? null : index);
  };

  const faqs = [
    {
      question: t('help.faqs.whatIsEdvise.question'),
      answer: t('help.faqs.whatIsEdvise.answer')
    },
    {
      question: t('help.faqs.howDoesAbilityTestWork.question'),
      answer: t('help.faqs.howDoesAbilityTestWork.answer')
    },
    {
      question: t('help.faqs.whoIsEddy.question'),
      answer: t('help.faqs.whoIsEddy.answer')
    },
    {
      question: t('help.faqs.howAccurateAreRecommendations.question'),
      answer: t('help.faqs.howAccurateAreRecommendations.answer')
    },
    {
      question: t('help.faqs.whatInformationDoINeed.question'),
      answer: t('help.faqs.whatInformationDoINeed.answer')
    },
    {
      question: t('help.faqs.howCanIInterpretScores.question'),
      answer: t('help.faqs.howCanIInterpretScores.answer')
    },
    {
      question: t('help.faqs.canIRetakeTest.question'),
      answer: t('help.faqs.canIRetakeTest.answer')
    },
    {
      question: t('help.faqs.howDoIUseTrajectory.question'),
      answer: t('help.faqs.howDoIUseTrajectory.answer')
    },
    {
      question: t('help.faqs.isMyDataSecure.question'),
      answer: t('help.faqs.isMyDataSecure.answer')
    },
    {
      question: t('help.faqs.howCanIGetSupport.question'),
      answer: t('help.faqs.howCanIGetSupport.answer')
    }
  ];

  return (
    <div className="bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <FaChevronLeft className="mr-2" />
              {t('common.back')}
            </button>
            <h1 className="text-2xl font-semibold text-gray-900">{t('help.title')}</h1>
            <div className="w-8"></div> {/* Spacer for alignment */}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* FAQ Section */}
          <div>
            <h2 className="text-xl font-semibold mb-4">{t('help.faq')}</h2>
            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <div key={index} className="bg-white rounded-lg shadow-sm">
                  <button
                    className="w-full px-6 py-4 text-left focus:outline-none"
                    onClick={() => toggleAccordion(index)}
                  >
                    <div className="flex justify-between items-center">
                      <h2 className="font-roboto text-lg font-medium text-gray-900">
                        {faq.question}
                      </h2>
                      <svg
                        className={`w-5 h-5 text-gray-500 transform transition-transform ${openAccordion === index ? 'rotate-180' : ''
                          }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </button>
                  {openAccordion === index && (
                    <div className="px-6 pb-4">
                      <p className="font-roboto text-gray-600">{faq.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Contact Form Button */}
          <button
            onClick={() => setShowContactForm(true)}
            className="flex items-center justify-center w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
          >
            <FaEnvelope className="mr-2" />
            {t('help.contactButton')}
          </button>
        </div>
      </div>

      {/* Contact Form Modal */}
      <ContactForm
        isOpen={showContactForm}
        onClose={() => setShowContactForm(false)}
      />
    </div>
  );
};

export default Help;
