import React, { useState, useEffect } from 'react';
import { useAuth, isNotPresenter } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import Papa from 'papaparse';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { useTranslation } from 'react-i18next';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const Presentation = () => {
  const { currentUser } = useAuth();
  const [csvData, setCsvData] = useState({
    jupasFactors: [],
    jupasDecisionTime: [],
    dseDecisionTime: [],
    dseFactors: []
  });
  const { t } = useTranslation();

  // Unified function to get translated labels for any field
  const getTranslatedLabel = (field) => {
    // DSE subject codes (from the CSV)
    const dseSubjects = {
      'Biology': 'BIO',
      'Business, Accounting and Financial Studies (BAFS)': 'BAF',
      'Chemistry': 'CHE',
      'Chinese History': 'CHH',
      'Chinese Literature': 'CHL',
      'Design and Applied Technology': 'DAT',
      'Economics': 'ECO',
      'Ethnic and Religious Studies': 'ERS',
      'Geography': 'GEO',
      'Health Management and Social Care': 'HSC',
      'History': 'HIS',
      'Information and Communication Technology': 'ICT',
      'Literature in English': 'LIE',
      'Mathematics Extended Part Module 1 (Calculus and Statistics)': 'MEP',
      'Mathematics Extended Part Module 2 (Algebra and Calculus)': 'MEP',
      'Music': 'MUS',
      'Physical Education': 'PHE',
      'Physics': 'PHY',
      'Technology and Living': 'TNL',
      'Tourism and Hospitality Studies': 'THS',
      'Visual Arts': 'VSA'
    };

    // JUPAS area mapping
    const jupasAreas = {
      'Arts and Humanities': 'artsAndHumanities',
      'Social Sciences': 'socialSciences',
      'Natural Sciences': 'naturalSciences',
      'Medical Sciences and Dentistry': 'medicalSciencesAndDentistry',
      'Engineering (excluding Computer Science)': 'engineeringExcludingComputerScience',
      'Mathematics and Computer Science': 'mathematicsAndComputerScience',
      'Architecture and Built Environment': 'architectureAndBuiltEnvironment',
      'Design, Media, and Digital Technologies': 'designMediaAndDigitalTechnologies',
      'Business and Economics': 'businessAndEconomics',
      'Law and Legal Studies': 'lawAndLegalStudies',
      'Education': 'education'
    };

    // Form/Time period mapping
    const timePeriods = {
      'Early Form 1': 'earlyForm1',
      'Late Form 1': 'lateForm1',
      'Early Form 2': 'earlyForm2',
      'Late Form 2': 'lateForm2',
      'Early Form 3': 'earlyForm3',
      'Late Form 3': 'lateForm3',
      'Early Form 4': 'earlyForm4',
      'Late Form 4': 'lateForm4',
      'Early Form 5': 'earlyForm5',
      'Late Form 5': 'lateForm5',
      'Early Form 6': 'earlyForm6',
      'Late Form 6': 'lateForm6',
      'Before Form 4': 'beforeForm4',
      'Form 4': 'form4',
      'Fom 4': 'form4',
      'After Taking the HKDSE': 'afterTakingHKDSE',
      'After the Release of HKDSE Results': 'afterReleaseOfHKDSE'
    };

    // Factor mapping (for DSE/JUPAS factors)
    const factors = {
      'I found it enjoyable.': 'enjoyability',
      'I found it less unenjoyable than other electives.': 'enjoyability',
      'I found it easy.': 'ease',
      'I heard that it is easy (to score well).': 'ease',
      'I thought that it can lead to my dream career.': 'dreamCareer',
      'I thought that it can lead to financially/socially better careers.': 'careerProspect',
      'I found it relevant to my extracurricular passions.': 'interest',
      'My teacher(s) recommended it to me.': 'teacherRecommendation',
      'This is included in my preferred school elective package.': 'programmeContent',
      'My parents recommended it to me.': 'parentalExpectation',
      'Other reasons': 'other',
      'I wanted to study it with my friends.': 'peerInfluence',
      'My parents chose it for me.': 'parentalExpectation',
      'My social circle consists of relevant connection(s) and/or inspirational figure(s).': 'peerInfluence',
      'I found it less unenjoyable than other disciplines.': 'enjoyability',
      'I found its curriculum flexible.': 'programmeContent',
      'This was the best offer I could get based on my HKDSE results.': 'admissionChance',
      'I messed up my JUPAS prioritisation strategy.': 'jupasPrioritisationStrategy',
      'This was the best offer I could get from my desired tertiary education institution.': 'admissionChance',
      'I heard that it is easy.': 'ease'
    };

    // Check if it's a DSE subject
    if (dseSubjects[field]) {
      return t(`dseSubjects.${dseSubjects[field]}`);
    }

    // Check if it's a JUPAS area
    if (jupasAreas[field]) {
      return t(`presentation.${jupasAreas[field]}`);
    }

    // Check if it's a time period
    if (timePeriods[field]) {
      return t(`presentation.${timePeriods[field]}`);
    }

    // Check if it's a factor
    if (factors[field]) {
      return t(`presentation.${factors[field]}`);
    }

    // If no mapping found, return the original field name
    return field;
  };

  useEffect(() => {
    // Load all CSV files
    const loadCSVFiles = async () => {
      try {
        const files = [
          { name: 'jupasFactors', path: '/asset/stats/JUPAS Factors Rel Imp.csv' },
          { name: 'jupasDecisionTime', path: '/asset/stats/JUPAS Decision Time.csv' },
          { name: 'dseDecisionTime', path: '/asset/stats/DSE Decision Time.csv' },
          { name: 'dseFactors', path: '/asset/stats/DSE Factors Rel Imp.csv' }
        ];

        for (const file of files) {
          const response = await fetch(file.path);
          const text = await response.text();
          Papa.parse(text, {
            header: true,
            complete: (results) => {
              // Filter out empty rows and convert numeric values
              const filteredData = results.data
                .filter(row => Object.values(row).some(val => val && val.trim() !== ''))
                .map(row => {
                  const processedRow = {};
                  Object.entries(row).forEach(([key, value]) => {
                    // Convert numeric values
                    processedRow[key] = !isNaN(value) ? parseFloat(value) : value;
                  });
                  return processedRow;
                });

              setCsvData(prev => ({
                ...prev,
                [file.name]: filteredData
              }));
            }
          });
        }
      } catch (error) {
        console.error('Error loading CSV files:', error);
      }
    };

    loadCSVFiles();
  }, []);

  // Additional protection at component level
  if (!currentUser || isNotPresenter(currentUser)) {
    return <Navigate to="/" replace />;
  }

  const renderBarChart = (data, titleKey, xField, yField, sortBy = yField) => {
    if (!data.length) return null;

    // Sort data by specified field in descending order
    const sortedData = [...data].sort((a, b) => b[sortBy] - a[sortBy]);

    const chartData = {
      labels: sortedData.map(row => getTranslatedLabel(row[xField])),
      datasets: [
        {
          label: t('presentation.averageRatedImportance'),
          data: sortedData.map(row => row[yField]),
          backgroundColor: 'rgba(59, 130, 246, 0.5)',
          borderColor: 'rgb(59, 130, 246)',
          borderWidth: 1,
          yAxisID: 'y',
        },
        {
          label: t('presentation.count'),
          data: sortedData.map(row => row['Count']),
          backgroundColor: 'rgba(16, 185, 129, 0.5)',
          borderColor: 'rgb(16, 185, 129)',
          borderWidth: 1,
          yAxisID: 'y1',
        }
      ],
    };

    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
        },
      },
      scales: {
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: {
            display: true,
            text: t('presentation.averageRatedImportance')
          }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          title: {
            display: true,
            text: t('presentation.count')
          },
          grid: {
            drawOnChartArea: false,
          },
        }
      }
    };

    return (
      <div className="bg-white rounded-lg shadow-sm p-6 pb-16 h-96">
        <h3 className="text-2xl font-semibold text-gray-900 mb-4">{t(`presentation.${titleKey}`)}</h3>
        <Bar data={chartData} options={chartOptions} />
      </div>
    );
  };

  const renderLineChart = (data, titleKey) => {
    if (!data.length) return null;

    // Get all unique fields (excluding 'Time')
    const fields = Object.keys(data[0]).filter(key => key !== 'Time');

    // Calculate totals for each time period (only for JUPAS)
    const totals = titleKey.includes('jupasDecisionTime') ? data.map(row => {
      let sum = 0;
      fields.forEach(field => {
        sum += row[field] || 0;
      });
      return sum;
    }) : null;

    const chartData = {
      labels: data.map(row => getTranslatedLabel(row.Time)),
      datasets: [
        // Add total line only for JUPAS
        ...(titleKey.includes('jupasDecisionTime') ? [{
          label: t('presentation.totalDecisions'),
          data: totals,
          borderColor: 'rgb(0, 0, 0)',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          borderWidth: 2,
          borderDash: [5, 5],
          tension: 0.1,
        }] : []),
        // Add subject area lines
        ...fields.map((field, index) => {
          const colors = [
            'rgb(59, 130, 246)',
            'rgb(16, 185, 129)',
            'rgb(245, 158, 11)',
            'rgb(239, 68, 68)',
            'rgb(139, 92, 246)',
            'rgb(236, 72, 153)',
            'rgb(20, 184, 166)',
            'rgb(249, 115, 22)',
            'rgb(220, 38, 38)',
            'rgb(124, 58, 237)',
            'rgb(219, 39, 119)'
          ];

          return {
            label: getTranslatedLabel(field),
            data: data.map(row => row[field]),
            borderColor: colors[index % colors.length],
            backgroundColor: colors[index % colors.length].replace('rgb', 'rgba').replace(')', ', 0.5)'),
            tension: 0.1,
          };
        }),
      ],
    };

    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
        },
      },
      scales: {
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: {
            display: true,
            text: titleKey.includes('DecisionTime') ? t('presentation.numberOfRespondents') : t('presentation.averageRatedImportance')
          }
        }
      }
    };

    return (
      <div className="bg-white rounded-lg shadow-sm p-6 pb-16 h-96">
        <h3 className="text-2xl font-semibold text-gray-900 mb-4">{t(`presentation.${titleKey}`)}</h3>
        <Line data={chartData} options={chartOptions} />
      </div>
    );
  };

  return (
    <div className="bg-gray-50">
      {/* Welcome Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            EDVise
          </h1>
          <p className="text-xl mt-2 text-gray-600">
            {t('presentation.streamliningLifeImpactingDecisions')}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <p className="text-gray-900 text-xl">
            <span className="font-bold text-2xl text-blue-800">{t('presentation.twentyFourPercent')}</span> {t('presentation.ofStudentsAreDissatisfied')}
          </p>
        </div>

        {/* Statistics Section */}
        <div className="space-y-8 mb-8">
          {/* DSE Section */}
          {renderBarChart(csvData.dseFactors, 'dseFactorsRelativeImportance', 'Variable', 'Average')}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">{t('presentation.dseFactorsKeyFindings')}</h3>
              <p className="text-gray-900 text-xl">
                <span className="font-bold text-2xl text-blue-800">{t('presentation.enjoyability')}</span> {t('presentation.mostImportantFactor')} <span className="font-bold text-2xl text-blue-800">80.86</span> {t('presentation.outOf100')}.
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">{t('presentation.dseDecisionTimeKeyFindings')}</h3>
              <p className="text-gray-900 text-xl">
                <span className="font-bold text-2xl text-blue-800">{t('presentation.formThree')}</span> {t('presentation.criticalDecisionMakingPeriod')}
              </p>
            </div>
          </div>
          {renderLineChart(csvData.dseDecisionTime, 'dseDecisionTimeBySubjectArea')}

          {/* JUPAS Section */}
          {renderBarChart(csvData.jupasFactors, 'jupasFactorsRelativeImportance', 'Variable', 'Average', 'Count')}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">{t('presentation.jupasFactorsKeyFindings')}</h3>
              <p className="text-gray-900 text-xl">
                <span className="font-bold text-2xl text-blue-800">{t('presentation.fortyNinePercent')}</span> {t('presentation.ofStudentsStillConsider')} <span className="font-bold text-2xl text-blue-800">{t('presentation.enjoyability')}</span> {t('presentation.asSignificantFactor')}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">{t('presentation.jupasDecisionTimeKeyFindings')}</h3>
              <p className="text-gray-900 text-xl">
                {t('presentation.dseDecisionsMade')} <span className="font-bold text-2xl text-blue-800">{t('presentation.differentTimes')}</span>{t('presentation.showingThat')} <span className="font-bold text-2xl text-blue-800">{t('presentation.anytimeCanBeRightTime')}</span> {t('presentation.toDecideYourFuture')}
              </p>
            </div>
          </div>
          {renderLineChart(csvData.jupasDecisionTime, 'jupasDecisionTimeBySubjectArea')}
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <p className="text-gray-900 text-xl">
            {t('presentation.comprehensiveReflectiveExperience')}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <p className="text-gray-900 text-xl">
            {t('presentation.thisWebappBuiltWith')} <span className="font-bold text-2xl text-blue-800">{t('presentation.cursor')}</span> {t('presentation.likeOurService')} <span className="font-bold text-2xl text-blue-800">{t('presentation.aHolisticOverview')}</span>
          </p>
        </div>

        {/* QR Code Section */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex-shrink-0 mb-6 md:mb-0 md:mr-8">
              <img src="/asset/images/QRCode.svg" alt={t('common.edviseQrCode')} className="h-64 w-64" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('presentation.tryEdviseNow')}</h2>
              <p className="text-gray-600 mb-6">
                {t('presentation.scanQrCode')}
              </p>
              <div className="flex space-x-4">
                <a
                  href="/register"
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  {t('common.getStarted')}
                </a>
                <a
                  href="/help"
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-blue-600 bg-white hover:bg-gray-50"
                >
                  {t('common.learnMore')}
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Presentation; 
