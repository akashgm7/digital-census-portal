from django.core.management.base import BaseCommand
from accounts.models import User, Zone

class Command(BaseCommand):
    help = 'Seeds initial data if database is empty'

    def handle(self, *args, **options):
        # Check if users exist
        if User.objects.exists():
            self.stdout.write(self.style.SUCCESS('Users already exist. Skipping seed.'))
            return

        self.stdout.write('Seeding initial data...')

        # Create Zones
        zones = [
            Zone(name='North Zone', center_lat=12.9716, center_lng=77.5946, radius_meters=5000),
            Zone(name='South Zone', center_lat=12.9141, center_lng=77.6100, radius_meters=5000),
            Zone(name='East Zone', center_lat=12.9784, center_lng=77.6408, radius_meters=5000),
            Zone(name='West Zone', center_lat=12.9698, center_lng=77.5500, radius_meters=5000),
        ]
        Zone.objects.bulk_create(zones)
        self.stdout.write(f'Created {len(zones)} zones.')
        
        # Fetch zones for assignment
        north_zone = Zone.objects.get(name='North Zone')
        south_zone = Zone.objects.get(name='South Zone')

        # Create Users
        users = [
            User(
                phone_number='+919876543210',
                full_name='Admin User',
                role='ADMIN',
                is_active=True,
                is_staff=True,
                is_superuser=True
            ),
            User(
                phone_number='+919876543200',
                full_name='Supervisor User',
                role='SUPERVISOR',
                zone=north_zone,
                is_active=True
            ),
            User(
                phone_number='+919876500000',
                full_name='Surveyor User',
                role='SURVEYOR',
                zone=south_zone,
                daily_target=20,
                is_active=True
            ),
        ]
        
        for user in users:
            user.set_password('password123') # Set a default password just in case
            user.save()
            
        self.stdout.write(self.style.SUCCESS(f'Successfully created {len(users)} users.'))
