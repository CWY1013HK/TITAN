import React from 'react';

const LoadingSpinner = ({
    size = 'medium',
    text = '',
    className = '',
    showText = true,
    textClassName = 'mt-2 text-gray-600'
}) => {
    const getSizeClasses = () => {
        switch (size) {
            case 'small':
                return 'h-4 w-4 border-b-2';
            case 'medium':
                return 'h-8 w-8 border-b-2';
            case 'large':
                return 'h-16 w-16 border-b-2';
            default:
                return 'h-8 w-8 border-b-2';
        }
    };

    const getContainerClasses = () => {
        switch (size) {
            case 'small':
                return 'inline-block';
            case 'medium':
                return 'inline-block';
            case 'large':
                return '';
            default:
                return 'inline-block';
        }
    };

    const spinnerClasses = `animate-spin rounded-full border-blue-600 ${getSizeClasses()} ${getContainerClasses()} ${className}`;

    if (showText && text) {
        return (
            <div className="flex flex-col items-center">
                <div className={spinnerClasses + (size == 'large' ? ' mb-6' : 'mb-3')}></div>
                {text && <p className={textClassName}>{text}</p>}
            </div>
        );
    }

    return (
        <div className={spinnerClasses}>
            {text && <span className="sr-only">{text}</span>}
        </div>
    );
};

export default LoadingSpinner; 