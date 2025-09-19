import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';
import { isPresenter } from '../../contexts/AuthContext';

function NavBar({ isAuthenticated, userData, onLogout }) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const isTrajectoryPage = location.pathname === '/trajectory';
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const isUserPresenter = isPresenter(userData);

    const handleLogout = () => {
        onLogout();
        navigate('/');
    };

    const toggleMobileMenu = () => {
        setIsMobileMenuOpen(!isMobileMenuOpen);
    };

    return (
        <>
            <nav className={`fixed top-0 left-0 right-0 bg-white shadow-sm z-50 ${isTrajectoryPage ? 'w-full' : ''}`}>
                <div className={`${isTrajectoryPage ? 'w-full' : 'max-w-7xl'} mx-auto px-4 sm:px-6 lg:px-8`}>
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <Link to="/" className="font-roboto font-medium">
                                    <img src="/asset/icons/logo-v3.png" alt="Company logo" className="h-12 w-12" />
                                </Link>
                            </div>
                            {/* Desktop Navigation */}
                            <div className="hidden md:ml-10 md:flex md:items-center md:space-x-4">
                                {isAuthenticated && (
                                    <Link to="/about" className="font-roboto font-medium">{t('navigation.about')}</Link>
                                )}
                                <Link to="/jupaselect" className="font-roboto font-medium">{t('navigation.jupaSelect')}</Link>
                                <Link to="/jupasurvey" className="font-roboto font-medium">{t('navigation.googleForm')}</Link>
                                {isAuthenticated && (
                                    <>
                                        <Link to="/personality-test" className="font-roboto font-medium">{t('navigation.takeTest')}</Link>
                                        <Link to="/eddy" className="font-roboto font-medium">{t('navigation.eddy')}</Link>
                                        <Link to="/trajectory" className="font-roboto font-medium">{t('navigation.trajectory')}</Link>
                                    </>
                                )}
                                {isUserPresenter && (
                                    <>
                                        <Link to="/presentation" className="font-roboto font-medium">{t('navigation.presentation')}</Link>
                                        <Link to="/analytics" className="font-roboto font-medium">{t('navigation.analytics')}</Link>
                                    </>
                                )}
                            </div>
                        </div>
                        {/* Desktop User Menu */}
                        <div className="hidden md:flex md:items-center">
                            <div className="flex items-center space-x-3">
                                <LanguageSwitcher />
                                {isAuthenticated ? (
                                    <>
                                        <button className="text-gray-700 hover:text-blue-500">
                                            <i className="fas fa-bell text-xl"></i>
                                        </button>
                                        <Link to="/view-report" className="flex items-center">
                                            <span className="text-gray-700 font-medium">
                                                {userData?.User_ID || t('common.user')}
                                            </span>
                                        </Link>
                                        <button
                                            onClick={handleLogout}
                                            className="text-gray-700 hover:text-blue-500 font-roboto font-mediu space-x-2"
                                        >
                                            {t('common.logout')}
                                        </button>
                                    </>
                                ) : (
                                    <div className="flex items-center space-x-4">
                                        <Link to="/login" className="font-roboto font-medium text-gray-700 hover:text-blue-500 space-x-2 ml-3">
                                            {t('common.login')}
                                        </Link>
                                        <Link to="/register" className="font-roboto font-medium text-gray-700 hover:text-blue-500 space-x-2">
                                            {t('common.register')}
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>
                        {/* Mobile menu button */}
                        <div className="md:hidden">
                            <button
                                onClick={toggleMobileMenu}
                                className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-blue-500 focus:outline-none"
                            >
                                <span className="sr-only">Open main menu</span>
                                {!isMobileMenuOpen ? (
                                    <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                    </svg>
                                ) : (
                                    <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Mobile Menu Overlay */}
            <div className={`fixed inset-0 z-[100] ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'} transition-opacity duration-300 ease-in-out`}>
                <div className="absolute inset-0 bg-black bg-opacity-50" onClick={toggleMobileMenu}></div>
                <div className={`absolute right-0 top-0 h-full w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'} z-[101]`}>
                    <div className="flex flex-col h-full">
                        <div className="flex items-center justify-between p-4 border-b">
                            <div className="flex items-center space-x-2">
                                <span className="text-gray-700 font-medium">
                                    {userData?.User_ID || t('common.user')}
                                </span>
                            </div>
                            <button onClick={toggleMobileMenu} className="text-gray-500 hover:text-gray-700">
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4">
                            <div className="mb-4">
                                <LanguageSwitcher />
                            </div>
                            {isAuthenticated && (
                                <Link to="/about" className="block text-gray-700 hover:text-blue-500 font-medium mb-4">{t('navigation.about')}</Link>
                            )}
                            <Link to="/jupaselect" className="block text-gray-700 hover:text-blue-500 font-medium mb-4">{t('navigation.jupaSelect')}</Link>
                            <Link to="/jupasurvey" className="block text-gray-700 hover:text-blue-500 font-medium mb-4">{t('navigation.googleForm')}</Link>
                            {isAuthenticated ? (
                                <div className="space-y-4">
                                    <Link to="/personality-test" className="block text-gray-700 hover:text-blue-500 font-medium">{t('navigation.takeTest')}</Link>
                                    <Link to="/eddy" className="block text-gray-700 hover:text-blue-500 font-medium">{t('navigation.eddy')}</Link>
                                    <Link to="/trajectory" className="block text-gray-700 hover:text-blue-500 font-medium">{t('navigation.trajectory')}</Link>
                                    {isUserPresenter && (
                                        <Link to="/presentation" className="block text-gray-700 hover:text-blue-500 font-medium">{t('navigation.presentation')}</Link>
                                    )}
                                    {isUserPresenter && (
                                        <Link to="/analytics" className="block text-gray-700 hover:text-blue-500 font-medium">{t('navigation.analytics')}</Link>
                                    )}
                                    <Link to="/help" className="block text-gray-700 hover:text-blue-500 font-medium">{t('navigation.helpCentre')}</Link>
                                    <Link to="/view-report" className="block text-gray-700 hover:text-blue-500 font-medium">{t('navigation.viewReport')}</Link>
                                    <button onClick={handleLogout} className="block w-full text-left text-gray-700 hover:text-blue-500 font-medium">
                                        {t('common.logout')}
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <Link to="/login" className="block text-gray-700 hover:text-blue-500 font-medium">{t('common.login')}</Link>
                                    <Link to="/register" className="block text-gray-700 hover:text-blue-500 font-medium">{t('common.register')}</Link>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

export default NavBar;