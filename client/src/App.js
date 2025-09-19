import './index.css';
import './i18n'; // Initialize i18n
import NavBar from './components/blocks/nav';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import DBTable from './handlers/DatabaseHandler';
import { AuthProvider, useAuth, isNotPresenter } from './contexts/AuthContext';
import Footer from './components/blocks/Footer';
import { useTranslation } from 'react-i18next';
import { getCurrentLanguage, loadLanguageFromProfile } from './utils/languageUtils';
import { useLanguageSync } from './hooks/useLanguageSync';
import LoadingSpinner from './components/blocks/LoadingSpinner';
import useScrollToTop from './hooks/useScrollToTop';

import Home from './pages/Home';
import ViewReport from './pages/ViewReport';
import Help from './pages/Help';
import PersonalityTest from './pages/PersonalityTest';
import Chatbot from './pages/ChatBot';
import Login from './pages/Login';
import Register from './pages/Register';
import EditProfile from './pages/EditProfile';
import TrajectoryMap from './pages/TrajectoryMap';
import Presentation from './pages/Presentation';
import NotFound from './pages/NotFound';
import JUPASelect from './pages/JUPASelect';
import About from './pages/About';
import PresentationAnalytics from './pages/PresentationAnalytics';
import GoogleForm from './pages/GoogleForm';

// Protected Route wrapper component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// Special protected route for Presentation page
const PresentationRoute = ({ children }) => {
  const { currentUser } = useAuth();
  if (!currentUser || isNotPresenter(currentUser)) {
    return <Navigate to="/" replace />;
  }
  return children;
};

// Scroll to top component for route changes
const ScrollToTop = () => {
  // Use the custom hook with improved configuration
  useScrollToTop({
    enabled: true,
    behavior: 'auto',
    delay: 10, // Small delay to ensure DOM is ready
    excludePaths: ['/trajectory'], // Exclude trajectory page as it has its own scroll management
    retryAttempts: 3, // Retry up to 3 times if scroll fails
    retryDelay: 100 // Wait 100ms between retries
  });

  return null;
};

// Language initialization component
const LanguageInitializer = ({ children }) => {
  const { i18n } = useTranslation();
  const { isAuthenticated, currentUser, loading } = useAuth();
  const [isLanguageReady, setIsLanguageReady] = useState(false);
  const [hasReloaded, setHasReloaded] = useState(false);
  const [hasCompleted, setHasCompleted] = useState(false);

  useEffect(() => {
    const initializeLanguage = async () => {
      try {
        // Don't run if already completed
        if (hasCompleted) {
          // console.log('LanguageInitializer: Already completed, skipping...');
          return;
        }

        // Wait for authentication context to be ready
        if (loading) {
          // console.log('LanguageInitializer: Waiting for auth context to load...');
          return;
        }

        // console.log('LanguageInitializer: Auth context ready. isAuthenticated:', isAuthenticated, 'currentUser:', currentUser?.User_ID);

        // Check if this is the first load or if language needs to be synchronized
        const isFirstLoad = !localStorage.getItem('languageInitialized');
        const currentLanguage = i18n.language || 'en';

        // console.log('LanguageInitializer: isFirstLoad:', isFirstLoad, 'currentLanguage:', currentLanguage);

        if (isFirstLoad && !hasReloaded) {
          // Mark that we've attempted initialization
          setHasReloaded(true);

          // Wait for i18n to be ready
          if (!i18n.isInitialized) {
            // console.log('LanguageInitializer: Waiting for i18n to initialize...');
            await new Promise(resolve => {
              const checkInitialized = () => {
                if (i18n.isInitialized) {
                  resolve();
                } else {
                  setTimeout(checkInitialized, 100);
                }
              };
              checkInitialized();
            });
          }

          // Load user language preference if authenticated
          let targetLanguage = 'en';
          if (isAuthenticated && currentUser?.User_ID) {
            try {
              // console.log('LanguageInitializer: Loading language from user profile for:', currentUser.User_ID);
              const userTable = new DBTable("USER", "User_ID", {});
              const userData = await userTable.handleRead({ User_ID: currentUser.User_ID }, false);
              targetLanguage = await loadLanguageFromProfile(userData);
              // console.log('LanguageInitializer: User profile language:', targetLanguage);
            } catch (error) {
              console.error('Error loading user language preference:', error);
              targetLanguage = getCurrentLanguage();
            }
          } else {
            // For non-authenticated users, check localStorage first, then browser language
            const savedLanguage = localStorage.getItem('i18nextLng');
            if (savedLanguage && ['en', 'tc', 'sc'].includes(savedLanguage)) {
              targetLanguage = savedLanguage;
              // console.log('LanguageInitializer: Using saved language from localStorage:', targetLanguage);
            } else {
              // Check browser language
              const browserLang = navigator.language || navigator.userLanguage;
              if (browserLang.startsWith('zh')) {
                // Determine if it's simplified or traditional Chinese
                if (browserLang.includes('CN') || browserLang.includes('Hans')) {
                  targetLanguage = 'sc';
                } else {
                  targetLanguage = 'tc';
                }
              } else {
                targetLanguage = 'en';
              }
              // console.log('LanguageInitializer: Using browser language:', browserLang, '->', targetLanguage);
            }
          }

          // If the current language doesn't match the target language, reload
          if (currentLanguage !== targetLanguage) {
            // console.log(`LanguageInitializer: Language mismatch detected. Current: ${currentLanguage}, Target: ${targetLanguage}. Reloading...`);
            await i18n.changeLanguage(targetLanguage);
            // Force a page reload to ensure all components render with the correct language
            window.location.reload();
            return;
          } else {
            // Languages match, mark as completed
            // console.log(`LanguageInitializer: Languages match (${currentLanguage}), initialization complete`);
            localStorage.setItem('languageInitialized', 'true');
            setHasCompleted(true);
            setIsLanguageReady(true);
            return;
          }
        } else {
          // Not first load, mark as completed
          // console.log('LanguageInitializer: Not first load, marking as completed');
          setHasCompleted(true);
          setIsLanguageReady(true);
        }

        // Set language as ready
        setIsLanguageReady(true);
      } catch (error) {
        console.error('Error during language initialization:', error);
        // Set as ready even if there's an error to prevent infinite loading
        setHasCompleted(true);
        setIsLanguageReady(true);
      }
    };

    initializeLanguage();
  }, [i18n, isAuthenticated, currentUser, hasReloaded, loading, hasCompleted]);

  // Show loading spinner while language is initializing or auth is loading
  if (!isLanguageReady || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a1020]">
        <div className="text-center">
          <LoadingSpinner size="large" text={loading ? 'Loading user preferences...' : 'Initializing language preferences...'} />
        </div>
      </div>
    );
  }

  return children;
};

// Main content component that uses useLocation
const MainContent = () => {
  const location = useLocation();
  const { isAuthenticated, currentUser, logout, login, register } = useAuth();
  const { isSynced } = useLanguageSync(); // Add language synchronization
  const isTrajectoryPage = location.pathname === '/trajectory';
  const isEddyPage = location.pathname === '/eddy';
  const shouldShowFooter = !isTrajectoryPage && !isEddyPage;

  return (
    <div className="flex flex-col min-h-screen bg-[#0a1020] text-blue-100">
      <NavBar
        isAuthenticated={isAuthenticated}
        userData={currentUser}
        onLogout={logout}
      />
      <ScrollToTop />
      <div className={`flex-1 ${isTrajectoryPage ? '' : 'flex'} flex-col`}>
        <main className="flex-1 pt-16">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={
              isAuthenticated ?
                <Navigate to="/" replace /> :
                <Login onLogin={login} />
            } />
            <Route path="/register" element={
              isAuthenticated ?
                <Navigate to="/" replace /> :
                <Register onRegister={register} />
            } />
            <Route path="/view-report" element={
              <ProtectedRoute>
                <ViewReport />
              </ProtectedRoute>
            } />
            <Route path="/help" element={<Help />} />
            <Route path="/personality-test" element={
              <ProtectedRoute>
                <PersonalityTest />
              </ProtectedRoute>
            } />
            <Route path="/eddy" element={
              <ProtectedRoute>
                <Chatbot />
              </ProtectedRoute>
            } />
            <Route path="/edit-profile" element={<EditProfile />} />
            <Route path="/trajectory" element={
              <ProtectedRoute>
                <TrajectoryMap />
              </ProtectedRoute>
            } />
            <Route path="/presentation" element={
              <PresentationRoute>
                <Presentation />
              </PresentationRoute>
            } />
            <Route path="/analytics" element={
              <PresentationRoute>
                <PresentationAnalytics />
              </PresentationRoute>
            } />
            <Route path="/jupaselect" element={<JUPASelect />} />
            <Route path="/about" element={
              <ProtectedRoute>
                <About />
              </ProtectedRoute>
            } />
            <Route path="/jupasurvey" element={<GoogleForm />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        {shouldShowFooter && (
          <div className="mt-auto">
            <Footer />
          </div>
        )}
      </div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <LanguageInitializer>
          <MainContent />
        </LanguageInitializer>
      </Router>
    </AuthProvider>
  );
}

export default App;
