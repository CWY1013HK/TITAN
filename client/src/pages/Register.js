import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

function Register({ onRegister }) {
  const navigate = useNavigate();
  const [userData, setUserData] = useState({
    User_ID: '',
    UID: '',
    First_Name: '',
    Last_Name: '',
    Nickname: '',
    Email_Address: '',
    Password: '',
    ConfirmPassword: '',
    School_Name: '',
    School_District: '',
    Form: '1', // Default to Form 1
    Tel: '',
    User_Role: 'Stu',
    direct_marketing: false,
    email_list: false,
    ability_6d: [1.5, 1.5, 1.5, 1.5, 1.5, 1.5]
  });
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [privacyWarning, setPrivacyWarning] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({
    First_Name: false,
    Last_Name: false,
    Email_Address: false,
    Password: false,
    ConfirmPassword: false,
    School_District: false
  });
  const [usernameStatus, setUsernameStatus] = useState({
    isChecking: false,
    isAvailable: true,
    message: ''
  });
  const { t } = useTranslation();

  // Debounce function to prevent too many API calls
  const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  };

  // Check username availability
  const checkUsername = async (username) => {
    if (!username || username.trim() === '') {
      setUsernameStatus({
        isChecking: false,
        isAvailable: true,
        message: ''
      });
      return;
    }

    setUsernameStatus(prev => ({ ...prev, isChecking: true }));
    try {
      const response = await fetch('/api/check-username', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username }),
      });

      const data = await response.json();
      setUsernameStatus({
        isChecking: false,
        isAvailable: data.available,
        message: data.available ?
          username.trim() !== '' ? t('common.usernameAvailable') : ''
          : t('common.usernameTaken')
      });
    } catch (error) {
      setUsernameStatus({
        isChecking: false,
        isAvailable: false,
        message: t('common.errorCheckingUsername')
      });
    }
  };

  // Debounced version of checkUsername
  const debouncedCheckUsername = debounce(checkUsername, 500);

  // Handle username change
  const handleUsernameChange = (e) => {
    const newUsername = e.target.value;
    setUserData(prev => ({ ...prev, User_ID: newUsername }));
    debouncedCheckUsername(newUsername);
  };

  // Handle field changes and clear errors
  const handleFieldChange = (fieldName, value) => {
    setUserData(prev => ({ ...prev, [fieldName]: value }));
    // Clear field error when user starts typing
    if (fieldErrors[fieldName]) {
      setFieldErrors(prev => ({ ...prev, [fieldName]: false }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setPrivacyWarning(false);

    // Reset field errors
    const newFieldErrors = {
      First_Name: false,
      Last_Name: false,
      Email_Address: false,
      Password: false,
      ConfirmPassword: false,
      School_District: false
    };

    // Validate required fields
    let hasErrors = false;
    const errorMessages = [];

    if (!userData.First_Name.trim()) {
      errorMessages.push(t('common.firstNameRequired'));
      newFieldErrors.First_Name = true;
      hasErrors = true;
    }
    if (!userData.Last_Name.trim()) {
      errorMessages.push(t('common.lastNameRequired'));
      newFieldErrors.Last_Name = true;
      hasErrors = true;
    }
    if (!userData.Email_Address.trim()) {
      errorMessages.push(t('common.emailRequired'));
      newFieldErrors.Email_Address = true;
      hasErrors = true;
    }
    if (!userData.Password) {
      errorMessages.push(t('common.passwordRequired'));
      newFieldErrors.Password = true;
      hasErrors = true;
    }
    if (!userData.School_District) {
      errorMessages.push(t('common.schoolDistrictRequired'));
      newFieldErrors.School_District = true;
      hasErrors = true;
    }

    // Check if passwords match
    if (userData.Password !== userData.ConfirmPassword) {
      errorMessages.push(t('common.passwordsDoNotMatch'));
      newFieldErrors.ConfirmPassword = true;
      hasErrors = true;
    }

    if (hasErrors) {
      setFieldErrors(newFieldErrors);
      setError(errorMessages.join('. '));
      return;
    }

    // Prevent submission if username is taken
    if (!usernameStatus.isAvailable && userData.User_ID.trim() !== '') {
      setError(t('common.chooseDifferentUsername'));
      return;
    }

    // Check privacy consent
    if (!privacyConsent) {
      setPrivacyWarning(true);
      setError(t('auth.privacy.warning'));
      return;
    }

    // Format data for submission
    const formData = {
      User_ID: userData.User_ID.trim(),
      First_Name: userData.First_Name.trim(),
      Last_Name: userData.Last_Name.trim(),
      Nickname: userData.Nickname.trim(),
      Email_Address: userData.Email_Address.trim().toLowerCase(), // Ensure email is lowercase
      Password: userData.Password,
      School_Name: userData.School_Name.trim(),
      School_District: userData.School_District,
      Form: parseInt(userData.Form),
      Tel: userData.Tel.trim(),
      User_Role: 'Stu', // Default to student
      direct_marketing: false,
      email_list: false,
      ability_6d: [1.5, 1.5, 1.5, 1.5, 1.5, 1.5]
    };

    try {
      const success = await onRegister(formData);
      if (success) {
        navigate('/');
      } else {
        setError(t('common.registrationFailed'));
      }
    } catch (error) {
      console.error('Registration error:', error);

      // Handle specific error types with translated messages
      let errorMessage = t('auth.register.failed');

      if (error.message) {
        if (error.message.includes('already exists') || error.message.includes('duplicate')) {
          errorMessage = t('auth.register.userExists');
        } else if (error.message.includes('invalid') || error.message.includes('validation')) {
          errorMessage = t('auth.register.invalidData');
        } else if (error.message.includes('server') || error.message.includes('500')) {
          errorMessage = t('auth.register.serverError');
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = t('auth.register.networkError');
        } else {
          // Keep original server message if it's specific and meaningful
          errorMessage = error.message;
        }
      }

      setError(errorMessage);
    }
  };

  return (
    <div className="h-full bg-gray-50 flex flex-col justify-start py-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-8 text-center text-3xl font-extrabold text-gray-900">
          {t('auth.register.title')}
        </h2>
      </div>

      <div className="mt-4 mb-10 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-6 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="First_Name" className="block text-sm font-medium text-gray-700">
                {t('common.firstName')}
              </label>
              <div className="mt-1">
                <input
                  id="First_Name"
                  name="First_Name"
                  type="text"
                  required
                  value={userData.First_Name}
                  onChange={(e) => handleFieldChange('First_Name', e.target.value)}
                  className={`appearance-none block w-full px-3 py-2 border ${fieldErrors.First_Name ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                />
              </div>
            </div>

            <div>
              <label htmlFor="Last_Name" className="block text-sm font-medium text-gray-700">
                {t('common.lastName')}
              </label>
              <div className="mt-1">
                <input
                  id="Last_Name"
                  name="Last_Name"
                  type="text"
                  required
                  value={userData.Last_Name}
                  onChange={(e) => handleFieldChange('Last_Name', e.target.value)}
                  className={`appearance-none block w-full px-3 py-2 border ${fieldErrors.Last_Name ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                />
              </div>
            </div>

            <div>
              <label htmlFor="Nickname" className="block text-sm font-medium text-gray-700">
                {t('common.nickname')}
              </label>
              <div className="mt-1">
                <input
                  id="Nickname"
                  name="Nickname"
                  type="text"
                  value={userData.Nickname}
                  onChange={(e) => setUserData({ ...userData, Nickname: e.target.value })}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t('common.optional')}
                />
              </div>
            </div>

            {/* Separator */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">{t('common.accountInformation')}</span>
              </div>
            </div>

            <div>
              <label htmlFor="User_ID" className="block text-sm font-medium text-gray-700">
                {t('common.username')}
              </label>
              <div className="mt-1">
                <input
                  id="User_ID"
                  name="User_ID"
                  type="text"
                  value={userData.User_ID}
                  onChange={handleUsernameChange}
                  className={`appearance-none block w-full px-3 py-2 border ${usernameStatus.message ? (usernameStatus.isAvailable ? 'border-green-300' : 'border-red-300') : 'border-gray-300'
                    } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                  placeholder={t('common.leaveBlankForAutoGeneration')}
                />
              </div>
              {usernameStatus.message && (
                <p className={`mt-1 text-sm ${usernameStatus.isAvailable ? 'text-green-600' : 'text-red-600'
                  }`}>
                  {usernameStatus.isChecking ? t('common.checkingAvailability') : usernameStatus.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="Email_Address" className="block text-sm font-medium text-gray-700">
                {t('common.email')}
              </label>
              <div className="mt-1">
                <input
                  id="Email_Address"
                  name="Email_Address"
                  type="email"
                  required
                  value={userData.Email_Address}
                  onChange={(e) => handleFieldChange('Email_Address', e.target.value)}
                  className={`appearance-none block w-full px-3 py-2 border ${fieldErrors.Email_Address ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                />
              </div>
            </div>

            <div>
              <label htmlFor="Password" className="block text-sm font-medium text-gray-700">
                {t('common.password')}
              </label>
              <div className="mt-1">
                <input
                  id="Password"
                  name="Password"
                  type="password"
                  required
                  value={userData.Password}
                  onChange={(e) => handleFieldChange('Password', e.target.value)}
                  className={`appearance-none block w-full px-3 py-2 border ${fieldErrors.Password ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                  placeholder={t('common.enterPassword')}
                />
              </div>
            </div>

            <div>
              <label htmlFor="ConfirmPassword" className="block text-sm font-medium text-gray-700">
                {t('common.confirmPassword')}
              </label>
              <div className="mt-1">
                <input
                  id="ConfirmPassword"
                  name="ConfirmPassword"
                  type="password"
                  required
                  value={userData.ConfirmPassword}
                  onChange={(e) => handleFieldChange('ConfirmPassword', e.target.value)}
                  className={`appearance-none block w-full px-3 py-2 border ${fieldErrors.ConfirmPassword ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                  placeholder={t('common.confirmYourPassword')}
                />
              </div>
            </div>

            {/* Separator */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">{t('common.schoolInformation')}</span>
              </div>
            </div>

            <div>
              <label htmlFor="School_Name" className="block text-sm font-medium text-gray-700">
                {t('report.school')}
              </label>
              <div className="mt-1">
                <input
                  id="School_Name"
                  name="School_Name"
                  type="text"
                  value={userData.School_Name}
                  onChange={(e) => setUserData({ ...userData, School_Name: e.target.value })}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t('common.optional')}
                />
              </div>
            </div>

            <div>
              <label htmlFor="School_District" className="block text-sm font-medium text-gray-700">
                {t('common.schoolDistrict')}
              </label>
              <div className="mt-1">
                <select
                  id="School_District"
                  name="School_District"
                  required
                  value={userData.School_District}
                  onChange={(e) => handleFieldChange('School_District', e.target.value)}
                  className={`appearance-none block w-full px-3 py-2 border ${fieldErrors.School_District ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
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
            </div>

            <div>
              <label htmlFor="Form" className="block text-sm font-medium text-gray-700">
                {t('common.form')}
              </label>
              <div className="mt-1">
                <select
                  id="Form"
                  name="Form"
                  required
                  value={userData.Form}
                  onChange={(e) => setUserData({ ...userData, Form: e.target.value })}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="1">Form 1</option>
                  <option value="2">Form 2</option>
                  <option value="3">Form 3</option>
                  <option value="4">Form 4</option>
                  <option value="5">Form 5</option>
                  <option value="6">Form 6</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="Tel" className="block text-sm font-medium text-gray-700">
                {t('common.phone')}
              </label>
              <div className="mt-1">
                <input
                  id="Tel"
                  name="Tel"
                  type="text"
                  value={userData.Tel}
                  onChange={(e) => setUserData({ ...userData, Tel: e.target.value })}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t('common.optional')}
                />
              </div>
            </div>

            {/* Privacy Statement */}
            <div className={`p-4 rounded-md border ${privacyWarning ? 'bg-red-50 border-red-300' : 'bg-gray-50 border-gray-200'}`}>
              <h3 className="text-sm font-medium text-gray-900 mb-2">
                {t('auth.privacy.title')}
              </h3>
              <div className="text-xs text-gray-600 space-y-2">
                <p>{t('auth.privacy.consent')}</p>
                <p>{t('auth.privacy.details')}</p>
                <p>{t('auth.privacy.rights')}</p>
                <p>{t('auth.privacy.contact')}</p>
              </div>
              <div className="mt-4">
                <label className="flex items-start">
                  <input
                    type="checkbox"
                    checked={privacyConsent}
                    onChange={(e) => {
                      setPrivacyConsent(e.target.checked);
                      if (e.target.checked) {
                        setPrivacyWarning(false);
                      }
                    }}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-0.5"
                  />
                  <span className="text-xs text-gray-700 ml-2">
                    {t('auth.privacy.agreeToTerms')}
                  </span>
                </label>
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {t('common.register')}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  {t('auth.register.hasAccount')} <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">{t('auth.register.signIn')}</Link>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register; 