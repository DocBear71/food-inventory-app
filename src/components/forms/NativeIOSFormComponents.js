'use client';
// file: /src/components/forms/NativeIOSFormComponents.js v1 - Enhanced iOS native form components

import { forwardRef, useState, useEffect, useCallback } from 'react';
import { PlatformDetection } from '@/utils/PlatformDetection';
import { MobileHaptics } from '@/components/mobile/MobileHaptics';

/**
 * Enhanced TextInput with native iOS behaviors
 * Replaces KeyboardOptimizedInput with more native iOS patterns
 */
export const NativeTextInput = forwardRef(({
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
                                               validation,
                                               errorMessage,
                                               successMessage,
                                               style = {},
                                               ...props
                                           }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const [isValid, setIsValid] = useState(null);
    const [validationMessage, setValidationMessage] = useState('');
    const isIOS = PlatformDetection.isIOS();

    // Enhanced input modes for iOS
    const getInputMode = () => {
        if (inputMode) return inputMode;

        const inputModeMap = {
            'email': 'email',
            'tel': 'tel',
            'number': 'decimal',
            'search': 'search',
            'url': 'url',
            'text': 'text'
        };

        // iOS-specific optimizations
        if (isIOS) {
            if (name === 'price' || name === 'amount' || name === 'cost') return 'decimal';
            if (name === 'quantity' || name === 'count') return 'numeric';
            if (name === 'zip' || name === 'postal') return 'numeric';
            if (name === 'phone') return 'tel';
        }

        return inputModeMap[type] || 'text';
    };

    // Enhanced autocomplete with iOS optimization
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
            'country': 'country',
            'organization': 'organization',
            'title': 'organization-title',
            'cc-name': 'cc-name',
            'cc-number': 'cc-number',
            'cc-exp': 'cc-exp',
            'cc-csc': 'cc-csc'
        };

        return autoCompleteMap[name] || 'off';
    };

    // iOS-optimized text attributes
    const getIOSTextAttributes = () => {
        const attrs = {};

        if (type === 'password' || type === 'email') {
            attrs.spellCheck = false;
            attrs.autoCorrect = 'off';
        } else {
            attrs.spellCheck = true;
            attrs.autoCorrect = 'on';
        }

        if (type === 'email' || type === 'password') {
            attrs.autoCapitalize = 'none';
        } else if (name === 'name' || name === 'firstName' || name === 'lastName') {
            attrs.autoCapitalize = 'words';
        } else {
            attrs.autoCapitalize = 'sentences';
        }

        return attrs;
    };

    // Native iOS validation
    const validateInput = useCallback((val) => {
        if (!validation) return { isValid: true, message: '' };

        const result = validation(val);
        return typeof result === 'boolean'
            ? { isValid: result, message: result ? successMessage || '' : errorMessage || 'Invalid input' }
            : result;
    }, [validation, errorMessage, successMessage]);

    // Handle focus with haptic feedback
    const handleFocus = async (e) => {
        setIsFocused(true);

        // Native iOS haptic feedback on focus
        if (isIOS) {
            await MobileHaptics.selection();
        }

        if (onFocus) onFocus(e);
    };

    // Handle blur with validation
    const handleBlur = async (e) => {
        setIsFocused(false);

        // Validate on blur
        if (value && validation) {
            const result = validateInput(value);
            setIsValid(result.isValid);
            setValidationMessage(result.message);

            // Haptic feedback for validation result
            if (isIOS) {
                if (result.isValid) {
                    await MobileHaptics.notificationSuccess();
                } else {
                    await MobileHaptics.notificationError();
                }
            }
        }

        if (onBlur) onBlur(e);
    };

    // Handle change with real-time validation
    const handleChange = (e) => {
        const newValue = e.target.value;

        // Real-time validation for immediate feedback
        if (validation && newValue) {
            const result = validateInput(newValue);
            setIsValid(result.isValid);
            setValidationMessage(result.message);
        } else {
            setIsValid(null);
            setValidationMessage('');
        }

        if (onChange) onChange(e);
    };

    // Dynamic classes based on state
    const getInputClasses = () => {
        const baseClasses = [
            'w-full transition-all duration-200',
            'text-gray-900 placeholder-gray-500',
            'disabled:bg-gray-100 disabled:cursor-not-allowed',
            'rounded-lg border-2',
            // iOS-specific styling
            isIOS ? 'px-4 py-3' : 'px-3 py-2'
        ];

        // Validation state styling
        if (isValid === true) {
            baseClasses.push('border-green-500 bg-green-50 focus:border-green-600 focus:ring-green-500');
        } else if (isValid === false) {
            baseClasses.push('border-red-500 bg-red-50 focus:border-red-600 focus:ring-red-500');
        } else if (isFocused) {
            baseClasses.push('border-blue-500 bg-blue-50 focus:border-blue-600 focus:ring-blue-500');
        } else {
            baseClasses.push('border-gray-300 focus:border-blue-500 focus:ring-blue-500');
        }

        return baseClasses.join(' ');
    };

    const iosAttributes = getIOSTextAttributes();

    return (
        <div className="space-y-1">
            <input
                ref={ref}
                type={type}
                name={name}
                id={id || name}
                placeholder={placeholder}
                value={value}
                onChange={handleChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                required={required}
                disabled={disabled}
                autoComplete={getAutoComplete()}
                inputMode={getInputMode()}
                className={`${getInputClasses()} ${className}`}
                style={{
                    fontSize: isIOS ? '16px' : '14px', // Prevent iOS zoom
                    WebkitAppearance: 'none',
                    ...style
                }}
                {...iosAttributes}
                {...props}
            />

            {/* Native iOS validation feedback */}
            {validationMessage && (
                <div className={`text-sm flex items-center gap-2 ${
                    isValid ? 'text-green-600' : 'text-red-600'
                }`}>
                    <span className="text-xs">
                        {isValid ? '✓' : '⚠️'}
                    </span>
                    <span>{validationMessage}</span>
                </div>
            )}
        </div>
    );
});

NativeTextInput.displayName = 'NativeTextInput';

/**
 * Enhanced Textarea with native iOS behaviors
 */
export const NativeTextarea = forwardRef(({
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
                                              maxLength,
                                              className = '',
                                              autoExpand = false,
                                              validation,
                                              errorMessage,
                                              successMessage,
                                              style = {},
                                              ...props
                                          }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const [isValid, setIsValid] = useState(null);
    const [validationMessage, setValidationMessage] = useState('');
    const [charCount, setCharCount] = useState(0);
    const isIOS = PlatformDetection.isIOS();

    // Auto-expand functionality
    const adjustHeight = useCallback(() => {
        if (autoExpand && ref?.current) {
            ref.current.style.height = 'auto';
            ref.current.style.height = `${Math.max(ref.current.scrollHeight, 48)}px`;
        }
    }, [autoExpand, ref]);

    useEffect(() => {
        if (autoExpand) adjustHeight();
        setCharCount(value?.length || 0);
    }, [value, adjustHeight, autoExpand]);

    // Native iOS validation
    const validateTextarea = useCallback((val) => {
        if (!validation) return { isValid: true, message: '' };

        const result = validation(val);
        return typeof result === 'boolean'
            ? { isValid: result, message: result ? successMessage || '' : errorMessage || 'Invalid input' }
            : result;
    }, [validation, errorMessage, successMessage]);

    // Handle focus with haptic feedback
    const handleFocus = async (e) => {
        setIsFocused(true);

        if (isIOS) {
            await MobileHaptics.selection();
        }

        if (onFocus) onFocus(e);
    };

    // Handle blur with validation
    const handleBlur = async (e) => {
        setIsFocused(false);

        if (value && validation) {
            const result = validateTextarea(value);
            setIsValid(result.isValid);
            setValidationMessage(result.message);

            if (isIOS) {
                if (result.isValid) {
                    await MobileHaptics.notificationSuccess();
                } else {
                    await MobileHaptics.notificationError();
                }
            }
        }

        if (onBlur) onBlur(e);
    };

    // Handle change with auto-expand and validation
    const handleChange = (e) => {
        const newValue = e.target.value;
        setCharCount(newValue.length);

        if (autoExpand) {
            setTimeout(adjustHeight, 0);
        }

        if (validation && newValue) {
            const result = validateTextarea(newValue);
            setIsValid(result.isValid);
            setValidationMessage(result.message);
        } else {
            setIsValid(null);
            setValidationMessage('');
        }

        if (onChange) onChange(e);
    };

    // Dynamic classes
    const getTextareaClasses = () => {
        const baseClasses = [
            'w-full transition-all duration-200',
            'text-gray-900 placeholder-gray-500',
            'disabled:bg-gray-100 disabled:cursor-not-allowed',
            'rounded-lg border-2',
            autoExpand ? 'resize-none overflow-hidden' : 'resize-vertical',
            isIOS ? 'px-4 py-3' : 'px-3 py-2'
        ];

        if (isValid === true) {
            baseClasses.push('border-green-500 bg-green-50 focus:border-green-600 focus:ring-green-500');
        } else if (isValid === false) {
            baseClasses.push('border-red-500 bg-red-50 focus:border-red-600 focus:ring-red-500');
        } else if (isFocused) {
            baseClasses.push('border-blue-500 bg-blue-50 focus:border-blue-600 focus:ring-blue-500');
        } else {
            baseClasses.push('border-gray-300 focus:border-blue-500 focus:ring-blue-500');
        }

        return baseClasses.join(' ');
    };

    return (
        <div className="space-y-1">
            <textarea
                ref={ref}
                name={name}
                id={id || name}
                placeholder={placeholder}
                value={value}
                onChange={handleChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                onInput={autoExpand ? adjustHeight : undefined}
                required={required}
                disabled={disabled}
                rows={rows}
                maxLength={maxLength}
                className={`${getTextareaClasses()} ${className}`}
                style={{
                    fontSize: isIOS ? '16px' : '14px',
                    WebkitAppearance: 'none',
                    minHeight: isIOS ? '48px' : '40px',
                    ...style
                }}
                spellCheck={true}
                autoCorrect="on"
                autoCapitalize="sentences"
                {...props}
            />

            {/* Character count and validation feedback */}
            <div className="flex justify-between items-center">
                {validationMessage && (
                    <div className={`text-sm flex items-center gap-2 ${
                        isValid ? 'text-green-600' : 'text-red-600'
                    }`}>
                        <span className="text-xs">
                            {isValid ? '✓' : '⚠️'}
                        </span>
                        <span>{validationMessage}</span>
                    </div>
                )}

                {maxLength && (
                    <div className={`text-xs ml-auto ${
                        charCount > maxLength * 0.9 ? 'text-orange-600' : 'text-gray-500'
                    }`}>
                        {charCount}/{maxLength}
                    </div>
                )}
            </div>
        </div>
    );
});

NativeTextarea.displayName = 'NativeTextarea';

/**
 * Enhanced Select with native iOS styling
 */
export const NativeSelect = forwardRef(({
                                            name,
                                            id,
                                            value,
                                            onChange,
                                            onFocus,
                                            onBlur,
                                            required = false,
                                            disabled = false,
                                            className = '',
                                            placeholder,
                                            children,
                                            options = [],
                                            validation,
                                            errorMessage,
                                            successMessage,
                                            style = {},
                                            ...props
                                        }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const [isValid, setIsValid] = useState(null);
    const [validationMessage, setValidationMessage] = useState('');
    const isIOS = PlatformDetection.isIOS();

    // Native iOS validation
    const validateSelect = useCallback((val) => {
        if (!validation) return { isValid: true, message: '' };

        const result = validation(val);
        return typeof result === 'boolean'
            ? { isValid: result, message: result ? successMessage || '' : errorMessage || 'Please select an option' }
            : result;
    }, [validation, errorMessage, successMessage]);

    // Handle focus with haptic feedback
    const handleFocus = async (e) => {
        setIsFocused(true);

        if (isIOS) {
            await MobileHaptics.selection();
        }

        if (onFocus) onFocus(e);
    };

    // Handle blur with validation
    const handleBlur = async (e) => {
        setIsFocused(false);

        if (value && validation) {
            const result = validateSelect(value);
            setIsValid(result.isValid);
            setValidationMessage(result.message);

            if (isIOS) {
                if (result.isValid) {
                    await MobileHaptics.notificationSuccess();
                } else {
                    await MobileHaptics.notificationError();
                }
            }
        }

        if (onBlur) onBlur(e);
    };

    // Handle change with validation and haptic feedback
    const handleChange = async (e) => {
        const newValue = e.target.value;

        if (isIOS) {
            await MobileHaptics.selection();

            // iPad-specific fix: Force immediate state update
            if (onChange) {
                onChange(e);
            }

            // Second update with delay to ensure persistence on iPad
            setTimeout(() => {
                if (onChange) {
                    const delayedEvent = {
                        ...e,
                        target: { ...e.target, value: newValue },
                        currentTarget: { ...e.currentTarget, value: newValue }
                    };
                    onChange(delayedEvent);
                }
            }, 100);
        } else {
            // Non-iOS devices use standard handling
            if (onChange) onChange(e);
        }

        // Validation handling
        if (validation && newValue) {
            const result = validateSelect(newValue);
            setIsValid(result.isValid);
            setValidationMessage(result.message);
        } else {
            setIsValid(null);
            setValidationMessage('');
        }
    };

    // Dynamic classes
    const getSelectClasses = () => {
        const baseClasses = [
            'w-full transition-all duration-200',
            'text-gray-900 bg-white',
            'disabled:bg-gray-100 disabled:cursor-not-allowed',
            'rounded-lg border-2',
            'cursor-pointer',
            isIOS ? 'px-4 py-3' : 'px-3 py-2'
        ];

        if (isValid === true) {
            baseClasses.push('border-green-500 bg-green-50 focus:border-green-600 focus:ring-green-500');
        } else if (isValid === false) {
            baseClasses.push('border-red-500 bg-red-50 focus:border-red-600 focus:ring-red-500');
        } else if (isFocused) {
            baseClasses.push('border-blue-500 bg-blue-50 focus:border-blue-600 focus:ring-blue-500');
        } else {
            baseClasses.push('border-gray-300 focus:border-blue-500 focus:ring-blue-500');
        }

        return baseClasses.join(' ');
    };

    return (
        <div className="space-y-1">
            <select
                ref={ref}
                name={name}
                id={id || name}
                value={value}
                onChange={handleChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                required={required}
                disabled={disabled}
                className={`${getSelectClasses()} ${className}`}
                style={{
                    fontSize: isIOS ? '16px' : '14px',
                    WebkitAppearance: 'none',
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: 'right 12px center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '16px',
                    paddingRight: isIOS ? '40px' : '36px',
                    ...style
                }}
                {...props}
            >
                {placeholder && (
                    <option value="" disabled>{placeholder}</option>
                )}

                {/* Render options array or children */}
                {options.length > 0 ? (
                    options.map((option, index) => (
                        <option key={index} value={option.value}>
                            {option.label}
                        </option>
                    ))
                ) : (
                    children
                )}
            </select>

            {/* Validation feedback */}
            {validationMessage && (
                <div className={`text-sm flex items-center gap-2 ${
                    isValid ? 'text-green-600' : 'text-red-600'
                }`}>
                    <span className="text-xs">
                        {isValid ? '✓' : '⚠️'}
                    </span>
                    <span>{validationMessage}</span>
                </div>
            )}
        </div>
    );
});

NativeSelect.displayName = 'NativeSelect';

/**
 * FIXED: Enhanced Checkbox with native iOS touch handling - Apple Review Issue #2 Fix
 */
export const NativeCheckbox = forwardRef(({
                                              name,
                                              id,
                                              checked,
                                              onChange,
                                              disabled = false,
                                              className = '',
                                              children,
                                              label,
                                              ...props
                                          }, ref) => {
    const isIOS = PlatformDetection.isIOS();
    const checkboxId = id || name || `checkbox-${Math.random().toString(36).substr(2, 9)}`;

    const handleToggle = async () => {
        if (disabled || !onChange) return;

        if (isIOS) {
            try {
                await MobileHaptics.selection();
            } catch (error) {
                console.log('Haptic feedback failed:', error);
            }
        }

        // Create a more complete synthetic event that matches native checkbox events
        const newChecked = !checked;
        const syntheticEvent = {
            target: {
                name: name,
                checked: newChecked,
                value: newChecked,
                type: 'checkbox'
            },
            currentTarget: {
                name: name,
                checked: newChecked,
                value: newChecked,
                type: 'checkbox'
            },
            type: 'change',
            preventDefault: () => {},
            stopPropagation: () => {}
        };

        onChange(syntheticEvent);
    };

    return (
        <div
            className={`flex items-center cursor-pointer select-none ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'} ${className} p-2 -m-2 rounded-md transition-colors`}
            onClick={handleToggle}
            style={{
                minHeight: '44px',
                touchAction: 'manipulation'
            }}
        >
            <input
                ref={ref}
                type="checkbox"
                name={name}
                id={checkboxId}
                checked={checked}
                onChange={() => {}} // Prevent default handling
                disabled={disabled}
                className={`
                    w-5 h-5 text-blue-600 border-2 border-gray-300 rounded
                    focus:ring-blue-500 focus:ring-2 focus:ring-offset-1
                    ${isIOS ? 'rounded-md' : 'rounded'}
                    ${checked ? 'bg-blue-600 border-blue-600' : 'bg-white'}
                    transition-all duration-200 cursor-pointer
                    pointer-events-none
                `}
                style={{
                    WebkitAppearance: 'none',
                    appearance: 'none',
                    backgroundImage: checked ? `url("data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='m13.854 3.646-7.5 7.5a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6 10.293l7.146-7.147a.5.5 0 0 1 .708.708z'/%3e%3c/svg%3e")` : 'none',
                    backgroundSize: '14px',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                }}
                {...props}
            />

            {(label || children) && (
                <span className={`ml-3 text-gray-900 leading-5 ${isIOS ? 'text-base' : 'text-sm'} ${disabled ? 'text-gray-400' : 'text-gray-900'}`}>
                    {label || children}
                </span>
            )}
        </div>
    );
});

NativeCheckbox.displayName = 'NativeCheckbox';

// Export common validation patterns
export const ValidationPatterns = {
    email: (value) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return {
            isValid: emailRegex.test(value),
            message: emailRegex.test(value) ? 'Valid email address' : 'Please enter a valid email address'
        };
    },

    password: (value) => {
        const minLength = value.length >= 8;
        const hasUpper = /[A-Z]/.test(value);
        const hasLower = /[a-z]/.test(value);
        const hasNumber = /\d/.test(value);

        const isValid = minLength && hasUpper && hasLower && hasNumber;

        if (!minLength) return { isValid: false, message: 'Password must be at least 8 characters' };
        if (!hasUpper) return { isValid: false, message: 'Password must contain an uppercase letter' };
        if (!hasLower) return { isValid: false, message: 'Password must contain a lowercase letter' };
        if (!hasNumber) return { isValid: false, message: 'Password must contain a number' };

        return { isValid: true, message: 'Strong password' };
    },

    required: (value) => ({
        isValid: Boolean(value && value.toString().trim()),
        message: Boolean(value && value.toString().trim()) ? '' : 'This field is required'
    }),

    numeric: (value) => {
        const isNumeric = !isNaN(value) && !isNaN(parseFloat(value));
        return {
            isValid: isNumeric,
            message: isNumeric ? '' : 'Please enter a valid number'
        };
    },

    phone: (value) => {
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        return {
            isValid: phoneRegex.test(value.replace(/\D/g, '')),
            message: phoneRegex.test(value.replace(/\D/g, '')) ? '' : 'Please enter a valid phone number'
        };
    }
};