import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const JupasSelectButton = ({ className = "" }) => {
    const { t } = useTranslation();

    return (
        <Link
            to="/jupaselect"
            className={`block bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow border border-gray-200 ${className}`}
        >
            <div className="flex items-center">
                <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
                    <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                </div>
                <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">{t('userDashboard.manageJupasProgrammes')}</h3>
                    <p className="mt-1 text-sm text-gray-500">
                        {t('userDashboard.manageJupasProgrammesDesc')}
                    </p>
                </div>
            </div>
        </Link>
    );
};

export default JupasSelectButton; 