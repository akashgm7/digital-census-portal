import os, sys, django
sys.path.append(r'c:\Users\ashish k amin\Desktop\digital-census-portal\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'census_portal.settings')
django.setup()

from accounts.models import User, Zone
from surveys.models import MasterAddress

print("=== ALL ZONES ===")
for z in Zone.objects.all():
    print("  Zone: %s | Code: %s" % (z.name, z.code))

print("")
print("=== SURVEYORS ===")
for u in User.objects.filter(role='SURVEYOR'):
    name = getattr(u, 'email', None) or getattr(u, 'username', None) or getattr(u, 'phone_number', None) or str(u)
    if u.zone:
        print("  %s | Zone: %s | Code: %s" % (name, u.zone.name, u.zone.code))
    else:
        print("  %s | No zone" % name)

print("")
print("=== ADDRESS COUNT BY ZONE ===")
for z in Zone.objects.all():
    count = MasterAddress.objects.filter(zone=z).count()
    print("  %s (%s): %d addresses" % (z.name, z.code, count))
