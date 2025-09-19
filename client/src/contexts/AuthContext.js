import React, { createContext, useState, useContext, useEffect, useMemo, useRef } from 'react';
import DBTable from '../handlers/DatabaseHandler';
import { useTranslation } from 'react-i18next';
import apiClient from '../utils/apiClient.js';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

// Centralized function to check if user is a presenter/admin
export function isPresenter(user) {
  if (!user || !user.User_ID) return false;
  return user.User_ID === 'CWY1013' || user.User_ID === 'HUDT2100' || user.User_ID === 'maverick_edvise' || user.User_ID === 'niki._yyk' || user.User_ID === 'Carson';
}

// Centralized function to check if user is NOT a presenter/admin (for access control)
export function isNotPresenter(user) {
  return !isPresenter(user);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const previousUserRef = useRef(null);
  const hasSyncedLanguageRef = useRef(false);
  const { t } = useTranslation();

  // Memoize the currentUser to prevent unnecessary re-renders
  const memoizedCurrentUser = useMemo(() => {
    // console.log('AuthContext: Memoizing currentUser:', currentUser?.User_ID);
    return currentUser;
  }, [
    currentUser?.User_ID,
    currentUser?.ability_6d?.join(','),
    currentUser?.eddy_recommendation_title,
    currentUser?.eddy_recommendation_text,
    currentUser?.needs_recommendation_regeneration,
    currentUser?.jupas_programme_order ? JSON.stringify(currentUser.jupas_programme_order) : ''
    // Removed preferred_language to prevent language change loops
  ]);

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
      ability_6d: [1.5, 1.5, 1.5, 1.5, 1.5, 1.5],
      eddy_recommendation_title: "",
      eddy_recommendation_text: "",
      needs_recommendation_regeneration: true,
      trajectory_events: [],
      trajectory_connections: [],
      trajectory_analyses: [],
      event_types: ['academic', 'extracurricular', 'personal'],
      preferred_language: "en",
      jupas_programme_order: {}
    }
  );

  const fetchCompleteUserProfile = async (userId) => {
    try {
      // console.log('AuthContext: Fetching complete user profile for:', userId);
      const userData = await userTable.handleRead({ User_ID: userId }, false);
      // console.log('AuthContext: Complete user profile:', userData);
      if (userData) {
        // console.log('AuthContext: Trajectory data - events:', userData.trajectory_events?.length || 0);
        // console.log('AuthContext: Trajectory data - connections:', userData.trajectory_connections?.length || 0);
        // console.log('AuthContext: Trajectory data - analyses:', userData.trajectory_analyses?.length || 0);
        // console.log('AuthContext: Trajectory data - event_types:', userData.event_types);
      }
      return userData;
    } catch (error) {
      console.error('AuthContext: Error fetching complete user profile:', error);
      return null;
    }
  };

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    // console.log('AuthContext: Checking token:', token);
    if (token) {
      // First fetch basic user data using the token
      apiClient.get('/api/auth/me')
        .then(response => {
          if (!response.ok) {
            throw new Error('Failed to fetch user data');
          }
          return response.json();
        })
        .then(basicUserData => {
          // console.log('AuthContext: Fetched basic user data:', basicUserData);
          // Check if user data is empty but we have a token
          if (!basicUserData || Object.keys(basicUserData).length === 0) {
            // console.log('AuthContext: Empty profile detected, reloading...');
            // Force reload the page to trigger a fresh auth check
            window.location.reload();
            return;
          }

          // Now fetch the complete user profile from database
          return fetchCompleteUserProfile(basicUserData.User_ID);
        })
        .then(completeUserData => {
          if (completeUserData) {
            // console.log('AuthContext: Setting complete user data:', completeUserData);
            setCurrentUserStable(completeUserData);
            setIsAuthenticated(true);

            // Store user data in localStorage for immediate access by i18n
            localStorage.setItem('user', JSON.stringify(completeUserData));

            // Immediately synchronize language when user data is loaded
            if (completeUserData.preferred_language && !hasSyncedLanguageRef.current) {
              // console.log('AuthContext: Immediately syncing language to:', completeUserData.preferred_language);
              hasSyncedLanguageRef.current = true;
              // Force language change immediately
              import('../i18n').then(({ default: i18n }) => {
                i18n.changeLanguage(completeUserData.preferred_language);
                // Force a reload to ensure all components render with correct language
                setTimeout(() => {
                  if (i18n.language !== completeUserData.preferred_language) {
                    // console.log('AuthContext: Language not applied, forcing reload...');
                    window.location.reload();
                  }
                }, 500);
              });
            }
          } else {
            console.error('AuthContext: Failed to fetch complete user profile');
            localStorage.removeItem('token');
            setIsAuthenticated(false);
          }
        })
        .catch(error => {
          console.error('Error fetching user data:', error);
          localStorage.removeItem('token');
          setIsAuthenticated(false);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      // console.log('AuthContext: No token found');
      setIsAuthenticated(false);
      setLoading(false);
    }
  }, []);

  const login = async (credentials, tOverride) => {
    const tFunc = tOverride || t;
    try {
      // Map identifier to either email or username
      const loginData = {
        password: credentials.password
      };

      // Check if identifier is an email (contains @) or username
      if (credentials.identifier.includes('@')) {
        loginData.email = credentials.identifier;
      } else {
        loginData.username = credentials.identifier;
      }

      const response = await apiClient.post('/api/auth/login', loginData);

      if (!response.ok) {
        try {
          // Try to parse JSON error from server
          const errorData = await response.json();
          throw new Error(errorData.message);
        } catch (jsonErr) {
          // If not JSON, try to get plain text
          try {
            const text = await response.text();
            if (text && text.toLowerCase().includes('too many')) {
              // Only translate rate-limit messages
              throw new Error(tFunc('auth.login.tooManyAttempts'));
            } else {
              // Use server message as-is
              throw new Error(text || tFunc('auth.login.failed'));
            }
          } catch (textErr) {
            // Fallback to translated message
            throw new Error(tFunc('auth.login.failed'));
          }
        }
      }

      const data = await response.json();
      // console.log('AuthContext: Login response:', data);
      localStorage.setItem('token', data.token);

      // Fetch complete user profile after login
      const completeUserData = await fetchCompleteUserProfile(data.user.User_ID);
      if (completeUserData) {
        // console.log('AuthContext: Setting complete user data after login:', completeUserData);
        setCurrentUserStable(completeUserData);
        setIsAuthenticated(true);

        // Store user data in localStorage for immediate access by i18n
        localStorage.setItem('user', JSON.stringify(completeUserData));

        // Clear language initialization flag to ensure proper language sync after login
        localStorage.removeItem('languageInitialized');

        // Immediately synchronize language when user data is loaded
        if (completeUserData.preferred_language && !hasSyncedLanguageRef.current) {
          // console.log('AuthContext: Immediately syncing language after login to:', completeUserData.preferred_language);
          hasSyncedLanguageRef.current = true;
          // Force language change immediately
          import('../i18n').then(({ default: i18n }) => {
            i18n.changeLanguage(completeUserData.preferred_language);
            // Force a reload to ensure all components render with correct language
            setTimeout(() => {
              if (i18n.language !== completeUserData.preferred_language) {
                // console.log('AuthContext: Language not applied after login, forcing reload...');
                window.location.reload();
              }
            }, 500);
          });
        }
      } else {
        // console.log('AuthContext: Using basic user data after login:', data.user);
        setCurrentUserStable(data.user);
        setIsAuthenticated(true);

        // Store basic user data in localStorage
        localStorage.setItem('user', JSON.stringify(data.user));

        // Clear language initialization flag to ensure proper language sync after login
        localStorage.removeItem('languageInitialized');
      }

      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('languageInitialized');
    setCurrentUserStable(null);
    setIsAuthenticated(false);
    hasSyncedLanguageRef.current = false;
  };

  const register = async (userData) => {
    try {
      const response = await apiClient.post('/api/register', userData);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || t('auth.register.failed'));
      }

      // Registration successful - automatically log in the user
      // console.log('AuthContext: Registration successful, logging in user:', data);

      // Store the token
      localStorage.setItem('token', data.token);

      // Fetch complete user profile after registration
      const completeUserData = await fetchCompleteUserProfile(data.user.User_ID);
      if (completeUserData) {
        // console.log('AuthContext: Setting complete user data after registration:', completeUserData);
        setCurrentUserStable(completeUserData);
        setIsAuthenticated(true);

        // Clear language initialization flag to ensure proper language sync after registration
        localStorage.removeItem('languageInitialized');
      } else {
        // console.log('AuthContext: Using basic user data after registration:', data.user);
        setCurrentUserStable(data.user);
        setIsAuthenticated(true);

        // Clear language initialization flag to ensure proper language sync after registration
        localStorage.removeItem('languageInitialized');
      }

      return true;
    } catch (error) {
      console.error('Registration error:', error);
      // If the error is from the server response, use that message
      if (error.message) {
        throw new Error(error.message);
      }
      // Otherwise, throw a generic error
      throw new Error(t('auth.register.failed'));
    }
  };

  // Stable setCurrentUser function that only updates when there are actual changes
  const setCurrentUserStable = (newUser) => {
    const prevUser = previousUserRef.current;

    // Check if the user data has actually changed (excluding preferred_language to avoid loops)
    const hasChanged = !prevUser ||
      prevUser.User_ID !== newUser?.User_ID ||
      JSON.stringify(prevUser.ability_6d) !== JSON.stringify(newUser?.ability_6d) ||
      prevUser.eddy_recommendation_title !== newUser?.eddy_recommendation_title ||
      prevUser.eddy_recommendation_text !== newUser?.eddy_recommendation_text ||
      prevUser.needs_recommendation_regeneration !== newUser?.needs_recommendation_regeneration;
    // Removed preferred_language comparison to prevent language change loops

    if (hasChanged) {
      // console.log('AuthContext: User data changed, updating state');
      previousUserRef.current = newUser;
      setCurrentUser(newUser);
    } else {
      // console.log('AuthContext: User data unchanged, skipping update');
    }
  };

  // Function to update language preference locally without triggering full re-fetch
  const updateLanguagePreference = (newLanguage) => {
    if (currentUser) {
      const updatedUser = { ...currentUser, preferred_language: newLanguage };
      setCurrentUser(updatedUser);
      previousUserRef.current = updatedUser;
      // console.log('AuthContext: Updated language preference locally:', newLanguage);
    }
  };

  const value = useMemo(() => {
    // console.log('AuthContext: Creating new context value for user:', memoizedCurrentUser?.User_ID);
    return {
      currentUser: memoizedCurrentUser,
      isAuthenticated,
      login,
      logout,
      register,
      loading,
      updateLanguagePreference
    };
  }, [memoizedCurrentUser, isAuthenticated, loading]);

  // console.log('AuthContext: Providing value:', value);

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
} 