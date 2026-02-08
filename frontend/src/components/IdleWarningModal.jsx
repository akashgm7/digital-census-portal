/**
 * Idle Warning Modal - shown 1 minute before auto-logout.
 */
import React, { useState, useEffect } from 'react';

function IdleWarningModal({ onDismiss }) {
    const [secondsLeft, setSecondsLeft] = useState(60);

    useEffect(() => {
        const timer = setInterval(() => {
            setSecondsLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
        }}>
            <div className="card" style={{ maxWidth: '400px', margin: '20px' }}>
                <h2>Session Expiring</h2>
                <p>
                    Your session will expire in <strong>{secondsLeft} seconds</strong> due to inactivity.
                </p>
                <p className="text-muted">
                    Click anywhere or press any key to continue working.
                </p>
                <button className="btn btn-primary" onClick={onDismiss}>
                    Continue Working
                </button>
            </div>
        </div>
    );
}

export default IdleWarningModal;
