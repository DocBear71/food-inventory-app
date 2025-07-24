// file: /src/components/forms/KeyboardOptimizedInput.js v1 - Optimized for mobile keyboard compatibility including swipe typing

'use client';

import { forwardRef } from 'react';

const KeyboardOptimizedInput = forwardRef(({
                                               type = 'text',
                                               name,
                                               id,
                                               placeholder,
                                               value,
                                               onChange,
                                               onFocus,
                                               onBlur,
                                               required = false,
                                               disabled = false,
                                               autoComplete,
                                               className = '',
                                               inputMode, // Helps mobile keyboards show appropriate layout
                                               ...props
                                           }, ref) => {
    // Default input modes for different types
    const getInputMode = () => {
        if (inputMode) return inputMode;

        switch (type) {
            case 'email':
                return 'email';
            case 'tel':
                return 'tel';
            case 'number':
                return 'numeric';
            case 'search':
                return 'search';
            case 'url':
                return 'url';
            default:
                return 'text';
        }
    };

    // Auto-complete suggestions for common fields
    const getAutoComplete = () => {
        if (autoComplete) return autoComplete;

        // Common field name mappings
        const autoCompleteMap = {
            'name': 'name',
            'firstName': 'given-name',
            'lastName': 'family-name',
            'email': 'email',
            'password': type === 'password' ? 'current-password' : 'off',
            'confirmPassword': 'new-password',
            'phone': 'tel',
            'street': 'street-address',
            'city': 'address-level2',
            'state': 'address-level1',
            'zip': 'postal-code',
            'country': 'country'
        };

        return autoCompleteMap[name] || 'off';
    };

    const baseClasses = `
        appearance-none relative block w-full px-3 py-2 
        border border-gray-300 placeholder-gray-500 text-gray-900 
        rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 
        sm:text-sm transition-colors duration-200
        disabled:bg-gray-100 disabled:cursor-not-allowed
    `.trim().replace(/\s+/g, ' ');

    return (
        <input
            ref={ref}
            type={type}
            name={name}
            id={id || name}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            onFocus={onFocus}
            onBlur={onBlur}
            required={required}
            disabled={disabled}
            autoComplete={getAutoComplete()}
            inputMode={getInputMode()}
            className={`${baseClasses} ${className}`}
            // Optimizations for mobile keyboards and swipe typing
            spellCheck={type === 'password' ? false : true} // Disable for passwords
            autoCorrect={type === 'password' ? 'off' : 'on'} // Enable for text fields
            autoCapitalize={
                type === 'email' || type === 'password' ? 'none' :
                    name === 'name' ? 'words' : 'sentences'
            }
            // Prevent zoom on iOS when focusing inputs
            style={{
                fontSize: '16px',
                ...props.style
            }}
            {...props}
        />
    );
});

KeyboardOptimizedInput.displayName = 'KeyboardOptimizedInput';

export default KeyboardOptimizedInput;


// To implement on pages:
//
// import KeyboardOptimizedInput from '@/components/forms/KeyboardOptimizedInput';
//
// // Replace input elements with:
// <KeyboardOptimizedInput
//     name="name"
//     type="text"
//     placeholder="Enter your full name"
//     value={formData.name}
//     onChange={handleChange}
//     required
// />







