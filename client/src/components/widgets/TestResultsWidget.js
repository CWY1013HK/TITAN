import React from 'react';
import { useTranslation } from 'react-i18next';

const TestResultsWidget = ({ testResults }) => {
    const { t } = useTranslation();
    if (!testResults) return null;
    return (
        <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3">{t('userDashboard.abilityScores')}</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500">{t('report.numericalReasoning')}</p>
                    <p className="text-lg font-semibold text-gray-900">{testResults.numerical?.toFixed(1)}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500">{t('report.logicalReasoning')}</p>
                    <p className="text-lg font-semibold text-gray-900">{testResults.logical?.toFixed(1)}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500">{t('report.graphicalReasoning')}</p>
                    <p className="text-lg font-semibold text-gray-900">{testResults.graphical?.toFixed(1)}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500">{t('report.verbalReasoning')}</p>
                    <p className="text-lg font-semibold text-gray-900">{testResults.verbal?.toFixed(1)}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500">{t('report.memory')}</p>
                    <p className="text-lg font-semibold text-gray-900">{testResults.memory?.toFixed(1)}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500">{t('report.creativity')}</p>
                    <p className="text-lg font-semibold text-gray-900">{testResults.creativity?.toFixed(1)}</p>
                </div>
            </div>
        </div>
    );
};

export default TestResultsWidget; 