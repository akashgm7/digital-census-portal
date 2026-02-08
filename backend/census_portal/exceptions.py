"""
Custom exception handler for human-friendly error messages.
"""
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status


def custom_exception_handler(exc, context):
    """
    Custom exception handler that returns human-friendly error messages.
    Replaces raw stack traces with user-friendly messages.
    """
    response = exception_handler(exc, context)
    
    if response is not None:
        custom_response_data = {
            'success': False,
            'error': {
                'code': response.status_code,
                'message': get_user_friendly_message(response.status_code, exc),
                'detail': response.data if isinstance(response.data, dict) else {'detail': response.data}
            }
        }
        response.data = custom_response_data
    else:
        # Handle unhandled exceptions (500 errors)
        custom_response_data = {
            'success': False,
            'error': {
                'code': 500,
                'message': 'Server issue. Your data is safe. Please try again later.',
                'detail': {}
            }
        }
        response = Response(custom_response_data, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    return response


def get_user_friendly_message(status_code, exc):
    """Return human-friendly error messages based on status code."""
    messages = {
        400: 'Invalid request. Please check your input and try again.',
        401: 'Unauthorized. Please log in again.',
        403: 'Access denied. You do not have permission to perform this action.',
        404: 'Page not found. Go back to Dashboard.',
        405: 'This action is not allowed.',
        429: 'Too many requests. Please wait a moment before trying again.',
        500: 'Server issue. Your data is safe. Please try again later.',
    }
    return messages.get(status_code, str(exc))
