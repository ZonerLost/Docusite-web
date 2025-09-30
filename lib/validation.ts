import * as Yup from 'yup';

// Login form validation schema
export const loginSchema = Yup.object({
  email: Yup.string()
    .email('Please enter a valid email address')
    .required('Email is required'),
  password: Yup.string()
    .min(6, 'Password must be at least 6 characters')
    .required('Password is required'),
  rememberMe: Yup.boolean()
});

// Forgot password form validation schema
export const forgotPasswordSchema = Yup.object({
  email: Yup.string()
    .email('Please enter a valid email address')
    .required('Email is required')
});

// Reset password form validation schema
export const resetPasswordSchema = Yup.object({
  newPassword: Yup.string()
    .min(8, 'Password must be at least 8 characters')
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    )
    .required('New password is required'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('newPassword')], 'Passwords must match')
    .required('Please confirm your password')
});

// Project form validation schema
export const createProjectSchema = Yup.object({
  title: Yup.string()
    .min(3, 'Project title must be at least 3 characters')
    .required('Project title is required'),
  clientName: Yup.string()
    .min(2, 'Client name must be at least 2 characters')
    .required('Client name is required'),
  location: Yup.string()
    .min(5, 'Location must be at least 5 characters')
    .required('Location is required'),
  deadline: Yup.string()
    .required('Deadline is required'),
  members: Yup.array()
    .of(Yup.string()),
  viewAccess: Yup.boolean(),
  editAccess: Yup.boolean()
});

// Add member form validation schema
export const addMemberSchema = Yup.object({
  name: Yup.string()
    .min(2, 'Name must be at least 2 characters')
    .required('Member name is required'),
  email: Yup.string()
    .email('Please enter a valid email address')
    .required('Email is required'),
  role: Yup.string()
    .required('Role is required')
});

// Personal info form validation schema
export const personalInfoSchema = Yup.object({
  fullName: Yup.string()
    .min(2, 'Full name must be at least 2 characters')
    .required('Full name is required'),
  email: Yup.string()
    .email('Please enter a valid email address')
    .required('Email is required'),
  currentPassword: Yup.string().optional(),
  newPassword: Yup.string()
    .when('currentPassword', {
      is: (val: string) => val && val.length > 0,
      then: (schema) => schema
        .min(8, 'Password must be at least 8 characters')
        .matches(
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
          'Password must contain at least one uppercase letter, one lowercase letter, and one number'
        ),
      otherwise: (schema) => schema.optional()
    }),
  confirmPassword: Yup.string()
    .when('newPassword', {
      is: (val: string) => val && val.length > 0,
      then: (schema) => schema.oneOf([Yup.ref('newPassword')], 'Passwords must match'),
      otherwise: (schema) => schema.optional()
    })
});

// Password change form validation schema
export const passwordChangeSchema = Yup.object({
  currentPassword: Yup.string()
    .required('Current password is required'),
  newPassword: Yup.string()
    .min(8, 'Password must be at least 8 characters')
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    )
    .required('New password is required'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('newPassword')], 'Passwords must match')
    .required('Please confirm your password')
});

// Message form validation schema
export const messageSchema = Yup.object({
  message: Yup.string()
    .min(1, 'Message cannot be empty')
    .max(1000, 'Message is too long')
    .required('Message is required')
});

// Form types
export interface LoginFormValues {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface ForgotPasswordFormValues {
  email: string;
}

export interface ResetPasswordFormValues {
  newPassword: string;
  confirmPassword: string;
}

export interface CreateProjectFormValues {
  title: string;
  clientName: string;
  location: string;
  deadline: string;
  members: string[];
  viewAccess: boolean;
  editAccess: boolean;
}

export interface AddMemberFormValues {
  name: string;
  email: string;
  role: string;
}

export interface PersonalInfoFormValues {
  fullName: string;
  email: string;
}

export interface PasswordChangeFormValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface MessageFormValues {
  message: string;
}

// Signup form validation schema
export const signupSchema = Yup.object({
  fullName: Yup.string()
    .min(2, 'Full name must be at least 2 characters')
    .required('Full name is required'),
  email: Yup.string()
    .email('Please enter a valid email address')
    .required('Email is required'),
  password: Yup.string()
    .min(8, 'Password must be at least 8 characters')
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    )
    .required('Password is required'),
  agreeToTerms: Yup.boolean()
    .oneOf([true], 'You must agree to the Privacy Policy')
});

export interface SignupFormValues {
  fullName: string;
  email: string;
  password: string;
  agreeToTerms: boolean;
}

// Verification code form validation schema
export const verificationSchema = Yup.object({
  code: Yup.string()
    .length(5, 'Verification code must be exactly 5 digits')
    .matches(/^\d{5}$/, 'Verification code must contain only numbers')
    .required('Verification code is required')
});

export interface VerificationFormValues {
  code: string;
}
