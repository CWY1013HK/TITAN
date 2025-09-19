import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const Footer = () => {
  const { t } = useTranslation();

  return (
    <footer className="bg-white border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          {/* Logo and Copyright */}
          <div className="flex items-center space-x-4 justify-center md:justify-start w-full md:w-auto">
            <Link to="/" className="font-roboto font-medium flex-shrink-0">
              <img src="/asset/icons/logo-v3.png" alt={t('common.companyLogo')} className="h-12 w-12 mb-1" />
            </Link>
            <p className="text-sm text-gray-500">
              © {new Date().getFullYear()} {t('common.companyName')}{t('common.allRightsReserved')}<a href="https://www.atlab.hku.hk" target="_blank" className="text-blue-600 hover:text-blue-700">{t('common.artsTechnologyLab')}</a>{t('common.supportedBy')}
            </p>
          </div>

          {/* Help Section */}
          <div className="flex items-center justify-between md:justify-end w-full md:w-auto space-x-4 md:space-x-6 px-1 md:px-0">
            <a
              href="mailto:info4edvise@gmail.com"
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              {t('common.contactEmail')}
            </a>
            <Link
              to="/help"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              {t('common.helpCentre')}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer; 