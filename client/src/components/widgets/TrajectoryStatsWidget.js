import React from 'react';
import { useTranslation } from 'react-i18next';

const TrajectoryStatsWidget = ({ trajectoryStats, formatDate }) => {
    const { t } = useTranslation();
    if (!trajectoryStats) return null;
    return (
        <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">{t('userDashboard.academicTrajectory')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500">{t('userDashboard.totalEvents')}</p>
                    <p className="text-lg font-semibold text-gray-900">{trajectoryStats.events}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500">{t('userDashboard.totalConnections')}</p>
                    <p className="text-lg font-semibold text-gray-900">{trajectoryStats.connections}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500">{t('userDashboard.lastAnalysis')}</p>
                    <p className="text-lg font-semibold text-gray-900">{formatDate(trajectoryStats.lastAnalysis)}</p>
                </div>
            </div>
        </div>
    );
};

export default TrajectoryStatsWidget; 