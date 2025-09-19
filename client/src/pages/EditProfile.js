import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import DBTable from "../handlers/DatabaseHandler";
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

function EditProfile() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    Title: '',
    First_Name: '',
    Last_Name: '',
    Nickname: '',
    Gender: '',
    Email_Address: '',
    Tel: '',
    School_Name: '',
    School_District: '',
    Form: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const hasLoadedDataRef = useRef(false);

  const userTable = new DBTable(
    "USER",
    "User_ID",
    {
      User_ID: "",
      First_Name: "",
      Last_Name: "",
      Nickname: "",
      Title: "",
      Gender: "",
      Email_Address: "",
      Tel: "",
      User_Role: "",
      School_Name: "",
      School_District: "",
      Form: "",
      direct_marketing: false,
      email_list: false,
      card_id: "",
      ability_6d: [1.5, 1.5, 1.5, 1.5, 1.5, 1.5]
    }
  );

  useEffect(() => {
    const loadUserData = async () => {
      try {
        if (!currentUser || !currentUser.User_ID) {
          setError(t('errors.loginRequired'));
          return;
        }

        // Check if we've already loaded data for this user
        if (hasLoadedDataRef.current === currentUser.User_ID) {
          return;
        }

        const userData = await userTable.handleRead({ User_ID: currentUser.User_ID }, false);

        if (userData) {
          setFormData({
            Title: userData.Title || '',
            First_Name: userData.First_Name || '',
            Last_Name: userData.Last_Name || '',
            Nickname: userData.Nickname || '',
            Gender: userData.Gender || '',
            Email_Address: userData.Email_Address || '',
            Tel: userData.Tel || '',
            School_Name: userData.School_Name || '',
            School_District: userData.School_District || '',
            Form: userData.Form || ''
          });

          // Mark that we've loaded data for this user
          hasLoadedDataRef.current = currentUser.User_ID;
        }
      } catch (error) {
        setError(t('errors.failedToLoadData'));
      }
    };

    if (currentUser?.User_ID) {
      loadUserData();
    } else {
      // Reset the ref when user is not available
      hasLoadedDataRef.current = false;
    }
  }, [currentUser?.User_ID]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (!currentUser || !currentUser.User_ID) {
        setError(t('errors.loginRequired'));
        return;
      }

      const userData = {
        User_ID: currentUser.User_ID,
        ...formData,
        needs_recommendation_regeneration: true
      };

      const result = await userTable.handleWrite(userData, false);
      if (result) {
        setSuccess("Profile updated successfully!");
        setTimeout(() => {
          navigate('/view-report');
        }, 1500);
      }
    } catch (error) {
      setError(t('errors.failedToUpdateData'));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-6">
              {t('common.editProfile')}
            </h3>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded">
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="Title" className="block text-sm font-medium text-gray-700">
                    {t('common.title')}
                  </label>
                  <select
                    id="Title"
                    name="Title"
                    value={formData.Title}
                    onChange={handleChange}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  >
                    <option value="">{t('common.selectTitle')}</option>
                    <option value="Mr.">{t('report.mr')}</option>
                    <option value="Ms.">{t('report.ms')}</option>
                    <option value="Mrs.">{t('report.mrs')}</option>
                    <option value="Dr.">{t('report.dr')}</option>
                    <option value="Prof.">{t('report.prof')}</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="First_Name" className="block text-sm font-medium text-gray-700">
                    {t('common.firstName')}
                  </label>
                  <input
                    type="text"
                    name="First_Name"
                    id="First_Name"
                    value={formData.First_Name}
                    onChange={handleChange}
                    className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label htmlFor="Last_Name" className="block text-sm font-medium text-gray-700">
                    {t('common.lastName')}
                  </label>
                  <input
                    type="text"
                    name="Last_Name"
                    id="Last_Name"
                    value={formData.Last_Name}
                    onChange={handleChange}
                    className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label htmlFor="Nickname" className="block text-sm font-medium text-gray-700">
                    {t('common.nickname')}
                  </label>
                  <input
                    type="text"
                    name="Nickname"
                    id="Nickname"
                    value={formData.Nickname}
                    onChange={handleChange}
                    className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label htmlFor="Gender" className="block text-sm font-medium text-gray-700">
                    {t('common.gender')}
                  </label>
                  <select
                    id="Gender"
                    name="Gender"
                    value={formData.Gender}
                    onChange={handleChange}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  >
                    <option value="">{t('common.selectGender')}</option>
                    <option value="Male">{t('common.male')}</option>
                    <option value="Female">{t('common.female')}</option>
                    <option value="Other">{t('common.other')}</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="Email_Address" className="block text-sm font-medium text-gray-700">
                    {t('common.email')}
                  </label>
                  <input
                    type="email"
                    name="Email_Address"
                    id="Email_Address"
                    value={formData.Email_Address}
                    onChange={handleChange}
                    className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label htmlFor="Tel" className="block text-sm font-medium text-gray-700">
                    {t('common.phone')}
                  </label>
                  <input
                    type="tel"
                    name="Tel"
                    id="Tel"
                    value={formData.Tel}
                    onChange={handleChange}
                    className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label htmlFor="School_Name" className="block text-sm font-medium text-gray-700">
                    {t('common.schoolName')}
                  </label>
                  <input
                    type="text"
                    name="School_Name"
                    id="School_Name"
                    value={formData.School_Name}
                    onChange={handleChange}
                    className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label htmlFor="School_District" className="block text-sm font-medium text-gray-700">
                    {t('common.schoolDistrict')}
                  </label>
                  <select
                    id="School_District"
                    name="School_District"
                    value={formData.School_District}
                    onChange={handleChange}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  >
                    <option value="">{t('common.selectSchoolDistrict')}</option>
                    <option value="centralAndWestern">{t('common.districts.centralAndWestern')}</option>
                    <option value="eastern">{t('common.districts.eastern')}</option>
                    <option value="southern">{t('common.districts.southern')}</option>
                    <option value="wanChai">{t('common.districts.wanChai')}</option>
                    <option value="kowloonCity">{t('common.districts.kowloonCity')}</option>
                    <option value="wongTaiSin">{t('common.districts.wongTaiSin')}</option>
                    <option value="yauTsimMong">{t('common.districts.yauTsimMong')}</option>
                    <option value="shamShuiPo">{t('common.districts.shamShuiPo')}</option>
                    <option value="islands">{t('common.districts.islands')}</option>
                    <option value="kwaiTsing">{t('common.districts.kwaiTsing')}</option>
                    <option value="north">{t('common.districts.north')}</option>
                    <option value="saiKung">{t('common.districts.saiKung')}</option>
                    <option value="shaTin">{t('common.districts.shaTin')}</option>
                    <option value="taiPo">{t('common.districts.taiPo')}</option>
                    <option value="tsuenWan">{t('common.districts.tsuenWan')}</option>
                    <option value="tuenMun">{t('common.districts.tuenMun')}</option>
                    <option value="yuenLong">{t('common.districts.yuenLong')}</option>
                    <option value="kwunTong">{t('common.districts.kwunTong')}</option>
                    <option value="other">{t('common.districts.other')}</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="Form" className="block text-sm font-medium text-gray-700">
                    {t('common.form')}
                  </label>
                  <select
                    id="Form"
                    name="Form"
                    value={formData.Form}
                    onChange={handleChange}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  >
                    <option value="">{t('common.selectForm')}</option>
                    <option value="1">Form 1</option>
                    <option value="2">Form 2</option>
                    <option value="3">Form 3</option>
                    <option value="4">Form 4</option>
                    <option value="5">Form 5</option>
                    <option value="6">Form 6</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => navigate('/view-report')}
                  className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {t('common.returnToReport')}
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EditProfile; 