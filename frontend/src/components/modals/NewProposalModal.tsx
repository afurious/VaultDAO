import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { X, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { StrKey } from 'stellar-sdk';

export interface NewProposalFormData {
  recipient: string;
  token: string;
  amount: string;
  memo: string;
}

interface ValidationErrors {
  recipient?: string;
  token?: string;
  amount?: string;
}

interface NewProposalModalProps {
  isOpen: boolean;
  loading: boolean;
  selectedTemplateName: string | null;
  formData: NewProposalFormData;
  onClose: () => void;
  onSubmit: (event: React.FormEvent) => void;
  onFieldChange: (field: keyof NewProposalFormData, value: string) => void;
  onOpenTemplateSelector: () => void;
  onSaveAsTemplate: () => void;
  submitError?: string | null;
}

// Base32 alphabet used by Stellar
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

// Validate base32 encoding
const isValidBase32 = (str: string): boolean => {
  for (const char of str) {
    if (!BASE32_ALPHABET.includes(char)) {
      return false;
    }
  }
  return true;
};

// Stellar address validation
const isValidStellarAddress = (addr: string): boolean => {
  if (!addr || typeof addr !== 'string') return false;
  
  // Check for valid Ed25519 public key (G... format, 56 characters)
  if (addr.startsWith('G')) {
    if (addr.length !== 56) return false;
    try {
      return StrKey.isValidEd25519PublicKey(addr);
    } catch {
      return false;
    }
  }
  
  // Check for valid muxed account (M... format, 69 characters)
  if (addr.startsWith('M')) {
    if (addr.length !== 69) return false;
    // Validate base32 encoding for muxed accounts
    const dataPart = addr.slice(1);
    return isValidBase32(dataPart);
  }
  
  return false;
};

// Check if it's a valid contract address (C... format, 56 characters)
const isValidContractAddress = (addr: string): boolean => {
  if (!addr || typeof addr !== 'string') return false;
  
  // Contract addresses start with C and are 56 characters
  if (addr.startsWith('C')) {
    if (addr.length !== 56) return false;
    // Validate base32 encoding
    const dataPart = addr.slice(1);
    return isValidBase32(dataPart);
  }
  
  // Also accept NATIVE as a valid token identifier
  if (addr === 'NATIVE') return true;
  
  // Also accept valid Stellar addresses as token addresses
  return isValidStellarAddress(addr);
};

// Format amount with proper decimal handling
const formatAmount = (value: string): string => {
  // Remove any non-numeric characters except decimal point
  let cleaned = value.replace(/[^0-9.]/g, '');
  
  // Ensure only one decimal point
  const parts = cleaned.split('.');
  if (parts.length > 2) {
    cleaned = parts[0] + '.' + parts.slice(1).join('');
  }
  
  // Limit decimal places to 7 (Stellar's maximum precision)
  if (parts.length === 2 && parts[1].length > 7) {
    cleaned = parts[0] + '.' + parts[1].slice(0, 7);
  }
  
  return cleaned;
};

// Convert amount to stroops (smallest unit, 7 decimal places)
const amountToStroops = (amount: string): string => {
  if (!amount || isNaN(parseFloat(amount))) return '0';
  
  const num = parseFloat(amount);
  // Multiply by 10^7 to convert to stroops
  const stroops = Math.floor(num * 10000000);
  return stroops.toString();
};

// Validation status indicator component
const ValidationIndicator: React.FC<{ status: 'valid' | 'invalid' | 'empty' | 'pending' }> = ({ status }) => {
  if (status === 'empty') return null;
  
  return (
    <div className="absolute right-3 top-1/2 -translate-y-1/2">
      {status === 'valid' && (
        <CheckCircle className="h-5 w-5 text-green-500" aria-label="Valid" />
      )}
      {status === 'invalid' && (
        <AlertCircle className="h-5 w-5 text-red-500" aria-label="Invalid" />
      )}
      {status === 'pending' && (
        <Loader2 className="h-5 w-5 text-gray-400 animate-spin" aria-label="Checking..." />
      )}
    </div>
  );
};

const NewProposalModal: React.FC<NewProposalModalProps> = ({
  isOpen,
  loading,
  selectedTemplateName,
  formData,
  onClose,
  onSubmit,
  onFieldChange,
  onOpenTemplateSelector,
  onSaveAsTemplate,
  submitError,
}) => {
  const [touched, setTouched] = useState<Record<keyof NewProposalFormData, boolean>>({
    recipient: false,
    token: false,
    amount: false,
    memo: false,
  });
  
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  // Validate form fields
  const validateField = useCallback((field: keyof NewProposalFormData, value: string): string | undefined => {
    switch (field) {
      case 'recipient':
        if (!value.trim()) return 'Recipient address is required';
        if (!isValidStellarAddress(value)) {
          return 'Invalid Stellar address (must start with G and be 56 characters)';
        }
        return undefined;
      
      case 'token':
        if (!value.trim()) return 'Token address is required';
        if (!isValidContractAddress(value)) {
          return 'Invalid token address (use NATIVE, a valid contract address starting with C, or a Stellar address)';
        }
        return undefined;
      
      case 'amount':
        if (!value.trim()) return 'Amount is required';
        const numValue = parseFloat(value);
        if (isNaN(numValue) || numValue <= 0) {
          return 'Amount must be a positive number greater than 0';
        }
        if (numValue > 1000000000000) {
          return 'Amount exceeds maximum allowed value';
        }
        return undefined;
      
      case 'memo':
        // Memo is optional, no validation needed
        return undefined;
      
      default:
        return undefined;
    }
  }, []);

  // Validate all fields
  const validateForm = useCallback(() => {
    const errors: ValidationErrors = {};
    (['recipient', 'token', 'amount'] as const).forEach(field => {
      const error = validateField(field, formData[field]);
      if (error) errors[field] = error;
    });
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData, validateField]);

  // Update validation when form data changes
  useEffect(() => {
    if (touched.recipient || touched.token || touched.amount) {
      validateForm();
    }
  }, [formData, touched, validateForm]);

  // Handle field blur for validation
  const handleBlur = (field: keyof NewProposalFormData) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  // Handle amount change with formatting
  const handleAmountChange = (value: string) => {
    const formatted = formatAmount(value);
    onFieldChange('amount', formatted);
  };

  // Check if form is valid
  const isFormValid = useMemo(() => {
    return (
      isValidStellarAddress(formData.recipient) &&
      isValidContractAddress(formData.token) &&
      formData.amount &&
      parseFloat(formData.amount) > 0
    );
  }, [formData]);

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !loading) {
      onClose();
    }
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Touch all fields to show validation
    setTouched({
      recipient: true,
      token: true,
      amount: true,
      memo: true,
    });
    
    if (validateForm()) {
      onSubmit(e);
    }
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, loading, onClose]);

  // Reset touched state when modal opens
  useEffect(() => {
    if (isOpen) {
      setTouched({
        recipient: false,
        token: false,
        amount: false,
        memo: false,
      });
      setValidationErrors({});
    }
  }, [isOpen]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm transition-opacity"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div 
        className="relative w-full max-w-[600px] rounded-2xl border border-gray-700 bg-gray-900 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-700 p-4 sm:p-6">
          <div className="flex flex-col gap-2">
            <h3 id="modal-title" className="text-xl font-semibold text-white sm:text-2xl">
              Create New Proposal
            </h3>
            {selectedTemplateName && (
              <span className="inline-flex w-fit rounded-full border border-purple-500/40 bg-purple-500/10 px-3 py-1 text-xs text-purple-300">
                Template: {selectedTemplateName}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white disabled:opacity-50 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          {/* Recipient Address */}
          <div className="space-y-2">
            <label htmlFor="recipient" className="block text-sm font-medium text-gray-300">
              Recipient Address <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                id="recipient"
                type="text"
                value={formData.recipient}
                onChange={(e) => onFieldChange('recipient', e.target.value)}
                onBlur={() => handleBlur('recipient')}
                placeholder="G..."
                disabled={loading}
                className={`w-full rounded-lg border bg-gray-800 px-3 py-3 pr-10 text-sm text-white placeholder-gray-500 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 min-h-[44px] ${
                  touched.recipient && validationErrors.recipient
                    ? 'border-red-500 focus:border-red-500'
                    : touched.recipient && !validationErrors.recipient
                    ? 'border-green-500 focus:border-green-500'
                    : 'border-gray-600 focus:border-purple-500'
                }`}
                aria-describedby={validationErrors.recipient ? 'recipient-error' : undefined}
                aria-invalid={touched.recipient && !!validationErrors.recipient}
              />
              <ValidationIndicator 
                status={
                  !touched.recipient ? 'empty' :
                  validationErrors.recipient ? 'invalid' : 'valid'
                } 
              />
            </div>
            {touched.recipient && validationErrors.recipient && (
              <p id="recipient-error" className="flex items-center gap-1 text-xs text-red-400">
                <AlertCircle className="h-3 w-3" />
                {validationErrors.recipient}
              </p>
            )}
            <p className="text-xs text-gray-500">
              Enter a valid Stellar public key (starts with G, 56 characters)
            </p>
          </div>

          {/* Token Address */}
          <div className="space-y-2">
            <label htmlFor="token" className="block text-sm font-medium text-gray-300">
              Token Address <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                id="token"
                type="text"
                value={formData.token}
                onChange={(e) => onFieldChange('token', e.target.value)}
                onBlur={() => handleBlur('token')}
                placeholder="NATIVE or C... (contract address)"
                disabled={loading}
                className={`w-full rounded-lg border bg-gray-800 px-3 py-3 pr-10 text-sm text-white placeholder-gray-500 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 min-h-[44px] ${
                  touched.token && validationErrors.token
                    ? 'border-red-500 focus:border-red-500'
                    : touched.token && !validationErrors.token
                    ? 'border-green-500 focus:border-green-500'
                    : 'border-gray-600 focus:border-purple-500'
                }`}
                aria-describedby={validationErrors.token ? 'token-error' : undefined}
                aria-invalid={touched.token && !!validationErrors.token}
              />
              <ValidationIndicator 
                status={
                  !touched.token ? 'empty' :
                  validationErrors.token ? 'invalid' : 'valid'
                } 
              />
            </div>
            {touched.token && validationErrors.token && (
              <p id="token-error" className="flex items-center gap-1 text-xs text-red-400">
                <AlertCircle className="h-3 w-3" />
                {validationErrors.token}
              </p>
            )}
            <p className="text-xs text-gray-500">
              Use NATIVE for XLM, or enter a valid contract/token address
            </p>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <label htmlFor="amount" className="block text-sm font-medium text-gray-300">
              Amount <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                id="amount"
                type="text"
                inputMode="decimal"
                value={formData.amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                onBlur={() => handleBlur('amount')}
                placeholder="0.0000000"
                disabled={loading}
                className={`w-full rounded-lg border bg-gray-800 px-3 py-3 pr-10 text-sm text-white placeholder-gray-500 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 min-h-[44px] ${
                  touched.amount && validationErrors.amount
                    ? 'border-red-500 focus:border-red-500'
                    : touched.amount && !validationErrors.amount
                    ? 'border-green-500 focus:border-green-500'
                    : 'border-gray-600 focus:border-purple-500'
                }`}
                aria-describedby={validationErrors.amount ? 'amount-error' : 'amount-hint'}
                aria-invalid={touched.amount && !!validationErrors.amount}
              />
              <ValidationIndicator 
                status={
                  !touched.amount ? 'empty' :
                  validationErrors.amount ? 'invalid' : 'valid'
                } 
              />
            </div>
            {touched.amount && validationErrors.amount && (
              <p id="amount-error" className="flex items-center gap-1 text-xs text-red-400">
                <AlertCircle className="h-3 w-3" />
                {validationErrors.amount}
              </p>
            )}
            <p id="amount-hint" className="text-xs text-gray-500">
              Enter amount with up to 7 decimal places (Stellar precision)
            </p>
          </div>

          {/* Memo */}
          <div className="space-y-2">
            <label htmlFor="memo" className="block text-sm font-medium text-gray-300">
              Memo <span className="text-gray-500">(optional)</span>
            </label>
            <textarea
              id="memo"
              value={formData.memo}
              onChange={(e) => onFieldChange('memo', e.target.value)}
              onBlur={() => handleBlur('memo')}
              placeholder="Add a description or note for this proposal..."
              disabled={loading}
              rows={3}
              className="w-full resize-none rounded-lg border border-gray-600 bg-gray-800 px-3 py-3 text-sm text-white placeholder-gray-500 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
            />
          </div>

          {/* Submit Error */}
          {submitError && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
              <p className="flex items-center gap-2 text-sm text-red-400">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {submitError}
              </p>
            </div>
          )}

          {/* Template Actions */}
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
            <button
              type="button"
              onClick={onOpenTemplateSelector}
              disabled={loading}
              className="min-h-[44px] flex-1 rounded-lg border border-gray-600 bg-gray-800 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Use Template
            </button>
            <button
              type="button"
              onClick={onSaveAsTemplate}
              disabled={loading || !isFormValid}
              className="min-h-[44px] flex-1 rounded-lg border border-gray-600 bg-gray-800 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save as Template
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 border-t border-gray-700 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="min-h-[44px] w-full rounded-lg bg-gray-700 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed sm:w-auto"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !isFormValid}
              className="min-h-[44px] w-full rounded-lg bg-purple-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting...
                </span>
              ) : (
                'Submit Proposal'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewProposalModal;

// Export utility functions for testing
export { isValidStellarAddress, isValidContractAddress, formatAmount, amountToStroops };
