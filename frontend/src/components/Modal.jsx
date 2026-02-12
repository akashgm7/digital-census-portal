import React, { useEffect } from 'react';

/**
 * Reusable Modal Component
 * @param {boolean} isOpen - Whether the modal is visible
 * @param {string} title - Modal title
 * @param {React.ReactNode} children - Modal content
 * @param {Function} onClose - Function to close the modal
 * @param {React.ReactNode} footer - Optional footer content (buttons)
 * @param {string} type - 'info', 'warning', 'error', 'success' (affects styling)
 */
function Modal({ isOpen, title, children, onClose, footer, type = 'info' }) {
    if (!isOpen) return null;

    // Close on Escape key
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    // Prevent scrolling when modal is open
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    const getHeaderColor = () => {
        switch (type) {
            case 'warning': return '#f59e0b'; // Amber-500
            case 'error': return '#ef4444'; // Red-500
            case 'success': return '#10b981'; // Emerald-500
            default: return '#3b82f6'; // Blue-500
        }
    };

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
            zIndex: 1100,
            backdropFilter: 'blur(2px)'
        }} onClick={onClose}>
            <div
                className="card"
                style={{
                    maxWidth: '500px',
                    width: '90%',
                    margin: '20px',
                    padding: '0',
                    overflow: 'hidden',
                    animation: 'slideIn 0.2s ease-out'
                }}
                onClick={e => e.stopPropagation()}
            >
                <div style={{
                    padding: '16px 24px',
                    borderBottom: '1px solid #eee',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderLeft: `4px solid ${getHeaderColor()}`
                }}>
                    <h3 style={{ margin: 0, fontSize: '1.25rem' }}>{title}</h3>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '1.5rem',
                            cursor: 'pointer',
                            color: '#666',
                            lineHeight: 1
                        }}
                    >
                        ×
                    </button>
                </div>

                <div style={{ padding: '24px' }}>
                    {children}
                </div>

                {footer && (
                    <div style={{
                        padding: '16px 24px',
                        background: '#f9fafb',
                        borderTop: '1px solid #eee',
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: '12px'
                    }}>
                        {footer}
                    </div>
                )}
            </div>
            <style>{`
                @keyframes slideIn {
                    from { transform: translateY(-20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
}

export default Modal;
