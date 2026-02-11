
import os
import django
import sys

# Setup Django environment
sys.path.append(r'c:\Users\ashish k amin\Desktop\digital-census-portal\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'census_portal.settings')
django.setup()

from django.contrib.auth import get_user_model
from accounts.models import Zone
from surveys.models import MasterAddress, SurveyResponse
from rest_framework.test import APIRequestFactory, force_authenticate
from surveys.views import AddressViewSet, SurveyViewSet

User = get_user_model()
factory = APIRequestFactory()

def test_pincode_validation():
    print("--- Testing Pincode Validation ---")
    
    # 1. Setup Data
    zone_code = "123456"
    zone, _ = Zone.objects.get_or_create(
        name="Test Zone",
        defaults={
            'code': zone_code,
            'center_latitude': 12.0,
            'center_longitude': 77.0
        }
    )
    
    user, _ = User.objects.get_or_create(
        phone_number="9999999999",
        defaults={'full_name': "Test Surveyor", 'role': 'SURVEYOR', 'zone': zone}
    )
    # Ensure user has zone
    user.zone = zone
    user.save()
    
    # 2. Test Invalid Pincode
    view = AddressViewSet.as_view({'get': 'validate_pincode'})
    request = factory.get('/api/v1/addresses/validate_pincode/', {'pincode': '000000'})
    force_authenticate(request, user=user)
    response = view(request)
    print(f"Invalid Pincode Check: {response.data}")
    assert response.data['valid'] == False, "Expected False for wrong pincode"
    
    # 3. Test Valid Pincode
    request = factory.get('/api/v1/addresses/validate_pincode/', {'pincode': zone_code})
    force_authenticate(request, user=user)
    response = view(request)
    print(f"Valid Pincode Check: {response.data}")
    assert response.data['valid'] == True, "Expected True for correct pincode"
    
    # 4. Test Master List Fetching
    MasterAddress.objects.create(
        zone=zone, pincode=zone_code, address_line1="Test House 1", status="ACTIVE"
    )
    
    list_view = AddressViewSet.as_view({'get': 'list'})
    request = factory.get('/api/v1/addresses/', {'pincode': zone_code})
    force_authenticate(request, user=user)
    response = list_view(request)
    print(f"Fetched Addresses: {len(response.data)}")
    assert len(response.data) >= 1, "Expected at least 1 address"

    print("✓ All Tests Passed")

if __name__ == "__main__":
    try:
        test_pincode_validation()
    except Exception as e:
        print(f"❌ Test Failed: {e}")
        import traceback
        traceback.print_exc()
