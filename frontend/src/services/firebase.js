/**
 * Firebase configuration for the Digital Census Portal.
 * Replace with your Firebase project credentials.
 */
import { initializeApp } from 'firebase/app';
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';

// Firebase configuration - Replace with your project config
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "YOUR_API_KEY",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "your-project.firebaseapp.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "your-project-id",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "your-project.appspot.com",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:123456789:web:abc123"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

/**
 * Initialize reCAPTCHA verifier for phone auth
 */
export const setupRecaptcha = (containerId) => {
    if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
            'size': 'invisible',
            'callback': () => {
                console.log('reCAPTCHA solved');
            }
        });
    }
    return window.recaptchaVerifier;
};

/**
 * Send OTP to phone number
 */
export const sendOTP = async (phoneNumber) => {
    try {
        const formattedPhone = phoneNumber.startsWith('+91')
            ? phoneNumber
            : `+91${phoneNumber}`;

        const appVerifier = window.recaptchaVerifier;
        const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
        window.confirmationResult = confirmationResult;
        return { success: true };
    } catch (error) {
        console.error('Error sending OTP:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Verify OTP code
 */
export const verifyOTP = async (otpCode) => {
    try {
        if (!window.confirmationResult) {
            throw new Error('No OTP request found. Please request OTP again.');
        }

        const result = await window.confirmationResult.confirm(otpCode);
        const token = await result.user.getIdToken();
        return { success: true, token, user: result.user };
    } catch (error) {
        console.error('Error verifying OTP:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Get current user's ID token
 */
export const getIdToken = async () => {
    const user = auth.currentUser;
    if (!user) return null;
    return await user.getIdToken(true);
};

/**
 * Sign out user
 */
export const signOut = async () => {
    await auth.signOut();
};

export { auth };
export default app;
