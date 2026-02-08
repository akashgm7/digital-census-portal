from django.core.management.base import BaseCommand
from accounts.models import User, Zone

class Command(BaseCommand):
    help = 'Seeds initial data if database is empty'

    def handle(self, *args, **options):
        self.stdout.write('Seeding initial data...')

        # Create Zones
        zones_data = [
            {'name': 'North Zone', 'code': 'ZN001', 'center_latitude': 12.9716, 'center_longitude': 77.5946, 'radius_meters': 5000},
            {'name': 'South Zone', 'code': 'ZN002', 'center_latitude': 12.9141, 'center_longitude': 77.6100, 'radius_meters': 5000},
            {'name': 'East Zone', 'code': 'ZN003', 'center_latitude': 12.9784, 'center_longitude': 77.6408, 'radius_meters': 5000},
            {'name': 'West Zone', 'code': 'ZN004', 'center_latitude': 12.9698, 'center_longitude': 77.5500, 'radius_meters': 5000},
        ]
        
        for zone_data in zones_data:
            Zone.objects.get_or_create(name=zone_data['name'], defaults=zone_data)
        
        self.stdout.write(f'Zones checked/created.')
        
        # Fetch zones
        north_zone = Zone.objects.get(name='North Zone')
        south_zone = Zone.objects.get(name='South Zone')

        # Create Users
        users_data = [
            {
                'phone_number': '+919876543210',
                'defaults': {
                    'full_name': 'Admin User',
                    'role': 'ADMIN',
                    'is_active': True,
                    'is_staff': True,
                    'is_superuser': True
                }
            },
            {
                'phone_number': '+919876543200',
                'defaults': {
                    'full_name': 'Supervisor User',
                    'role': 'SUPERVISOR',
                    'zone': north_zone,
                    'is_active': True
                }
            },
            {
                'phone_number': '+919876500000',
                'defaults': {
                    'full_name': 'Surveyor User',
                    'role': 'SURVEYOR',
                    'zone': south_zone,
                    'daily_target': 20,
                    'is_active': True
                }
            },
        ]
        
        for user_data in users_data:
            user, created = User.objects.get_or_create(
                phone_number=user_data['phone_number'],
                defaults=user_data['defaults']
            )
            if created:
                user.set_password('password123')
                user.save()
            
        self.stdout.write(self.style.SUCCESS(f'Successfully seeded users.'))
