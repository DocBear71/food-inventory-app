'use client';

// file: /src/components/forms/FormComponents.js v1 - Complete set of optimized form components

import { forwardRef } from 'react';

// Text-based input component (your existing one, but renamed for clarity)
export const TextInput = forwardRef(({
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
                                         ...props
                                     }, ref) => {
    // Only works for text-based input types
    const textInputTypes = ['text', 'email', 'password', 'number', 'tel', 'search', 'url', 'date', 'time', 'datetime-local'];

    if (!textInputTypes.includes(type)) {
        console.warn(`TextInput component received unsupported type: ${type}. Use appropriate component instead.`);
    }

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

    const getAutoComplete = () => {
        if (autoComplete) return autoComplete;

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

    const getSpellCheck = () => {
        if (type === 'password' || type === 'email') return false;
        return true;
    };

    const getAutoCorrect = () => {
        if (type === 'password' || type === 'email') return 'off';
        return 'on';
    };

    const getAutoCapitalize = () => {
        if (type === 'email' || type === 'password') return 'none';
        if (name === 'name' || name === 'firstName' || name === 'lastName') return 'words';
        return 'sentences';
    };

    const baseClasses = `
        w-full text-gray-900 placeholder-gray-500 transition-colors duration-200
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
            spellCheck={getSpellCheck()}
            autoCorrect={getAutoCorrect()}
            autoCapitalize={getAutoCapitalize()}
            style={{
                fontSize: '16px', // Prevent iOS zoom
                WebkitAppearance: 'none',
                ...props.style
            }}
            {...props}
        />
    );
});

TextInput.displayName = 'TextInput';

// Checkbox component
export const Checkbox = forwardRef(({
                                        name,
                                        id,
                                        checked,
                                        onChange,
                                        disabled = false,
                                        className = '',
                                        children,
                                        ...props
                                    }, ref) => {
    const baseClasses = `
        h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded
        transition-colors duration-200 disabled:bg-gray-100 disabled:cursor-not-allowed
    `.trim().replace(/\s+/g, ' ');

    return (
        <div className="flex items-center">
            <input
                ref={ref}
                type="checkbox"
                name={name}
                id={id || name}
                checked={checked}
                onChange={onChange}
                disabled={disabled}
                className={`${baseClasses} ${className}`}
                style={{
                    // Ensure proper touch target size on mobile
                    minWidth: '44px',
                    minHeight: '44px',
                    ...props.style
                }}
                {...props}
            />
            {children && (
                <label
                    htmlFor={id || name}
                    className="ml-3 text-sm text-gray-700 cursor-pointer select-none"
                >
                    {children}
                </label>
            )}
        </div>
    );
});

Checkbox.displayName = 'Checkbox';

// Radio button component
export const Radio = forwardRef(({
                                     name,
                                     id,
                                     value,
                                     checked,
                                     onChange,
                                     disabled = false,
                                     className = '',
                                     children,
                                     ...props
                                 }, ref) => {
    const baseClasses = `
        h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300
        transition-colors duration-200 disabled:bg-gray-100 disabled:cursor-not-allowed
    `.trim().replace(/\s+/g, ' ');

    return (
        <div className="flex items-center">
            <input
                ref={ref}
                type="radio"
                name={name}
                id={id || `${name}-${value}`}
                value={value}
                checked={checked}
                onChange={onChange}
                disabled={disabled}
                className={`${baseClasses} ${className}`}
                style={{
                    // Ensure proper touch target size on mobile
                    minWidth: '44px',
                    minHeight: '44px',
                    ...props.style
                }}
                {...props}
            />
            {children && (
                <label
                    htmlFor={id || `${name}-${value}`}
                    className="ml-3 text-sm text-gray-700 cursor-pointer select-none"
                >
                    {children}
                </label>
            )}
        </div>
    );
});

Radio.displayName = 'Radio';

// Select dropdown component
export const Select = forwardRef(({
                                      name,
                                      id,
                                      value,
                                      onChange,
                                      options = [],
                                      placeholder,
                                      required = false,
                                      disabled = false,
                                      className = '',
                                      ...props
                                  }, ref) => {
    const baseClasses = `
        w-full text-gray-900 transition-colors duration-200
        disabled:bg-gray-100 disabled:cursor-not-allowed
        bg-white cursor-pointer
    `.trim().replace(/\s+/g, ' ');

    return (
        <select
            ref={ref}
            name={name}
            id={id || name}
            value={value}
            onChange={onChange}
            required={required}
            disabled={disabled}
            className={`${baseClasses} ${className}`}
            style={{
                fontSize: '16px', // Prevent iOS zoom
                ...props.style
            }}
            {...props}
        >
            {placeholder && (
                <option value="" disabled>
                    {placeholder}
                </option>
            )}
            {options.map((option, index) => (
                <option key={index} value={option.value || option}>
                    {option.label || option}
                </option>
            ))}
        </select>
    );
});

Select.displayName = 'Select';

// Textarea component
export const TextArea = forwardRef(({
                                        name,
                                        id,
                                        placeholder,
                                        value,
                                        onChange,
                                        onFocus,
                                        onBlur,
                                        required = false,
                                        disabled = false,
                                        rows = 4,
                                        className = '',
                                        ...props
                                    }, ref) => {
    const baseClasses = `
        w-full text-gray-900 placeholder-gray-500 transition-colors duration-200
        disabled:bg-gray-100 disabled:cursor-not-allowed resize-vertical
    `.trim().replace(/\s+/g, ' ');

    return (
        <textarea
            ref={ref}
            name={name}
            id={id || name}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            onFocus={onFocus}
            onBlur={onBlur}
            required={required}
            disabled={disabled}
            rows={rows}
            className={`${baseClasses} ${className}`}
            spellCheck={true}
            autoCorrect="on"
            autoCapitalize="sentences"
            style={{
                fontSize: '16px', // Prevent iOS zoom
                minHeight: '80px',
                ...props.style
            }}
            {...props}
        />
    );
});

TextArea.displayName = 'TextArea';

// Form field wrapper component
export const FormField = ({
                              label,
                              error,
                              required = false,
                              children,
                              className = '',
                              htmlFor
                          }) => {
    return (
        <div className={`space-y-1 ${className}`}>
            {label && (
                <label
                    htmlFor={htmlFor}
                    className="block text-sm font-medium text-gray-700"
                >
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}
            {children}
            {error && (
                <p className="text-red-600 text-sm mt-1">{error}</p>
            )}
        </div>
    );
};

// Backwards compatibility exports
export const KeyboardOptimizedInput = TextInput;

// Export convenience object
export const Form = {
    Field: FormField,
    TextInput,
    Checkbox,
    Radio,
    Select,
    TextArea
};

// Default export for backwards compatibility
export default TextInput;