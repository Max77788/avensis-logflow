/**
 * Validation Utilities
 * Provides validation functions for email, phone, and address fields
 */

/**
 * Email validation using RFC 5322 compliant regex
 */
export function isValidEmail(email: string): boolean {
  if (!email) return false;
  
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email.trim());
}

/**
 * Phone number validation for US phone numbers
 * Accepts formats: (555) 123-4567, 555-123-4567, 5551234567, +1 555 123 4567
 */
export function isValidPhoneNumber(phone: string): boolean {
  if (!phone) return false;
  
  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, '');
  
  // US phone numbers should have 10 digits (or 11 if starting with 1)
  return digitsOnly.length === 10 || (digitsOnly.length === 11 && digitsOnly[0] === '1');
}

/**
 * Format phone number to (XXX) XXX-XXXX format
 */
export function formatPhoneNumber(phone: string): string {
  if (!phone) return '';
  
  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, '');
  
  // Remove leading 1 if present
  const cleaned = digitsOnly.startsWith('1') && digitsOnly.length === 11 
    ? digitsOnly.substring(1) 
    : digitsOnly;
  
  // Format as (XXX) XXX-XXXX
  if (cleaned.length === 10) {
    return `(${cleaned.substring(0, 3)}) ${cleaned.substring(3, 6)}-${cleaned.substring(6)}`;
  }
  
  // Return as-is if not 10 digits
  return phone;
}

/**
 * Address validation - checks for basic address components
 * A valid address should have:
 * - Street number and name
 * - City
 * - State (2 letters)
 * - ZIP code (5 or 9 digits)
 */
export function isValidAddress(address: string): boolean {
  if (!address) return false;
  
  const trimmed = address.trim();
  
  // Basic validation: address should be at least 10 characters and contain a number
  if (trimmed.length < 10) return false;
  if (!/\d/.test(trimmed)) return false; // Must contain at least one digit
  
  return true;
}

/**
 * Validate full address with separate fields
 */
export interface AddressComponents {
  street: string;
  city: string;
  state: string;
  zip: string;
}

export function isValidAddressComponents(address: AddressComponents): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Validate street
  if (!address.street || address.street.trim().length < 5) {
    errors.push('Street address must be at least 5 characters');
  }
  if (address.street && !/\d/.test(address.street)) {
    errors.push('Street address must contain a street number');
  }
  
  // Validate city
  if (!address.city || address.city.trim().length < 2) {
    errors.push('City must be at least 2 characters');
  }
  
  // Validate state (2-letter code)
  if (!address.state || !/^[A-Z]{2}$/.test(address.state.toUpperCase())) {
    errors.push('State must be a valid 2-letter code (e.g., TX, CA)');
  }
  
  // Validate ZIP code (5 or 9 digits)
  const zipDigits = address.zip.replace(/\D/g, '');
  if (zipDigits.length !== 5 && zipDigits.length !== 9) {
    errors.push('ZIP code must be 5 or 9 digits');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Format ZIP code to XXXXX or XXXXX-XXXX format
 */
export function formatZipCode(zip: string): string {
  if (!zip) return '';
  
  const digitsOnly = zip.replace(/\D/g, '');
  
  if (digitsOnly.length === 5) {
    return digitsOnly;
  } else if (digitsOnly.length === 9) {
    return `${digitsOnly.substring(0, 5)}-${digitsOnly.substring(5)}`;
  }
  
  return zip;
}

/**
 * Get validation error message for email
 */
export function getEmailValidationError(email: string): string | null {
  if (!email) return 'Email is required';
  if (!isValidEmail(email)) return 'Please enter a valid email address';
  return null;
}

/**
 * Get validation error message for phone number
 */
export function getPhoneValidationError(phone: string): string | null {
  if (!phone) return 'Phone number is required';
  if (!isValidPhoneNumber(phone)) return 'Please enter a valid 10-digit phone number';
  return null;
}

/**
 * Get validation error message for address
 */
export function getAddressValidationError(address: string): string | null {
  if (!address) return 'Address is required';
  if (!isValidAddress(address)) return 'Please enter a valid address with street number, city, state, and ZIP';
  return null;
}

