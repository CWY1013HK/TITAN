import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import PromotionalHome from '../components/displays/PromotionalHome';
import UserDashboard from '../components/displays/UserDashboard';

const Home = () => {
  const { currentUser, isAuthenticated } = useAuth();
  // console.log('Current user from AuthContext:', currentUser);
  // console.log('Authentication state:', isAuthenticated);

  return isAuthenticated ? <UserDashboard userData={currentUser} /> : <PromotionalHome />;
};

export default Home;