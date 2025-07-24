'use client';

// file: /src/components/forms/KeyboardOptimizedInput.js v1 - Standalone component to avoid import issues

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
                                               inputMode,
                                               style = {},
                                               ...props
                                           }, ref) => {
    // Get appropriate input mode
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

    // Get appropriate autocomplete
    const getAutoComplete = () => {
        if (autoComplete) return autoComplete;

        const autoCompleteMap = {
            'name': 'name',
            'firstName': 'given-name',
            'lastName': 'family-name',
            'email': 'email',
            'password': type === 'password' ? 'current-password' : 'off',
            'confirmPassword': 'new-password',
            'phone': 'tel'
        };

        return autoCompleteMap[name] || 'off';
    };

    // Get spellcheck setting
    const getSpellCheck = () => {
        if (type === 'password' || type === 'email') return false;
        return true;
    };

    // Get autocorrect setting
    const getAutoCorrect = () => {
        if (type === 'password' || type === 'email') return 'off';
        return 'on';
    };

    // Get autocapitalize setting
    const getAutoCapitalize = () => {
        if (type === 'email' || type === 'password') return 'none';
        if (name === 'name' || name === 'firstName' || name === 'lastName') return 'words';
        return 'sentences';
    };

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
            spellCheck={getSpellCheck()}
            autoCorrect={getAutoCorrect()}
            autoCapitalize={getAutoCapitalize()}
            className={className}
            style={{
                fontSize: '16px', // Prevent iOS zoom
                WebkitAppearance: 'none',
                ...style
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







